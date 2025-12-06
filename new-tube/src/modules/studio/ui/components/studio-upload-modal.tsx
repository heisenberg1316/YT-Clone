"use client"

import { ResponsiveModal } from "@/components/responsive-modal"
import { Button } from "@/components/ui/button"
import { trpc } from "@/trpc/client"
import { Check, Loader2Icon, PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { StudioUploader } from "./studio-uploader"

export const StudioUploadModal = () => {

    const utils = trpc.useUtils();
    const create = trpc.videos.create.useMutation({
        onSuccess : () => {
            toast.success("Video Created", {
                icon: <Check className="text-green-500" />, // change color here
                duration: 3000,
                cancel: {
                    label: "Close",
                    onClick: () => {},
                }
            });
            
            utils.studio.getMany.invalidate();
        },
        onError : (err) => {
            toast.error(err.message);
        }
    });

    return (
        <>
            <ResponsiveModal title="Upload a video" open={!!create.data?.url} onOpenChange={() => create.reset()}>
                { create.data?.url ? <StudioUploader endpoint={create.data.url} onSuccess={() => {}}/> : <Loader2Icon /> }
            </ResponsiveModal>
            <Button variant={"secondary"} className="cursor-pointer" onClick={() => create.mutate()} disabled={create.isPending}>
                {
                    create.isPending ? <Loader2Icon className="animate-spin"/> : <PlusIcon />
                }
                Create
            </Button>
        </>
    )
}
