# ADR-002: Penerapan Pola CQRS-Lite untuk Optimasi Pembacaan Data

**Status:** Accepted (Locked)
**Date:** 2026-07-29

## Context
Aplikasi LMS memiliki rasio baca dan tulis (Read-to-Write ratio) yang sangat tidak seimbang. Siswa lebih sering membaca daftar kelas, melihat tugas, dan memeriksa nilai (Reads) daripada membuat tugas atau mempublikasikan nilai (Writes). Menggunakan satu *Repository* untuk kedua operasi ini akan menyebabkan *query* yang kompleks (banyak JOIN) dan membahayakan performa database transaksional.

## Decision
Kita mengadopsi pola **CQRS-Lite** (Command Query Responsibility Segregation tanpa arsitektur microservice terpisah).
1.  **Command Repository:** Digunakan oleh *Service* untuk melakukan perubahan data (`INSERT`, `UPDATE`). Murni mengandalkan *Prisma Entity* penuh dan mengamankan integritas menggunakan *Optimistic Concurrency Control (OCC)*.
2.  **Query Repository:** Digunakan untuk menampilkan data ke *Dashboard*. Menghasilkan *Projection DTO* yang ringan. Lapisan ini bebas melakukan *query* seagresif mungkin dan dilengkapi dengan **Version-based Caching**.

## Consequences
*   **Keuntungan:** Performa *Dashboard* (latensi < 10ms), beban database PostgreSQL utama berkurang drastis, *cache invalidation* terjadi secara otomatis saat *version aggregate* naik.
*   **Kekurangan:** Kode *Repository* berlipat ganda (*Command* vs *Query*). Perlu kehati-hatian ekstra agar *Command* tidak secara tidak sengaja memanggil metode *Query* untuk validasi bisnis kritis.
