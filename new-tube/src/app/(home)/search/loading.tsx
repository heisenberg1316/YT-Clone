import { CategoriesSkeleton } from "@/modules/search/ui/sections/categories-section";
import { ResultsSectionSkeleton } from "@/modules/search/ui/sections/results-section";

export default function Loading() {
    return (
        <div className="max-w-[1420px] mx-auto mb-10 flex flex-col gap-y-6 px-4 pt-2.5">
            <CategoriesSkeleton />
            <ResultsSectionSkeleton />
        </div>
    );
}