import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils"
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"
import { useClerk, useUser } from "@clerk/nextjs";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";

interface videoReactionsProps {
    videoId : string;
}

export const VideoReactions = ({ videoId } : videoReactionsProps) => {

    const clerk = useClerk();
    const utils = trpc.useUtils();
    const {user} = useUser();
    const { data: video } = trpc.videos.getOne.useQuery(
        { id: videoId },
        { staleTime: Infinity }
    );

    if (!video) return null;


    const like = trpc.videoReactions.like.useMutation({
        onMutate: async () => {
            await utils.videos.getOne.cancel({ id: videoId });

            const previous = utils.videos.getOne.getData({ id: videoId });

            utils.videos.getOne.setData({ id: videoId }, (old) => {
                if (!old) return old;

                const wasLiked = old.viewerReaction === "like";
                const wasDisliked = old.viewerReaction === "dislike";

                return {
                    ...old,
                    likeCount: wasLiked ? old.likeCount - 1 : old.likeCount + 1,
                    dislikeCount: wasDisliked ? old.dislikeCount - 1 : old.dislikeCount,
                    viewerReaction: wasLiked ? null : "like",
                };
            });

            return { previous };
        },

        onError: (err, _, ctx) => {
            utils.videos.getOne.setData(
                { id: videoId },
                ctx?.previous
            );

            toast.error("Something went wrong");

        },
    });


    const dislike = trpc.videoReactions.dislike.useMutation({
        onMutate: async () => {
            await utils.videos.getOne.cancel({ id: videoId });

            const previous = utils.videos.getOne.getData({ id: videoId });

            utils.videos.getOne.setData({ id: videoId }, (old) => {
                if (!old) return old;

                const wasDisliked = old.viewerReaction === "dislike";
                const wasLiked = old.viewerReaction === "like";

                return {
                    ...old,
                    dislikeCount: wasDisliked ? old.dislikeCount - 1 : old.dislikeCount + 1,
                    likeCount: wasLiked ? old.likeCount - 1 : old.likeCount,
                    viewerReaction: wasDisliked ? null : "dislike",
                };
            });

            return { previous };
        },

        onError: (err, _, ctx) => {
            utils.videos.getOne.setData(
                { id: videoId },
                ctx?.previous
            );

            toast.error("Something went wrong");

        },
    });

    const handleLike = () => {
        if (!user) {
            clerk.openSignIn();
            return;
        }

        like.mutate({ videoId : videoId });
    };

     const handleDislike = () => {
        if (!user) {
            clerk.openSignIn();
            return;
        }

        dislike.mutate({ videoId : videoId });
    };


    return (
        <div className="flex items-center flex-none">
            <Button onClick={() => {handleLike()}} disabled={like.isPending || dislike.isPending} variant="secondary" className="cursor-pointer hover:bg-ring rounded-l-full rounded-r-none gap-2 pr-4">
                <ThumbsUpIcon className={cn("size-5", video.viewerReaction === "like" && "fill-current")} />
                {video.likeCount}
            </Button>
            <Separator orientation="vertical"/>
            <Button onClick={() => {handleDislike()}} disabled={like.isPending || dislike.isPending}  variant="secondary" className="cursor-pointer hover:bg-ring rounded-l-none rounded-r-full pl-3">
                <ThumbsDownIcon className={cn("size-5", video.viewerReaction === "dislike" && "fill-current")}/>
                {video.dislikeCount}
            </Button>
        </div>
    )
}