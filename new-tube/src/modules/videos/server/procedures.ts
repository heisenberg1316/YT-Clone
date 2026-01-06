import { db } from "@/db";
import { subscriptions, users, videoReactions, videos, videoUpdateSchema, videoViews } from "@/db/schema";
import { mux } from "@/lib/mux";
import { workflow } from "@/lib/workflow";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, getTableColumns, inArray, isNotNull } from "drizzle-orm";
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
            muxStatus : "waiting",
            muxUploadId : upload.id,
        }).returning();

        return {
            video : video,
            url : upload.url,
        }
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

            const [removedVideo] = await db.delete(videos).where(
                and(
                    eq(videos.id, input.id),
                    eq(videos.userId, userId),
                )
            ).returning();

            if(!removedVideo){
                throw new TRPCError({ code : "NOT_FOUND" });
            }

            //VERY IMPORTANT :------>       video delete from mux also reamining

            return removedVideo;
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

            const [updatedVideo] = await db.update(videos).set({ thumbnailUrl }).where(
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

    getOne : baseProcedure
        .input(z.object({ id : z.uuid() }))
        .query(async ({ input, ctx }) => {


            const { clerkUserId } = ctx;
            let userId;

            const [user] = await db.select().from(users).where(inArray(users.clerkId, clerkUserId ? [clerkUserId] : []))

            if(user){
                userId = user.id;
            }

            const viewerReactions = db.$with("viewer_reactions").as(
                db.select({
                    videoId : videoReactions.videoId,
                    type : videoReactions.type
                }).from(videoReactions).where(inArray(videoReactions.userId, userId ? [userId] : []))
            )

            const viewerSubscriptions = db.$with("viewer_subscriptions").as(
                db.select().from(subscriptions).where(inArray(subscriptions.viewerId, userId ? [userId] : []))
            )

            const [existingVideo] = await db.with(viewerReactions, viewerSubscriptions).select({
                ...getTableColumns(videos),
                user : {
                    ...getTableColumns(users),  
                    subscriberCount : db.$count(subscriptions, eq(subscriptions.creatorId, users.id)),
                    viewerSubscribed : isNotNull(viewerSubscriptions.viewerId).mapWith(Boolean),
                },
                viewCount : db.$count(videoViews, eq(videoViews.videoId, videos.id)),
                likeCount : db.$count(videoReactions,
                    and(
                        eq(videoReactions.videoId, videos.id),
                        eq(videoReactions.type, "like"),
                    ),
                ),
                dislikeCount : db.$count(videoReactions,
                    and(
                        eq(videoReactions.videoId, videos.id),
                        eq(videoReactions.type, "dislike"),
                    ),
                ),
                viewerReaction : viewerReactions.type,
            })
            .from(videos)
            .innerJoin(users, eq(videos.userId, users.id))
            .leftJoin(viewerReactions, eq(viewerReactions.videoId, videos.id))
            .leftJoin(viewerSubscriptions, eq(viewerSubscriptions.creatorId, users.id))
            .where(eq(videos.id, input.id))
            // .groupBy(
            //     videos.id,
            //     users.id,
            //     viewerReactions.type,
            // )

            if(!existingVideo){
                throw new TRPCError({ code : "NOT_FOUND" });
            } 

            return existingVideo;
        })

    
}) 