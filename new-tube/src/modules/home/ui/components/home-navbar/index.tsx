"use client";
import { SidebarTrigger } from "@/components/ui/sidebar"
import Image from "next/image"
import Link from "next/link"
import SearchInput from "./search-input"
import AuthButton from "@/modules/auth/ui/components/auth-button"
import { useState } from "react";
import { useTheme } from "@/context/theme-context";
import { ArrowLeft, Moon, MoonIcon, MoonStar, SearchIcon, Sun, SunDim, SunIcon, SunMoon } from "lucide-react";

export const HomeNavbar = () => {
    const { theme, toggleTheme } = useTheme();
    const [open, setOpen] = useState<boolean>(false);

    return (
      <nav className="fixed top-0 left-0 right-0 bg-background h-16 flex items-center px-2 pr-5 z-50">
        <div className="flex items-center gap-2 w-full justify-between">
          {/* Menu and Logo */}
          <div className="flex items-center shrink-0">
            {
              !open && 
              <SidebarTrigger className="cursor-pointer 2xl:size-10 ml-1 2xl:ml-0"/>
            }
            {
              open &&
                <button className="cursor-pointer ml-3" onClick={() => setOpen((value) => !value)} >
                  <ArrowLeft />
                </button>
            }
            {
              !open && 
              <Link prefetch href="/">
                <div className="p-2 sm:p-4 flex items-center gap-1">
                  <Image src="/logo.svg" alt="Logo" width={32} height={32} />
                  <p className="hidden sm:block text-sm md:text-lg lg:text-xl font-semibold tracking-tight">NewTube</p>
                </div>
              </Link>
            }
          </div>
          
          {/* search bar */}
          <div className="flex-1 hidden sm:block justify-center max-w-[720px] mx-auto">
            <SearchInput />
          </div>
          {
            open && 
            <div className="flex-1 sm:hidden justify-center max-w-[720px] mx-auto">
              <SearchInput />
            </div>
          }

          <div className="flex items-center gap-3.5 lg:gap-4 shrink-0">
             {
              !open && 
              (
                <>
                  <button className="sm:hidden cursor-pointer" onClick={() => setOpen((value) => !value)}>
                    <SearchIcon className="size-6"/>
                  </button>
                  <button onClick={toggleTheme} className="text-xl cursor-pointer">{theme === "dark" ?  <Sun /> : <Moon />}</button>
                  <AuthButton />
                </>
              )
            }
          </div>
          
        </div>
      </nav>
    )
}
export default HomeNavbar