import { SUCCESS_TOAST_CONFIG } from "@/toastCustom";
import { trpc } from "@/trpc/client";
import { useClerk, useUser } from "@clerk/nextjs";
import { toast } from "sonner";



interface UseSubscriptionProps {
    userId : string;
    isSubscribed : boolean;
    fromVideoId ?: string;
}


export const useSubscription = ({ userId, isSubscribed, fromVideoId} : UseSubscriptionProps) => {
    const clerk = useClerk();
    const utils = trpc.useUtils();
    const {user} = useUser();

    const subscribe = trpc.subscriptions.create.useMutation({
        onSuccess : () => {
            toast.success("Subscribed", SUCCESS_TOAST_CONFIG);

            if(fromVideoId){
                utils.videos.getOne.invalidate({ id : fromVideoId });
            }
        },
        onError : (error) => {
            toast.error("Something went wrong");
            if(error?.data?.code === "UNAUTHORIZED"){
                clerk.openSignIn();
            }
        }
    });
    const unsubscribe = trpc.subscriptions.remove.useMutation({
        onSuccess : () => {
            toast.success("Unsubscribed", SUCCESS_TOAST_CONFIG);

            if(fromVideoId){
                utils.videos.getOne.invalidate({ id : fromVideoId });
            }
        },
        onError : (error) => {
            toast.error("Something went wrong");
            if(error?.data?.code === "UNAUTHORIZED"){
                clerk.openSignIn();
            }
        }
    });

    const isPending = subscribe.isPending || unsubscribe.isPending;

    const onClick = () => {
        if(!user){
            clerk.openSignIn();
            return;
        }
        if(isSubscribed){
            unsubscribe.mutate({ userId });
        }
        else{
            subscribe.mutate({ userId })
        }
    }
    return {
        isPending,
        onClick,
    }
}