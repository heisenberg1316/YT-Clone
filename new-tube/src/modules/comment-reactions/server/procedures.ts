import { db } from "@/db";
import { commentReactions, videoReactions } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { and, eq } from "drizzle-orm";
import z from "zod";


export const commentReactionsRouter = createTRPCRouter({
    like: protectedProcedure
        .input(z.object({ commentId: z.uuid() }))
        .mutation(async ({ input, ctx }) => {
            const { commentId } = input;
            const userId = ctx.user.id;

            // Try delete first
            const deleted = await db
                .delete(commentReactions)
                .where(
                    and(
                        eq(commentReactions.userId, userId),
                        eq(commentReactions.commentId, commentId),
                        eq(commentReactions.type, "like")
                    )
                );

            // If row was deleted → it was already liked
            if (deleted.rowCount > 0) {
                return { action: "removed" };
            }

            // Otherwise upsert like
            await db
            .insert(commentReactions)
            .values({ userId, commentId, type: "like" })
            .onConflictDoUpdate({
                target: [commentReactions.userId, commentReactions.commentId],
                set: { type: "like" },
            });

            return { action: "added" };
        }),


   dislike: protectedProcedure
        .input(z.object({ commentId: z.uuid() }))
        .mutation(async ({ input, ctx }) => {
            const { commentId } = input;
            const userId = ctx.user.id;

            // Try delete first (toggle off dislike)
            const deleted = await db
                .delete(commentReactions)
                .where(
                    and(
                        eq(commentReactions.userId, userId),
                        eq(commentReactions.commentId, commentId),
                        eq(commentReactions.type, "dislike")
                    )   
                );

            // If row was deleted → it was already disliked
            if (deleted.rowCount > 0) {
                return { action: "removed" };
            }

            // Otherwise upsert dislike (also converts like → dislike)
            await db
            .insert(commentReactions)
            .values({ userId, commentId, type: "dislike" })
            .onConflictDoUpdate({
                target: [commentReactions.userId, commentReactions.commentId],
                set: { type: "dislike" },
            });

            return { action: "added" };
        }),
    
})