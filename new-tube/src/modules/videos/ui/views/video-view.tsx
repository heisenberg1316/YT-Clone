"use client"

import { useSidebar } from "@/components/ui/sidebar";
import { CommentsSection } from "../sections/comments-section";
import SuggestionsSection from "../sections/suggestions-section";
import { VideoSection } from "../sections/video-section";

interface VideoViewProps {
  videoId: string;
}

export const VideoView = ({ videoId }: VideoViewProps) => {


  const {open} = useSidebar();

  return (
    // 1. Reduced max-width slightly to match YT's "comfort zone" 
    // 2. Added 2xl:px-24 for better whitespace on massive screens
    <div className="flex mx-auto max-w-[2500px] pt-4 px-4 lg:px-6 mb-10">
      <div className={`flex flex-col ${open ? "" : "justify-center"} xl:flex-row w-full gap-x-6`}>
        
        {/* LEFT SIDE: Video & Comments */}
        {/* We use max-w to prevent the video from becoming too tall on ultra-wide screens */}
        <div className="flex-1 min-w-0 max-w-full xl:max-w-[calc(100%-33%)]">
          <div className="w-full">
             <VideoSection videoId={videoId} />
          </div>

          {/* Mobile Suggestions (Only visible below XL) */}
          <div className="xl:hidden block mt-6">
            <SuggestionsSection />
          </div>

          <div className="mt-4">
            <CommentsSection videoId={videoId} />
          </div>
        </div>

        {/* RIGHT SIDE: Suggestions Sidebar */}
        {/* Fixed width (350px) ensures zoom doesn't crush it */}
        <aside className="hidden xl:block w-[350px] border-2 shrink-0">
          <SuggestionsSection />
        </aside>

      </div>
    </div>
  );
};