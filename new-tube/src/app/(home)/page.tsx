import { HydrateClient, trpc } from "@/trpc/server";
import { Suspense } from "react";
import { PageClient } from "./client";
import { ErrorBoundary } from "react-error-boundary"

export default async function Home() {
    void trpc.hello.prefetch({text : "vivek"})
    
    return (
      <HydrateClient>
        <Suspense fallback={<p>loading</p>}>
          <ErrorBoundary fallback={<p>error...</p>}>
              <PageClient />
          </ErrorBoundary>
        </Suspense>
      </HydrateClient>
    );
}
