# Authorization Module

## Tujuan Modul
Mengisolasi seluruh logika *Access Control* ke dalam satu domain murni (Domain-Driven Design). Modul ini bertanggung jawab mengevaluasi *Role-Based Access Control* (RBAC) dan *Attribute/Ownership-Based Access Control* (ABAC/Policies) tanpa mencampurnya dengan logika HTTP (Express Middleware) maupun ORM (Prisma).

## Dependency
*   `RequestContextService` (untuk mengekstrak `tenantId`, `userId`, `roleId`).
*   `IEventPublisher` (opsional: jika hasil otorisasi diteruskan ke Audit Log eksternal).
*   Abstraksi Metrik (`IMetricPublisher`).

## Sequence Evaluasi
1.  **Request Masuk**: Express mengekstrak *JWT* & *Session*, mengisi `RequestContext`.
2.  **Middleware Adapter**: Memanggil `AuthorizationService.checkPermission()` atau `checkPolicy()`.
3.  **Super Admin Bypass**: Service memeriksa `ISuperAdminStrategy`. Jika *True*, proses selesai (Allow).
4.  **RBAC Evaluation**: `PermissionEvaluator` merangkai `Resource:Action`, mengecek `MemoryPermissionCache`. Jika *Miss*, memanggil `IPermissionRepository` (DB).
5.  **Policy Evaluation**: Service mengambil `IPolicy` dari `PolicyRegistry`.
6.  **Decision Logger**: Hasil akhir (termasuk *Latency* & Alasan) dicetak sebagai *Structured JSON Log*.
7.  **Middleware Response**: Jika *Denied*, adapter melempar `PermissionDeniedException` / `OwnershipDeniedException`.

## Lifecycle Cache
Menggunakan `MemoryPermissionCache` (In-Memory).
*   Setiap entri bertahan selama TTL (Default: 1 Jam).
*   *Cache Warming:* Dapat dipanggil via skrip saat server *startup* dengan melooping `PermissionRepository.getAll()`.
*   *Invalidation:* Panggil `cache.invalidateRole(roleId)` saat admin mengubah hak akses peran di Dashboard.

## Extension Point
*   **Tenant Strategy:** Ganti cara resolve tenant (JWT/Subdomain/Header).
*   **Super Admin Strategy:** Ganti logika *bypass* Admin.
*   **Policy Registry:** Daftarkan *Policy* baru secara dinamis.

## Contoh Implementasi Policy Baru

```typescript
// 1. Buat Policy menggunakan komposisi
export class AssignmentTeacherPolicy implements IPolicy {
  constructor(private assignmentRepo: IAssignmentRepository) {}

  async evaluate(ctx: AuthorizationContext): Promise<AuthorizationResult> {
    if (!ctx.resourceId) return AuthorizationResult.deny(ctx, 'No ID provided', 'AssignmentTeacherPolicy', 0);
    
    const ownerId = await this.assignmentRepo.getOwnerId(ctx.resourceId);
    if (ownerId === ctx.requestContext.identity.userId) {
       return AuthorizationResult.allow(ctx, 'AssignmentTeacherPolicy', 0);
    }
    return AuthorizationResult.deny(ctx, 'User is not the owner', 'AssignmentTeacherPolicy', 0);
  }
}

// 2. Daftarkan di saat Bootstrapping
PolicyRegistry.register('Assignment', new AssignmentTeacherPolicy(new PrismaAssignmentRepo()));
```
