/**
 * Strategy interface for calculating progress based on Resource Types.
 */
export interface IProgressStrategy {
  /**
   * Translates a raw analytics event stream into a normalized progress metric (0 to 100).
   */
  calculateProgress(events: any[], materialMetadata: any): number;
  
  /**
   * Determines if the specific criteria for completion are met.
   */
  isCompleted(events: any[], materialMetadata: any): boolean;
}

export class PdfProgressStrategy implements IProgressStrategy {
  calculateProgress(events: any[], materialMetadata: any): number {
    const totalPages = materialMetadata.pages || 1;
    let maxPageScrolled = 0;

    for (const event of events) {
      if (event.eventName === 'pdf_scrolled' && event.metadata.page > maxPageScrolled) {
        maxPageScrolled = event.metadata.page;
      }
    }
    
    return Math.min(100, Math.round((maxPageScrolled / totalPages) * 100));
  }

  isCompleted(events: any[], materialMetadata: any): boolean {
    const progress = this.calculateProgress(events, materialMetadata);
    // Custom logic: e.g., considered completed if 90% is viewed
    return progress >= 90;
  }
}

export class VideoProgressStrategy implements IProgressStrategy {
  calculateProgress(events: any[], materialMetadata: any): number {
    // Simplified: Find the max 'watch_duration' event
    // Reality: Calculate contiguous watched segments to prevent skipping
    let maxWatchedSeconds = 0;
    for (const event of events) {
      if (event.eventName === 'video_paused' && event.metadata.watchedSeconds > maxWatchedSeconds) {
        maxWatchedSeconds = event.metadata.watchedSeconds;
      }
    }

    const totalDuration = materialMetadata.durationSeconds || 1;
    return Math.min(100, Math.round((maxWatchedSeconds / totalDuration) * 100));
  }

  isCompleted(events: any[], materialMetadata: any): boolean {
    // For video, we might demand 95% completion
    return this.calculateProgress(events, materialMetadata) >= 95;
  }
}

// Future implementations: ScormProgressStrategy, AdaptiveProgressStrategy
