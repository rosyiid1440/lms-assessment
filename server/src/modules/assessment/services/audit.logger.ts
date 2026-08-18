import { PrismaClient } from '@prisma/client';

/**
 * Append-only audit helper for the Assessment domain.
 * Writes to the forensic AuditLog table (tenant-scoped, never updated/deleted).
 */
export class AuditLogger {
  constructor(private readonly prisma: PrismaClient) {}

  async log(params: {
    tenantId: string;
    actorId?: string | null;
    resource: string;
    resourceId?: string | null;
    action: string;
    severity?: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
    correlationId?: string | null;
    requestId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    oldValues?: unknown;
    newValues?: unknown;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: params.tenantId,
          actorId: params.actorId ?? null,
          resource: params.resource,
          resourceId: params.resourceId ?? null,
          action: params.action,
          severity: params.severity ?? 'INFO',
          correlationId: params.correlationId ?? null,
          requestId: params.requestId ?? null,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          events: {
            create: [
              {
                oldValues: params.oldValues !== undefined ? (params.oldValues as any) : undefined,
                newValues: params.newValues !== undefined ? (params.newValues as any) : undefined,
                diffSummary: params.oldValues !== undefined && params.newValues !== undefined ? 'assessments:change' : null,
              },
            ],
          },
        },
      });
    } catch (error) {
      // Audit must never break the main operation.
      console.error('[audit] failed to write audit log', error);
    }
  }
}
