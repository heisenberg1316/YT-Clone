import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useEffect } from "react";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

interface InfiniteScrollProps {
    isManual ?: boolean;
    hasNextPage : boolean;
    isFetchingNextPage : boolean;
    fetchNextPage : () => void;
};


export const InfiniteScroll = ({ isManual = false, hasNextPage, isFetchingNextPage, fetchNextPage} : InfiniteScrollProps ) => {

    const { targetRef, isIntersecting } = useIntersectionObserver({threshold : 0.1, rootMargin : "200px"});

    useEffect(() => {
        if(isIntersecting && hasNextPage && !isFetchingNextPage && !isManual){
            fetchNextPage();
        }

    }, [isIntersecting, hasNextPage, isFetchingNextPage, isManual, fetchNextPage]);



    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <div ref={targetRef} className="h-1" />
            {hasNextPage ? (
                    <Button variant={"secondary"} className="cursor-pointer" disabled={!hasNextPage || isFetchingNextPage} onClick={() => fetchNextPage()}>
                        {isFetchingNextPage ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading
                                </>
                            ) : (
                            "Load more"
                        )}
                    </Button>
                )
                : 
                (
                    <p className="text-xs text-muted-foreground">
                        You have reached the end of the list
                    </p>
                )
            }
        </div>
    )
}