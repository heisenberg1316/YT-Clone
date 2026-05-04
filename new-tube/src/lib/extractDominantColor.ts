import { getAverageColor } from "fast-average-color-node";

export async function extractDominantColorFromUrl(imageUrl: string) {
    const response = await fetch(imageUrl);

    if (!response.ok) {
        throw new Error("Failed to fetch image");
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const color = await getAverageColor(buffer);

    return {
        hex: color.hex,
        rgb: color.rgb,
        isDark: color.isDark,
    };
}