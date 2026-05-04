import { DEFAULT_LIMIT } from "@/constants";
import { VideoView } from "@/modules/videos/ui/views/video-view";
import { HydrateClient, trpc } from "@/trpc/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
    params : Promise<{
        videoId : string;
    }>
}

const Page = async ({ params }: PageProps) => {
    const { videoId } = await params;

    try {        
        //to check exists or not
        let result = await trpc.videos.getOne({ id: videoId });
    
        await Promise.all([
            trpc.videos.getOne.prefetch({ id: videoId }),
            trpc.comments.getMany.prefetchInfinite({ videoId, limit: DEFAULT_LIMIT }),
            trpc.comments.getTotal.prefetch({ videoId }),
            trpc.suggestions.getMany.prefetchInfinite({ videoId, limit: DEFAULT_LIMIT }),
        ]);

    } catch (error: any) {
        /** * If tRPC throws an error, check the code.
         * If it's NOT_FOUND, show your custom not-found.tsx
         */
        const isNotFound = 
            error.code === "NOT_FOUND" || 
            error.code === "BAD_REQUEST";            

        if (isNotFound) {
            return notFound();
        }
        
        // For other errors (database down, etc.), trigger error.tsx
        throw error;
    }

    return (
        <HydrateClient>
            <VideoView videoId={videoId} />
        </HydrateClient>
    );
}

export default Page;