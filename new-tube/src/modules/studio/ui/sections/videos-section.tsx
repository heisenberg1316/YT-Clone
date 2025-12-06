"use client"

import { InfiniteScroll } from "@/components/infinite-scroll";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEFAULT_LIMIT } from "@/constants";
import { snakeCaseToTitle } from "@/lib/utils";
import { VideoThumbnail } from "@/modules/videos/ui/components/video-thumbnail";
import { trpc } from "@/trpc/client"
import { format } from "date-fns";
import { Globe2Icon, LockIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";


const VideosSectionSkeleton = () => {
    return (
        <>
            <div className="border-y">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="pl-6 w-[510px]">Video</TableHead>
                            <TableHead>Visibility</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="">Date</TableHead>
                            <TableHead className="text-right">Views</TableHead>
                            <TableHead className="text-right">Comments</TableHead>
                            <TableHead className="text-right pr-6">Likes</TableHead>
                        </TableRow>
                    </TableHeader> 

                    <TableBody>
                        {Array.from({ length : 5 }).map((_, index) => (
                            <TableRow key={index}>
                                <TableCell className="pl-6">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="h-20 w-36"/>
                                        <div className="flex flex-col gap-2">
                                            <Skeleton className="h-4 w-[100px]"/>
                                            <Skeleton className="h-3 w-[150px]"/>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-4 w-20" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-4 w-14" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-4 w-[86.7px]" />
                                </TableCell>
                                <TableCell className="">
                                    <Skeleton className="h-4 w-12 ml-auto px-2" />
                                </TableCell>
                                <TableCell className="">
                                    <Skeleton className="h-4 w-12 ml-auto" />
                                </TableCell>
                                <TableCell className="pr-6">
                                    <Skeleton className="h-4 w-12 ml-auto px-2" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    )
}

export const VideosSection = () => {
    return (
        <Suspense fallback={<VideosSectionSkeleton />}>
            <ErrorBoundary fallback={<p>Error</p>}>
                <VideosSectionSuspense />
            </ErrorBoundary>
        </Suspense>
    )
}


export const VideosSectionSuspense = () => {

    const [videos, query] = trpc.studio.getMany.useSuspenseInfiniteQuery({
        limit : DEFAULT_LIMIT,
    }, {
        getNextPageParam : (lastPage) => lastPage.nextCursor,
    });

    const router = useRouter(); 

    

    return (
        <div>
            <div className="border-y">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="pl-6 w-[510px]">Video</TableHead>
                            <TableHead>Visibility</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="">Date</TableHead>
                            <TableHead className="text-right">Views</TableHead>
                            <TableHead className="text-right">Comments</TableHead>
                            <TableHead className="text-right pr-6">Likes</TableHead>
                        </TableRow>
                    </TableHeader> 

                    <TableBody>
                        {videos.pages.flatMap((page) => page.items).map((video) => (
                            <TableRow key={video.id} className="cursor-pointer" onClick={() => router.push(`/studio/videos/${video.id}`)}>
                                <TableCell className="pl-6">
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-36 shrink-0">
                                            <VideoThumbnail imageUrl={video.thumbnailUrl} previewUrl={video.previewUrl} title={video.title} duration={video.duration || 0}/>
                                        </div>

                                        <div className="flex flex-col flex-1 max-w-[300px] overflow-hidden gap-y-1">
                                            <p className="text-sm truncate">{video.title}</p>
                                            <span className="text-xs text-muted-foreground line-clamp-1">{video.description || "No description"}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center">
                                        {video.visibility === "private" ?
                                            <LockIcon className="size-4 mr-2" />
                                            : 
                                            <Globe2Icon className="size-4 mr-2" />
                                        }
                                        {snakeCaseToTitle(video.visibility)}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center">
                                        {snakeCaseToTitle(video.muxStatus || "Error")}
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm truncate">
                                    {format(new Date(video.createdAt), "d MMM yyyy")}
                                </TableCell>
                                <TableCell className="text-right">views</TableCell>
                                <TableCell className="text-right">comments</TableCell>
                                <TableCell className="text-right pr-6">likes</TableCell>
                            </TableRow>
                        ))}
                    </TableBody> 
                </Table>
            </div>

            
            <InfiniteScroll hasNextPage={query.hasNextPage} isFetchingNextPage={query.isFetchingNextPage} fetchNextPage={query.fetchNextPage}/> 
        </div>
    )
}

