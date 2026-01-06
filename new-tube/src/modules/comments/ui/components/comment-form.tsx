import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { commentInsertSchema } from "@/db/schema";
import { trpc } from "@/trpc/client";
import { useClerk, useUser } from "@clerk/clerk-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import {z} from "zod";

interface CommentFormProps {
    videoId : string;
    onSuccess ?: () => void;
}


const CommentForm = ({ videoId, onSuccess } : CommentFormProps) => {
    
    const {user} = useUser();
    const clerk = useClerk();
    const utils = trpc.useUtils();
    const create = trpc.comments.create.useMutation({
        onMutate: async (newComment) => {
            // Cancel outgoing fetches
            await utils.comments.getMany.cancel({ videoId });

            // Snapshot previous state
            const previousComments =
                utils.comments.getMany.getData({ videoId });

            // Optimistically update cache
            utils.comments.getMany.setData({ videoId }, (old) => {
                if (!old) return old;

                return [
                    {
                        id: `temp-${Date.now()}`,
                        value: newComment.value,
                        videoId,
                        userId: user!.id,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        isOptimistic: true,
                    },
                    ...old,
                ];
            });

            return { previousComments };
        },

        onError: (error, _, ctx) => {
            // Rollback
            utils.comments.getMany.setData(
                { videoId },
                ctx?.previousComments
            );
            
            toast.error("Failed to add comment");
            
            if (error.data?.code === "UNAUTHORIZED") {
                clerk.openSignIn();
            }
        },
        
        onSuccess: () => {
            form.reset();
            toast.success("Comment added");
            onSuccess?.();
        },
        onSettled: () => {
            // Optional: ensure server truth
            utils.comments.getMany.invalidate({ videoId });
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
            value: "",
            // userId is no longer expected here, resolving the conflict
        }
    });

    const handleSubmit = (values : CommentFormValues) => {
        //invalidate all comments is too worst for yt like apps
        create.mutate(values);
    }

    return (
        <FormProvider {...form}> 
            <form className="flex gap-4 group" onSubmit={form.handleSubmit(handleSubmit)}>
                <UserAvatar size={"lg"} imageUrl={user?.imageUrl || "/user-placeholder.svg"} name={user?.username || "User"}/>
                <div className="flex-1">
                    <FormField name="value" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Textarea {...field} placeholder="Add a comment" className="resize-none bg-transparent overflow-hidden min-h-0 wrap-anywhere"/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="justify-end gap-2 mt-2 flex">
                        <Button type="submit" size="sm" className="cursor-pointer" disabled={create.isPending || !form.watch("value").trim()}>
                            Comment
                        </Button>
                    </div>
                </div>
            </form>
        </FormProvider>
    )
}

export default CommentForm

