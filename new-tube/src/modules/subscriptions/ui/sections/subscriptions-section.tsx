"use client";

import { InfiniteScroll } from "@/components/infinite-scroll";
import { DEFAULT_LIMIT } from "@/constants";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import {
  SubscriptionItem,
  SubscriptionItemSkeleton,
} from "../components/subscription-item";
import { SUCCESS_TOAST_CONFIG } from "@/toastCustom";


const SubscriptionsSectionSkeleton = () => {
    return (
        <div className="flex flex-col gap-4">
            {[...Array(6)].map((_, index) => (
                <SubscriptionItemSkeleton key={index} />
            ))}
        </div>
    );
};

export const SubscriptionsSection = () => {
    return (
        <Suspense fallback={<SubscriptionsSectionSkeleton />}>
            <ErrorBoundary fallback={<p>Something went wrong</p>}>
                <SubscriptionsSectionSuspense />
            </ErrorBoundary>
        </Suspense>
    );
};

const SubscriptionsSectionSuspense = () => {
    const utils = trpc.useUtils();
    const [data, query] = trpc.subscriptions.getMany.useSuspenseInfiniteQuery(
        {
            limit: DEFAULT_LIMIT,
        },
        {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
        }
    );

    const unsubscribe = trpc.subscriptions.remove.useMutation({
        onSuccess : (data) => {
            toast.success("Unsubscribed", SUCCESS_TOAST_CONFIG);
            utils.videos.getManySubscribed.invalidate();
            utils.users.getOne.invalidate({ id : data.creatorId }); 
            utils.subscriptions.getMany.invalidate();
        },
        onError : (error) => {
            toast.error("Something went wrong");
        }
    });
    

    return (
        <>
            <div className="flex flex-col gap-4">
                {data.pages
                .flatMap((page) => page.items)
                .map((subscription) => (
                    <Link prefetch
                    key={subscription.creatorId}
                    href={`/users/${subscription.user.id}`}
                    >
                    <SubscriptionItem
                        name={subscription.user.name}
                        imageUrl={subscription.user.imageUrl || "/user-placeholder.svg"}
                        subscriberCount={subscription.user.subscriberCount}
                        onUnsubscribe={() =>
                            unsubscribe.mutate({ userId: subscription.creatorId })
                        }
                        disabled={unsubscribe.isPending}
                    />
                    </Link>
                ))}
            </div>

            <InfiniteScroll
                hasNextPage={query.hasNextPage}
                isFetchingNextPage={query.isFetchingNextPage}
                fetchNextPage={query.fetchNextPage}
            />
        </>
    );
};