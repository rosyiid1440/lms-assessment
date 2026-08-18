export interface SearchDocument {
  id: string; // The ID of the aggregate (e.g., LessonId, MaterialId)
  tenantId: string;
  type: string; // 'LESSON', 'MATERIAL', 'ASSIGNMENT'
  title: string;
  content: string; // The extracted searchableText
  tags?: string[];
  attributes?: Record<string, any>; // e.g., authorId, subjectId
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  snippet: string; // Highlighted match
  score: number;
}

/**
 * Universal Search Engine Interface.
 * Agnostic to Postgres FTS, ElasticSearch, or Meilisearch.
 */
export interface ISearchProvider {
  /**
   * Upserts a document into the search index.
   */
  indexDocument(doc: SearchDocument): Promise<void>;
  
  /**
   * Removes a document from the index.
   */
  deleteDocument(id: string, type: string): Promise<void>;
  
  /**
   * Performs a full-text or semantic search.
   */
  search(query: string, filters?: { tenantId?: string; type?: string; tags?: string[] }, limit?: number): Promise<SearchResult[]>;
}
