// app/feed/[videoId]/page.tsx

interface PageProps {
   params : Promise<{ videoId : string }>;
}

const Page = async ({ params }: PageProps) => {
  const { videoId } = await params; // <-- await the params Promise
  console.log("videoId is", videoId);

  return <div>page {videoId}</div>;
};

export default Page;
