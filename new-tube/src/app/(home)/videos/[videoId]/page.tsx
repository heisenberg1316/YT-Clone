import { DEFAULT_LIMIT } from "@/constants";
import { VideoView } from "@/modules/videos/ui/views/video-view";
import { HydrateClient, trpc } from "@/trpc/server";


interface PageProps {
    params : Promise<{
        videoId : string;
    }>
}

const Page = async ({ params } : PageProps) => {

    const { videoId } = await params;
    await trpc.videos.getOne.prefetch({ id : videoId });
    await trpc.comments.getMany.prefetchInfinite({ videoId, limit : DEFAULT_LIMIT });
    await trpc.comments.getTotal.prefetch({ videoId });

    return (
        <HydrateClient>
            <VideoView videoId={videoId} />
        </HydrateClient>
    )
}

export default Page;