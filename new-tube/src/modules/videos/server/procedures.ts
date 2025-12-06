import { db } from "@/db";
import { videos } from "@/db/schema";
import { mux } from "@/lib/mux";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";


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
}) 