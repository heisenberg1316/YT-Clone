"use client";

import { InfiniteScroll } from "@/components/infinite-scroll";
import { DEFAULT_LIMIT } from "@/constants";
import { trpc } from "@/trpc/client";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { PlaylistGridCard, PlaylistGridCardSkeleton } from "../components/playlist-grid-card";


const PlaylistsSectionSkeleton = () => {
    return (
        <>
            <div className="flex-col gap-4 gap-y-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 [@media(min-width:1920px)]:grid-cols-4">
                {
                    Array.from({length : 8}).map((_, index) => (
                        <PlaylistGridCardSkeleton key={index} />
                    ))
                }
            </div>
        </>
    )
}

export const PlaylistsSection = () => {
    return (
        <Suspense  fallback={<PlaylistsSectionSkeleton />}>
            <ErrorBoundary fallback={<p>Error...</p>} >
                <PlaylistsSectionSuspense  />
            </ErrorBoundary>
        </Suspense>
    )
}


const PlaylistsSectionSuspense = () => {
    const [playlists, query] = trpc.playlists.getMany.useSuspenseInfiniteQuery({ limit : DEFAULT_LIMIT }, {
        getNextPageParam : (lastPage) => lastPage.nextCursor,
    });

    return (
        <div>
            <div className="gap-4 gap-y-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 [@media(min-width:1920px)]:grid-cols-4">
                {
                    playlists.pages.flatMap((page) => page.items)
                    .map((playlist) => (
                        <PlaylistGridCard data={playlist} key={playlist.id} />
                    ))
                }
            </div>
             
             <InfiniteScroll hasNextPage={query.hasNextPage} isFetchingNextPage={query.isFetchingNextPage} fetchNextPage={query.fetchNextPage} />
        </div>
    )
}


