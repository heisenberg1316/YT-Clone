"use client";

import { InfiniteScroll } from "@/components/infinite-scroll";
import { DEFAULT_LIMIT } from "@/constants";
import { VideoGridCard, VideoGridCardSkeleton } from "@/modules/videos/ui/components/video-grid-card";
import { trpc } from "@/trpc/client";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";


const TrendingVideosSectionSkeleton = () => {
    return (
        <div className="gap-4 gap-y-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 [@media(min-width:1920px)]:grid-cols-4">
            {
                Array.from({length : 16}).map((_, index) => (
                    <VideoGridCardSkeleton key={index} />
                ))
            }
        </div>
    )
}

export const TrendingVideosSection = () => {
    return (
        <Suspense  fallback={<TrendingVideosSectionSkeleton />}>
            <ErrorBoundary fallback={<p>Error...</p>} >
                <TrendingVideosSectionSuspense  />
            </ErrorBoundary>
        </Suspense>
    )
}


const TrendingVideosSectionSuspense = () => {
    const [videos, query] = trpc.videos.getManyTrending.useSuspenseInfiniteQuery({ limit : DEFAULT_LIMIT }, {
        getNextPageParam : (lastPage) => lastPage.nextCursor,
    });

    return (
        <div>
            <div className="gap-4 gap-y-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 [@media(min-width:1920px)]:grid-cols-4">
                {
                    videos.pages.flatMap((page) => page.items).map((video) => (
                        <VideoGridCard key={video.id} data={video} />
                    ))
                }
            </div>
             <InfiniteScroll hasNextPage={query.hasNextPage} isFetchingNextPage={query.isFetchingNextPage} fetchNextPage={query.fetchNextPage} />
        </div>
    )
}


