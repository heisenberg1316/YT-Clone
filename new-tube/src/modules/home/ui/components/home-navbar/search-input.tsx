import { Button } from "@/components/ui/button";
import { APP_URL } from "@/constants";
import { SearchIcon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation";
import { useState } from "react"

const SearchInput = () => {
    const [value, setValue] = useState("");
    const router = useRouter();

    const handleSearch = (e : React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const url = new URL("/search", APP_URL ? `https://${APP_URL}` : "http://localhost:3000");
        const newQuery = value.trim();

        url.searchParams.set("query", newQuery);
        if(newQuery === ""){
            url.searchParams.delete("query");
        }

        setValue(newQuery);
        router.push(url.toString());
    }

    return (
        <form className="flex w-full max-w-[600px]" onSubmit={handleSearch}>
            <div className="relative w-full">
                <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Search" className="w-full pl-4 py-2 pr-12 rounded-l-full border focus:outline-none focus:border-blue-500" />
                {/* todo : add remove search button */}
                {value && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setValue("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full cursor-pointer">
                        <XIcon />
                    </Button>
                )}
            </div>
            <button type="submit" disabled={!value.trim()} className="px-5 py-2.5 bg-muted border hover:bg-sidebar-ring border-l-0 rounded-r-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <SearchIcon className="size-5"/>
            </button>
        </form>
    )
}

export default SearchInput