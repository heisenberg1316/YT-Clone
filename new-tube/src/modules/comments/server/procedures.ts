import { db } from "@/db";
import { commentInsertSchema, commentReactions, comments, users } from "@/db/schema";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, getTableColumns, inArray, isNull, lt, or, sql } from "drizzle-orm";
import z from "zod";



export const commentsRouter = createTRPCRouter({
    create : protectedProcedure
        .input(z.object({
            videoId : z.uuid(),
            parentId : z.uuid().nullish(),
            value : z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            const { videoId, parentId, value } = input;
            const { id : userId } = ctx.user;

            const [existingComment] = await db.select().from(comments).where(inArray(comments.id, parentId ? [parentId] : []));
            
            if(!existingComment && parentId){
                throw new TRPCError({ code : "NOT_FOUND" });
            }

            if(existingComment?.parentId && parentId){
                throw new TRPCError({ code : "BAD_REQUEST" });
            }

            const trimmedValue = value.trim();

            const [createdComment] = await db.insert(comments).values({userId, videoId, parentId, value : trimmedValue}).returning();
            return createdComment;
        }),

    remove : protectedProcedure
        .input(z.object({
            id : z.uuid(),
        }))
        .mutation(async ({ input, ctx }) => {
            const { id } = input;
            const { id : userId } = ctx.user;


            const [deletedComment] = await db.delete(comments).where(and(eq(comments.id, id), eq(comments.userId, userId))).returning();

            if(!deletedComment){
                throw new TRPCError({ code : "NOT_FOUND" });
            }

            return deletedComment;
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
            parentId : z.uuid().nullish(),
            cursor : z.object({
                id : z.uuid(),
                updatedAt : z.date(),
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


            const data = await db.with(viewerReactions).select({
                ...getTableColumns(comments),
                replyCount: sql<number>`
                    (
                        SELECT COUNT(*)
                        FROM ${comments} AS replies
                        WHERE replies.parent_id = ${comments.id}
                    )
                `,
                likeCount : db.$count(
                    commentReactions,
                    and(
                        eq(commentReactions.type, "like"),
                        eq(commentReactions.commentId, comments.id),
                    )
                ),
                dislikeCount : db.$count(
                    commentReactions,
                    and(
                        eq(commentReactions.type, "dislike"),
                        eq(commentReactions.commentId, comments.id),
                    )
                ),
                viewerReaction : viewerReactions.type,
                user : {
                    id : users.id,
                    name : users.name,
                    imageUrl : users.imageUrl,
                    clerkId : users.clerkId,
                }
            })
            .from(comments)
            .innerJoin(users, eq(comments.userId, users.id))
            .leftJoin(viewerReactions, eq(comments.id, viewerReactions.commentId))
            .where(
                and(
                    eq(comments.videoId, videoId),
                    parentId 
                        ? 
                            eq(comments.parentId, parentId) 
                        : 
                            isNull(comments.parentId), 
                    cursor
                        ? or(
                                lt(comments.updatedAt, cursor.updatedAt),
                                and(
                                    eq(comments.updatedAt, cursor.updatedAt),
                                    lt(comments.id, cursor.id)
                                )
                            )
                        : undefined
                )
            )
            .orderBy(desc(comments.updatedAt), desc(comments.id))
            .limit(limit + 1);

            // Determine if there's a next page
            const hasMore = data.length > limit;
            const items = hasMore ? data.slice(0, -1) : data;
            const lastItem = items[items.length - 1];
            const nextCursor = hasMore ? {id : lastItem.id, updatedAt : lastItem.updatedAt} : null;
            
            return {
                items,
                nextCursor,
            };
        })
})