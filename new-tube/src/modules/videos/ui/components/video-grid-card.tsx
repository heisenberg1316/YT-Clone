import Link from "next/link";
import { VideoGetManyOutput } from "../../types";
import { VideoThumbnail } from "./video-thumbnail";
import { VideoInfo } from "./video-info";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoGridCardProps {
    data : VideoGetManyOutput["items"][number];
    onRemove ?: () => void;
    isRemoving?: boolean;
}

function rgbToRgba(rgb: string, opacity: number) {
    return rgb.replace("rgb", "rgba").replace(")", `, ${opacity})`);
}

export const VideoGridCardSkeleton = () => {
    return (
        <div className="flex flex-col gap-2 w-full">
        {/* Thumbnail */}
        <Skeleton className="aspect-video w-full rounded-md" />

        {/* Info */}
        <div className="flex gap-3">
            {/* Avatar */}
            <Skeleton className="h-9 w-9 rounded-full flex-none" />

            <div className="flex-1 space-y-2 min-w-0">
            {/* Title */}
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />

            {/* Meta */}
            <Skeleton className="h-3 w-28" />
            </div>

            {/* Menu */}
            <Skeleton className="h-8 w-4 rounded-md flex-none" />
        </div>
        </div>
    );
};

export const VideoGridCard = ({ data, onRemove, isRemoving }: VideoGridCardProps) => {
  return (
    <div className="relative flex flex-col gap-2 w-full group">
      {/* Thumbnail Wrapper */}
      <div className="relative">
        <Link prefetch href={`/videos/${data.id}`}>
          <div className="relative">
            <VideoThumbnail
              imageUrl={data.thumbnailUrl}
              previewUrl={data.previewUrl}
              title={data.title}
              duration={data.duration}
            />

          </div>
        </Link>
      </div>

      {/* Hover overlay */}
      <div style={{ backgroundColor : rgbToRgba(data.dominantColor, 0.28) }} className={`absolute -z-10 inset-0 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 rounded-xl pointer-events-none`}/>
      <VideoInfo data={data} onRemove={onRemove} isRemoving={isRemoving} />
    </div>
  );
};