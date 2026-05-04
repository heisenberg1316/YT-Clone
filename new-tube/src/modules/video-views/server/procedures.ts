import { db } from "@/db";
import { videoStats, videoViews } from "@/db/schema";
import { authedOptionalProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import z from "zod";

export const videoViewsRouter = createTRPCRouter({
  create: authedOptionalProcedure
    .input(
      z.object({
        videoId: z.uuid(),
        viewerFingerprint: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { videoId, viewerFingerprint } = input;
      const userId = ctx.user?.id ?? null;
      const now = new Date();

      // cooldown duration (10 minutes)
      const COOLDOWN_MS = 10 * 60 * 1000;
      const cooldownThreshold = new Date(Date.now() - COOLDOWN_MS);

      try {
        return await db.transaction(async (tx) => {
          /**
           * 1️⃣ Try fresh insert
           */
          const inserted = await tx
            .insert(videoViews)
            .values({
              videoId,
              userId,
              viewerFingerprint,
              lastViewedAt: now,
            })
            .onConflictDoNothing()
            .returning({ id: videoViews.id });

          if (inserted.length > 0) {
            await tx
              .update(videoStats)
              .set({ viewCount: sql`${videoStats.viewCount} + 1` })
              .where(eq(videoStats.videoId, videoId));

            return { counted: true, message: "counted: fresh insert" };
          }

          /**
           * 2️⃣ Existing viewer:
           *    Atomic cooldown check + update
           */
          const updated = await tx
            .update(videoViews)
            .set({ lastViewedAt: now })
            .where(
              and(
                eq(videoViews.videoId, videoId),
                userId
                  ? eq(videoViews.userId, userId)
                  : eq(videoViews.viewerFingerprint, viewerFingerprint),
                sql`${videoViews.lastViewedAt} <= ${cooldownThreshold.toISOString()}`,
              ),
            )
            .returning({ id: videoViews.id });

          /**
           * 3️⃣ If cooldown passed → increment viewCount
           */
          if (updated.length > 0) {
            await tx
              .update(videoStats)
              .set({ viewCount: sql`${videoStats.viewCount} + 1` })
              .where(eq(videoStats.videoId, videoId));

            return {
              counted: true,
              message: "counted: cooldown passed — incremented",
            };
          }

          /**
           * 4️⃣ Cooldown active → refresh timestamp (anti-loop abuse)
           */
          await tx
            .update(videoViews)
            .set({ lastViewedAt: now })
            .where(
              and(
                eq(videoViews.videoId, videoId),
                userId
                  ? eq(videoViews.userId, userId)
                  : eq(videoViews.viewerFingerprint, viewerFingerprint),
              ),
            );

          return { counted: false, message: "Too soon — cooldown active" };
        });
      }
      catch (err) {
          console.error("❌ View count error:", err);
          throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to count view",
              cause: err,
          });
      }
    }),
});

