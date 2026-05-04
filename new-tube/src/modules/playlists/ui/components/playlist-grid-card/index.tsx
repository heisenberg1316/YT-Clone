import { PlaylistGetManyOutput } from "@/modules/playlists/types";
import Link from "next/link";
import { PlaylistThumbnail, PlaylistThumbnailSkeleton } from "./playlist-thumbnail";
import { PlaylistInfo, PlaylistInfoSkeleton } from "./playlist-info";
import { THUMBNAIL_FALLBACK } from "@/modules/videos/constants";


interface PlaylistGridCardProps {
    data : PlaylistGetManyOutput["items"][number];
}

export const PlaylistGridCardSkeleton = () => {
    return (
        <div className="flex flex-col gap-2 w-full">
            <PlaylistThumbnailSkeleton />
            <PlaylistInfoSkeleton />
        </div>
    )
}

export const PlaylistGridCard = ({ data } : PlaylistGridCardProps) => {
    return (
        <Link prefetch href={`/playlists/${data.id}`}>
            <div className="flex flex-col gap-2 w-full group">
                <PlaylistThumbnail title={data.name} videosCount={data.videosCount} imageUrl={data.thumbnailUrl || THUMBNAIL_FALLBACK} />
                <PlaylistInfo data={data} />
            </div>
        </Link>
    )
}