import { CreateNoteDTO, NoteEntity } from '../dtos/workspace.dto';
import { IEncryptionProvider } from '../security/encryption.provider';
import { WORKSPACE_EVENTS } from '../events/workspace.events';
import { IEventPublisher } from '../../authorization/service';

export interface INoteRepository {
  create(data: Omit<NoteEntity, 'id'>): Promise<NoteEntity>;
}

export class NotesEngine {
  constructor(
    private readonly repo: INoteRepository,
    private readonly encryption: IEncryptionProvider,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async createNote(data: CreateNoteDTO): Promise<NoteEntity> {
    
    // 1. Privacy Boundary: Encrypt the raw content
    const encryptedContent = await this.encryption.encrypt(data.rawContent, data.studentId);
    
    // 2. AI-Ready Extraction: Strip markdown for search/embedding
    // (A real implementation would strip tags here)
    const searchableContent = data.rawContent.slice(0, 1000); 

    const notePayload: Omit<NoteEntity, 'id'> = {
      studentId: data.studentId,
      type: data.type,
      encryptedContent,
      searchableContent,
      embeddingStatus: 'PENDING', // Ready for Cron/AI job
      version: 1,
      syncStatus: 'SYNCED',
      lastDeviceId: data.deviceId,
      updatedAt: new Date()
    };

    const newNote = await this.repo.create(notePayload);

    // 3. Publish Private Domain Event
    this.eventPublisher.publish({
      eventId: require('crypto').randomUUID(),
      eventName: WORKSPACE_EVENTS.NOTE_CREATED,
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      tenantId: 'resolved-tenant-id', 
      correlationId: 'trace-id',
      requestId: 'req-id',
      metadata: {
        noteId: newNote.id,
        studentId: newNote.studentId,
        version: newNote.version,
        deviceId: newNote.lastDeviceId
      }
    });

    return newNote;
  }
}
