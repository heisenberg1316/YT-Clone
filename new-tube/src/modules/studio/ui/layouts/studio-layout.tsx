"use client"
import { SidebarProvider } from "@/components/ui/sidebar"
import StudioNavbar from "../components/studio-navbar"
import StudioSidebar from "../components/studio-sidebar"
import { useState } from "react"

interface StudioLayoutProps{
    children : React.ReactNode
}

 
export const StudioLayout = ({ children } : StudioLayoutProps) => {

    const [isOpen, setIsOpen] = useState(true);

    return (
        <SidebarProvider >
            <div className="w-full">
                <StudioNavbar /> 
                <div className="flex min-h-screen pt-16">
                    <StudioSidebar />
                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}
