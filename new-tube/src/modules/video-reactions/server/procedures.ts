import { db } from "@/db";
import { videoReactions, videoStats } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import z from "zod";

//logic wrong here
export const videoReactionsRouter = createTRPCRouter({
  like: protectedProcedure
    .input(z.object({ videoId: z.uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { videoId } = input;
      const userId = ctx.user.id;
      try {
        return await db.transaction(async (tx) => {
            const existing = await tx
              .select({ type: videoReactions.type })
              .from(videoReactions)
              .where(
                and(
                  eq(videoReactions.userId, userId),
                  eq(videoReactions.videoId, videoId),
                ),
              )
              .limit(1)
              .for("update");

            const previousType = existing[0]?.type ?? null;

            if (previousType && previousType === "like") {
              // Try to delete existing like (toggle off)
              const deleted = await tx
                .delete(videoReactions)
                .where(
                  and(
                    eq(videoReactions.userId, userId),
                    eq(videoReactions.videoId, videoId),
                    eq(videoReactions.type, "like"),
                  ),
                );

              // decrease likeCount
              await tx
                .update(videoStats)
                .set({ likeCount: sql`GREATEST(like_count - 1, 0)` })
                .where(eq(videoStats.videoId, videoId));

              return { action: "removed" };
            }

            // Upsert like (insert or convert dislike → like)
            const result = await tx
              .insert(videoReactions)
              .values({ userId, videoId, type: "like" })
              .onConflictDoUpdate({
                target: [videoReactions.userId, videoReactions.videoId],
                set: { type: "like", updatedAt: new Date() },
              });

            // Update stats (increment likeCount, decrement dislikeCount if needed)
            await tx
              .update(videoStats)
              .set({
                likeCount: sql`like_count + 1`,
                dislikeCount: previousType
                  ? sql`GREATEST(dislike_count - 1, 0)`
                  : sql`dislike_count`,
              })
              .where(eq(videoStats.videoId, videoId));

            return { action: "added" };
        });
      } catch (err) {
        console.error("❌ like error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to like the video",
          cause: err,
        });
      }
    }),

  dislike: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { videoId } = input;
      const userId = ctx.user.id;
      try {
        return await db.transaction(async (tx) => {
          const existing = await tx
            .select({ type: videoReactions.type })
            .from(videoReactions)
            .where(
              and(
                eq(videoReactions.userId, userId),
                eq(videoReactions.videoId, videoId),
              ),
            )
            .limit(1)
            .for("update");

          const previousType = existing[0]?.type ?? null;

          if (previousType && previousType === "dislike") {
            // Try to delete existing dislike (toggle off)
            const deleted = await tx
              .delete(videoReactions)
              .where(
                and(
                  eq(videoReactions.userId, userId),
                  eq(videoReactions.videoId, videoId),
                  eq(videoReactions.type, "dislike"),
                ),
              );

            // decrease dislikeCount
            await tx
              .update(videoStats)
              .set({ dislikeCount: sql`GREATEST(dislike_count - 1, 0)` })
              .where(eq(videoStats.videoId, videoId));

            return { action: "removed" };
          }

          // Upsert dislike (insert or convert like → dislike)
          await tx
            .insert(videoReactions)
            .values({ userId, videoId, type: "dislike" })
            .onConflictDoUpdate({
              target: [videoReactions.userId, videoReactions.videoId],
              set: { type: "dislike", updatedAt: new Date() },
            });

          // Update stats (increment dislikeCount, decrement likeCount if needed)
          await tx
            .update(videoStats)
            .set({
              dislikeCount: sql`dislike_count + 1`,
              likeCount: previousType
                ? sql`GREATEST(like_count - 1, 0)`
                : sql`like_count`,
            })
            .where(eq(videoStats.videoId, videoId));

          return { action: "added" };
        });
      } 
      catch (err) {
          console.error("❌ like error:", err);
          throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to dislike the video",
              cause: err,
          });
      }
    }),
});
