"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BASE_URL = 'http://localhost:3000';
async function testStatusBuku() {
    console.log('🚀 Memulai pengujian Fitur Flag Status Buku (Aktif / Nonaktif)...\n');
    // 1. Tambah Buku Baru
    console.log('--- 1. Testing POST /buku (Tambah Buku Default Aktif) ---');
    const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF');
    const formData = new FormData();
    formData.append('filePdf', new Blob([new Uint8Array(dummyPdf)], { type: 'application/pdf' }), 'test_status_buku.pdf');
    formData.append('judul', 'Buku Standar Operasional Karanganyar');
    formData.append('penulis', 'Diskominfo Bagian Tata Kelola');
    formData.append('isActive', 'true');
    const resAdd = await fetch(`${BASE_URL}/buku`, {
        method: 'POST',
        body: formData,
    });
    const dataAdd = await resAdd.json();
    console.log('Status Tambah:', resAdd.status);
    console.log('Buku Dibuat:', {
        id: dataAdd.data?.id,
        judul: dataAdd.data?.judul,
        isActive: dataAdd.data?.isActive,
        status: dataAdd.data?.status,
    });
    const bukuId = dataAdd.data?.id;
    if (!bukuId) {
        console.error('Gagal mendapatkan ID buku!');
        return;
    }
    // 2. Ubah Status Menjadi Nonaktif via PATCH /buku/:id/status
    console.log(`\n--- 2. Testing PATCH /buku/${bukuId}/status (Ubah ke Nonaktif) ---`);
    const resNonaktif = await fetch(`${BASE_URL}/buku/${bukuId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
    });
    const dataNonaktif = await resNonaktif.json();
    console.log('Hasil Ubah Status:', dataNonaktif);
    // 3. Filter Buku Nonaktif: GET /buku?status=nonaktif
    console.log('\n--- 3. Testing GET /buku?status=nonaktif (Cari Buku Nonaktif) ---');
    const resGetNonaktif = await fetch(`${BASE_URL}/buku?status=nonaktif`);
    const dataGetNonaktif = await resGetNonaktif.json();
    console.log('Total Buku Nonaktif:', dataGetNonaktif.total);
    const foundInNonaktif = dataGetNonaktif.data?.some((b) => b.id === bukuId);
    console.log('Apakah buku ditemukan di daftar nonaktif?', foundInNonaktif ? '✅ Ya' : '❌ Tidak');
    // 4. Filter Buku Aktif: GET /buku?status=aktif
    console.log('\n--- 4. Testing GET /buku?status=aktif (Cari Buku Aktif) ---');
    const resGetAktif = await fetch(`${BASE_URL}/buku?status=aktif`);
    const dataGetAktif = await resGetAktif.json();
    const foundInAktif = dataGetAktif.data?.some((b) => b.id === bukuId);
    console.log('Apakah buku nonaktif muncul di daftar aktif?', foundInAktif ? '❌ Ya (Salah)' : '✅ Tidak (Benar, tersembunyi)');
    // 5. Toggle Status Kembali ke Aktif (tanpa body)
    console.log(`\n--- 5. Testing PATCH /buku/${bukuId}/status (Toggle Otomatis ke Aktif) ---`);
    const resToggle = await fetch(`${BASE_URL}/buku/${bukuId}/status`, {
        method: 'PATCH',
    });
    const dataToggle = await resToggle.json();
    console.log('Hasil Toggle Status:', dataToggle);
    // 6. Update Detail Buku via PUT /buku/:id
    console.log(`\n--- 6. Testing PUT /buku/${bukuId} (Update Data Buku) ---`);
    const resUpdate = await fetch(`${BASE_URL}/buku/${bukuId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            judul: 'Buku Standar Operasional Karanganyar - Edisi Revisi',
            penerbit: 'Diskominfo Press',
        }),
    });
    const dataUpdate = await resUpdate.json();
    console.log('Hasil Update:', {
        judul: dataUpdate.data?.judul,
        penerbit: dataUpdate.data?.penerbit,
        status: dataUpdate.data?.status,
    });
    // 7. Cleanup Hapus Buku
    console.log(`\n--- 7. Cleanup DELETE /buku/${bukuId} ---`);
    const resDel = await fetch(`${BASE_URL}/buku/${bukuId}`, { method: 'DELETE' });
    const dataDel = await resDel.json();
    console.log('Hasil Hapus:', dataDel);
    console.log('\n🎉 Pengujian Fitur Status Flag Buku Selesai dengan Sukses!');
}
testStatusBuku().catch(console.error);
