import {
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

const StudioSidebarHeader = () => {
    const { user } = useUser();

    const { state } = useSidebar();

    const avatarSizeClass = state === "collapsed" ? "h-6 w-6" : "h-23 w-23";

    if (!user) {
        return (
        <SidebarHeader className="flex items-center justify-center pb-2">
            <Skeleton
            className={`size-23 rounded-full ${avatarSizeClass} transition-all duration-450  hover:opacity-70`}
            />

            {state != "collapsed" && (
            <div className="flex flex-col items-center mt-1 gap-y-1">
                <Skeleton className="h-4 w-[80px]" />

                <Skeleton className="h-4 w-[100px]" />
            </div>
            )}
        </SidebarHeader>
        );
    }

    return (
        <SidebarHeader className="flex items-center justify-center pb-2">
        <SidebarMenuItem>
            <SidebarMenuButton
            tooltip="Your profile"
            className={`${avatarSizeClass} py-0 ${state != "collapsed" ? "rounded-full" : ""}  flex justify-center transtition-all duration-450 `}
            asChild
            >
            <Link href={"/users/current"} className="p-0">
                <UserAvatar
                imageUrl={user?.imageUrl}
                name={user?.fullName ?? "User"}
                className={`${avatarSizeClass} rounded-full transition-all duration-450  hover:opacity-70`}
                />
            </Link>
            </SidebarMenuButton>

            {state != "collapsed" && (
            <div className="flex flex-col items-center mt-2 gap-y-1">
                <p className="text-sm font-medium">Your profile</p>

                <p className="text-xs text-muted-foreground">{user.fullName} </p>
            </div>
            )}
        </SidebarMenuItem>
        </SidebarHeader>
    );
};

export default StudioSidebarHeader;
