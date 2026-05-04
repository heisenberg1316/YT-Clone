"use client";

import { InfiniteScroll } from "@/components/infinite-scroll";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_LIMIT } from "@/constants";
import { VideoGridCard, VideoGridCardSkeleton } from "@/modules/videos/ui/components/video-grid-card";
import { VideoRowCard, VideoRowCardSkeleton } from "@/modules/videos/ui/components/video-row-card";
import { trpc } from "@/trpc/client";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";

interface Props {
  playlistId: string;
}

export const VideosSection = ({ playlistId }: Props) => {
    return (
        <Suspense fallback={<VideosSectionSkeleton />}>
        <ErrorBoundary fallback={<p>Something went wrong</p>}>
            <VideosSectionSuspense playlistId={playlistId} />
        </ErrorBoundary>
        </Suspense>
    );
};

const VideosSectionSkeleton = () => {
    return (
        <>
            <div className="flex flex-col gap-4 gap-y-10 md:hidden">
                {
                    Array.from({length : 8}).map((_, index) => (
                        <VideoGridCardSkeleton key={index} />
                    ))
                }
            </div>
            <div className="hidden flex-col gap-4 md:flex">
            {
                Array.from({length : 8}).map((_, index) => (
                    <VideoRowCardSkeleton key={index} size={"compact"} />
                ))
            }
            </div>
        
        </>
    )
}

const VideosSectionSuspense = ({ playlistId }: Props) => {
    const utils = trpc.useUtils();
    const [videos, query] = trpc.playlists.getVideos.useSuspenseInfiniteQuery(
        {
            playlistId,
            limit: DEFAULT_LIMIT,
        },
        {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
        }
    );

    const removeVideo = trpc.playlists.removeVideo.useMutation({
        onSuccess: (data) => {
            toast.success("Video removed from playlist");
            utils.playlists.getManyForVideo.invalidate({
                videoId: data.videoId,
            });
            utils.playlists.getOne.invalidate({ id: data.playlistId });
            utils.playlists.getVideos.invalidate({
                playlistId: data.playlistId,
            });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    return (
        <div>
        <div className="flex flex-col gap-4 gap-y-10 md:hidden">
            {videos.pages
            .flatMap((page) => page.items)
            .map((video) => (
                <VideoGridCard
                key={video.id}
                data={video}
                onRemove={() =>
                    removeVideo.mutate({ playlistId, videoId: video.id })
                }
                isRemoving={removeVideo.isPending}
                />
            ))}
        </div>
        <div className="hidden md:flex flex-col gap-4 gap-y-10">
            {videos.pages
            .flatMap((page) => page.items)
            .map((video) => (
                <VideoRowCard
                key={video.id}
                data={video}
                size="compact"
                onRemove={() =>
                    removeVideo.mutate({ playlistId, videoId: video.id })
                }
                isRemoving={removeVideo.isPending}
                />
            ))}
        </div>
        <InfiniteScroll
            hasNextPage={query.hasNextPage}
            isFetchingNextPage={query.isFetchingNextPage}
            fetchNextPage={query.fetchNextPage}
        />
        </div>
    );
};