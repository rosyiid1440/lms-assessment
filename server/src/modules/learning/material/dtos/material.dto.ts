// ---------------------------------------------------------
// ASSET DTOs (Physical Files / URLs)
// ---------------------------------------------------------
export type AssetStatus = 'UPLOADED' | 'SCANNING' | 'PROCESSING' | 'READY' | 'ARCHIVED' | 'DELETED';
export type StorageProviderType = 'LOCAL' | 'S3' | 'CLOUDFLARE_R2';

export interface CreateAssetDTO {
  tenantId: string;
  fingerprint: string; // SHA-256 hash of the file/content
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  provider: StorageProviderType;
  storageKey: string; // The path or object key in the storage provider
}

export interface AssetSummaryDTO {
  id: string;
  fingerprint: string;
  mimeType: string;
  status: AssetStatus;
  provider: StorageProviderType;
  storageKey: string;
  metadata: any; // Duration, dimensions, pages
}

// ---------------------------------------------------------
// MATERIAL DTOs (Learning Context)
// ---------------------------------------------------------
export type MaterialStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface CreateMaterialDTO {
  tenantId: string;
  lessonId: string;
  assetId: string;
  title: string;
  description?: string;
  order: number;
}

export interface CreateMaterialVersionDTO {
  tenantId: string;
  materialId: string;
  assetId: string;
  title: string;
  description?: string;
  expectedCurrentVersion: number;
}

// ---------------------------------------------------------
// PROJECTIONS (CQRS Read Models)
// ---------------------------------------------------------
export interface MaterialCardDTO {
  id: string;
  lessonId: string;
  title: string;
  mimeType: string;
  assetStatus: AssetStatus;
  version: number;
  thumbnailUrl?: string;
}

export interface MaterialDetailDTO {
  id: string;
  lessonId: string;
  status: MaterialStatus;
  currentVersion: number;
  activeVersion: {
    title: string;
    description?: string;
    asset: AssetSummaryDTO;
    searchableContent: string;
    createdAt: Date;
  };
}
