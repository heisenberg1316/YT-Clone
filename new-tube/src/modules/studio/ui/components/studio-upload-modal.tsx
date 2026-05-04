"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { Check, Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { StudioUploader } from "./studio-uploader";

type UploadSession = {
  videoId: string;
  uploadUrl: string;
  muxUploadId: string;
};

export const StudioUploadModal = () => {
    const router = useRouter();
    const utils = trpc.useUtils();

    const [session, setSession] = useState<UploadSession | null>(null);
    const [uploadCompleted, setUploadCompleted] = useState(false);

    const create = trpc.videos.create.useMutation({
        onSuccess: (res) => {
            toast.success("Video Created", {
                icon: <Check className="text-green-500" />,
                duration: 3000,
            });

            setUploadCompleted(false);
            setSession({
                videoId: res.video.id,
                uploadUrl: res.url,
                muxUploadId: res.video.muxUploadId!,
            });

            utils.studio.getMany.invalidate();
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    const deleteDraft = trpc.videos.deleteDraft.useMutation({
        onSuccess: () => {
            utils.studio.getMany.invalidate();
        },
    });

    const handleClose = () => {
        if (session && !uploadCompleted) {
            deleteDraft.mutate({
                videoId: session.videoId,
                muxUploadId: session.muxUploadId,
            });
        }

        setSession(null);
        setUploadCompleted(false);
        create.reset();
    };

    const onSuccess = () => {
        if (!session?.videoId) return;

        setUploadCompleted(true);
        const videoId = session.videoId;

        setSession(null);
        create.reset();

        sessionStorage.setItem("fromStudioVideoUpload", "1");
        router.push(`/studio/videos/${videoId}`);
    };

    return (
      <>
        <ResponsiveModal
          title="Upload a video"
          open={!!session?.uploadUrl}
          onOpenChange={(open) => {
            if (!open) handleClose();
          }}
        >
            {session?.uploadUrl ? (
              <StudioUploader endpoint={session.uploadUrl} onSuccess={onSuccess} />
            ) : (
              <Loader2Icon />
            )}
        </ResponsiveModal>

        <Button
          variant={"secondary"}
          className="cursor-pointer"
          onClick={() => create.mutate()}
          disabled={create.isPending}
        >
            {create.isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
            Create
        </Button>
      </>
    );
};