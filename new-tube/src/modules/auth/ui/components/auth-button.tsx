"use client"

import { Button } from "@/components/ui/button";
import { ClapperboardIcon, UserCircleIcon } from "lucide-react";
import { UserButton, SignInButton, SignedIn, SignedOut, useUser  } from "@clerk/nextjs";

const AuthButton = () => {
   const { user, isLoaded } = useUser();

  // While Clerk loads → render stable placeholder
  if (!isLoaded) {
     return (
      <div className="flex gap-2">
        <div className="animate-pulse rounded-full bg-gray-300 h-7 w-7" />
        <div className="animate-pulse rounded-full bg-gray-300 h-7 w-7" />
        <div className="animate-pulse rounded-full bg-gray-300 h-7 w-7" />
      </div>
     )
  }

  return (
    <>
      <SignedIn >
        <div className="flex gap-2">
          <UserButton>
              <UserButton.MenuItems>
                  <UserButton.Link label="Studio" href="/studio" labelIcon={<ClapperboardIcon className="size-4"/>}/>
              </UserButton.MenuItems>
          </UserButton>
        </div>
      </SignedIn>
      <SignedOut >
        <SignInButton mode="modal">
          <Button variant={"outline"} className="hover:cursor-pointer rpx-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 border-blue-500/20 rounded-full shadow-none">
              <UserCircleIcon className="size-5"/>
              Sign in 
          </Button>
        </SignInButton>
      </SignedOut>
    </>
  )
}

export default AuthButton;