"use client"

import { Sidebar, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import Link from "next/link"
import { LogOutIcon, VideoIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import StudioSidebarHeader from "./studio-sidebar-header"

const StudioSidebar = () => {

    const pathname = usePathname();

    return (
      <div className="max-w-[255px]">
          <Sidebar className="pt-16 z-40 max-w-[255px] duration-300" collapsible="icon">
              <SidebarContent className="bg-background">
                  
                  <SidebarGroup>
                      <SidebarMenu className="flex gap-1">

                        {/* studio header */}
                        <StudioSidebarHeader />


                        {/* studio items */}
                        <SidebarMenuItem >
                          <SidebarMenuButton isActive={pathname === "/studio"} tooltip={"Content"} asChild>
                            <Link href={"/studio"}>
                              <VideoIcon className="size-5"/>
                              <span className="text-sm">Content</span>
                            </Link>
                          </SidebarMenuButton>

                        <Separator className="mt-1.5"/>  

                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton tooltip={"Exit studio"} asChild>
                            <Link href={"/"}>
                              <LogOutIcon className="size-5"/>
                              <span className="text-sm">Exit studio</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>

                      </SidebarMenu>
                  </SidebarGroup>
              </SidebarContent>
          </Sidebar>
      </div>
    )
}

export default StudioSidebar