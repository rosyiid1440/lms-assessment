export interface AiPromptOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AiResponse {
  content: string;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
  provider: string; // e.g., 'OPENAI', 'OLLAMA'
}

/**
 * Universal AI Provider Interface.
 * Agnostic to OpenAI, Gemini, or Local LLMs.
 */
export interface IAIProvider {
  /**
   * Generates text completion based on prompt.
   */
  generateText(prompt: string, options?: AiPromptOptions): Promise<AiResponse>;
  
  /**
   * Generates vector embeddings for Semantic Search / RAG.
   */
  generateEmbeddings(text: string): Promise<number[]>;
}
