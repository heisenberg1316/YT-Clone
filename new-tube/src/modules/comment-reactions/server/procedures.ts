import { db } from "@/db";
import { commentReactions, commentStats, videoReactions } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import z from "zod";


export const commentReactionsRouter = createTRPCRouter({
    like: protectedProcedure
        .input(z.object({ commentId: z.uuid() }))
        .mutation(async ({ input, ctx }) => {
            const { commentId } = input;
            const userId = ctx.user.id;

            try{
                return await db.transaction(async (tx) => {
                      const existing = await tx
                        .select({ type: commentReactions.type })
                        .from(commentReactions)
                        .where(
                        and(
                            eq(commentReactions.userId, userId),
                            eq(commentReactions.commentId, commentId),
                        ),
                        )
                        .limit(1)
                        .for("update");
        
                    const previousType = existing[0]?.type ?? null;
        
                    if (previousType && previousType === "like") {
                        // Try to delete existing like (toggle off)
                        const deleted = await tx
                        .delete(commentReactions)
                        .where(
                            and(
                                eq(commentReactions.userId, userId),
                                eq(commentReactions.commentId, commentId),
                                eq(commentReactions.type, "like"),
                            ),
                        );
        
                        // decrease likeCount
                        await tx
                        .update(commentStats)
                        .set({ likeCount: sql`GREATEST(like_count - 1, 0)` })
                        .where(eq(commentStats.commentId, commentId));

        
                        return { action: "removed" };
                    }
        
                    // Upsert like (insert or convert dislike → like)
                    const result = await tx
                        .insert(commentReactions)
                        .values({ userId, commentId, type: "like" })
                        .onConflictDoUpdate({
                            target: [commentReactions.userId, commentReactions.commentId],
                            set: { type: "like", updatedAt: new Date() },
                        });
        
                    // Update stats (increment likeCount, decrement dislikeCount if needed)
                    await tx
                        .update(commentStats)
                        .set({
                        likeCount: sql`like_count + 1`,
                        dislikeCount: previousType
                            ? sql`GREATEST(dislike_count - 1, 0)`
                            : sql`dislike_count`,
                        })
                        .where(eq(commentStats.commentId, commentId));
        
                    return { action: "added" };

                   
                }
            )}
            catch(err){
                console.error("❌ like error:", err);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to like the comment",
                    cause: err,
                })
            }
        }),
   dislike: protectedProcedure
        .input(z.object({ commentId: z.uuid() }))
        .mutation(async ({ input, ctx }) => {
            const { commentId } = input;
            const userId = ctx.user.id;

            try{
                return await db.transaction(async (tx) => {
                      const existing = await tx
                        .select({ type: commentReactions.type })
                        .from(commentReactions)
                        .where(
                            and(
                                eq(commentReactions.userId, userId),
                                eq(commentReactions.commentId, commentId),
                            ),
                        )
                        .limit(1)
                        .for("update");
        
                    const previousType = existing[0]?.type ?? null;
        
                    if (previousType && previousType === "dislike") {
                        // Try to delete existing dislike (toggle off)
                        const deleted = await tx
                        .delete(commentReactions)
                        .where(
                            and(
                                eq(commentReactions.userId, userId),
                                eq(commentReactions.commentId, commentId),
                                eq(commentReactions.type, "dislike"),
                            ),
                        );
        
                        // decrease likeCount
                        await tx
                        .update(commentStats)
                        .set({ dislikeCount: sql`GREATEST(dislike_count - 1, 0)` })
                        .where(eq(commentStats.commentId, commentId));
        
                        return { action: "removed" };
                    }
        
                    // Upsert dislike (insert or convert like → dislike)
                    const result = await tx
                        .insert(commentReactions)
                        .values({ userId, commentId, type: "dislike" })
                        .onConflictDoUpdate({
                            target: [commentReactions.userId, commentReactions.commentId],
                            set: { type: "dislike", updatedAt: new Date() },
                        });
        
                    // Update stats (increment likeCount, decrement dislikeCount if needed)
                    await tx
                        .update(commentStats)
                        .set({
                            dislikeCount: sql`dislike_count + 1`,
                            likeCount: previousType
                                ? sql`GREATEST(like_count - 1, 0)`
                                : sql`like_count`,
                        })
                        .where(eq(commentStats.commentId, commentId));
        
                    return { action: "added" };
                   
                }
            )}
            catch(err){
                console.error("❌ like error:", err);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to dislike the comment",
                    cause: err,
                })
            }
        }),
    
})