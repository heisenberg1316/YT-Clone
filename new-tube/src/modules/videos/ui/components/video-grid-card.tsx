import Link from "next/link";
import { VideoGetManyOutput } from "../../types";
import { VideoThumbnail } from "./video-thumbnail";
import { VideoInfo } from "./video-info";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoGridCardProps {
    data : VideoGetManyOutput["items"][number];
    onRemove ?: () => void;
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


export const VideoGridCard = ({data, onRemove} : VideoGridCardProps) => {
    return (
        <div className="flex flex-col gap-2 w-full group">
            <Link href={`/videos/${data.id}`}>
                <VideoThumbnail imageUrl={data.thumbnailUrl} previewUrl={data.previewUrl} title={data.title} duration={data.duration} />
            </Link>
            <VideoInfo data={data} onRemove={onRemove}/>
        </div>
    )
}