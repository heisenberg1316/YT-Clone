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
    onSuccess ?: () => void;
    onCancel ?: () => void;
    variant ?: "comment" | "reply";
}


const CommentForm = ({ videoId, parentId, onSuccess, onCancel, variant = "comment" } : CommentFormProps) => {
    
    const {user : clerkUser} = useUser();
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

            // Snapshot previous state
            const previousComments =
                utils.comments.getMany.getInfiniteData({ videoId, limit : DEFAULT_LIMIT });
            
            const previousTotal =
                utils.comments.getTotal.getData({ videoId });


            // Optimistically update cache
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
                                        id: `temp-${crypto.randomUUID()}`,
                                        value: newComment.value,
                                        videoId,
                                        userId: `temp-${crypto.randomUUID()}`,
                                        createdAt: new Date(),
                                        updatedAt: new Date(),
                                        replyCount : 0,
                                        likeCount : 0,
                                        dislikeCount : 0,
                                        viewerReaction : null,
                                        parentId : parentId ? parentId : null,
                                        user: {
                                            id:  `temp-${crypto.randomUUID()}`,
                                            name: clerkUser.fullName || "Anonymous",
                                            imageUrl: clerkUser.imageUrl,
                                            clerkId : clerkUser.id
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

            utils.comments.getTotal.setData({ videoId }, (old) => {
                if (!old) return old;
                return { count: old.count + 1 };
            });

            return { previousFormValues, previousComments, previousTotal };
        },

        onError: (error, _, ctx) => {
            // Rollback
            utils.comments.getMany.setInfiniteData(
                { videoId, limit : DEFAULT_LIMIT },
                ctx?.previousComments
            );

            if (ctx?.previousFormValues) {
                form.reset(ctx.previousFormValues);
            }

            if (ctx?.previousTotal) {
                utils.comments.getTotal.setData(
                    { videoId },
                    ctx.previousTotal
                );
            }
            
            toast.error("Failed to add comment");
            
        },
        
        onSuccess: () => {
            toast.success("Comment added");
            onSuccess?.();
        },
        onSettled: () => {
            // Optional: ensure server truth
            // utils.comments.getMany.invalidate({ videoId });
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
                <UserAvatar size={"lg"} imageUrl={clerkUser?.imageUrl || "/user-placeholder.svg"} name={clerkUser?.username || "User"}/>
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

