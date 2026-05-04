import { LikedVideosSection } from "../sections/liked-videos-section";

export const LikedView = () => {
    return (
        <div className="max-w-screen-md mx-auto mb-10 px-6 pt-2.5 flex flex-col gap-y-5">
            <div>
                <h1 className="text-2xl font-bold">Liked</h1>
                <p className="text-xs text-muted-foreground">Videos you have liked</p>
            </div>
            <LikedVideosSection  />
        </div>
    )
}
