import { db } from "@/db";
import { playlists, playlistVideos, users, videoHistory, videoReactions, videos, videoStats, videoViews } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, getTableColumns, lt, or, sql } from "drizzle-orm";
import z from "zod";


export const playlistsRouter = createTRPCRouter({

    addHistory : protectedProcedure
        .input(
            z.object({ videoId: z.uuid()  })
        )
        .mutation(async ({ input, ctx }) => {
            const { videoId } = input;
            const userId = ctx.user.id;

            await db
            .insert(videoHistory)
            .values({
                userId,
                videoId,
                lastViewedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: [videoHistory.userId, videoHistory.videoId],
                set: {
                    lastViewedAt: new Date(),
                },
            });
        }),

    getLiked : protectedProcedure
        .input(
            z.object({
                cursor: z.object({
                        id: z.uuid(),
                        likedAt: z.date(),
                    }).nullish(),

                limit: z.number().min(1).max(100), 
            })
        ) 
        .query(async ({ input, ctx }) => {
            const { cursor, limit } = input;
            const { id : userId } = ctx.user;

            //its different from getHistory in the way that i am using CTE here (build "viewer_video_reactions (only this user, only likes) then Join videos with that small, clean set) 
            // instead of joining the videoreactions which means join first the whole table for that user then filter likes

            const viewerVideoReactions = db.$with("viewer_video_reactions").as(
                db.select({
                    videoId: videoReactions.videoId,
                    likedAt: videoReactions.updatedAt,
                })
                .from(videoReactions)
                .where(
                    and(
                        eq(videoReactions.userId, userId),
                        eq(videoReactions.type, "like")
                    )
                )
            );

            // Fetch one extra item to determine whether there's a next page
            const data = await db
                    .with(viewerVideoReactions)
                    .select({
                        ...getTableColumns(videos),
                        user : users,
                        likedAt : viewerVideoReactions.likedAt,
                        viewCount : videoStats.viewCount,
                        likeCount : videoStats.likeCount,
                        dislikeCount : videoStats.dislikeCount,
                    }) 
                    .from(videos)
                    .innerJoin(users, eq(users.id, videos.userId))
                    .innerJoin(viewerVideoReactions, eq(videos.id, viewerVideoReactions.videoId))
                    .innerJoin(videoStats, eq(videoStats.videoId, videos.id))
                    .where(
                        and(
                            eq(videos.visibility, "public"),
                            // If cursor is provided, apply the cursor boundary:
                            cursor
                            ? or(
                                    lt(viewerVideoReactions.likedAt, cursor.likedAt),
                                    and(
                                        eq(viewerVideoReactions.likedAt, cursor.likedAt),
                                        lt(videos.id, cursor.id)
                                    )
                                )
                            : undefined
                        )
                    )
                    .orderBy(desc(viewerVideoReactions.likedAt), desc(videos.id))
                    .limit(limit + 1);

            // Determine if there's a next page
            const hasMore = data.length > limit;
            const items = hasMore ? data.slice(0, -1) : data;
            const lastItem = items[items.length - 1];
            const nextCursor = hasMore ? {id : lastItem.id, likedAt : lastItem.likedAt} : null;

            return {
                items,
                nextCursor,
            };
        }),

 
    getHistory: protectedProcedure
        .input(
            z.object({
                cursor: z.object({
                        id: z.uuid(),
                        lastViewedAt: z.date(),
                    }).nullish(),

                limit: z.number().min(1).max(100), 
            })
        ) 
        .query(async ({ input, ctx }) => {
            const { cursor, limit } = input;
            const { id : userId } = ctx.user;


            // Fetch one extra item to determine whether there's a next page
            const data = await db
                    .select({
                        ...getTableColumns(videos),
                        user : users,
                        lastViewedAt : videoHistory.lastViewedAt,
                        viewCount : videoStats.viewCount,
                        likeCount : videoStats.likeCount,
                        dislikeCount : videoStats.dislikeCount,
                    }) 
                    .from(videos)
                    .innerJoin(users, eq(users.id, videos.userId))
                    .innerJoin(videoHistory, eq(videos.id, videoHistory.videoId))
                    .innerJoin(videoStats, eq(videoStats.videoId, videos.id))
                    .where(
                        and(
                            eq(videoHistory.userId, userId),
                            eq(videos.visibility, "public"),
                            // If cursor is provided, apply the cursor boundary:
                            cursor
                            ? or(
                                    lt(videoHistory.lastViewedAt, cursor.lastViewedAt),
                                    and(
                                        eq(videoHistory.lastViewedAt, cursor.lastViewedAt),
                                        lt(videos.id, cursor.id)
                                    )
                                )
                            : undefined
                        )
                    )
                    .orderBy(desc(videoHistory.lastViewedAt), desc(videos.id))
                    .limit(limit + 1);

            // Determine if there's a next page
            const hasMore = data.length > limit;
            const items = hasMore ? data.slice(0, -1) : data;
            const lastItem = items[items.length - 1];
            const nextCursor = hasMore ? {id : lastItem.id, lastViewedAt : lastItem.lastViewedAt} : null;

            return {
                items,
                nextCursor,
            };
        }),

    create : protectedProcedure.
        input(z.object({ name : z.string().min(1)}))
        .mutation(async ({ input, ctx }) => {
            const { name } = input;
            const { id : userId } = ctx.user;
            
            const [createdPlaylist] = await db.insert(playlists).values({ userId, name }).returning();

            if(!createdPlaylist){
                throw new TRPCError({ code : "BAD_REQUEST" });
            }
        }),

    getMany : protectedProcedure    
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

            // Fetch one extra item to determine whether there's a next page
            const data = await db
                    .select({
                        ...getTableColumns(playlists),
                        users : users,
                        thumbnailUrl : sql<string | null>`(
                            SELECT v.thumbnail_url
                            FROM ${playlistVideos} pv
                            JOIN ${videos} v ON v.id = pv.video_id
                            WHERE pv.playlist_id = ${playlists.id}
                            ORDER BY pv.updated_at DESC
                            LIMIT 1
                        )`
                    }) 
                    .from(playlists)
                    .innerJoin(users, eq(playlists.userId, users.id))
                    .where(
                        and(
                            eq(playlists.userId, userId),
                            // If cursor is provided, apply the cursor boundary:
                            cursor
                            ? or(
                                    lt(playlists.updatedAt, cursor.updatedAt),
                                    and(
                                        eq(playlists.updatedAt, cursor.updatedAt),
                                        lt(playlists.id, cursor.id)
                                    )
                                )
                            : undefined
                        )
                    )
                    .orderBy(desc(playlists.updatedAt), desc(playlists.id))
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

    getManyForVideo : protectedProcedure
        .input(
            z.object({
                videoId : z.uuid(),
                cursor: z.object({
                        id: z.uuid(),
                        updatedAt: z.date(),
                    }).nullish(),

                limit: z.number().min(1).max(100), 
            })
        ) 
        .query(async ({ input, ctx }) => {
            const { cursor, limit, videoId } = input;
            const { id : userId } = ctx.user;

            // Fetch one extra item to determine whether there's a next page
            const data = await db
                    .select({
                        ...getTableColumns(playlists),
                        users : users,
                        containsVideo : videoId
                        ? sql<boolean>`(
                            SELECT EXISTS (
                                SELECT 1 
                                FROM ${playlistVideos} pv
                                WHERE pv.playlist_id = ${playlists.id} AND pv.video_id = ${videoId}
                            )
                        )`
                        : sql<boolean>`false`,
                    }) 
                    .from(playlists)
                    .innerJoin(users, eq(playlists.userId, users.id))
                    .where(
                        and(
                            eq(playlists.userId, userId),
                            // If cursor is provided, apply the cursor boundary:
                            cursor
                            ? or(
                                    lt(playlists.updatedAt, cursor.updatedAt),
                                    and(
                                        eq(playlists.updatedAt, cursor.updatedAt),
                                        lt(playlists.id, cursor.id)
                                    )
                                )
                            : undefined
                        )
                    )
                    .orderBy(desc(playlists.updatedAt), desc(playlists.id))
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

    addVideo : protectedProcedure.
        input(z.object({ playlistId : z.uuid(), videoId : z.uuid()}))
        .mutation(async ({ input, ctx }) => {
            const { playlistId, videoId } = input;
            const { id : userId } = ctx.user;
            
            const [existingPlaylist] = await db.select().from(playlists).where(
                and(
                    eq(playlists.id, playlistId),
                    eq(playlists.userId, userId)
                )
            );

            if(!existingPlaylist){
                throw new TRPCError({ code : "NOT_FOUND", message : "existing playilst not found" });
            }

            const [existingVideo] = await db.select().from(videos).where(eq(videos.id, videoId));
            
            if(!existingVideo){
                throw new TRPCError({ code : "NOT_FOUND", message : "existing video not found" });
            }
    
            const [existingPlaylistVideo] = await db.select().from(playlistVideos).where(
                and(
                    eq(playlistVideos.playlistId, playlistId),
                    eq(playlistVideos.videoId, videoId)
                )
            );

            
            if(existingPlaylistVideo){
                throw new TRPCError({ code : "CONFLICT", message : "video already exist in the playlist" });
            }
            
            const [createdPlaylistVideo] = await db.insert(playlistVideos).values({ playlistId, videoId }).returning();
            await db.update(playlists).set({ videosCount: sql`videos_count + 1` }).where(eq(playlists.id, playlistId));
            
            return createdPlaylistVideo;

        }),

    removeVideo : protectedProcedure.
        input(z.object({ playlistId : z.uuid(), videoId : z.uuid()}))
        .mutation(async ({ input, ctx }) => {
            const { playlistId, videoId } = input;
            const { id : userId } = ctx.user;
            
            const [existingPlaylist] = await db.select().from(playlists).where(
                and(
                    eq(playlists.id, playlistId),
                    eq(playlists.userId, userId)
                )
            );

            if(!existingPlaylist){
                throw new TRPCError({ code : "NOT_FOUND", message : "existing playilst not found" });
            }

            const [existingVideo] = await db.select().from(videos).where(eq(videos.id, videoId));
            
            if(!existingVideo){
                throw new TRPCError({ code : "NOT_FOUND", message : "existing video not found" });
            }
    
            const [existingPlaylistVideo] = await db.select().from(playlistVideos).where(
                and(
                    eq(playlistVideos.playlistId, playlistId),
                    eq(playlistVideos.videoId, videoId)
                )
            );

            if(!existingPlaylistVideo){
                throw new TRPCError({ code : "NOT_FOUND" });
            }

            const [deletedPlaylistVideo] = await db.delete(playlistVideos).where(
                and(
                    eq(playlistVideos.playlistId, playlistId),
                    eq(playlistVideos.videoId, videoId),
                )
            ).returning();

            await db.update(playlists).set({ videosCount: sql`GREATEST(videos_count - 1, 0)` }).where(eq(playlists.id, playlistId));
            
            return deletedPlaylistVideo;

        }),

    getVideos: protectedProcedure
        .input(
            z.object({
                playlistId: z.uuid(),
                cursor: z
                    .object({
                        id: z.uuid(),
                        updatedAt: z.date(),
                    })
                    .nullish(),
                limit: z.number().min(1).max(100),
            })
        )
        .query(async ({ input, ctx }) => {
        const { cursor, limit, playlistId } = input;
        const { user: { id: userId } } = ctx;

        const [existingPlaylist] = await db
            .select()
            .from(playlists)
            .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));

        if (!existingPlaylist) {
            throw new TRPCError({
                code: "NOT_FOUND",
            });
        }

        const videosFromPlaylist = db.$with("playlist_videos").as(
            db
            .select({
                videoId: playlistVideos.videoId,
            })
            .from(playlistVideos)
            .where(eq(playlistVideos.playlistId, playlistId))
        );

        const data = await db
            .with(videosFromPlaylist)
            .select({
                ...getTableColumns(videos),
                user: users,
                viewCount: videoStats.viewCount,
                likeCount: videoStats.likeCount,
                dislikeCount: videoStats.dislikeCount,
            })
            .from(videos)
            .innerJoin(users, eq(videos.userId, users.id))
            .innerJoin(
                videosFromPlaylist,
                eq(videos.id, videosFromPlaylist.videoId)
            )
            .innerJoin(videoStats, eq(videoStats.videoId, videos.id))
            .where(
                and(
                    eq(videos.visibility, "public"),
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
            // Add 1 to the limit to check if there are more data
            .limit(limit + 1);

        const hasMore = data.length > limit;
        // Remove the last item if there is more data
        const items = hasMore ? data.slice(0, -1) : data;
        // Set the next cursor to the last item if there is more data
        const lastItem = items[items.length - 1];
        const nextCursor = hasMore
            ? {
                id: lastItem.id,
                updatedAt: lastItem.updatedAt,
            }
            : null;

        return { items, nextCursor };
    }),

    getOne: protectedProcedure
        .input(z.object({ id: z.uuid() }))
        .query(async ({ input, ctx }) => {
        const { id } = input;
        const { user: { id: userId } } = ctx;

        const [existingPlaylist] = await db
            .select()
            .from(playlists)
            .where(and(eq(playlists.id, id), eq(playlists.userId, userId)));

        if (!existingPlaylist) {
            throw new TRPCError({
                code: "NOT_FOUND",
            });
        }

        return existingPlaylist;
    }),
    remove: protectedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ input, ctx }) => {
        const { id } = input;
        const { user: { id: userId } } = ctx;

        const [deletedPlaylist] = await db
            .delete(playlists)
            .where(and(eq(playlists.id, id), eq(playlists.userId, userId)))
            .returning();

        if (!deletedPlaylist) {
            throw new TRPCError({
                code: "NOT_FOUND",
            });
        }

        return deletedPlaylist;
    }),

    
}) 