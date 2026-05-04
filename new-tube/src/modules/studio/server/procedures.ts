import { db } from "@/db";
import { users, videos, videoStats } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, lt, or, desc, getTableColumns } from "drizzle-orm";
import { z } from "zod";

export const studioRouter = createTRPCRouter({

    getOne : protectedProcedure
        .input(
            z.object({
                id : z.uuid(),
            })
        )
        .query(async ({ ctx, input}) => {
            const { id : userId } = ctx.user;
            const { id } = input;

            const [video] = await db
                    .select()
                    .from(videos)
                    .where(
                        and(
                            eq(videos.id, id),
                            eq(videos.userId, userId)
                        )
                    );

            if(!video){
                throw new TRPCError({ code : "NOT_FOUND" });
            }
            
            return video;

        }),

    getMany: protectedProcedure
        .input(
            z.object({
                cursor: z.object({
                        id: z.uuid(),
                        updatedAt: z.date(),
                    }).nullish(),

                limit: z.number().min(1).max(100), 
            })
        )
        .query(async ({ ctx, input }) => {
            const { cursor, limit } = input;
            const { id : userId } = ctx.user;
            
            // Fetch one extra item to determine whether there's a next page

            const data = await db
                    .select({
                        ...getTableColumns(videos),
                        user : users,
                        viewCount : videoStats.viewCount,
                        likeCount : videoStats.likeCount,
                        commentCount : videoStats.commentCount,
                    }) 
                    .from(videos)
                    .innerJoin(users, eq(users.id, videos.userId))
                    .innerJoin(videoStats, eq(videoStats.videoId, videos.id))
                    .where(
                        and(
                            eq(videos.userId, userId),
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
});
