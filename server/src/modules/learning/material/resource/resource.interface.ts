export interface IResourceMetadata {
  sizeBytes?: number;
  durationSeconds?: number;
  pages?: number;
  dimensions?: { width: number; height: number };
  codec?: string;
  externalId?: string; // e.g., YouTube Video ID
  customData?: Record<string, any>;
}

export interface IResourcePreview {
  thumbnailUrl: string;
  previewUrl?: string; // HTML, PDF first page, etc.
}

export interface ProcessedResource {
  metadata: IResourceMetadata;
  preview: IResourcePreview;
  searchableContent: string; // Ready for Full Text Search / AI Embeddings
}

/**
 * The core contract for the Content Engine.
 * Every material type (PDF, Video, YouTube) MUST implement this.
 */
export interface IResourceStrategy {
  readonly type: string;
  
  /**
   * Validates the raw input (File object, URL string, etc.)
   * Throws ValidationException if invalid.
   */
  validate(input: any): Promise<void>;

  /**
   * Extracts metadata, generates previews, and extracts raw text for search/AI.
   */
  process(input: any): Promise<ProcessedResource>;
}
