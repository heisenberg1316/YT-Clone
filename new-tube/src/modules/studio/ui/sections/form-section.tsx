"use client"

import { z } from "zod";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, CopyCheckIcon, CopyIcon, Globe2Icon, LockIcon, MoreVerticalIcon, TrashIcon } from "lucide-react";
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


interface FormSectionProps {
    videoId : string;
}


const FormSectionSkeleton = () => {
    return <p>Loading...</p>
}


export const FormSection = ({ videoId } :  FormSectionProps) => {
    return (
        <Suspense fallback={<FormSectionSkeleton />}>
            <ErrorBoundary fallback={<p>Error</p>}>
                <FormSectionSuspense videoId={videoId}/>
            </ErrorBoundary>
        </Suspense>
    )
}

const FormSectionSuspense = ({ videoId } :  FormSectionProps) => {

    const utils = trpc.useUtils();

    const [video] = trpc.studio.getOne.useSuspenseQuery({ id : videoId });
    const [categories] = trpc.categories.getMany.useSuspenseQuery();
    const fullUrl = `${process.env.VERCEL_URL || "http://localhost:3000"}/videos/${videoId}`;

    const [isCopied, setIsCopied] = useState(false);
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

    const form = useForm<z.infer<typeof videoUpdateSchema>>({
        resolver : zodResolver(videoUpdateSchema),
        defaultValues : video,
    })

    const onSubmit = (data : z.infer<typeof videoUpdateSchema>) => {
        update.mutate(data);
    }   
    


    return (
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
                                <DropdownMenuItem>
                                    <TrashIcon className="size-4 mr-2"/>
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="space-y-8 lg:col-span-3">
                        
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Title
                                </FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Add a title to your video" />
                                </FormControl>
                            </FormItem>
                        )}/>

                        
                         <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Description
                                </FormLabel>
                                <FormControl>
                                    <Textarea {...field} value={field.value ?? ""} rows={10} className="resize-none min-h-50"  placeholder="Add a description to your video" />
                                </FormControl> 
                            </FormItem>
                        )}/>


                        {/* TODO : add thumbnail field here */}
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
                        <div className="flex flex-col gap-2 bg-[#F9F9F9] rounded-xl overflow-hidden h-fit">
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
                            )}
                        />

                    </div>
                </div>
            </form>
        </FormProvider>
    )
}