// src/app/(home)/videos/[videoId]/error.tsx
'use client';

import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  
  // Custom UI for specific server errors (if message is passed)
  const isPrivate = error.message === "PRIVATE_VIDEO";

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className={`rounded-full p-6 mb-6 ${isPrivate ? 'bg-yellow-100' : 'bg-red-100'}`}>
        <AlertTriangle className={`size-12 ${isPrivate ? 'text-yellow-600' : 'text-red-600'}`} />
      </div>

      <h1 className="text-2xl font-bold mb-2">
        {isPrivate ? "This video is private" : "Something went wrong"}
      </h1>
      
      <p className="text-muted-foreground mb-5 max-w-sm">
        {isPrivate 
          ? "You don't have permission to view this content. Please sign in with an authorized account." 
          : "We encountered an error while trying to load this video or you have send the wrong id. Please try again later."}
      </p>

      <div className="flex gap-4">
        <Button variant="default" onClick={() => window.location.href = '/'} className="cursor-pointer">
          Go Home
        </Button>
      </div>
    </div>
  );
}