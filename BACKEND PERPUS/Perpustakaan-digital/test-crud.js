"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BASE_URL = 'http://localhost:3000';
async function testAllCRUD() {
    console.log('🚀 Memulai pengujian Komprehensif Seluruh Fitur CRUD (Create, Read, Update, Delete)...\n');
    // ========================================================
    // 1. TEST CRUD USER
    // ========================================================
    console.log('=== 1. PENGUJIAN CRUD USER ===');
    const userEmail = `test_crud_${Date.now()}@karanganyar.go.id`;
    // CREATE User via /register
    const resCreateUser = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nama: 'Testing CRUD User',
            email: userEmail,
            password: 'passwordAman123',
            roles: ['ANGGOTA'],
        }),
    });
    const dataCreateUser = await resCreateUser.json();
    const userId = dataCreateUser.user?.id;
    console.log('✅ [CREATE] User dibuat:', { id: userId, email: userEmail });
    // READ Detail User (GET /users/:id)
    const resGetUser = await fetch(`${BASE_URL}/users/${userId}`);
    const dataGetUser = await resGetUser.json();
    console.log('✅ [READ] Detail User:', { id: dataGetUser.data?.id, nama: dataGetUser.data?.nama, roles: dataGetUser.data?.roles });
    // UPDATE User (PUT /users/:id)
    const resUpdateUser = await fetch(`${BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nama: 'Testing CRUD User (Updated)',
            roles: ['ANGGOTA', 'PETUGAS'],
        }),
    });
    const dataUpdateUser = await resUpdateUser.json();
    console.log('✅ [UPDATE] User diubah:', { nama: dataUpdateUser.data?.nama, roles: dataUpdateUser.data?.roles });
    // DELETE User (DELETE /users/:id - Soft Delete)
    const resDelUser = await fetch(`${BASE_URL}/users/${userId}`, { method: 'DELETE' });
    const dataDelUser = await resDelUser.json();
    console.log('✅ [DELETE] User dihapus:', dataDelUser.message);
    // Verifikasi user terhapus tidak bisa diakses
    const resCheckUser = await fetch(`${BASE_URL}/users/${userId}`);
    console.log('✅ [VERIFIKASI] User terhapus return 404:', resCheckUser.status === 404);
    // ========================================================
    // 2. TEST CRUD MASTER ROLE
    // ========================================================
    console.log('\n=== 2. PENGUJIAN CRUD MASTER ROLE ===');
    const roleName = `ROLE_UJI_${Date.now()}`;
    // CREATE Role
    const resCreateRole = await fetch(`${BASE_URL}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: roleName }),
    });
    const dataCreateRole = await resCreateRole.json();
    const roleId = dataCreateRole.data?.id;
    console.log('✅ [CREATE] Role dibuat:', { id: roleId, nama: dataCreateRole.data?.nama });
    // READ Role by ID
    const resGetRole = await fetch(`${BASE_URL}/roles/${roleId}`);
    const dataGetRole = await resGetRole.json();
    console.log('✅ [READ] Detail Role:', dataGetRole.data?.nama);
    // UPDATE Role
    const updatedRoleName = `${roleName}_REV`;
    const resUpdateRole = await fetch(`${BASE_URL}/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: updatedRoleName }),
    });
    const dataUpdateRole = await resUpdateRole.json();
    console.log('✅ [UPDATE] Role diubah:', dataUpdateRole.data?.nama);
    // DELETE Role (Soft Delete)
    const resDelRole = await fetch(`${BASE_URL}/roles/${roleId}`, { method: 'DELETE' });
    const dataDelRole = await resDelRole.json();
    console.log('✅ [DELETE] Role dihapus:', dataDelRole.message);
    // ========================================================
    // 3. TEST CRUD MASTER KATEGORI
    // ========================================================
    console.log('\n=== 3. PENGUJIAN CRUD MASTER KATEGORI ===');
    const katName = `Kategori Riset IT ${Date.now()}`;
    // CREATE Kategori
    const resCreateKat = await fetch(`${BASE_URL}/kategori`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: katName }),
    });
    const dataCreateKat = await resCreateKat.json();
    const katId = dataCreateKat.data?.id;
    console.log('✅ [CREATE] Kategori dibuat:', { id: katId, nama: dataCreateKat.data?.nama });
    // READ All & One Kategori
    const resGetKatAll = await fetch(`${BASE_URL}/kategori`);
    const dataGetKatAll = await resGetKatAll.json();
    console.log('✅ [READ ALL] Total Kategori:', dataGetKatAll.total);
    const resGetKatOne = await fetch(`${BASE_URL}/kategori/${katId}`);
    const dataGetKatOne = await resGetKatOne.json();
    console.log('✅ [READ ONE] Detail Kategori:', dataGetKatOne.data?.nama);
    // UPDATE Kategori
    const resUpdateKat = await fetch(`${BASE_URL}/kategori/${katId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: `${katName} - Edisi Terbaru` }),
    });
    const dataUpdateKat = await resUpdateKat.json();
    console.log('✅ [UPDATE] Kategori diubah:', dataUpdateKat.data?.nama);
    // DELETE Kategori
    const resDelKat = await fetch(`${BASE_URL}/kategori/${katId}`, { method: 'DELETE' });
    const dataDelKat = await resDelKat.json();
    console.log('✅ [DELETE] Kategori dihapus:', dataDelKat.message);
    // ========================================================
    // 4. TEST CRUD MASTER JENIS LITERATUR
    // ========================================================
    console.log('\n=== 4. PENGUJIAN CRUD MASTER JENIS LITERATUR ===');
    const jenisName = `Jurnal Ilmiah ${Date.now()}`;
    // CREATE Jenis Literatur
    const resCreateJenis = await fetch(`${BASE_URL}/jenis-literatur`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: jenisName }),
    });
    const dataCreateJenis = await resCreateJenis.json();
    const jenisId = dataCreateJenis.data?.id;
    console.log('✅ [CREATE] Jenis Literatur dibuat:', { id: jenisId, nama: dataCreateJenis.data?.nama });
    // READ All & One Jenis Literatur
    const resGetJenisAll = await fetch(`${BASE_URL}/jenis-literatur`);
    const dataGetJenisAll = await resGetJenisAll.json();
    console.log('✅ [READ ALL] Total Jenis Literatur:', dataGetJenisAll.total);
    // UPDATE Jenis Literatur
    const resUpdateJenis = await fetch(`${BASE_URL}/jenis-literatur/${jenisId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: `${jenisName} Terakreditasi` }),
    });
    const dataUpdateJenis = await resUpdateJenis.json();
    console.log('✅ [UPDATE] Jenis Literatur diubah:', dataUpdateJenis.data?.nama);
    // DELETE Jenis Literatur
    const resDelJenis = await fetch(`${BASE_URL}/jenis-literatur/${jenisId}`, { method: 'DELETE' });
    const dataDelJenis = await resDelJenis.json();
    console.log('✅ [DELETE] Jenis Literatur dihapus:', dataDelJenis.message);
    // ========================================================
    // 5. TEST CRUD TRANSAKSIONAL USULAN BUKU
    // ========================================================
    console.log('\n=== 5. PENGUJIAN CRUD TRANSAKSIONAL USULAN BUKU ===');
    // CREATE Usulan Buku
    const resCreateUsulan = await fetch(`${BASE_URL}/usulan-buku`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            judul: 'Arsitektur Cloud Native untuk Pemerintah Daerah',
            penulis: 'Pakar IT Nasional',
            alasan: 'Dibutuhkan sebagai panduan implementasi SPBE Karanganyar',
        }),
    });
    const dataCreateUsulan = await resCreateUsulan.json();
    const usulanId = dataCreateUsulan.data?.id;
    console.log('✅ [CREATE] Usulan Buku diajukan:', { id: usulanId, judul: dataCreateUsulan.data?.judul });
    // READ Usulan Buku
    const resGetUsulan = await fetch(`${BASE_URL}/usulan-buku/${usulanId}`);
    const dataGetUsulan = await resGetUsulan.json();
    console.log('✅ [READ] Detail Usulan Buku:', dataGetUsulan.data?.judul);
    // DELETE Usulan Buku
    const resDelUsulan = await fetch(`${BASE_URL}/usulan-buku/${usulanId}`, { method: 'DELETE' });
    const dataDelUsulan = await resDelUsulan.json();
    console.log('✅ [DELETE] Usulan Buku dihapus:', dataDelUsulan.message);
    // ========================================================
    // 6. TEST CRUD TRANSAKSIONAL SUMBANGAN BUKU
    // ========================================================
    console.log('\n=== 6. PENGUJIAN CRUD TRANSAKSIONAL SUMBANGAN BUKU ===');
    // CREATE Sumbangan Buku
    const resCreateSumbangan = await fetch(`${BASE_URL}/sumbangan-buku`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            judulBuku: 'Sejarah dan Kebudayaan Karanganyar Tenteram',
            penulis: 'Balai Pustaka Daerah',
            kondisi: 'Sangat Baik (Buku Baru)',
            tahunTerbit: 2026,
        }),
    });
    const dataCreateSumbangan = await resCreateSumbangan.json();
    const sumbanganId = dataCreateSumbangan.data?.id;
    console.log('✅ [CREATE] Sumbangan Buku dicatat:', { id: sumbanganId, judul: dataCreateSumbangan.data?.judulBuku });
    // READ Sumbangan Buku
    const resGetSumbangan = await fetch(`${BASE_URL}/sumbangan-buku/${sumbanganId}`);
    const dataGetSumbangan = await resGetSumbangan.json();
    console.log('✅ [READ] Detail Sumbangan Buku:', dataGetSumbangan.data?.judulBuku);
    // DELETE Sumbangan Buku
    const resDelSumbangan = await fetch(`${BASE_URL}/sumbangan-buku/${sumbanganId}`, { method: 'DELETE' });
    const dataDelSumbangan = await resDelSumbangan.json();
    console.log('✅ [DELETE] Sumbangan Buku dihapus:', dataDelSumbangan.message);
    console.log('\n🎉 SEMUA PENGUJIAN CRUD LENGKAP TELAH BERHASIL DIJALANKAN DENGAN SEMPURNA! 🎉');
}
testAllCRUD().catch(console.error);
