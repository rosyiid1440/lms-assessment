import { IResourceStrategy, ProcessedResource } from '../resource.interface';
import { ResourceValidator } from '../validators/resource.validators';

export class YoutubeResourceStrategy implements IResourceStrategy {
  public readonly type = 'YOUTUBE';

  async validate(input: any): Promise<void> {
    await ResourceValidator.validateYoutube(input);
  }

  async process(input: any): Promise<ProcessedResource> {
    // 1. Extract Video ID using Regex
    const videoIdMatch = input.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : 'UNKNOWN';

    // 2. In reality, call YouTube Data API (v3) here to get duration, title, description, tags
    const mockDurationSeconds = 600; // 10 minutes
    const mockDescription = "Extracted description from YouTube Data API.";

    return {
      metadata: {
        externalId: videoId,
        durationSeconds: mockDurationSeconds,
      },
      preview: {
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // Auto-generate standard YT thumb
        previewUrl: `https://www.youtube.com/embed/${videoId}`
      },
      searchableContent: mockDescription // Makes the video searchable by its transcript/description
    };
  }
}
