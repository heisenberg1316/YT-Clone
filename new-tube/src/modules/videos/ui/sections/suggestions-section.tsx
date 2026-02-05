"use client"

import { DEFAULT_LIMIT } from "@/constants"
import { trpc } from "@/trpc/client"
import { VideoRowCard, VideoRowCardSkeleton } from "../components/video-row-card"
import { VideoGridCard, VideoGridCardSkeleton } from "../components/video-grid-card"
import { InfiniteScroll } from "@/components/infinite-scroll"
import { ErrorBoundary } from "react-error-boundary"
import { Suspense } from "react"

interface SuggestionsSectionProps {
  videoId : string,
  isManual ?: boolean,
}

const SuggestionsSectionSkeleton = () => {
    return (
        <>
            <div className="hidden xl:block space-y-3">
                {
                    Array.from({ length: 6 }).map((_, i) => (
                        <VideoRowCardSkeleton key={i} size="compact" />
                    ))
                }
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:hidden gap-4">
                {
                    Array.from({ length: 6 }).map((_, i) => (
                        <VideoGridCardSkeleton key={i} />
                    ))
                }
            </div>
        </>
    )
}

export const SuggestionsSection = ({ videoId, isManual } : SuggestionsSectionProps) => {
    return (
        <Suspense fallback={<SuggestionsSectionSkeleton />}>
            <ErrorBoundary fallback={<p>Error</p>}>
                <SuggestionsSectionSuspense videoId={videoId} isManual={isManual} />
            </ErrorBoundary>
        </Suspense>
    )
}


const SuggestionsSectionSuspense = ({ videoId, isManual } : SuggestionsSectionProps) => {
    const [suggestions, query] = trpc.suggestions.getMany.useSuspenseInfiniteQuery({
        videoId,
        limit : DEFAULT_LIMIT   
    },{
        getNextPageParam : (lastPage) => lastPage.nextCursor,
    })

    return (
        <>
            <div className="hidden xl:block space-y-3">          
                {suggestions.pages.flatMap((page) => page.items.map(( video ) => (
                    <VideoRowCard key={video.id} data={video} size={"compact"}/>
                )))}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:hidden gap-4">
                {suggestions.pages.flatMap((page) => page.items.map(( video ) => (
                    <VideoGridCard key={video.id} data={video} />
                )))}
            </div>
            <InfiniteScroll isManual hasNextPage={query.hasNextPage} isFetchingNextPage={query.isFetchingNextPage} fetchNextPage={query.fetchNextPage} />
        </>
    )
}

export default SuggestionsSection