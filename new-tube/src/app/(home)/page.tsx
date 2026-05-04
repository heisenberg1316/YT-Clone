import { DEFAULT_LIMIT } from "@/constants";
import { HomeView } from "@/modules/home/ui/views/home-view";
import { HydrateClient, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
    searchParams : Promise<{
        categoryId ?: string;
    }>
};

const Page = async ({ searchParams } : PageProps) => {
    const { categoryId } = await searchParams;
    await Promise.all([
        trpc.categories.getMany.prefetch(),
        trpc.subscriptions.getMany.prefetchInfinite({ limit: DEFAULT_LIMIT }),
        trpc.videos.getMany.prefetchInfinite({ categoryId, limit: DEFAULT_LIMIT }),
    ]);

    return (
      <HydrateClient>
          <HomeView categoryId={categoryId} />
      </HydrateClient>
    );
}

export default Page;
