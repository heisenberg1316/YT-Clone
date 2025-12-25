import { db } from "@/db";
import { videos } from "@/db/schema";
import { genAI } from "@/lib/gemini";
import { serve } from "@upstash/workflow/nextjs";
import { and, eq } from "drizzle-orm";

interface InputType {
  userId: string;
  videoId: string;
  type : string;
}

export const generatePrompt = (type: string, text: string) => {
    if (type === "title") {
        return `
            Generate a short, catchy, SEO-friendly title.

            Rules:
            - Max 10 words
            - No emojis
            - No quotes
            - Return ONLY the title

            TEXT:
            ${text}
        `;
    }

    return `
        Generate a concise, engaging, SEO-friendly video description.

        Rules:
        - Max 3-4 short sentences
        - Clear and informative
        - Include relevant keywords naturally
        - No emojis
        - No quotes
        - Return ONLY the description text

        TEXT:
        ${text}
    `;
};


async function generateContentWithFallback(prompt: string) {
    const models = [
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
    ];

    let lastError: any = null;

    for (const model of models) {
        try {
            console.log(`Trying Gemini model: ${model}`);

            const result = await genAI.models.generateContent({
                model,
                contents: prompt,
            });

            const text = result.text?.trim();
            if (text) return text;

        }
        catch (err: any) {
            lastError = err;

            const status = err?.status || err?.error?.code;

            // Retry-worthy errors : (429 means quota limit reached for that modal) and (503 means that model is overloaded)
            if (status === 429 || status === 503) {
                console.warn(
                    `[Gemini ${model}] failed with ${status}. Trying next model...`
                );
                continue;
            }

            // Non-retry error → break immediately
            console.error(`[Gemini ${model}] fatal error`, err);
            break;
        }
    }

    console.error("All Gemini models exhausted", lastError);
    return "Quota limit reached, Please try again tommorow";
}


export const { POST } = serve(async (context) => {
    const { videoId, userId, type } = context.requestPayload as InputType;

    // 1️⃣ Get video
    const video = await context.run("get-video", async () => {
        const [existingVideo] = await db
        .select()
        .from(videos)
        .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));

        if (!existingVideo) throw new Error("Not Found");

        return existingVideo;
    });

    // 2️⃣ Generate AI content
    const aiResponse = await context.run("generate-title-ai", async () => {
        const trackUrl = `https://stream.mux.com/${video.muxPlaybackId}/text/${video.muxTrackId}.txt`;
        const response = await fetch(trackUrl);
        const text = await response.text();

        if (!text) throw new Error("Subtitle Failed");

        const prompt = generatePrompt(type, text);

        return await generateContentWithFallback(prompt);
    });

    // 3️⃣ Update DB
    await context.run("update-video", async () => {
        if(type=="title"){
            await db
            .update(videos)
            .set({
                title: aiResponse,
                aiTitleStatus: "idle",
            })
            .where(and(eq(videos.id, video.id), eq(videos.userId, video.userId)));
        }
        else{
             await db
            .update(videos)
            .set({
                description: aiResponse,
                aiDescriptionStatus: "idle",
            })
            .where(and(eq(videos.id, video.id), eq(videos.userId, video.userId)));
        }
    });
});
