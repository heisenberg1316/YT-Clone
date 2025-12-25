
import { ResponsiveModal } from "@/components/responsive-modal";
import { UploadButton, UploadDropzone } from "@/lib/uploadthing";
import { trpc } from "@/trpc/client";

interface ThumbnailUploadModalProps {
    open : boolean;
    onOpenChange : (open : boolean) => void;
    videoId : string;
}


export const ThumbnailUploadModal = ({open, onOpenChange, videoId} : ThumbnailUploadModalProps) => {
    const utils = trpc.useUtils();

    const onUploadComplete = () => {
        utils.studio.getMany.invalidate();
        utils.studio.getOne.invalidate({id : videoId});
        onOpenChange(false);
    }
    return (
        <ResponsiveModal title="Upload a thumbnail" open={open} onOpenChange={onOpenChange}>
            {/* <UploadDropzone endpoint="thumbnailUploader" input={{videoId}} onClientUploadComplete={onUploadComplete}/>      */}
            <UploadButton
                endpoint="thumbnailUploader"
                input={{ videoId }}
                onClientUploadComplete={onUploadComplete}
                className="
                    ut-button
                    cursor-pointer

                    flex items-center justify-center
                    bg-blue-600 hover:bg-blue-700
                    text-white text-sm font-medium
                    px-4 py-2 rounded-md

                    [&_label]:w-full
                    [&_label]:h-full
                    [&_label]:cursor-pointer
                    [&_label]:flex
                    [&_label]:items-center
                    [&_label]:justify-center
                "
            />
        </ResponsiveModal>
    )
}