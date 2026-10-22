import { Buffer } from 'node:buffer';

const BASE_URL = 'http://localhost:3000';

async function testUpload() {
  console.log('🔍 Memeriksa koneksi ke server backend...');
  try {
    const healthCheck = await fetch(`${BASE_URL}/`);
    const healthJson: any = await healthCheck.json();
    console.log('✅ Server backend online:', healthJson.message);
  } catch (err: any) {
    console.error('\n❌ Server backend belum berjalan di', BASE_URL);
    console.error('👉 Silakan jalankan backend terlebih dahulu di terminal dengan perintah:');
    console.error('   npm run dev\n');
    process.exit(1);
  }

  // File PDF dummy yang valid untuk pengujian
  const dummyPdf = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n' +
    'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n' +
    'trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF'
  );

  // 1. Test POST /upload/pdf (Upload PDF saja ke MinIO)
  console.log('\n--- 1. Testing POST /upload/pdf (Upload PDF ke MinIO) ---');
  const formData1 = new FormData();
  formData1.append(
    'filePdf',
    new Blob([new Uint8Array(dummyPdf)], { type: 'application/pdf' }),
    'panduan_diskominfo.pdf'
  );

  const res1 = await fetch(`${BASE_URL}/upload/pdf`, {
    method: 'POST',
    body: formData1,
  });
  const data1: any = await res1.json();
  console.log('Status:', res1.status);
  console.log('Hasil Upload:', data1);

  // 2. Test POST /buku (Upload PDF + Simpan Data Buku ke MySQL Prisma)
  console.log('\n--- 2. Testing POST /buku (Simpan Buku + Upload MinIO) ---');
  const formData2 = new FormData();
  formData2.append(
    'filePdf',
    new Blob([new Uint8Array(dummyPdf)], { type: 'application/pdf' }),
    'buku_sejarah_karanganyar.pdf'
  );
  formData2.append('judul', 'Buku Panduan SPBE Diskominfo Karanganyar');
  formData2.append('penulis', 'Tim IT Diskominfo');
  formData2.append('penerbit', 'Pemerintah Kabupaten Karanganyar');
  formData2.append('tahunTerbit', '2026');
  formData2.append('isGratis', 'true');

  const res2 = await fetch(`${BASE_URL}/buku`, {
    method: 'POST',
    body: formData2,
  });
  const data2: any = await res2.json();
  console.log('Status:', res2.status);
  console.log('Hasil Tambah Buku:', data2);

  const bukuId = data2.data?.id;

  // 3. Test GET /buku (Ambil semua buku beserta Presigned URL MinIO)
  console.log('\n--- 3. Testing GET /buku ---');
  const res3 = await fetch(`${BASE_URL}/buku`);
  const data3: any = await res3.json();
  console.log('Status:', res3.status);
  console.log('Daftar Buku:', JSON.stringify(data3, null, 2));

  // 4. Test GET /buku/:id dan Streaming PDF
  if (bukuId) {
    console.log(`\n--- 4. Testing GET /buku/${bukuId} (Detail Buku) ---`);
    const res4 = await fetch(`${BASE_URL}/buku/${bukuId}`);
    const data4: any = await res4.json();
    console.log('Detail Buku:', data4);

    console.log(`\n--- 5. Testing GET /buku/${bukuId}/pdf (Streaming Baca PDF) ---`);
    const res5 = await fetch(`${BASE_URL}/buku/${bukuId}/pdf`);
    console.log('Status Streaming:', res5.status);
    console.log('Content-Type:', res5.headers.get('content-type'));
    console.log('Content-Disposition:', res5.headers.get('content-disposition'));
    const pdfBytes = await res5.arrayBuffer();
    console.log('Ukuran PDF yang diterima:', pdfBytes.byteLength, 'bytes');

    console.log(`\n--- 6. Testing DELETE /buku/${bukuId} (Hapus Buku & PDF MinIO) ---`);
    const res6 = await fetch(`${BASE_URL}/buku/${bukuId}`, { method: 'DELETE' });
    const data6: any = await res6.json();
    console.log('Hasil Hapus Buku:', data6);
  }

  console.log('\n✨ Semua pengujian berhasil dijalankan!');
}

testUpload().catch((err) => {
  console.error('\n❌ Terjadi kesalahan saat pengujian:', err);
});
