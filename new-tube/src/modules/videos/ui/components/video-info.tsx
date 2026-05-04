import { formatDistanceToNow } from "date-fns";
import { VideoGetManyOutput } from "../../types";
import { useMemo } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { UserInfo } from "@/modules/users/ui/components/user-info";
import { VideoMenu } from "./video-menu";

interface VideoInfoProps {
    data :  VideoGetManyOutput["items"][number];
    onRemove ?: () => void;
    isRemoving ?: boolean;
}

export const VideoInfo = ({ data, onRemove, isRemoving } : VideoInfoProps) => {

    const compactViews = useMemo(() => {
            return Intl.NumberFormat("en", {
                notation : "compact"
            }).format(data.viewCount)
    }, [data.viewCount]);

    const compactDate = useMemo(() => {
        return formatDistanceToNow(data.createdAt, { addSuffix : true })
    }, [data.createdAt]);

    return (
        <div className="flex gap-3">
            <Link prefetch href={`/users/${data.user.id}`}>
                <UserAvatar imageUrl={data.user.imageUrl} name={data.user.name} />
            </Link>
            <div className="min-w-0 flex-1">
                <Link prefetch href={`/videos/${data.id}`}>
                    <h3 className="font-medium line-clamp-1 lg:line-clamp-2 text-base wrap-break-word">
                        {data.title}
                    </h3>
                </Link>
                <Link prefetch href={`/users/${data.user.id}`}>
                    <UserInfo name={data.user.name} className="text-muted-foreground"/>
                </Link>
                <Link prefetch href={`/videos/${data.id}`}>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                        {compactViews} views • {compactDate}
                    </p>
                </Link>
            </div>
            <div className="shrink-0"> 
                <VideoMenu videoId={data.id} onRemove={onRemove} isRemoving={isRemoving} />
            </div>
        </div>  
    )
}

