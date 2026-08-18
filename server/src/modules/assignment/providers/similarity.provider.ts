/**
 * Standardized result for Similarity/Plagiarism checks
 */
export interface SimilarityReport {
  score: number; // 0.0 to 1.0 (0% to 100%)
  matchedSources: {
    sourceUrl?: string;
    internalSubmissionId?: string; // If matched against another student's work
    matchPercentage: number;
    snippet: string;
  }[];
  processedAt: Date;
}

/**
 * Agnostic Provider Interface.
 * Can be implemented by Local MinHash, OpenAI Embeddings, or Turnitin API.
 */
export interface ISimilarityProvider {
  /**
   * Identifies provider for logging (e.g., 'LOCAL_VECTOR', 'TURNITIN')
   */
  readonly providerName: string;

  /**
   * Queues text/files for similarity check.
   */
  checkSimilarity(content: string, tenantId: string): Promise<SimilarityReport>;
}
