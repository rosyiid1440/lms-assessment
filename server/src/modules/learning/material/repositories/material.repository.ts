import { CreateAssetDTO, AssetSummaryDTO, AssetStatus, CreateMaterialDTO, CreateMaterialVersionDTO, MaterialDetailDTO } from '../dtos/material.dto';

export interface IAssetRepository {
  /**
   * Fast lookup for deduplication
   */
  findByFingerprint(fingerprint: string, tenantId: string): Promise<AssetSummaryDTO | null>;
  findById(id: string, tenantId: string): Promise<AssetSummaryDTO | null>;
  create(data: CreateAssetDTO): Promise<AssetSummaryDTO>;
  updateStatus(id: string, tenantId: string, status: AssetStatus): Promise<void>;
  updateMetadata(id: string, tenantId: string, metadata: any): Promise<void>;
}

export interface IMaterialCommandRepository {
  /**
   * Creates the Aggregate Root (Material) AND its first Version atomically.
   */
  createMaterial(data: CreateMaterialDTO): Promise<MaterialDetailDTO>;
  
  /**
   * Creates a new version and updates the aggregate's currentVersion pointer (OCC protected).
   */
  createVersion(data: CreateMaterialVersionDTO): Promise<MaterialDetailDTO>;
  
  /**
   * Updates state (Published, Archived)
   */
  updateStatus(id: string, tenantId: string, status: string, expectedVersion: number): Promise<void>;
}

export interface IMaterialQueryRepository {
  /**
   * CQRS Projection: Get a specific material mapped to MaterialDetailDTO.
   * Utilizes internal Cache based on `version`.
   */
  getMaterialDetail(id: string, tenantId: string, version?: number): Promise<MaterialDetailDTO | null>;
  
  /**
   * CQRS Projection: Get a list of lightweight cards for a Lesson.
   */
  getMaterialCardsByLesson(lessonId: string, tenantId: string): Promise<any[]>; // Returns MaterialCardDTO[]
}
