"use client"

import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger } from "@/components/ui/sidebar"
import { useIsMobile } from "@/hooks/use-mobile"
import { useClerk, useAuth } from "@clerk/nextjs"
import { FlameIcon, HomeIcon, PlaySquareIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

const items = [
    {
        title : "Home",
        url : "/",
        icon : HomeIcon,
    },
    {
        title : "Subscriptions",
        url : "/feed/subscriptions",
        icon : PlaySquareIcon,
        auth : true,

    },
    {
        title : "Trending",
        url : "/feed/trending",
        icon : FlameIcon
    }
]

export const MainSection = () => {

    const clerk = useClerk();
    const { isSignedIn } = useAuth();
    const pathname = usePathname();
    const isMobile = useIsMobile();

    return (
        <SidebarGroup>
            <SidebarGroupContent>
                {isMobile && 
                    <div className="flex items-center">
                        <SidebarTrigger className="cursor-pointer 2xl:size-10 ml-1 2xl:ml-0" />
                        <Link prefetch href="/">
                            <div className="p-2 sm:p-4 flex items-center gap-1">
                                <Image src="/logo.svg" alt="Logo" width={32} height={32} />
                                <p className="hidden sm:block text-sm md:text-lg lg:text-xl font-semibold tracking-tight">NewTube</p>
                            </div>
                        </Link>
                    </div>
                }
                <SidebarMenu className="gap-0.5 2xl:gap-2.5">
                    {
                        items.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton 
                                    tooltip={item.title} 
                                    asChild 
                                    isActive={pathname === item.url} 
                                    onClick={(e) => {
                                        if(!isSignedIn && item?.auth){
                                            e.preventDefault();
                                            return clerk.openSignIn();
                                        }
                                    }}
                                >
                                    <Link prefetch href={item.url} className="flex items-center gap-4">
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