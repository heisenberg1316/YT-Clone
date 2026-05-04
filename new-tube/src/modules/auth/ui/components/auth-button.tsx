"use client";

import { Button } from "@/components/ui/button";
import { ClapperboardIcon, UserCircleIcon, UserIcon } from "lucide-react";
import {
  UserButton,
  SignInButton,
  SignedIn,
  SignedOut,
  useUser,
} from "@clerk/nextjs";

const AuthButton = () => {
  const { isLoaded } = useUser();

  return (
    <div className="flex items-center gap-2">
      
        <>
          {!isLoaded && (
            <div className="h-7 w-7 flex items-center justify-center">
              <div className="h-7 w-7 rounded-full bg-gray-300 animate-pulse" />
            </div>
          )}

          <SignedIn>
            <div className="h-7 w-7 flex items-center justify-center">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-7 w-7",
                  },
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="My profile"
                    href="/users/current"
                    labelIcon={<UserIcon className="size-4" />}
                  />
                  <UserButton.Link
                    label="Studio"
                    href="/studio"
                    labelIcon={<ClapperboardIcon className="size-4" />}
                  />
                </UserButton.MenuItems>
              </UserButton>
            </div>
          </SignedIn>
        
          {/* Logged-out CTA */}
          <SignedOut>
            <SignInButton mode="modal">
              <Button
                variant="outline"
                className="rounded-full px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 border-blue-500/20 shadow-none cursor-pointer"
                >
                <UserCircleIcon className="size-5" />
                Sign in
              </Button>
            </SignInButton>
          </SignedOut>
        </>
    </div>
  );
};

export default AuthButton;
