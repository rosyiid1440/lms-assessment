import { PrismaClient } from '@prisma/client';
import { PrismaBaseWorker } from '../../../core/worker/PrismaBaseWorker';
import { JobContext } from '../../../core/worker/JobContext';
import { EventBus } from '../../../core/infrastructure/event-bus/EventBus'; // Adjust import if needed

export interface AssetUploadedPayload {
  assetId: string;
  fileUrl: string;
  mimeType: string;
}

export class AssetUploadedWorker extends PrismaBaseWorker<AssetUploadedPayload> {
  constructor(prisma: PrismaClient, private readonly eventBus?: EventBus) {
    super(prisma);
  }

  get name(): string {
    return 'learning.asset.uploaded';
  }

  protected async validate(payload: AssetUploadedPayload, context: JobContext): Promise<void> {
    if (!payload.assetId || !payload.fileUrl) {
      throw new Error('Invalid payload: missing assetId or fileUrl');
    }
    const asset = await this.prisma.asset.findUnique({ where: { id: payload.assetId } });
    if (!asset) {
      throw new Error(`Asset not found: ${payload.assetId}`);
    }
  }

  protected async execute(payload: AssetUploadedPayload, context: JobContext): Promise<void> {
    console.log(`[AssetUploadedWorker] Processing asset: ${payload.assetId}`);
    
    // 1. Virus Scan (Mocked logic)
    console.log(`[AssetUploadedWorker] Virus scanning ${payload.fileUrl}...`);
    const isClean = true; 
    
    if (!isClean) {
        await this.prisma.asset.update({
            where: { id: payload.assetId },
            data: { status: 'DELETED' } // Assuming some status enum
        });
        throw new Error('Virus detected in asset');
    }

    // 2. Metadata Extraction (Mocked logic)
    console.log(`[AssetUploadedWorker] Extracting metadata...`);
    const metadata = { size: 1024, dimension: "1920x1080" };

    // 3. Update Asset to READY
    await this.prisma.asset.update({
      where: { id: payload.assetId },
      data: {
        status: 'READY', // Use appropriate enum value
        metadata: metadata
      }
    });
  }

  protected async onSuccess(payload: AssetUploadedPayload, context: JobContext): Promise<void> {
    // 4. Publish AssetReady Event
    console.log(`[AssetUploadedWorker] Success for asset: ${payload.assetId}. Publishing AssetReady event.`);
    if (this.eventBus) {
        // Mock event publish
        // await this.eventBus.publish('learning.asset.ready', { assetId: payload.assetId });
    }
  }
}
