"use client";

import { InfiniteScroll } from "@/components/infinite-scroll";
import { DEFAULT_LIMIT } from "@/constants";
import CommentForm from "@/modules/comments/ui/components/comment-form";
import CommentItem from "@/modules/comments/ui/components/comment-item";
import { trpc } from "@/trpc/client";
import { Loader2Icon } from "lucide-react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface CommentsSectionProps{
  videoId : string;
}

export const CommentsSection = ({ videoId } : CommentsSectionProps) => {
    return (
        <Suspense fallback={<CommentSectionSkeleton />}>
            <ErrorBoundary fallback={<p>error...comments</p>}>
                <CommentsSectionSuspense videoId={videoId} />
            </ErrorBoundary>
        </Suspense>
    )
}

const CommentSectionSkeleton = () => {
    return (
        <div className="mt-6 flex justify-center items-center">
            <Loader2Icon className="text-muted-foreground size-7 animate-spin"/>
        </div>
    )
}

const CommentsSectionSuspense = ({ videoId } : CommentsSectionProps) => {

    const [comments, query] = trpc.comments.getMany.useSuspenseInfiniteQuery({ videoId, limit : DEFAULT_LIMIT }, {
        getNextPageParam : (lastPage) => lastPage.nextCursor,
    });

    const [totalComments] = trpc.comments.getTotal.useSuspenseQuery({ videoId });
    
    return (
        <div className="mt-6">
            <div className="flex flex-col gap-6">
                <h1 className="text-xl font-semibold">
                   {totalComments.count} comments
                </h1>
                <CommentForm videoId={videoId} />
                <div className="flex flex-col gap-4 mt-2 ">
                    {
                        comments.pages.flatMap((page) => page.items).map((comment) => (
                            <CommentItem key={comment.id} comment={comment}/>
                        ))
                    }
                    <InfiniteScroll hasNextPage={query.hasNextPage} isFetchingNextPage={query.isFetchingNextPage} fetchNextPage={query.fetchNextPage}/>
                </div>
            </div>
        </div>
    )
}

