"use client"

import { z } from "zod";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, CopyCheckIcon, CopyIcon, Globe2Icon, ImagePlusIcon, Loader2Icon, LockIcon, MoreVerticalIcon, RotateCcwIcon, SparkleIcon, SparklesIcon, TrashIcon } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { videoUpdateSchema } from "@/db/schema";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { VideoPlayer } from "@/modules/videos/ui/components/video-player";
import Link from "next/link";
import { snakeCaseToTitle } from "@/lib/utils";
import { useRouter } from "next/navigation"
import Image from "next/image";
import { THUMBNAIL_FALLBACK } from "@/modules/videos/constants";
import { ThumbnailUploadModal } from "../components/thumbnail-upload-modal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_URL } from "@/constants";



interface FormSectionProps {
    videoId : string;
}


const FormSectionSkeleton = () => {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-4 w-40"/>
                </div>
                <Skeleton className="h-9 w-24"/>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="space-y-8 lg:col-span-3">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-10 w-full"/>
                    </div> 
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-[220px] w-full"/>
                    </div> 
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-[84px] w-[153px]"/>
                    </div> 
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-10 w-full"/>
                    </div> 
                </div>
                <div className="flex flex-col gap-y-8 lg:col-span-2">
                    <div className="flex flex-col gap-2 bg-[#F9F9F9] rounded-xl overflow-hidden">
                        <Skeleton className="aspect-video" />
                        <div className="px-4 py-4 space-y-3">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20"/>
                                <Skeleton className="h-5 w-full"/>
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24"/>
                                <Skeleton className="h-5 w-32"/>
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24"/>
                                <Skeleton className="h-5 w-32"/>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20"/>
                        <Skeleton className="h-10 w-full"/>
                    </div>
                </div>
            </div>
        </div>
    )
}

const FormSectionError = () => {
    return (
         <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
                Video doesn’t exist
            </h2>

            <p className="text-sm text-muted-foreground">
                The video you’re trying to access was not found or may have been deleted.
            </p>

            <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-md border px-4 py-2 text-sm hover:bg-muted cursor-pointer"
            >
                Refresh page
            </button>
        </div>
    )
}

export const FormSection = ({ videoId } :  FormSectionProps) => {
    return (
        <Suspense fallback={<FormSectionSkeleton />}>
            <ErrorBoundary fallback={<FormSectionError />}>
                <FormSectionSuspense videoId={videoId}/>
            </ErrorBoundary>
        </Suspense>
    )
}

const FormSectionSuspense = ({ videoId } :  FormSectionProps) => {

    const utils = trpc.useUtils();
    const router = useRouter();

    const [video] = trpc.studio.getOne.useSuspenseQuery(
        { id: videoId },
        {
            refetchInterval: (query) => {
                const data = query.state.data;

                if (data?.aiTitleStatus === "pending" || data?.aiDescriptionStatus === "pending") {
                    return 3000;  //polling after every 3 second
                }
                return false;
            },
            retry: (failureCount, error) => {
                const code = error?.data?.code;
                if (code === "BAD_REQUEST" || code === "NOT_FOUND") return false;
                return failureCount < 3;
            },
        }
    );
    const [categories] = trpc.categories.getMany.useSuspenseQuery();
    const fullUrl = `${APP_URL || "http://localhost:3000"}/videos/${videoId}`;
    const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [generatingType, setGeneratingType] = useState<"title" | "description" | null>(null);



    useEffect(() => {
        const cameFromStudioVideoUpload = sessionStorage.getItem('fromStudioVideoUpload');

        if (!cameFromStudioVideoUpload) return;
        
        const t = setTimeout(() => {
            utils.studio.getOne.invalidate({id : videoId});
            sessionStorage.removeItem('fromStudioVideoUpload');
        }, 5000);

        return () => clearTimeout(t);
    }, []);


    
    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(fullUrl);
            setIsCopied(true);

            const timeout = setTimeout(() => setIsCopied(false), 2000);

            return () => clearTimeout(timeout); // cleanup
        } catch (err) {
            console.error("Copy failed:", err);
        }
    };

    const update = trpc.videos.update.useMutation({
        onSuccess : () => {
            utils.studio.getMany.invalidate();
            utils.studio.getOne.invalidate({ id : videoId });
            toast.success("Video updated successfully", {
                icon: <Check className="text-green-500" />, // change color here
                duration: 3000,
                cancel: {
                    label: "Close",
                    onClick: () => {},
                }
            })
        },
        onError : (err) => {
            toast.error("Error while updating video");
        },
    });
    
    const remove = trpc.videos.remove.useMutation({
        onSuccess : () => {
            utils.studio.getMany.invalidate();
            toast.success("Video deleted successfully", {
                icon: <Check className="text-green-500" />, // change color here
                duration: 3000,
                cancel: {
                    label: "Close",
                    onClick: () => {},
                }
            })

            router.push("/studio");
        },
        onError : (err) => {
            toast.error("Error while deleting the video");
        },
    });

    const revalidate = trpc.videos.revalidate.useMutation({
        onSuccess : () => {
            utils.studio.getMany.invalidate();
            utils.studio.getOne.invalidate({ id : videoId });
            toast.success("Video revalidated successfully", {
                icon: <Check className="text-green-500" />, // change color here
                duration: 3000,
                cancel: {
                    label: "Close",
                    onClick: () => {},
                }
            })
        },
        onError : (err) => {
            toast.error("Error while revalidating the video");
        },
    });


    const restoreThumbnail = trpc.videos.restoreThumbnail.useMutation({
        onSuccess : () => {
            utils.studio.getMany.invalidate();
            utils.studio.getOne.invalidate({id : videoId});
            toast.success("Thumbnail restored successfully", {
                icon: <Check className="text-green-500" />, // change color here
                duration: 3000,
                cancel: {
                    label: "Close",
                    onClick: () => {},
                }
            })
        },
        onError : (err) => {
            toast.error("Error while restoring the thumbnail");
        },
    });
    
    const generateContent = trpc.videos.generateContent.useMutation({
        onSuccess : () => {
            utils.studio.getMany.invalidate();
            utils.studio.getOne.invalidate({ id: videoId });
            setGeneratingType(null);
            toast.success("Backgorund job started", {description : "This may take some time"});
        },
        onError : (err) => {
            toast.error(err.message);
        },
    });



    const form = useForm<z.infer<typeof videoUpdateSchema>>({
        resolver : zodResolver(videoUpdateSchema),
        values : video,
    })

    const onSubmit = (data : z.infer<typeof videoUpdateSchema>) => {
        update.mutate(data);
    }   
    

    return (
        <>
            <ThumbnailUploadModal open={thumbnailModalOpen} onOpenChange={setThumbnailModalOpen} videoId={videoId} />
            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h1 className="text-xl font-bold">Video Details</h1>
                            <p className="text-xs text-muted-foreground">Manage your video details</p>
                        </div>
                        <div className="flex items-center gap-x-2">
                            <Button type="submit" disabled={update.isPending} className="cursor-pointer h-8 w-14"> 
                                Save
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="cursor-pointer">
                                        <MoreVerticalIcon />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="mr-2 mt-0.5">
                                     <DropdownMenuItem className="cursor-pointer" disabled={revalidate.isPending} onClick={() => revalidate.mutate({ id : videoId })}>
                                        <RotateCcwIcon className="size-4 mr-2"/>
                                        Revalidate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer" disabled={remove.isPending}  onClick={() => remove.mutate({ id : videoId })}>
                                        <TrashIcon className="size-4 mr-2"/>
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="space-y-8 lg:col-span-3">
                            
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            <div className="flex items-center gap-x-2">
                                                Title
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        type="button"
                                                        className="rounded-full size-6 [&_svg]:size-3 cursor-pointer"
                                                        disabled={((generateContent.isPending && generatingType === "title") || !video.muxTrackId)}
                                                        onClick={() => {
                                                            setGeneratingType("title");
                                                            generateContent.mutate({ id: videoId, type: "title" });
                                                        }}
                                                    >
                                                        {generateContent.isPending && generatingType === "title" ? (
                                                        <Loader2Icon className="animate-spin" />
                                                        ) : (
                                                        <SparklesIcon />
                                                        )}
                                                    </Button>
                                                    </PopoverTrigger>

                                                    <PopoverContent
                                                    side="top"
                                                    align="center"
                                                    className="w-64 text-sm"
                                                    >
                                                    AI generation will work only when the video language is{" "}
                                                    <b>English</b>.
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </FormLabel>

                                    <FormControl>
                                        <Input {...field} placeholder="Add a title to your video" />
                                    </FormControl>
                                </FormItem>  
                            )}/>

                                
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        <div className="flex items-center gap-x-2">
                                            Description
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    type="button"
                                                    className="rounded-full size-6 [&_svg]:size-3 cursor-pointer"
                                                    disabled={((generateContent.isPending && generatingType === "description") || !video.muxTrackId)}
                                                    onClick={() => {
                                                        setGeneratingType("description");
                                                        generateContent.mutate({ id: videoId, type: "description" });
                                                    }}
                                                >
                                                    {generateContent.isPending  && generatingType === "description" ? (
                                                    <Loader2Icon className="animate-spin" />
                                                    ) : (
                                                    <SparklesIcon />
                                                    )}
                                                </Button>
                                                </PopoverTrigger>

                                                <PopoverContent
                                                side="top"
                                                align="center"
                                                className="w-64 text-sm"
                                                >
                                                AI generation will work only when the video language is{" "}
                                                <b>English</b>.
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea {...field} value={field.value ?? ""} rows={10} className="resize-none min-h-50"  placeholder="Add a description to your video" />
                                    </FormControl> 
                                </FormItem>
                            )}/>


                            {/*thumbnail field here */}
                            <FormField 
                                control={form.control}
                                name="thumbnailUrl"
                                render = {() => (
                                    <FormItem>
                                        <FormLabel>Thumbnail</FormLabel>
                                        <FormControl>
                                            <div className="p-0.5 border border-dashed border-neutral-400 relative h-[84px] w-[153px] group">
                                                <Image src={video?.thumbnailUrl ?? THUMBNAIL_FALLBACK} fill alt="thumbnail" className="object-cover"/>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button type="button" size="icon" className="bg-black/50 hover:bg-black/50 absolute top-1 right-1 cursor-pointer rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 duration-300 size-7">
                                                            <MoreVerticalIcon className="text-white"/>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" side="right">
                                                        <DropdownMenuItem className="cursor-pointer" onClick={() => setThumbnailModalOpen(true)}>
                                                            <ImagePlusIcon className="size-4 mr-1"/>
                                                            Change
                                                        </DropdownMenuItem>
                                                        {/* <DropdownMenuItem className="cursor-pointer" onClick={() => generateContent.mutate({id : videoId})}>
                                                            <SparkleIcon className="size-4 mr-1"/>
                                                            AI-generated
                                                        </DropdownMenuItem> */}
                                                        <DropdownMenuItem className="cursor-pointer" onClick={() => restoreThumbnail.mutate({id : videoId})}>
                                                            <RotateCcwIcon className="size-4 mr-1"/>
                                                            Restore
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />


                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) =>  (            
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a category"/>
                                            </SelectTrigger> 
                                            <SelectContent>
                                                {
                                                    categories.map((category) => (
                                                        <SelectItem key={category.id} value={`${category.id}`}>{category.name}</SelectItem>
                                                    ))
                                                }
                                            </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex flex-col gap-y-8 lg:col-span-2">
                            <div className="flex flex-col gap-2 bg-secondary rounded-xl overflow-hidden h-fit">
                                <div className="aspect-video overflow-hidden relative">
                                    <VideoPlayer playbackId={video.muxPlaybackId} thumbnailUrl={video.thumbnailUrl}  />
                                </div>
                                <div className="py-4 px-3 flex flex-col gap-y-3">
                                    <div className="flex justify-between items-center gap-x-2">
                                        <div className="flex flex-col gap-y-1">
                                            <p className="text-muted-foreground text-xs">Video link</p>
                                            <div className="flex items-center gap-x-2">
                                                <Link href={`/videos/${video.id}`}>
                                                    <p className="line-clamp-2 break-all text-sm text-blue-500">
                                                        {fullUrl}
                                                    </p>
                                                </Link>
                                                <Button type="button" variant="ghost" size="icon" className="shrink-0 cursor-pointer" onClick={onCopy} disabled={isCopied}>
                                                    { isCopied ?  <CopyCheckIcon /> : <CopyIcon /> }
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col gapy-y-1">
                                            <p className="text-muted-foreground text-xs">
                                                Video status
                                            </p>
                                            <p className="text-sm">
                                                {snakeCaseToTitle(video.muxStatus || "preparing")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col gapy-y-1">
                                            <p className="text-muted-foreground text-xs">
                                                Subtitle status
                                            </p>
                                            <p className="text-sm">
                                                {snakeCaseToTitle(video.muxTrackStatus || "No subtitles")}
                                            </p>
                                        </div>
                                    </div>
                                </div>


                            </div>

                            <FormField
                                control={form.control}
                                name="visibility"
                                render={({ field }) => (            
                                    <FormItem>
                                        <FormLabel>Visibility</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select the visibilty"/>
                                            </SelectTrigger> 

                                            <SelectContent>
                                                <SelectItem value="public">
                                                    <div className="flex items-center">
                                                        <Globe2Icon className="size-4 mr-2"/>
                                                        Public
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="private">
                                                    <div className="flex items-center">
                                                        <LockIcon className="size-4 mr-2"/>
                                                        Private
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}/>
                        </div>
                    </div>
                </form>
            </FormProvider>
        </>
    )
}