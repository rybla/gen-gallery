import { imageSize } from "image-size";

export async function getRemoteImageDimensions(
  url: string,
): Promise<{ height: number; width: number }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const dimensions = imageSize(buffer);

  return dimensions;
}
