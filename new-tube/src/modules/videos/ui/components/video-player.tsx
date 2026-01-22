"use client"

import MuxPlayer from "@mux/mux-player-react";
import { THUMBNAIL_FALLBACK } from "../../constants";

interface VideoPlayerProps {
    playbackId ?: string | null | undefined;
    thumbnailUrl ?: string | null | undefined;
    autoPlay ?: boolean;
    onPlay ?: () => void;
}

export const VideoPlayerSkeleton = () => {
    return <div className="aspect-video bg-gray-300 rounded-xl" />
}


export const VideoPlayer = ({ playbackId, thumbnailUrl, autoPlay, onPlay } : VideoPlayerProps) => {
    // if(!playbackId) return null;

    return (
        <MuxPlayer 
            playbackId={playbackId || ""}
            poster={thumbnailUrl || THUMBNAIL_FALLBACK}
            playerInitTime={0}
            autoPlay={autoPlay} 
            thumbnailTime={0}
            className="w-full h-full
            [--media-object-fit:contain]"
            accentColor="#FF2056"
            onPlay={onPlay}
            forwardSeekOffset={5}
            backwardSeekOffset={5}
        />
    )

}