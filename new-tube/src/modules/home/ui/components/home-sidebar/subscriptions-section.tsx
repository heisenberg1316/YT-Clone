"use client"

import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { trpc } from "@/trpc/client"
import { DEFAULT_LIMIT } from "@/constants"
import { UserAvatar } from "@/components/user-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { ListIcon } from "lucide-react"

export const LoadingSkeleton = () => {
    return (
        <div className="flex flex-col gap-4">
        {[...Array(4)].map((_, index) => (
            <SidebarMenuItem key={index}>
                <SidebarMenuButton disabled>
                    <Skeleton className="size-5 rounded-full shrink-0"/>
                    <Skeleton className="h-4 w-full" />
                </SidebarMenuButton>
            </SidebarMenuItem>
        ))}
        </div>
    );
};



export const SubscriptionsSection = () => {
    const pathname = usePathname();
    const { data, isLoading } = trpc.subscriptions.getMany.useInfiniteQuery({
        limit : DEFAULT_LIMIT,
    }, {
        getNextPageParam : (lastPage) => lastPage.nextCursor,
    })

    return (
        <SidebarGroup>
            <SidebarGroupLabel className="2xl:text-base 2xl:mb-2">Subscriptions</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu className="2xl:gap-2 gap-0.5">
                    {isLoading ? <LoadingSkeleton /> : 
                        data?.pages.flatMap((page) => page.items).map((subscription) => (
                            <SidebarMenuItem key={`${subscription.creatorId}-${subscription.viewerId}`}>
                                <SidebarMenuButton 
                                    tooltip={subscription.user.name} 
                                    asChild 
                                    isActive={pathname === `/users/${subscription.user.id}`} 
                                >
                                    <Link prefetch href={`/users/${subscription.user.id}`} className="flex items-center gap-4">
                                        <UserAvatar size="xs" imageUrl={subscription.user.imageUrl} name={subscription.user.name} />
                                        <span className="text-sm 2xl:text-base">{subscription.user.name}</span>
                                    </Link>
                                </SidebarMenuButton>

                            </SidebarMenuItem>
                        ))
                    }
                    {!isLoading && (
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                isActive={pathname === "/subscriptions"}
                                asChild
                            >
                                <Link prefetch
                                href="/subscriptions"
                                className="flex items-center gap-4"
                                >
                                    <ListIcon className="size-4" />
                                    <span className="text-sm">All subscriptions</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}