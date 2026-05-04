import { ResponsiveModal } from "@/components/responsive-modal";
import { UploadButton, UploadDropzone } from "@/lib/uploadthing";
import { trpc } from "@/trpc/client";

interface BannerUploadModalProps {
    userId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const BannerUploadModal = ({
  userId,
  open,
  onOpenChange,
}: BannerUploadModalProps) => {
    const utils = trpc.useUtils();

    const onUploadComplete = () => {
        utils.users.getOne.invalidate({ id: userId });
        onOpenChange(false);
    };
    return (
        <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        title="Upload a Banner"
        >
            <UploadButton
                endpoint="bannerUploader"
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
    );
};