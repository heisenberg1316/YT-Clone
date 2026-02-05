import { CommentGetManyOutput } from '../../types'
import Link from 'next/link'
import { UserAvatar } from '@/components/user-avatar'
import { formatDistanceToNow } from 'date-fns'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon, ChevronUpIcon, MessagesSquareIcon, MoreVerticalIcon, ThumbsDownIcon, ThumbsUpIcon, Trash2Icon } from 'lucide-react'
import { useAuth, useClerk, useUser } from '@clerk/nextjs'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { DEFAULT_LIMIT } from '@/constants'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import CommentForm from './comment-form'
import { CommentReplies } from './comment-replies'

interface CommentItemProps {
    comment : CommentGetManyOutput["items"][number],
    variant ?: "reply" | "comment",
}

const CommentItem = ({ comment, variant = "comment" } : CommentItemProps) => {

    const {userId} = useAuth();
    const {user} = useUser();
    const clerk = useClerk();
    const utils = trpc.useUtils();

    const [isReplyOpen, setIsReplyOpen] = useState(false);
    const [isRepliesOpen, setIsRepliesOpen] = useState(false);
    const [isReplyPending, setIsReplyPending] = useState(false);

   
    const remove = trpc.comments.remove.useMutation({
        onMutate: async ({ id }) => {
            // Cancel ongoing fetches
            await utils.comments.getMany.cancel({ videoId : comment.videoId, limit: DEFAULT_LIMIT });
            if(comment.parentId){
                await utils.comments.getMany.cancel({ videoId : comment.videoId, parentId : comment.parentId, limit: DEFAULT_LIMIT });
            }

            // Snapshot previous cache
            const previousMain =
            utils.comments.getMany.getInfiniteData({ videoId : comment.videoId, limit: DEFAULT_LIMIT });
            const previousReplies = comment.parentId ? utils.comments.getMany.getInfiniteData({ videoId : comment.videoId, parentId : comment.parentId, limit: DEFAULT_LIMIT }) : undefined;

            const previousTotal =
            utils.comments.getTotal.getData({ videoId : comment.videoId });

            // Optimistically remove comment and decrement parent replies count if it is a reply
            let removedParentId : string | null = null;
            let totalReplies : number = 0;
            if(comment.parentId){
                utils.comments.getMany.setInfiniteData(
                    { videoId : comment.videoId, parentId : comment.parentId, limit: DEFAULT_LIMIT },
                    (old) => {
                        if (!old) return old;
                        return {
                            ...old,
                            pages: old.pages.map(page => ({
                                ...page,
                                items: page.items.filter(comment => {
                                    if(comment.id === id){
                                        removedParentId = comment.parentId;
                                        return false; // remove this comment
                                    }
                                    return true;
                                }),
                            })),
                        };
                    }
                );
                //update the replies count
                utils.comments.getMany.setInfiniteData(
                    { videoId : comment.videoId, limit: DEFAULT_LIMIT },
                    (old) => {
                        if (!old) return old;
                        return {
                            ...old,
                            pages: old.pages.map(page => ({
                                ...page,
                                items: page.items.map(comment => {
                                    if (comment.id === removedParentId) {
                                        return {
                                            ...comment,
                                            replyCount: Math.max(0, comment.replyCount - 1),
                                        };
                                    }
                                    return comment;
                                }),
                            })),
                        };
                    }
                );
            }
            else{
                utils.comments.getMany.setInfiniteData(
                    { videoId : comment.videoId, limit: DEFAULT_LIMIT },
                    (old) => {
                        if (!old) return old;
                        return {
                            ...old,
                            pages: old.pages.map(page => ({
                                ...page,
                                items: page.items.filter(comment => {
                                    if(comment.id === id){
                                        totalReplies = comment.replyCount;
                                        return false; // remove this comment
                                    }
                                    return true;
                                }),
                            })),
                        };
                    }
                );
            }
            
            // Optimistically update total
            utils.comments.getTotal.setData({ videoId : comment.videoId }, (old) => {
                if (!old) return old;
                return { count: comment.parentId ? old.count - 1 :  old.count - (totalReplies) - 1 };
            });

            return { previousMain, previousReplies, previousTotal };
        },

        onError: (_err, _vars, ctx) => {
            // Rollback cache
            if (ctx?.previousMain) {
                utils.comments.getMany.setInfiniteData(
                    { videoId : comment.videoId, limit: DEFAULT_LIMIT },
                    ctx.previousMain
                );
            }
            if(ctx?.previousReplies){
                utils.comments.getMany.setInfiniteData(
                    { videoId: comment.videoId, parentId : comment.parentId ?? undefined, limit: DEFAULT_LIMIT },
                    ctx.previousReplies
                );
            }
            if (ctx?.previousTotal) {
                utils.comments.getTotal.setData(
                    { videoId : comment.videoId },
                    ctx.previousTotal
                );
            }
            

            toast.error("Failed to delete comment");
        },

        onSuccess: () => {
            toast.success("Comment deleted");
        },

        onSettled: () => {
            // Ensure server truth (important with pagination)
            // utils.comments.getMany.invalidate({ videoId : comment.videoId, limit: DEFAULT_LIMIT });
        },
    });



    const like = trpc.commentReactions.like.useMutation({
        onMutate : async ({ commentId }) => {
            //not needed to cancel ongoing comment requests
            
            // await utils.comments.getMany.cancel({
            //     videoId: comment.videoId,
            //     limit: DEFAULT_LIMIT,
            // });
            
            // if(comment.parentId){
            //     await utils.comments.getMany.cancel({ videoId : comment.videoId, parentId : comment.parentId, limit: DEFAULT_LIMIT });
            // }

            const previousMain = utils.comments.getMany.getInfiniteData({
                videoId: comment.videoId,
                limit: DEFAULT_LIMIT,
            });
            const previousReplies = comment.parentId ? utils.comments.getMany.getInfiniteData({ videoId : comment.videoId, parentId : comment.parentId, limit: DEFAULT_LIMIT }) : undefined;

            utils.comments.getMany.setInfiniteData(
                { videoId: comment.videoId, parentId : comment.parentId ?? undefined, limit: DEFAULT_LIMIT },
                (old) => {
                    if (!old) return old;

                    return {
                        ...old,
                        pages: old.pages.map((page) => ({
                            ...page,
                            items: page.items.map((c) => {
                                if (c.id !== commentId) return c;

                                const wasLiked = c.viewerReaction === "like";
                                const wasDisliked = c.viewerReaction === "dislike";

                                return {
                                    ...c,
                                    likeCount: wasLiked ? c.likeCount - 1 : c.likeCount + 1,
                                    dislikeCount: wasDisliked ? c.dislikeCount - 1 : c.dislikeCount,
                                    viewerReaction: wasLiked ? null : "like",
                                };
                            }),
                        })),
                    };
                }
            )

            return { previousMain, previousReplies };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.previousMain) {
                utils.comments.getMany.setInfiniteData(
                    { videoId: comment.videoId, limit: DEFAULT_LIMIT },
                    ctx.previousMain
                );
            }
            if(ctx?.previousReplies){
                utils.comments.getMany.setInfiniteData(
                    { videoId: comment.videoId, parentId : comment.parentId ?? undefined, limit: DEFAULT_LIMIT },
                    ctx.previousReplies
                );
            }
        },
    });

    const dislike = trpc.commentReactions.dislike.useMutation({
        onMutate: async ({ commentId }) => {
            //not needed to cancel ongoing comment requests

            // await utils.comments.getMany.cancel({
            //     videoId: comment.videoId,
            //     limit: DEFAULT_LIMIT,
            // });

            // if(comment.parentId){
            //     await utils.comments.getMany.cancel({ videoId : comment.videoId, parentId : comment.parentId, limit: DEFAULT_LIMIT });
            // }

            const previousMain = utils.comments.getMany.getInfiniteData({
                videoId: comment.videoId,
                limit: DEFAULT_LIMIT,
            });
            const previousReplies = comment.parentId ? utils.comments.getMany.getInfiniteData({ videoId : comment.videoId, parentId : comment.parentId, limit: DEFAULT_LIMIT }) : undefined;


            utils.comments.getMany.setInfiniteData(
                { videoId: comment.videoId, parentId : comment.parentId ?? undefined,  limit: DEFAULT_LIMIT },
                (old) => {
                    if (!old) return old;

                    return {
                        ...old,
                        pages: old.pages.map((page) => ({
                            ...page,
                            items: page.items.map((c) => {
                                if (c.id !== commentId) return c;

                                const wasDisliked = c.viewerReaction === "dislike";
                                const wasLiked = c.viewerReaction === "like";

                                return {
                                    ...c,
                                    dislikeCount: wasDisliked ? c.dislikeCount - 1 : c.dislikeCount + 1,
                                    likeCount: wasLiked ? c.likeCount - 1 : c.likeCount,
                                    viewerReaction: wasDisliked ? null : "dislike",
                                };
                            }),
                        })),
                    };
                }
            );

            return { previousMain, previousReplies };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.previousMain) {
                utils.comments.getMany.setInfiniteData(
                    { videoId: comment.videoId, limit: DEFAULT_LIMIT },
                    ctx.previousMain
                );
            }
            if(ctx?.previousReplies){
                utils.comments.getMany.setInfiniteData(
                    { videoId: comment.videoId, parentId : comment.parentId ?? undefined, limit: DEFAULT_LIMIT },
                    ctx.previousReplies
                );
            }
        },
    });


    const handleLike = () => {
        if (!user) {
            clerk.openSignIn();
            return;
        }

        like.mutate({ commentId : comment.id });
    };

    const handleDislike = () => {
        if (!user) {
            clerk.openSignIn();
            return;
        }

        dislike.mutate({ commentId : comment.id });
    };

    const isTemp = comment.id.includes("temp");


    return (
        <div>
            <div className={`flex ${variant === "comment" ? "gap-4" : "gap-3"} ${isTemp ? "animate-pulse" : ""}`}>
                <Link href={`/users/${comment.userId}`}>
                    <UserAvatar size={variant === "comment" ? "lg" : "sm"} imageUrl={comment.user.imageUrl} name={comment.user.name} />
                </Link>
                <div className="flex-1 min-w-0">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <Link href={`/users/${comment.userId}`} className="font-medium text-sm pb-0.5">
                                {comment.user.name}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(comment.updatedAt, {
                                    addSuffix : true,
                                })}
                            </span>
                        </div>
                    </div> 
                    <p className="text-sm whitespace-pre-wrap">
                        {variant === "reply" && (
                            comment.replyToUserUsername ? (
                                <Link
                                href={`/users/${comment.user.id}`}
                                className="text-blue-500 hover:underline font-medium"
                                >
                                    @{comment.replyToUserUsername}
                                </Link>
                            ) : (
                                <span className="text-gray-400 italic">
                                    Deleted user
                                </span>
                            )
                        )}

                        {" "}{comment.value.trim()}
                    </p>

                    <div className="flex items-center gap-2 mt-1 -ml-2">
                        <div className="flex items-center">
                            <Button className="size-8 cursor-pointer rounded-full" size="icon" variant="ghost" disabled={like.isPending || dislike.isPending || isTemp} onClick={() => {handleLike()}}>
                                <ThumbsUpIcon className={cn(comment.viewerReaction==="like" && "fill-current")}/>
                            </Button>
                            <span className="text-xs text-muted-foreground mr-0.5">{comment.likeCount}</span>
                            <Button className="size-8 cursor-pointer rounded-full" size="icon" variant="ghost" disabled={dislike.isPending || like.isPending || isTemp}  onClick={() => {handleDislike()}}>
                                <ThumbsDownIcon className={cn(comment.viewerReaction==="dislike" && "fill-current")}/>
                            </Button>
                            <span className="text-xs text-muted-foreground">{comment.dislikeCount}</span>
                        </div>

                        <Button variant={"ghost"} size={"sm"} disabled={isTemp} className="h-8 cursor-pointer" onClick={() => {setIsReplyOpen(!isReplyOpen)}}>
                            Reply
                        </Button>
                    </div>
                </div>
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger>
                        <Button variant="ghost" size="icon" className="size-8 cursor-pointer">
                            <MoreVerticalIcon />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {setIsReplyOpen(!isReplyOpen)}} disabled={isTemp} className="cursor-pointer">
                                    <MessagesSquareIcon className="size-4" />
                                    Reply
                                </DropdownMenuItem>
                        {comment.user.clerkId === userId && (
                             <DropdownMenuItem onClick={() => {remove.mutate({ id : comment.id})}} disabled={isTemp} className="cursor-pointer">
                                <Trash2Icon className="size-4" />
                                Delete
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {
                isReplyOpen && (
                    <div className={`mt-4 ml-14 ${isReplyPending ? "hidden" : "block"}`}>
                        <CommentForm videoId={comment.videoId} parentId={comment.parentId ? comment.parentId : comment.id} replyToUserId={comment.userId} replyToUserUsername={comment.user.username} onCancel={() => setIsReplyOpen(false)} onSuccess={() => {
                            setIsReplyOpen(false);
                        }} setIsReplyPending={setIsReplyPending}  variant='reply'/>
                    </div>      
                )
            }

            {
                comment.replyCount > 0 && variant === "comment" && isRepliesOpen && (
                    <CommentReplies parentId={comment.id} videoId={comment.videoId}>
                    </CommentReplies>
                )
            }


            {
                comment.replyCount > 0 && variant === "comment" && (
                    <div className="pl-14">
                        <Button variant="tertiary" size="sm" className="cursor-pointer" disabled={isReplyPending} onClick={() => setIsRepliesOpen((current) => !current)}>
                            {isRepliesOpen ? <ChevronUpIcon /> : <ChevronDownIcon />} 
                            {isRepliesOpen ? "hide replies" : `${comment.replyCount} replies`}
                        </Button>
                    </div>
                )
            }
            
        </div>
    )
}

export default CommentItem