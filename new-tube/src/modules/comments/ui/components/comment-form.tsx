import { usernameFromEmail } from "@/app/api/users/webhook/route";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { DEFAULT_LIMIT } from "@/constants";
import { commentInsertSchema } from "@/db/schema";
import { trpc } from "@/trpc/client";
import { useClerk, useUser } from "@clerk/clerk-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import {date, z} from "zod";

interface CommentFormProps {
    videoId : string;
    parentId ?: string;
    replyToUserUsername ?: string;
    replyToUserId ?: string;
    onSuccess ?: () => void;
    onCancel ?: () => void;
    onError ?: () => void;
    setIsReplyPending ?: React.Dispatch<React.SetStateAction<boolean>>;
    variant ?: "comment" | "reply";
}


const CommentForm = ({ videoId, parentId, replyToUserUsername, replyToUserId, onSuccess, onCancel, onError, setIsReplyPending, variant = "comment" } : CommentFormProps) => {
    
    const {user : clerkUser} = useUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress;
    const prefix = email ? usernameFromEmail(email) : "user";
    const suffix = clerkUser?.id.slice(-4);
    const optimisticUsername = `${prefix}_${suffix}`;
    const clerk = useClerk();
    const utils = trpc.useUtils();
    const create = trpc.comments.create.useMutation({
        onMutate: async (newComment) => {

            // snapshot form values
            const previousFormValues = form.getValues();
            
            // reset immediately (fast UX)
            form.reset();
            
            // Cancel outgoing fetches
            await utils.comments.getMany.cancel({ videoId, limit : DEFAULT_LIMIT });
            await utils.comments.getMany.cancel({ videoId, parentId, limit: DEFAULT_LIMIT });

            // Snapshot previous state
            const previousMain = utils.comments.getMany.getInfiniteData({ videoId, limit: DEFAULT_LIMIT });
            const previousReplies = parentId ? utils.comments.getMany.getInfiniteData({ videoId, parentId, limit: DEFAULT_LIMIT }) : undefined;
            
            const previousTotal =
                utils.comments.getTotal.getData({ videoId });


            // Optimistically update cache
            let tempId = `temp-${crypto.randomUUID()}`;

            if(parentId){
                console.log("setisreplypending is ", setIsReplyPending);
                if(setIsReplyPending){
                    console.log("inside true");
                    setIsReplyPending(true);
                }
                utils.comments.getMany.setInfiniteData(
                    { videoId, parentId, limit: DEFAULT_LIMIT },
                    (old) => {
                        if (!old || !clerkUser) return old;

                        const lastPageIndex = old.pages.length - 1;

                        return {
                            ...old,
                            pages: old.pages.map((page, index) => {
                                if (index !== lastPageIndex) return page;

                                return {
                                    ...page,
                                    items: [
                                        ...page.items, // ✅ keep existing
                                        {
                                            id: tempId,
                                            value: newComment.value,
                                            videoId,
                                            userId: tempId,
                                            createdAt: new Date(),
                                            updatedAt: new Date(),
                                            replyCount: 0,
                                            likeCount: 0,
                                            dislikeCount: 0,
                                            viewerReaction: null,
                                            parentId,
                                            replyToUserUsername: replyToUserUsername ?? null,
                                            replyToUserId: replyToUserId ?? null,
                                            user: {
                                                id: tempId,
                                                name: clerkUser.fullName || "Anonymous",
                                                imageUrl: clerkUser.imageUrl,
                                                clerkId: clerkUser.id,
                                                username: optimisticUsername,
                                            },
                                        },
                                    ],
                                };
                            })};
                        }
                    );

                // 2) Increment replyCount for the parent in the main (top-level) comments cache
                utils.comments.getMany.setInfiniteData(
                    { videoId, limit: DEFAULT_LIMIT },
                    (old) => {
                        if (!old) return old;
                        return {
                            ...old,
                            pages: old.pages.map((page) => ({
                                ...page,
                                items: page.items.map((c) => {
                                    if(c.id === parentId){
                                        return {
                                            ...c,
                                            replyCount : c.replyCount + 1,
                                        }
                                    }
                                    return c;
                                }),
                            })),
                        };
                    }
                );
            }
            else{
                utils.comments.getMany.setInfiniteData(
                    { videoId, limit: DEFAULT_LIMIT },
                    (old) => {
                        if (!old || !clerkUser) return old;

                        return {
                            ...old,
                            pages: [
                                {
                                    ...old.pages[0],
                                    items: [
                                        {
                                            id: tempId,
                                            value: newComment.value,
                                            videoId,
                                            userId: tempId,
                                            parentId : parentId ? parentId : null,
                                            createdAt: new Date(),
                                            updatedAt: new Date(),
                                            replyCount : 0,
                                            likeCount : 0,
                                            replyToUserUsername: replyToUserUsername ? replyToUserUsername : null,
                                            replyToUserId: replyToUserId ? replyToUserId : null,
                                            dislikeCount : 0,
                                            viewerReaction : null,
                                            user: {
                                                id:  tempId,
                                                name: clerkUser.fullName || "Anonymous",
                                                imageUrl: clerkUser.imageUrl,
                                                clerkId : clerkUser.id,
                                                username : optimisticUsername,
                                            },
                                        },
                                        ...old.pages[0].items,
                                    ],
                                },
                                ...old.pages.slice(1),
                            ],
                        };
                    }
                );
            }
            utils.comments.getTotal.setData({ videoId }, (old) => {
                if (!old) return old;
                return { count: old.count + 1 };
            });

            
            return { previousFormValues, previousMain, previousReplies, previousTotal, tempId };
        },

        onError: (error, _, ctx) => {
            // Rollback
            if(setIsReplyPending){
                setIsReplyPending(false);
            }
            utils.comments.getMany.setInfiniteData(
                { videoId, limit : DEFAULT_LIMIT },
                ctx?.previousMain
            );
            if (parentId && ctx?.previousReplies) {
                utils.comments.getMany.setInfiniteData(
                    { videoId, parentId, limit: DEFAULT_LIMIT },
                    ctx.previousReplies
                );
            }
            
            if (ctx?.previousTotal) {
                utils.comments.getTotal.setData(
                    { videoId },
                    ctx.previousTotal
                );
            }
            
            if (ctx?.previousFormValues) {
                form.reset(ctx.previousFormValues);
            }
            
            toast.error("Failed to add comment");  
        },
        
        onSuccess: (serverComment, input, context) => {
            toast.success("Comment added");
            if(setIsReplyPending){
                setIsReplyPending(false);
            }
            utils.comments.getMany.setInfiniteData(
                { videoId, parentId : input.parentId ?? undefined, limit: DEFAULT_LIMIT },
                (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        pages: old.pages.map((page) => ({
                            ...page,
                            items: page.items.map((c) => {
                                if(c.id === context.tempId){
                                    return {
                                        ...c,
                                        id: serverComment.id,
                                        videoId: serverComment.videoId,
                                        parentId: serverComment.parentId,
                                        userId: serverComment.userId,
                                        replyToUserId: serverComment.replyToUserId,
                                        value: serverComment.value,
                                        createdAt: serverComment.createdAt,
                                        updatedAt: serverComment.updatedAt,
                                    }
                                }
                                return c;
                            }),
                        })),
                    };
                }
            );
            onSuccess?.();
        },
    });


    // 1. Define the schema for the form (omitting what you don't need)
    const commentFormSchema = commentInsertSchema.omit({ userId: true });

    // 2. Infer the type from THAT specific schema
    type CommentFormValues = z.infer<typeof commentFormSchema>;

    // 3. Use that type in useForm
    const form = useForm<CommentFormValues>({
        resolver: zodResolver(commentFormSchema),
        defaultValues: {
            videoId,
            parentId,
            replyToUserId,
            value: "",
            // userId is no longer expected here, resolving the conflict
        }
    });

    const handleSubmit = (values : CommentFormValues) => {
        if (!clerkUser) {
            clerk.openSignIn();
            return;
        }
        create.mutate(values);
    }

    const handleCancel = () => {
        form.reset();
        onCancel?.(); 
    }

    return (
        <FormProvider {...form}> 
            <form className="flex gap-4 group" onSubmit={form.handleSubmit(handleSubmit)}>
                <UserAvatar size={parentId ? "sm" : "lg"} imageUrl={clerkUser?.imageUrl || "/user-placeholder.svg"} name={clerkUser?.username || "User"}/>
                <div className="flex-1">
                    <FormField name="value" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Textarea {...field} placeholder={variant === "reply" ? "Reply to this comment..." : "Add a comment..."} className="resize-none bg-transparent overflow-hidden min-h-0 wrap-anywhere"/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <div className={`justify-end gap-2 mt-2 flex ${(form.watch("value").trim() || variant === "reply") ? "block" : "hidden"}`}>
                        {onCancel && (
                            <Button variant="ghost" type="button" onClick={handleCancel} className="cursor-pointer">
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" size="sm" className="cursor-pointer" disabled={create.isPending || !form.watch("value").trim()}>
                            {variant === "reply" ? "Reply" : "Comment"}
                        </Button>
                    </div>
                </div>
            </form>
        </FormProvider>
    )
}

export default CommentForm

