import { ReadonlyDomainEvent } from '../../authorization/types';

// Standardized Workspace Payload
interface WorkspacePayload {
  aggregateId: string;
  studentId: string;
  courseId: string;
  version: number;
  deviceId: string;
}

export type WorkspaceDomainEvent = ReadonlyDomainEvent<WorkspacePayload>;

/**
 * PRIVATE Domain Events.
 * Must NOT be forwarded to Teacher Analytics or General Dashboards.
 */
export const WORKSPACE_EVENTS = {
  BOOKMARK_CREATED: 'workspace.bookmark_created',
  NOTE_CREATED: 'workspace.note_created',
  NOTE_UPDATED: 'workspace.note_updated',
  NOTE_DELETED: 'workspace.note_deleted',
  HIGHLIGHT_CREATED: 'workspace.highlight_created',
  READING_POSITION_UPDATED: 'workspace.reading_position_updated',
} as const;
