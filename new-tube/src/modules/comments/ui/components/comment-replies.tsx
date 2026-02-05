import { DEFAULT_LIMIT } from "@/constants";
import { trpc } from "@/trpc/client";
import { CornerDownRightIcon, Loader2Icon } from "lucide-react";
import CommentItem from "./comment-item";
import { Button } from "@/components/ui/button";

interface CommentRepliesProps {
    parentId : string;
    videoId : string;
}
const RepliesLoader = () => (
    <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-2">
        <Loader2Icon className="size-4 animate-spin" />
        Loading replies...
    </div>
);


export const CommentReplies = ({ parentId, videoId }: CommentRepliesProps) => {
    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = trpc.comments.getMany.useInfiniteQuery(
        { limit: DEFAULT_LIMIT, videoId, parentId },
        
        {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
        }
    );

    return (
        <div className="ml-12.5">
            <div className="flex flex-col gap-2 mt-2">

                {/* First load */}
                {isLoading && <RepliesLoader />}

                {/* Replies */}
                {data?.pages
                    .flatMap((page) => page.items)
                    .map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            variant="reply"
                        />
                    ))}

                {/* Pagination loader */}
                {isFetchingNextPage && <RepliesLoader />}

            </div>

            {/* Load more button */}
            {hasNextPage && !isFetchingNextPage && (
                <Button
                    variant="tertiary"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => fetchNextPage()}
                >
                    <CornerDownRightIcon />
                    Show more replies
                </Button>
            )}
        </div>
    );
};
