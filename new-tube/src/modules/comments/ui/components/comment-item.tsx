interface CommentItemProps {
    comment : CommentGetManyOutput["items"][number],
    variant ?: "reply" | "comment",
}

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

const CommentItem = ({ comment, variant = "comment" } : CommentItemProps) => {

    const {userId} = useAuth();
    const {user} = useUser();
    const clerk = useClerk();
    const utils = trpc.useUtils();

    const [isReplyOpen, setIsReplyOpen] = useState(false);
    const [isRepliesOpen, setIsRepliesOpen] = useState(false);

   
    const remove = trpc.comments.remove.useMutation({
        onMutate: async ({ id }) => {
            // Cancel ongoing fetches
            await utils.comments.getMany.cancel({ videoId : comment.videoId, limit: DEFAULT_LIMIT });

            // Snapshot previous cache
            const previousComments =
            utils.comments.getMany.getInfiniteData({ videoId : comment.videoId, limit: DEFAULT_LIMIT });

            const previousTotal =
            utils.comments.getTotal.getData({ videoId : comment.videoId });

            // Optimistically remove comment
            utils.comments.getMany.setInfiniteData(
                { videoId : comment.videoId, limit: DEFAULT_LIMIT },
                (old) => {
                    if (!old) return old;

                    return {
                        ...old,
                        pages: old.pages.map(page => ({
                            ...page,
                            items: page.items.filter(comment => comment.id !== id),
                        })),
                    };
                }
            );

            // Optimistically update total
            utils.comments.getTotal.setData({ videoId : comment.videoId }, (old) => {
                if (!old) return old;
                return { count: old.count - 1 };
            });

            return { previousComments, previousTotal };
        },

        onError: (_err, _vars, ctx) => {
            // Rollback cache
            if (ctx?.previousComments) {
                utils.comments.getMany.setInfiniteData(
                    { videoId : comment.videoId, limit: DEFAULT_LIMIT },
                    ctx.previousComments
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

            await utils.comments.getMany.cancel({
                videoId: comment.videoId,
                limit: DEFAULT_LIMIT,
            });

            const previous = utils.comments.getMany.getInfiniteData({
                videoId: comment.videoId,
                limit: DEFAULT_LIMIT,
            });

            utils.comments.getMany.setInfiniteData(
                { videoId: comment.videoId, limit: DEFAULT_LIMIT },
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

            return { previous };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) {
                utils.comments.getMany.setInfiniteData(
                    { videoId: comment.videoId, limit: DEFAULT_LIMIT },
                    ctx.previous
                );
            }
        },
    });

    const dislike = trpc.commentReactions.dislike.useMutation({
        onMutate: async ({ commentId }) => {
            await utils.comments.getMany.cancel({
                videoId: comment.videoId,
                limit: DEFAULT_LIMIT,
            });

            const previous =
                utils.comments.getMany.getInfiniteData({
                    videoId: comment.videoId,
                    limit: DEFAULT_LIMIT,
                });

            utils.comments.getMany.setInfiniteData(
                { videoId: comment.videoId, limit: DEFAULT_LIMIT },
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

            return { previous };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) {
                utils.comments.getMany.setInfiniteData(
                    { videoId: comment.videoId, limit: DEFAULT_LIMIT },
                    ctx.previous
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


    return (
        <div>
            <div className="flex gap-4">
                <Link href={`/users/${comment.userId}`}>
                    <UserAvatar size={"lg"} imageUrl={comment.user.imageUrl} name={comment.user.name} />
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
                    <p className="text-sm whitespace-pre-wrap">{comment.value.trim()}</p>
                    <div className="flex items-center gap-2 mt-1 -ml-2">
                        <div className="flex items-center">
                            <Button className="size-8 cursor-pointer rounded-full" size="icon" variant="ghost" disabled={like.isPending || dislike.isPending} onClick={() => {handleLike()}}>
                                <ThumbsUpIcon className={cn(comment.viewerReaction==="like" && "fill-black")}/>
                            </Button>
                            <span className="text-xs text-muted-foreground mr-0.5">{comment.likeCount}</span>
                            <Button className="size-8 cursor-pointer rounded-full" size="icon" variant="ghost" disabled={dislike.isPending || like.isPending} onClick={() => {handleDislike()}}>
                                <ThumbsDownIcon className={cn(comment.viewerReaction==="dislike" && "fill-black")}/>
                            </Button>
                            <span className="text-xs text-muted-foreground">{comment.dislikeCount}</span>
                        </div>

                        {variant === "comment" && (
                            <Button variant={"ghost"} size={"sm"} className="h-8 cursor-pointer" onClick={() => {setIsReplyOpen(!isReplyOpen)}}>
                                Reply
                            </Button>
                        )}

                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger>
                        <Button variant="ghost" size="icon" className="size-8 cursor-pointer">
                            <MoreVerticalIcon />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {
                            variant === "comment" && (
                                <DropdownMenuItem onClick={() => {setIsReplyOpen(!isReplyOpen)}} className="cursor-pointer">
                                    <MessagesSquareIcon className="size-4" />
                                    Reply
                                </DropdownMenuItem>
                            )
                        }
                        {comment.user.clerkId === userId && (
                             <DropdownMenuItem onClick={() => {remove.mutate({ id : comment.id})}} className="cursor-pointer">
                                <Trash2Icon className="size-4" />
                                Delete
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {
                isReplyOpen && variant === "comment" && (
                    <div className="mt-4 ml-14">
                        <CommentForm videoId={comment.videoId} parentId={comment.id} onCancel={() => setIsReplyOpen(false)} onSuccess={() => {
                            setIsReplyOpen(false);
                            setIsRepliesOpen(false);
                        }} variant='reply'/>
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
                        <Button variant="tertiary" size="sm" className="cursor-pointer" onClick={() => setIsRepliesOpen((current) => !current)}>
                            {isRepliesOpen ? <ChevronUpIcon /> : <ChevronDownIcon />} 
                            {comment.replyCount} replies
                        </Button>
                    </div>
                )
            }
            
        </div>
    )
}

export default CommentItem