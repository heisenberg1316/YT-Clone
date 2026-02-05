"use client"
import { SidebarTrigger } from "@/components/ui/sidebar"
import Image from "next/image"
import Link from "next/link"
import AuthButton from "@/modules/auth/ui/components/auth-button"
import { StudioUploadModal } from "../studio-upload-modal"
import { useTheme } from "@/context/theme-context"


export const StudioNavbar = () => {
    const { theme, toggleTheme } = useTheme();
    return (
      <nav className="fixed top-0 left-0 right-0 h-16 bg-background flex items-center px-2 pr-5 z-50 border-b shadow-sm">
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Menu and Logo */}
          <div className="flex items-center shrink-0">
            <SidebarTrigger className="cursor-pointer"/>
            <Link href="/studio">
              <div className="p-4 flex items-center gap-1">
                <Image src="/logo.svg" alt="Logo" width={32} height={32} />
                <p className="text-xl font-semibold tracking-tight">Studio</p>
              </div>
            </Link>
          </div>
          
          {/* space bar */}
          {/* <div className="flex-1"/> */} 

          <div className="flex items-center gap-4 shrink-0">
            <button onClick={toggleTheme} className="text-2xl cursor-pointer">{theme === "dark" ? "☀️" : "🌙"}</button>
            <StudioUploadModal />
            <AuthButton />
          </div>
          
        </div>
      </nav>
    )
}
export default StudioNavbar