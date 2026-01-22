// src/app/(home)/videos/[videoId]/not-found.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VideoOff } from "lucide-react"; // Import an icon

export default function VideoNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="bg-muted rounded-full p-6 mb-6">
        <VideoOff className="size-12 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold mb-2">Video not found</h1>
      <p className="text-muted-foreground mb-5 max-w-md">
        The video you are looking for doesn't exist, has been removed, or the link is incorrect.
      </p>
      <Button asChild variant="default" size="lg">
        <Link href="/">
          Go back home
        </Link>
      </Button>
    </div>
  );
}