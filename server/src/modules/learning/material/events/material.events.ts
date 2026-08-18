import { ReadonlyDomainEvent } from '../../../authorization/types';

interface AssetPayload {
  assetId: string;
  fingerprint: string;
  status: string;
  storageKey: string;
}

interface MaterialVersionPayload {
  materialId: string;
  lessonId: string;
  version: number;
  assetId: string;
}

export type AssetDomainEvent = ReadonlyDomainEvent<AssetPayload>;
export type MaterialDomainEvent = ReadonlyDomainEvent<MaterialVersionPayload>;

export const CONTENT_EVENTS = {
  ASSET_UPLOADED: 'content.asset_uploaded',
  ASSET_SCANNING_STARTED: 'content.asset_scanning_started',
  ASSET_PROCESSING_STARTED: 'content.asset_processing_started',
  ASSET_READY: 'content.asset_ready',
  
  MATERIAL_CREATED: 'content.material_created',
  MATERIAL_VERSION_CREATED: 'content.material_version_created',
  MATERIAL_PUBLISHED: 'content.material_published',
  MATERIAL_ARCHIVED: 'content.material_archived',
} as const;
