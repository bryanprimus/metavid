import { Input, ALL_FORMATS, FilePathSource } from "mediabunny";
import path from "path";

export type MediaMetadata = {
  Title: string;
  Duration: number;
  DateCreated: string;
  Resolution: string;
  FileSize: number;
  Format: string;
};

export async function extractMediaMetadata(
  filePath: string,
): Promise<MediaMetadata | null> {
  let input: Input<FilePathSource> | undefined = undefined;
  try {
    const stats = Bun.file(filePath);

    input = new Input({
      source: new FilePathSource(filePath),
      formats: ALL_FORMATS,
    });

    const tags = await input.getMetadataTags();

    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) {
      throw new Error("No video stream found in this file.");
    }

    const durationInSeconds = await input.computeDuration();

    const videoInfo = {
      Title: tags.title || path.parse(filePath).name,
      Duration: durationInSeconds * 1000,
      DateCreated: tags.date
        ? new Date(tags.date).toLocaleString()
        : new Date(stats.lastModified).toISOString(),
      Resolution: `${videoTrack.displayWidth}x${videoTrack.displayHeight}`,
      FileSize: stats.size,
      Format: path.extname(filePath).toUpperCase().replace(".", ""),
    };

    return videoInfo;
  } catch (error: any) {
    console.error(`Error processing file ${filePath}: ${error.message}`);
    return null;
  } finally {
    if (input) {
      input.dispose();
    }
  }
}
