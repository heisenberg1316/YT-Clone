"use client";

import { FilterCarousel } from "@/components/filter-carousel";
import { DEFAULT_LIMIT } from "@/constants";
import { trpc } from "@/trpc/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface CategoriesSectionProps {
    categoryId ?: string;
}


export const CategoriesSection = ({ categoryId } : CategoriesSectionProps) => {
    return (
        <Suspense fallback={<CategoriesSkeleton />}>
            <ErrorBoundary fallback={<p>Error...</p>}>
                <CategoriesSectionSuspense categoryId = {categoryId}/>
            </ErrorBoundary>
        </Suspense>
    )
}

const CategoriesSkeleton = () => {
    return <FilterCarousel isLoading data={[]} onSelect={() => {}}/>
}

const CategoriesSectionSuspense = ({ categoryId } : CategoriesSectionProps) => {
    const [categories] = trpc.categories.getMany.useSuspenseQuery();
    const router = useRouter();

    const data = categories.map((category) => ({
        value : category.id,
        label : category.name,
    }))
    const utils = trpc.useUtils();


    const onSelect = async (value : string | null) => {
        const url = new URL(window.location.href);
        
        if(value){
            url.searchParams.set("categoryId", value);
        }
        else{
            url.searchParams.delete("categoryId");
        }
        router.push(url.toString());

    }

    return (
        <FilterCarousel onSelect={onSelect} value={categoryId}  data={data}  />
    )
}
