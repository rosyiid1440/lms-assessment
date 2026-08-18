/**
 * Kurikulum Merdeka Competency Linking
 */
export interface CompetencyMetadata {
  fase: string;          // e.g., 'E', 'F'
  elemen: string;        // e.g., 'Aljabar', 'Geometri'
  cpId?: string;         // Capaian Pembelajaran ID
  tpId?: string;         // Tujuan Pembelajaran ID
  atpId?: string;        // Alur Tujuan Pembelajaran ID
  indikator?: string;
}

export type QuestionType = 'MULTIPLE_CHOICE' | 'MULTIPLE_RESPONSE' | 'TRUE_FALSE' | 'NUMERIC' | 'ESSAY' | 'FILE_UPLOAD';
export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'HOTS'; // HOTS: Higher Order Thinking Skills

export interface CreateQuestionDTO {
  tenantId: string;
  subjectId: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  
  content: string; // Rich Text or Markdown
  attachments?: string[]; // Asset IDs for images/audio
  
  // Strategy Specific Payload (e.g., choices for MCQ, tolerance for Numeric)
  strategyPayload: any; 
  
  // Analytics & Adaptive Ready
  competency: CompetencyMetadata;
  estimatedTimeSeconds: number; // For CAT algorithm
  
  // Metadata & Tags
  tags: string[];
}

export interface QuestionSummaryDTO {
  id: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  snippet: string; // First 100 chars of content
  competency: CompetencyMetadata;
  usageCount: number; // How many exams use this
  successRate?: number; // Calculated async for Analytics (0.0 - 1.0)
}
