"use client";

import MuxPlayer from "@mux/mux-player-react";
import { THUMBNAIL_FALLBACK } from "../../constants";
import { useEffect, useRef } from "react";
import { trpc } from "@/trpc/client";
import { getFingerprint } from "@/hooks/use-fingerprint";
import clsx from "clsx";
import { useUser } from "@clerk/nextjs";

interface VideoPlayerProps {
  videoId : string;
  playbackId?: string | null;
  thumbnailUrl?: string | null;
  autoPlay?: boolean;
  duration : number;
}

export const VideoPlayerSkeleton = () => {
    return <div className="aspect-video bg-gray-300 rounded-xl" />;
};

export const VideoPlayer = ({
  videoId,
  playbackId,
  thumbnailUrl,
  autoPlay,
  duration
}: VideoPlayerProps) => {
    const watchedRef = useRef(0);          // total valid watch time
    const lastTimeRef = useRef(0);         // last video time
    const countedRef = useRef(false);      // prevent double count
    duration = duration/1000;              // Mux gives duration in MS
    const totalRequiredWatch = Math.min(10, (0.8 * duration)); // 80% of video or 10s max

    const createView = trpc.videoViews.create.useMutation();
    const fingerprintRef = useRef<string | null>(null);
    const {user} = useUser();
    const addToHistory = trpc.playlists.addHistory.useMutation();

    useEffect(() => {
      let mounted = true;

      if(user){
         addToHistory.mutate({ videoId });
      }

      (
        async () => {
            const id = await getFingerprint();
            if (mounted) {
              fingerprintRef.current = id;
            }
        }
      )();

      return () => {
        mounted = false;
      };
    }, []);


    // ✅ called frequently by the video element
    const handleTimeUpdate = (e: any) => {
        if (countedRef.current) return;
        if (document.hidden) return;

        const currentTime = e.target.currentTime;

        const delta = currentTime - lastTimeRef.current;

        // ignore seeks / jumps / rewinds
        if (delta > 0 && delta < 1.5) {
            watchedRef.current += delta;
        }

        lastTimeRef.current = currentTime;


        if (watchedRef.current >= totalRequiredWatch) {
            countedRef.current = true;
            console.log("🚀 Required watchtime completed");

            createView.mutate({ videoId, viewerFingerprint : fingerprintRef.current! }); 
        }
    };

  return (
    <MuxPlayer
      playbackId={playbackId || ""}
      poster={thumbnailUrl || THUMBNAIL_FALLBACK}
      autoPlay={autoPlay}
      thumbnailTime={0}
      accentColor="#FF2056"
      className="w-full h-full [--media-object-fit:contain]"
      forwardSeekOffset={5}
      backwardSeekOffset={5}
      onTimeUpdate={handleTimeUpdate}
      defaultHiddenCaptions
    />
  );
};
