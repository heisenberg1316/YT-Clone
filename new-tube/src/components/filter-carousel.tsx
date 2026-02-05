"use client";
import { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";

interface FilterCarouselProps {
    value ?: string | null;
    isLoading ?: boolean;
    onSelect : (value : string | null) => void;
    data : {
        value : string;
        label : string;
    }[];
}

export const FilterCarousel = ({ value, isLoading, onSelect, data } : FilterCarouselProps) => {

    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);
    const [count, setCount] = useState(0);

    useEffect(() => {
        if(!api) return;

        setCount(api.scrollSnapList().length);
        setCurrent(api.selectedScrollSnap() + 1);

        api.on("select", () => {
            setCurrent(api.selectedScrollSnap() + 1);
        })
    }, [api])

    return (
        <div className="relative w-full -mt-1">

            {/* left fade */}
            <div className={cn(
                "absolute left-5 top-0 bottom-0 w-12 z-10 bg-linear-to-r from-background to-transparent pointer-events-none",
                current==1 && "hidden"
            )}/>

            <Carousel setApi={setApi} opts={{ align : "start", dragFree : true}} className="w-full px-8 py-1">
                <CarouselContent>

                    {!isLoading && (
                         <CarouselItem onClick={() => onSelect(null)} className="pl-5 basis-auto">
                            <Badge variant={!value ? "default" : "secondary"} className="rounded-lg px-3 py-1 cursor-pointer whitespace-nowrap text-sm">
                                All
                            </Badge>
                        </CarouselItem>
                    )}
                   
                    {isLoading && 
                        Array.from({length : 14}).map((_, idx) => (
                            <CarouselItem key={idx} className="pl-5 basis-auto">
                                <Skeleton className="rounded-lg px-3 py-1 h-full text-sm w-[100px] font-semibold">
                                    &nbsp;
                                </Skeleton>
                            </CarouselItem>
                        ))
                    
                    } 

                    {!isLoading && data.map((item) => (
                        <CarouselItem onClick={() => onSelect(item.value)} key={item.value} className="basis-auto pl-0 ml-4">
                            <Badge variant={value === item.value ? "default" : "secondary"} className="rounded-lg px-3 py-1 cursor-pointer whitespace-nowrap text-sm ">
                                {item.label}
                            </Badge>
                        </CarouselItem>
                    ))}

                </CarouselContent>   

                <CarouselPrevious className="-left-1 z-20"/>
                <CarouselNext className="-right-1 z-20" />        
            </Carousel>

             {/* right fade */}
            <div className={cn(
                "absolute right-5 top-0 bottom-0 w-12 z-10 bg-linear-to-l from-background to-transparent pointer-events-none",
                current==count && "hidden"
            )}/>
        </div>
    )
}