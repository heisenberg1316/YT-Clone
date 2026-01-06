import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils"
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"

import { VideoGetOneOutput } from "../../types";
import { useClerk } from "@clerk/nextjs";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";

interface videoReactionsProps {
    videoId : string;
    likes : number;
    dislikes : number;
    viewerReaction : VideoGetOneOutput["viewerReaction"];
}

export const VideoReactions = ({ videoId, likes, dislikes, viewerReaction } : videoReactionsProps) => {

    const clerk = useClerk();
    const utils = trpc.useUtils();

    const like = trpc.videoReactions.like.useMutation({
        onSuccess : () => {
            utils.videos.getOne.invalidate({ id : videoId });
        },
        onError : (err) =>  {
            toast.error("Something went wrong");
            if(err.data?.code === "UNAUTHORIZED"){
                clerk.openSignIn();
            }
        }
    });

    const dislike = trpc.videoReactions.dislike.useMutation({
        onSuccess : () => {
            utils.videos.getOne.invalidate({ id : videoId });
        },
        onError : (err) =>  {
            toast.error("Something went wrong");
            if(err.data?.code === "UNAUTHORIZED"){
                clerk.openSignIn();
            }
        }
    });

    return (
        <div className="flex items-center flex-none">
            <Button onClick={() => like.mutate({ videoId })} disabled={like.isPending || dislike.isPending} variant="secondary" className="cursor-pointer hover:bg-gray-200 rounded-l-full rounded-r-none gap-2 pr-4">
                <ThumbsUpIcon className={cn("size-5", viewerReaction === "like" && "fill-black")} />
                {likes}
            </Button>
            <Separator orientation="vertical"/>
            <Button onClick={() => dislike.mutate({ videoId })} disabled={like.isPending || dislike.isPending}  variant="secondary" className="cursor-pointer hover:bg-gray-200 rounded-l-none rounded-r-full pl-3">
                <ThumbsDownIcon className={cn("size-5", viewerReaction === "dislike" && "fill-black")}/>
                {dislikes}
            </Button>
        </div>
    )
}