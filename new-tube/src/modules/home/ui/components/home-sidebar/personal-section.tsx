"use client"

import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { FlameIcon, HistoryIcon, HomeIcon, ListVideoIcon, PlaySquareIcon, ThumbsUpIcon } from "lucide-react"
import Link from "next/link"
import { useClerk, useAuth } from "@clerk/nextjs"


const items = [
    {
        title : "History",
        url : "/playlists/history",
        icon : HistoryIcon,
        auth : true,
    },
    {
        title : "Liked videos",
        url : "/playlists/liked",
        icon : ThumbsUpIcon,
        auth : true,
    },
    {
        title : "All playlists",
        url : "/playlists",
        icon : ListVideoIcon,
        auth : true,
    }
]

export const PersonalSection = () => {
    const clerk = useClerk();
    const { isSignedIn } = useAuth();

    return (
        <SidebarGroup>
            <SidebarGroupLabel className="2xl:text-base 2xl:mb-2">You</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu className="2xl:gap-2 gap-0.5">
                    {
                        items.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton 
                                    tooltip={item.title} 
                                    asChild 
                                    isActive={false} 
                                    onClick={(e) => {
                                        if(!isSignedIn && item?.auth){
                                            e.preventDefault();
                                            return clerk.openSignIn();
                                        }
                                    }}
                                >
                                    <Link href={item.url} className="flex items-center gap-4">
                                        <item.icon className="size-4! 2xl:size-4.5!"/>
                                        <span className="text-sm 2xl:text-base">{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>

                            </SidebarMenuItem>
                        ))
                    }
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}