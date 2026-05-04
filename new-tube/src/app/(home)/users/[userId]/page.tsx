import { DEFAULT_LIMIT } from "@/constants";
import { UserView } from "@/modules/users/ui/views/user-view";
import { HydrateClient, trpc } from "@/trpc/server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface UserPageProps {
  params: Promise<{
    userId: string;
  }>;
}


const Page = async ({ params }: UserPageProps) => {
    const { userId } = await params;
    try{
        //to check exists or not
        await trpc.users.getOne({ id: userId });

        await Promise.all([
            trpc.users.getOne.prefetch({ id: userId }),
            trpc.videos.getMany.prefetchInfinite({ userId, limit : DEFAULT_LIMIT}),
        ]);
    }
    catch(error: any){
        /** * If tRPC throws an error, check the code.
         * If it's NOT_FOUND, show your custom not-found.tsx
         */

        const isNotFound = 
            error.code === "NOT_FOUND" || 
            error.code === "BAD_REQUEST";     
            
        const unauthorizedError = error.code;

        if(unauthorizedError === "UNAUTHORIZED"){
            redirect("/sign-in")
        }

        if (isNotFound) {
            return notFound();
        }

        // For other errors (database down, etc.), trigger error.tsx
        throw error;
    }

    return (
        <HydrateClient>
            <UserView userId={userId} />    
        </HydrateClient>
    );
};

export default Page;