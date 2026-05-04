"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { trpc } from "@/trpc/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface PlaylistCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  name: z.string().min(1).max(100),
});

export const PlaylistCreateModal = ({ open, onOpenChange}: PlaylistCreateModalProps) => {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
        },
    });

    const isMobile = useIsMobile();
    const utils = trpc.useUtils();

    const create = trpc.playlists.create.useMutation({
        onSuccess: () => {
            form.reset();
            onOpenChange(false);
            utils.playlists.getMany.invalidate();
            toast.success("Playlist created successfully");
        },
        onError: (error) => {
            toast.error("something went wrong");
        },
    });

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        create.mutateAsync(data);
    };

    return (
        <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        title="Create a Playlist"
        >
            <Form {...form} >
                <form onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem className={`mb-4 ${isMobile ? "mx-4" : "ml-0"}`}>
                        <FormLabel className="">Name</FormLabel>
                        <FormControl>
                        <Input
                            placeholder="Enter playlist name"
                            {...field}
                            className="w-full"
                        />
                        </FormControl>
                    </FormItem>
                    )}
                />
                <div className="flex justify-center">

                <Button disabled={create.isPending} type="submit" className={`cursor-pointer ${isMobile ? "mb-5" : "mb-0"} `}>
                    Create
                </Button>
                </div>
                </form>
            </Form>
        </ResponsiveModal>
    );
};