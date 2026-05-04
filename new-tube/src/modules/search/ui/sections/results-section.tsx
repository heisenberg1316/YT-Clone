"use client";

import { InfiniteScroll } from "@/components/infinite-scroll";
import { DEFAULT_LIMIT } from "@/constants";
import { useIsMobile } from "@/hooks/use-mobile";
import { VideoGridCard, VideoGridCardSkeleton } from "@/modules/videos/ui/components/video-grid-card";
import { VideoRowCard, VideoRowCardSkeleton } from "@/modules/videos/ui/components/video-row-card";
import { trpc } from "@/trpc/client";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface ResultsSectionProps {
    query : string | undefined;
    categoryId : string | undefined;
}

export const ResultsSectionSkeleton = () => {
    return (
        <div className="pt-11">
            <div className="flex flex-col gap-4 p-4 gap-y-10 md:hidden">
                {
                    
                    Array.from({ length : 5 }).map((_, index) => (
                        <VideoGridCardSkeleton key={index} />
                    ))
                }
            </div>
            <div className="hidden flex-col gap-4 md:flex">
                {
                    Array.from({ length : 5 }).map((_, index) => (
                        <VideoRowCardSkeleton key={index} />
                    ))
                }
            </div>
        </div>
    )
}

export const ResultsSection = (props : ResultsSectionProps) => {
    return (
        <Suspense fallback={<ResultsSectionSkeleton />}>
            <ErrorBoundary fallback={<p>error...</p>} >
                <ResultsSectionSuspense {...props} />
            </ErrorBoundary>
        </Suspense>
    ) 
};


export const ResultsSectionSuspense = ({ query, categoryId } : ResultsSectionProps) => {
    const [results, resultsQuery] = trpc.search.getMany.useSuspenseInfiniteQuery({query, categoryId, limit : DEFAULT_LIMIT}, {
        getNextPageParam : (lastPage) => lastPage.nextCursor,
    })
    
        
    return (
        <>
            <div className="pt-11">
                {/* Mobile */}
                <div className="flex flex-col gap-4 gap-y-10 md:hidden">
                    {results.pages.flatMap((page) => page.items).map(v => <VideoGridCard key={v.id} data={v} />)}
                </div>

                {/* Desktop */}
                <div className="hidden md:flex flex-col gap-4">
                    {results.pages.flatMap((page) => page.items).map(v => <VideoRowCard key={v.id} data={v} />)}
                </div>
            </div>
            <InfiniteScroll hasNextPage={resultsQuery.hasNextPage} isFetchingNextPage={resultsQuery.isFetchingNextPage} fetchNextPage={resultsQuery.fetchNextPage} />
        </>
    )
}