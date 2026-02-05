import Link from "next/link";
import { useMemo } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { UserAvatar } from "@/components/user-avatar";
import { UserInfo } from "@/modules/users/ui/components/user-info";
import { VideoMenu } from "./video-menu";
import { VideoThumbnail } from "./video-thumbnail";
import { VideoGetManyOutput, VideoGetOneOutput } from "../../types";

const videoRowCardVariants = cva("group flex min-w-0", {
    variants : {
        size : {
            default : "gap-4",
            compact : "gap-2",
        },
    },
    defaultVariants : {
        size : "default",
    }
})

const thumbnailVariants = cva("relative flex-none", {
    variants : {
        size : {
            default : "w-[36%]",
            compact : "w-[168px]",
        },
    },
    defaultVariants : {
        size : "default",
    }
})

interface VideoRowCardProps extends VariantProps<typeof videoRowCardVariants>{
    data : VideoGetManyOutput["items"][number];
    onRemove ?: () => void;
}

interface VideoRowCardSkeletonProps extends VariantProps<typeof videoRowCardVariants> {}

export const VideoRowCardSkeleton = ({ size = "default" }: VideoRowCardSkeletonProps) => {
  return (
    <div className={videoRowCardVariants({ size })}>
      {/* Thumbnail */}
      <div className={thumbnailVariants({ size })}>
        <Skeleton className="aspect-video w-full rounded-md" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-x-2">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title */}
            <Skeleton
              className={cn(
                "w-full",
                size === "compact" ? "h-4" : "h-5"
              )}
            />

            {/* Default layout */}
            {size === "default" && (
              <>
                {/* Views + likes */}
                <Skeleton className="h-3 w-32 mt-1" />

                {/* User info */}
                <div className="flex items-center gap-2 my-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>

                {/* Description */}
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </>
            )}

            {/* Compact layout */}
            {size === "compact" && (
              <>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-28 mt-1" />
              </>
            )}
          </div>

          {/* Menu */}
          <Skeleton className="h-8 w-4 rounded-md flex-none mr-2" />
        </div>
      </div>
    </div>
  );
};


export const VideoRowCard = ({ data, size = "default", onRemove } : VideoRowCardProps) => {

    const compactViews = useMemo(() => {
        return Intl.NumberFormat("en", {
            notation : "compact"
        }).format(data.viewCount)
    }, [data.viewCount]);

    const compactLikes = useMemo(() => {
        return Intl.NumberFormat("en", {
            notation : "compact"
        }).format(data.likeCount)
    }, [data.likeCount]);

    return (
        <div className={videoRowCardVariants({ size })}>
            <Link href={`/videos/${data.id}`} className={thumbnailVariants({ size })} >
                <VideoThumbnail imageUrl={data.thumbnailUrl} previewUrl={data.previewUrl} title={data.title} duration={data.duration} />
            </Link>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-x-2">
                    <Link href={`/videos/${data.id}`} className="flex-1 min-w-0">
                        <h3 className={cn("font-medium line-clamp-2", size === "compact" ? "text-sm" : "text-base")}>
                            {data.title}
                        </h3>
                        {
                            size === "default" && (
                                <>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {compactViews} views • {compactLikes} likes
                                    </p>

                                    <div className="flex items-center gap-2 my-3">
                                        <UserAvatar size="sm" imageUrl={data.user.imageUrl} name={data.user.name} />
                                        <UserInfo size="sm" name={data.user.name} />
                                    </div>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                        <p className="text-xs text-muted-foreground w-fit line-clamp-2">
                                            {data.description ?? "No description"}
                                        </p>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" align="center" className="bg-muted-background">
                                        <p>From the video description</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </>
                            )
                        }
                        {
                            size === "compact" && (
                                <>
                                    <UserInfo size={"sm"} name={data.user.name}/>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {compactViews} views • {compactLikes} likes
                                    </p>
                                </>
                            )
                        }
                    </Link>
                    <div className="flex-none">
                        <VideoMenu videoId={data.id} onRemove={onRemove} />
                    </div>
                </div>
            </div>
        </div>
    )
}


