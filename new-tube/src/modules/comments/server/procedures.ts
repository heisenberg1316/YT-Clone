import { db } from "@/db";
import { commentInsertSchema, commentReactions, comments, commentStats, users, videoStats } from "@/db/schema";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, getTableColumns, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import z from "zod";


export const commentsRouter = createTRPCRouter({

    //this also remaning update, replytousername, replytouserid
    create : protectedProcedure
        .input(z.object({
            videoId : z.uuid(),
            parentId : z.uuid().nullish(),
            replyToUserId : z.uuid().nullish(),
            value : z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            const { videoId, parentId, replyToUserId, value } = input;
            const { id : userId } = ctx.user;

            try {
                return await db.transaction(async (tx) => {

                    if(parentId){
                        const [existingComment] = await tx.select().from(comments).where(eq(comments.id, parentId));
                        
                        if(!existingComment && parentId){
                            throw new TRPCError({ code : "NOT_FOUND", message : "Cannot reply to a non-existent comment" });
                        }
                    }


                    const trimmedValue = value.trim();
                    if (!trimmedValue) {
                        throw new TRPCError({
                            code: "BAD_REQUEST",
                            message: "Comment cannot be empty",
                        });
                    }

                    const [createdComment] = await tx.insert(comments).values({userId, videoId, parentId, replyToUserId, value : trimmedValue}).returning();

                    await tx.insert(commentStats).values({commentId : createdComment.id, isParent : Boolean(!parentId)});
                    await tx.update(videoStats).set({ commentCount: sql`${videoStats.commentCount} + 1` }).where(eq(videoStats.videoId, videoId));

                    if(parentId){
                        await tx.update(commentStats).set({replyCount : sql`${commentStats.replyCount} + 1`}).where(eq(commentStats.commentId, parentId));
                    }

                   
                    return createdComment;
                })

            }
            catch(err){
                console.error("❌ comment create error:", err);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create the comment",
                    cause: err,
                });
            }
        }),
        
    remove : protectedProcedure
        .input(z.object({
            id : z.uuid(),
        }))
        .mutation(async ({ input, ctx }) => {
            const { id } = input;
            const { id : userId } = ctx.user;

            try {
                return await db.transaction(async (tx) => {

                    // 1. Get the comment FIRST
                    const [existingComment] = await tx.select().from(comments).where(and(eq(comments.id, id), eq(comments.userId, userId)));

                    if (!existingComment) {
                        throw new TRPCError({ code: "NOT_FOUND" });
                    }

                    // 2. Get stats BEFORE delete (important)
                    const [stats] = await tx.select().from(commentStats).where(eq(commentStats.commentId, id));

                    const replyCount = stats?.replyCount ?? 0;

                    // 3. Delete comment (this cascades)
                    const [deletedComment] = await tx.delete(comments).where(eq(comments.id, id)).returning();

                    // 4. Update counts
                    if (existingComment.parentId) {
                        // deleting a reply
                        await tx.update(commentStats)
                            .set({
                                replyCount: sql`GREATEST(reply_count - 1, 0)`
                            })
                            .where(eq(commentStats.commentId, existingComment.parentId));

                        await tx.update(videoStats)
                            .set({
                                commentCount: sql`GREATEST(comment_count - 1, 0)`
                            })
                            .where(eq(videoStats.videoId, existingComment.videoId));

                    } 
                    else {
                        // deleting a parent
                        await tx.update(videoStats)
                            .set({
                                commentCount: sql`GREATEST(comment_count - ${1 + replyCount}, 0)`
                            })
                            .where(eq(videoStats.videoId, existingComment.videoId));
                        }

                        return deletedComment;
                    });
                }
            catch (err) {
                if (err instanceof TRPCError) throw err;

                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to delete the comment",
                    cause: err,
                });
            }
        }),
        
    getTotal : baseProcedure
        .input(z.object({
            videoId : z.uuid(),
        }))
        .query(async ({ input }) => {
            const { videoId } = input;
            const [totalData] = await db.select({ count : count()}).from(comments).where(eq(comments.videoId, videoId));

            return {count : totalData.count};
        }),

    getMany : baseProcedure
        .input(z.object({
            videoId : z.uuid(),
            parentId : z.uuid().optional(),
            cursor : z.object({
                id : z.uuid(),
                createdAt : z.date(),
            }).nullish(),

            limit : z.number().min(1).max(100),
        }))
        .query(async ({ input, ctx }) =>{
            const { videoId, parentId, cursor, limit } = input;  
            const { clerkUserId } = ctx;

            let userId;
            //or we can do if else which means if clerkUserId is not null then only do db query else not
            const [user] = await db.select().from(users).where(inArray(users.clerkId, clerkUserId ? [clerkUserId] : []));

            if(user){
                userId = user.id;
            }

            const viewerReactions = db.$with("viewer_reactions").as(
                db.select({
                    commentId : commentReactions.commentId,
                    type : commentReactions.type,
                })
                .from(commentReactions)
                .where(inArray(commentReactions.userId, userId ? [userId] : []))
            )
            const replyToUsers = alias(users, "reply_to_users");
            const isAscending = !!parentId; 

            const orderByClause = isAscending 
                ? [asc(comments.createdAt), asc(comments.id)] 
                : [desc(comments.createdAt), desc(comments.id)];


            const data = await db.with(viewerReactions).select({
                ...getTableColumns(comments),
                replyCount: commentStats.replyCount,
                likeCount : commentStats.likeCount,
                dislikeCount : commentStats.dislikeCount,
                viewerReaction : viewerReactions.type,
                user : {
                    id : users.id,
                    name : users.name,
                    imageUrl : users.imageUrl,
                    clerkId : users.clerkId,
                    username : users.username,
                },
                replyToUserUsername: replyToUsers.username, 
                replyToUserId: replyToUsers.id, // Optional: useful for client-side routing
            })
            .from(comments)
            .innerJoin(users, eq(comments.userId, users.id))
            .leftJoin(viewerReactions, eq(comments.id, viewerReactions.commentId))
            .leftJoin(replyToUsers, eq(comments.replyToUserId, replyToUsers.id))
            .innerJoin(commentStats, eq(commentStats.commentId, comments.id))
            .where(
                and(
                    eq(comments.videoId, videoId),
                    parentId 
                        ? 
                            eq(comments.parentId, parentId) 
                        : 
                            isNull(comments.parentId), 
                    cursor
                        ? isAscending
                            // CHILD COMMENTS (ASC)
                            ? or(
                                    gt(comments.createdAt, cursor.createdAt),
                                    and(
                                        eq(comments.createdAt, cursor.createdAt),
                                        gt(comments.id, cursor.id)
                                    )
                                )
                            // TOP-LEVEL COMMENTS (DESC)
                            : or(
                                    lt(comments.createdAt, cursor.createdAt),
                                    and(
                                        eq(comments.createdAt, cursor.createdAt),
                                        lt(comments.id, cursor.id)
                                    )
                                )
                    : undefined
                )
            )
            .orderBy(...orderByClause)
            .limit(limit + 1);

            // Determine if there's a next page
            const hasMore = data.length > limit;
            const items = hasMore ? data.slice(0, -1) : data;
            const lastItem = items[items.length - 1];
            const nextCursor = hasMore ? {id : lastItem.id, createdAt : lastItem.createdAt} : null;
            
            return {
                items,
                nextCursor,
            };
        })
})