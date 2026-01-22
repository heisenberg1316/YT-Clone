import { DEFAULT_LIMIT } from "@/constants";
import { VideoView } from "@/modules/videos/ui/views/video-view";
import { HydrateClient, trpc } from "@/trpc/server";
import { notFound } from "next/navigation";


interface PageProps {
    params : Promise<{
        videoId : string;
    }>
}

const Page = async ({ params }: PageProps) => {
    const { videoId } = await params;

    try {
        // 1. Try to fetch the data
        await trpc.videos.getOne({ id: videoId });
        
        // 2. Hydrate the client if video exists
        await Promise.all([
            trpc.videos.getOne.prefetch({ id: videoId }),
            trpc.comments.getMany.prefetchInfinite({ videoId, limit: DEFAULT_LIMIT }),
            trpc.comments.getTotal.prefetch({ videoId }),
        ]);

    } catch (error: any) {
        /** * If tRPC throws an error, check the code.
         * If it's NOT_FOUND, show your custom not-found.tsx
         */
        const isNotFound = 
            error.code === "NOT_FOUND" || 
            error.cause?.code === "NOT_FOUND" ||
            error.shape?.code === -32004; // -32004 is the JSON-RPC code for Not Found

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