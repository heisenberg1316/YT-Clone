"use client";

import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { Suspense, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { VideoPlayer, VideoPlayerSkeleton } from "../components/video-player";
import { VideoBanner } from "../components/video-banner";
import { mux } from "@/lib/mux";
import { VideoTopRow, VideoTopRowSkeleton } from "../components/video-top-row";
import { SignedIn, useAuth } from "@clerk/nextjs";

interface VideoSectionProps {
    videoId : string;
}

const VideoSectionSkeleton = () => {
    return (
        <>
            <VideoPlayerSkeleton />
            <VideoTopRowSkeleton />
        </>
    )
}

const VideoSectionSuspense = ({ videoId } : VideoSectionProps) => {

    const { isSignedIn } = useAuth();
    const utils = trpc.useUtils();
    const [video] = trpc.videos.getOne.useSuspenseQuery({ id : videoId });
    const hasCountedViewRef = useRef(false);
    const createView = trpc.videoViews.create.useMutation({
        onSuccess : () => {
            utils.videos.getOne.invalidate({ id : videoId });
        }
    });

    const handlePlay = () => {
        if(!isSignedIn) return;
        
         // ⛔ already counted → do nothing
        if (hasCountedViewRef.current) return;

        // ✅ first valid play
        hasCountedViewRef.current = true;

        createView.mutate({ videoId })
    }
    
    return (
        <>
            <div className={cn("aspect-video bg-black rounded-xl overflow-hidden relative", video.muxStatus !== "ready" && "rounded-b-none")}>
                <VideoPlayer  onPlay={handlePlay} playbackId={video.muxPlaybackId} thumbnailUrl={video.thumbnailUrl} />
            </div>
            <VideoBanner status={video.muxStatus}/>
            <VideoTopRow video={video}/>
        </>
    )
}


export const VideoSection = ({ videoId } : VideoSectionProps) => {
    return (
        <Suspense fallback={<VideoSectionSkeleton />}>
            <ErrorBoundary fallback ={<p>Error..</p>}>
                <VideoSectionSuspense videoId={videoId} />
            </ErrorBoundary>
        </Suspense>
    )
}