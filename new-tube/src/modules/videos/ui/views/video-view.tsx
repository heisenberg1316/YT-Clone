import { VideoSection } from "../sections/video-section";

interface VideoViewProps {
    videoId : string;
}

export const VideoView = ({ videoId } : VideoViewProps) => {
    return (
        <div className="flex flex-col mx-auto max-w-[750px] pt-2.5 px-4 mb-10">
            <div className="flex flex-col xl:flex-row gap-6">
                <div className="flex-1 min-w-0">
                    <VideoSection videoId={videoId}/>
                    <div className="xl:hidden block mt-4">

                    </div>
                </div>
            </div>
        </div>
    )
}