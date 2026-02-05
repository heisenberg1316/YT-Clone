import { db } from "@/db";
import { users, videoReactions, videos, videoViews } from "@/db/schema";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, lt, or, desc, ilike, getTableColumns } from "drizzle-orm";
import { z } from "zod";

export const searchRouter = createTRPCRouter({
    getMany: baseProcedure
        .input(
            z.object({
                query : z.string().nullish(),
                categoryId : z.uuid().nullish(),
                cursor: z.object({
                        id: z.uuid(),
                        updatedAt: z.date(),
                    }).nullish(),

                limit: z.number().min(1).max(100), 
            })
        )
        .query(async ({ input }) => {
            const { cursor, limit, query, categoryId } = input;

            // Fetch one extra item to determine whether there's a next page
            const data = await db
                    .select({
                        ...getTableColumns(videos),
                        user : users,
                        viewCount : db.$count(videoViews, eq(videoViews.videoId, videos.id)),
                        likeCount : db.$count(videoReactions, and(
                            eq(videoReactions.videoId, videos.id),
                            eq(videoReactions.type, "like"))
                        ),
                        dislikeCount : db.$count(videoReactions, and(
                            eq(videoReactions.videoId, videos.id),
                            eq(videoReactions.type, "dislike"))
                        ),
                    }) 
                    .from(videos)
                    .innerJoin(users, eq(videos.userId, users.id))
                    .where(
                        and(
                            ilike(videos.title, `%${query}%`),
                            categoryId ? eq(videos.categoryId, categoryId) : undefined,
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
