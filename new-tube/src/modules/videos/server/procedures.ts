import { db } from "@/db";
import { subscriptions, users, videoReactions, videos, videoStats, videoUpdateSchema, videoViews } from "@/db/schema";
import { extractDominantColorFromUrl } from "@/lib/extractDominantColor";
import { mux } from "@/lib/mux";
import { workflow } from "@/lib/workflow";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, getTableColumns, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { UTApi } from "uploadthing/server";
import z from "zod";


export const videosRouter = createTRPCRouter({
    create : protectedProcedure.mutation(async ({ ctx }) => {
        const { id : userId } = ctx.user;

        const upload = await mux.video.uploads.create({
            new_asset_settings : {
                passthrough : userId,
                playback_policies : ["public"],
                input : [
                    {
                        generated_subtitles : [
                            {
                                language_code : "en",
                                name : "English",
                            },
                        ],
                    },
                ],
            },
            cors_origin : "*",  
        }) 

        const [video] = await db.insert(videos).values({
            userId,
            title : "this is the title", 
            muxStatus : upload.status,
            muxUploadId : upload.id,
        }).returning();

        await db.insert(videoStats).values({
            videoId : video.id,
            userId : userId,
            viewCount : 0,
            likeCount : 0,
            dislikeCount : 0,
            commentCount : 0,
        })

        return {
            video : video,
            url : upload.url,
        }
    }),

    deleteDraft: protectedProcedure
        .input(
            z.object({
            videoId: z.string(),
            muxUploadId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            await db.delete(videos).where(eq(videos.id, input.videoId));

            return { success: true };
    }),

    update : protectedProcedure
        .input(videoUpdateSchema)
        .mutation(async ({ ctx, input}) => {
            const { id : userId } = ctx.user;
            
            if(!input.id) {
                throw new TRPCError({ code : "BAD_REQUEST" })
            }
            
            const [updatedVideo] = await db.update(videos).set({
                title : input.title,
                description : input.description,
                categoryId : input.categoryId,
                visibility : input.visibility,
                updatedAt : new Date(),
            }).where(and( eq(videos.id, input.id), eq(videos.userId, userId) )).returning();

            if(!updatedVideo){
                throw new TRPCError({ code : "NOT_FOUND" });
            }

            return updatedVideo;

        }),

    remove : protectedProcedure
        .input(z.object({ id : z.uuid() }))
        .mutation(async ({ ctx, input}) => {
            const { id : userId } = ctx.user;

            
            const [video] = await db.select().from(videos).where(and(eq(videos.id, input.id), eq(videos.userId, userId)));

            if(!video){
                throw new TRPCError({ code: "NOT_FOUND" });
            }


            if (video.muxAssetId) {
                try {
                    const muxDeletedVideo = await mux.video.assets.delete(video.muxAssetId);
                    return muxDeletedVideo;
                }
                catch (err) {
                    console.error("Failed to delete from Mux:", err);
                    throw new TRPCError({code : "INTERNAL_SERVER_ERROR"});
                }
            }

        }),

    revalidate : protectedProcedure
        .input(z.object({ id : z.uuid()}))
        .mutation(async ({ ctx, input }) => {
            const { id : userId } = ctx.user;

            const [existingVideo] = await db.select({
                id: videos.id,
                muxUploadId: videos.muxUploadId,
                muxStatus: videos.muxStatus,
                muxPlaybackId: videos.muxPlaybackId,
            }).from(videos).where(
                and(
                    eq(videos.id, input.id),
                    eq(videos.userId, userId),
                )   
            );

            if(!existingVideo){
                throw new TRPCError({ code : "NOT_FOUND" });
            }

            if(!existingVideo.muxUploadId){
                throw new TRPCError({ code : "BAD_REQUEST" });
            }

            // 🚀 early exit
            if (existingVideo.muxStatus === "ready" && existingVideo.muxPlaybackId) {
                return existingVideo;
            }

            const directUpload = await mux.video.uploads.retrieve(
                existingVideo.muxUploadId 
            )

            if(!directUpload || !directUpload.asset_id){
                throw new TRPCError({ code : "BAD_REQUEST" });
            }

            const asset = await mux.video.assets.retrieve(
                directUpload.asset_id
            );

            if(!asset){
                throw new TRPCError({ code : "BAD_REQUEST" }); 
            }

            const playbackId = asset.playback_ids?.[0].id;
            const duration = asset.duration ? Math.round(asset.duration * 1000) : 0;

            const [updatedVideo] = await db.update(videos).set({
                muxStatus : asset.status,
                muxPlaybackId : playbackId,
                muxAssetId : asset.id,
                duration,
            })
            .where((
                and(
                    eq(videos.id, input.id),
                    eq(videos.userId, userId),
                )
            ))
            .returning();
            return updatedVideo;
        }),

    restoreThumbnail : protectedProcedure
        .input(z.object({ id : z.uuid() }))
        .mutation(async ({ ctx, input}) => {
            const { id : userId } = ctx.user;

            const [existingVideo] = await db.select().from(videos).where(
                and(
                    eq(videos.id, input.id),
                    eq(videos.userId, userId),
                )   
            );

            if(!existingVideo){
                throw new TRPCError({ code : "NOT_FOUND" });
            }

            if(existingVideo.thumbnailKey){
                const utapi = new UTApi();

                await utapi.deleteFiles(existingVideo.thumbnailKey);
                await db.update(videos).set({thumbnailKey : null, thumbnailUrl : null}).where(
                    and(
                        eq(videos.id, input.id),
                        eq(videos.userId, userId),
                    ) 
                );
            }

            if(!existingVideo.muxPlaybackId){
                throw new TRPCError({ code : "BAD_REQUEST" });
            }


            const thumbnailUrl = `https://image.mux.com/${existingVideo.muxPlaybackId}/thumbnail.jpg`;
            const dominantColor = await extractDominantColorFromUrl(thumbnailUrl);

            const [updatedVideo] = await db.update(videos).set({ thumbnailUrl, dominantColor : dominantColor.rgb }).where(
                and(
                    eq(videos.id, input.id),
                    eq(videos.userId, userId),
                )
            ).returning();

            return updatedVideo;
        }),


    generateContent : protectedProcedure
        .input(z.object({ id : z.uuid(), type : z.string() }))
        .mutation(async ({ ctx, input}) => {
            const { id : userId } = ctx.user;
            const { type } = input;

            const [video] = await db.select().from(videos).where(
                and(
                    eq(videos.id, input.id),
                    eq(videos.userId, userId),
                )   
            );

            if (video.aiTitleStatus === "pending" && type=="title") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Title generation already in progress",
                });
            }

            if (video.aiDescriptionStatus === "pending" && type=="description") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Description generation already in progress",
                });
            }

            if(type=="title"){
                await db.update(videos).set({aiTitleStatus : "pending"}).where(
                    and(
                        eq(videos.id, input.id),
                        eq(videos.userId, userId),
                    ) 
                );
            }
            else{
                await db.update(videos).set({aiDescriptionStatus : "pending"}).where(
                    and(
                        eq(videos.id, input.id),
                        eq(videos.userId, userId),
                    ) 
                );
            }

            const { workflowRunId } = await workflow.trigger({
                url : `${process.env.UPSTASH_WORKFLOW_URL}/api/videos/workflows/content`,
                body : { userId, videoId : input.id, type },
            })

            return workflowRunId;
        }),

    getOne: baseProcedure
        .input(z.object({ id: z.uuid() }))
        .query(async ({ input, ctx }) => {
            const { clerkUserId } = ctx;
            let userId;

            // 1. Get the internal User ID if logged in
            if (clerkUserId) {
                const [user] = await db
                    .select({ id: users.id })
                    .from(users)
                    .where(eq(users.clerkId, clerkUserId));
                userId = user?.id;
            }

            // 2. The Optimized Query
            const [existingVideo] = await db
            .select({
                // Spread Video Data
                ...getTableColumns(videos),
                
                // User (Creator) Data
                user: {
                    ...getTableColumns(users),
                    // We still calculate this on fly (unless i add channel_stats table later)
                    subscriberCount: db.$count(
                        subscriptions, 
                        eq(subscriptions.creatorId, users.id)
                    ),
                    // Check if CURRENT viewer is subscribed
                    viewerSubscribed: userId 
                        ? isNotNull(subscriptions.viewerId).mapWith(Boolean)
                        : sql<boolean>`false`,
                },
                // FAST: Read from the Stats Table (O(1) Lookup)
                viewCount: videoStats.viewCount,
                likeCount: videoStats.likeCount,
                dislikeCount: videoStats.dislikeCount,
                
                // Check if CURRENT viewer liked/disliked
                viewerReaction: userId 
                    ? videoReactions.type 
                    : sql<"like" | "dislike" | null>`null`,
            })
            .from(videos)
            
            // A. Join the Creator
            .innerJoin(users, eq(videos.userId, users.id))
            
            // B. Join the Stats Table (This is the speed boost)
            .innerJoin(videoStats, eq(videoStats.videoId, videos.id))
            
            // C. Join Viewer Interaction (Only matches if userId exists)
            .leftJoin(videoReactions, and(
                eq(videoReactions.videoId, videos.id),
                userId
                    ? eq(videoReactions.userId, userId)
                    : sql`false`
            ))

            
            // D. Join Subscription Status (Only matches if userId exists)
            .leftJoin(subscriptions, and(
                eq(subscriptions.creatorId, users.id),
                userId
                    ? eq(subscriptions.viewerId, userId)
                    : sql`false`
            ))
            
            .where(eq(videos.id, input.id));

            if (!existingVideo) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            return existingVideo;
        }),

    getMany: baseProcedure
        .input(
            z.object({
                categoryId : z.uuid().nullish(),
                userId : z.uuid().nullish(),
                cursor: z.object({
                        id: z.uuid(),
                        updatedAt: z.date(),
                    }).nullish(),

                limit: z.number().min(1).max(100), 
            })
        ) 
        .query(async ({ input }) => {
            const { cursor, limit, categoryId, userId } = input;
            // Fetch one extra item to determine whether there's a next page
            const data = await db
                    .select({
                        ...getTableColumns(videos),
                        user : users,
                        viewCount : videoStats.viewCount,
                        likeCount : videoStats.likeCount,
                        dislikeCount : videoStats.dislikeCount,
                    }) 
                    .from(videos)
                    .innerJoin(users, eq(videos.userId, users.id))
                    .innerJoin(videoStats, eq(videoStats.videoId, videos.id))
                    .where(
                        and(
                            eq(videos.visibility, "public"),
                            categoryId ? eq(videos.categoryId, categoryId) : undefined,
                            userId ? eq(videos.userId, userId) : undefined,
                            // If cursor is provided, apply the cursor boundary:
                            cursor
                            ? or(
                                    lt(videos.updatedAt, cursor.updatedAt),
                                    and(
                                        eq(videos.updatedAt, cursor.updatedAt),
                                        lt(videos.id, cursor.id)
                                    )
                                )
                            : undefined
                        )
                    )
                    .orderBy(desc(videos.updatedAt), desc(videos.id))
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
        }),

    getManyTrending : baseProcedure
        .input(
            z.object({
                cursor: z.object({
                        id: z.uuid(),
                        viewCount: z.number(),
                    }).nullish(),

                limit: z.number().min(1).max(100), 
            })
        ) 
        .query(async ({ input }) => {
            const { cursor, limit } = input;
            // Fetch one extra item to determine whether there's a next page

            const data = await db
                    .select({
                        ...getTableColumns(videos),
                        user : users,
                        viewCount : videoStats.viewCount,
                        likeCount : videoStats.likeCount,
                        dislikeCount : videoStats.dislikeCount,
                    }) 
                    .from(videos)
                    .innerJoin(users, eq(videos.userId, users.id))
                    .innerJoin(videoStats, eq(videoStats.videoId, videos.id))
                    .where(
                        and(
                            eq(videos.visibility, "public"),
                            // If cursor is provided, apply the cursor boundary:
                            cursor
                            ? or(
                                    lt(videoStats.viewCount, cursor.viewCount),
                                    and(
                                        eq(videoStats.viewCount, cursor.viewCount),
                                        lt(videos.id, cursor.id)
                                    )
                                )
                            : undefined
                        )
                    )   
                    .orderBy(desc(videoStats.viewCount), desc(videos.id))
                    .limit(limit + 1);

            // Determine if there's a next page
            const hasMore = data.length > limit;
            const items = hasMore ? data.slice(0, -1) : data;
            const lastItem = items[items.length - 1];
            const nextCursor = hasMore ? {id : lastItem.id, viewCount : lastItem.viewCount} : null;

            return {
                items,
                nextCursor,
            };
        }),

     getManySubscribed : protectedProcedure
        .input(
            z.object({
                cursor: z.object({
                        id: z.uuid(),
                        updatedAt: z.date(),
                    }).nullish(),

                limit: z.number().min(1).max(100), 
            })
        ) 
        .query(async ({ input, ctx }) => {
            const { cursor, limit } = input;
            const { id : userId } = ctx.user;

            const viewerSubscriptions = db.$with("viewer_subscriptions").as(
                db.select({
                    creatorId : subscriptions.creatorId,
                })
                .from(subscriptions)
                .where(eq(subscriptions.viewerId, userId))
            )

            // Fetch one extra item to determine whether there's a next page
            const data = await db.with(viewerSubscriptions)
                    .select({
                        ...getTableColumns(videos),
                        user : users,
                        viewCount : videoStats.viewCount,
                        likeCount : videoStats.likeCount,
                        dislikeCount : videoStats.dislikeCount,
                    }) 
                    .from(videos)
                    .innerJoin(users, eq(videos.userId, users.id))
                    .innerJoin(viewerSubscriptions, eq(viewerSubscriptions.creatorId, users.id))
                    .innerJoin(videoStats, eq(videoStats.videoId, videos.id))
                    .where(
                        and(
                            eq(videos.visibility, "public"),
                            // If cursor is provided, apply the cursor boundary:
                            cursor
                            ? or(
                                    lt(videos.updatedAt, cursor.updatedAt),
                                    and(
                                        eq(videos.updatedAt, cursor.updatedAt),
                                        lt(videos.id, cursor.id)
                                    )
                                )
                            : undefined
                        )
                    )
                    .orderBy(desc(videos.updatedAt), desc(videos.id))
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
        }),
    
}) 