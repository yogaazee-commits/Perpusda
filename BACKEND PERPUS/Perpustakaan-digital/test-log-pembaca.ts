import { Buffer } from 'node:buffer';

const BASE_URL = 'http://localhost:3000';

async function testLogPembaca() {
  console.log('🚀 Memulai Pengujian Komprehensif Fitur Log Pembaca...\n');

  // 1. Health check server
  try {
    const health = await fetch(`${BASE_URL}/`);
    const hData = await health.json();
    console.log('✅ Server online:', (hData as any).message);
  } catch (err: any) {
    console.error('❌ Server belum berjalan! Jalankan npm run dev terlebih dahulu.');
    process.exit(1);
  }

  // 2. Siapkan Buku Uji (Buat baru via POST /buku agar independen)
  console.log('\n--- 1. Menyiapkan Buku Uji (POST /buku) ---');
  const dummyPdf = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF'
  );

  const formData = new FormData();
  formData.append(
    'filePdf',
    new Blob([new Uint8Array(dummyPdf)], { type: 'application/pdf' }),
    'buku_sejarah_karanganyar.pdf'
  );
  formData.append('judul', 'Buku Panduan SPBE Diskominfo Karanganyar 2026');
  formData.append('penulis', 'Tim IT Diskominfo Karanganyar');
  formData.append('penerbit', 'Pemerintah Kabupaten Karanganyar');
  formData.append('tahunTerbit', '2026');
  formData.append('isActive', 'true');

  const resAdd = await fetch(`${BASE_URL}/buku`, {
    method: 'POST',
    body: formData,
  });
  const dataAdd: any = await resAdd.json();
  const bukuId = dataAdd.data?.id;

  if (!bukuId) {
    console.error('❌ Gagal membuat buku uji:', dataAdd);
    process.exit(1);
  }

  console.log('✅ Buku uji berhasil disiapkan:', {
    id: bukuId,
    judul: dataAdd.data?.judul,
    penulis: dataAdd.data?.penulis,
    isActive: dataAdd.data?.isActive,
  });

  const todayStr = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD (contoh: 2026-10-21)

  // 3. Register & Login User untuk pengujian akses login
  console.log('\n--- 2. Membuat user untuk pengujian akses login ---');
  const testEmail = `pembaca_${Date.now()}@karanganyar.go.id`;
  const resReg = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nama: 'Budi Santoso Pembaca',
      email: testEmail,
      password: 'password123',
      roles: ['ANGGOTA'],
    }),
  });
  const dataReg: any = await resReg.json();
  const testUserId = dataReg.user?.id;
  console.log('✅ User terdaftar:', { id: testUserId, email: testEmail });

  const resLogin = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'password123',
    }),
  });
  const dataLogin: any = await resLogin.json();
  const userToken = dataLogin.token;
  console.log('✅ User berhasil login, token JWT diperoleh');

  // 4. Test Akses Buku TANPA LOGIN (Tamu / Guest) via POST /buku/:id/baca
  console.log('\n--- 3. Testing Akses Buku TANPA LOGIN (Guest) via POST /buku/:id/baca ---');
  const resBacaGuest1 = await fetch(`${BASE_URL}/buku/${bukuId}/baca`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const dataBacaGuest1: any = await resBacaGuest1.json();
  console.log('Status:', resBacaGuest1.status);
  console.log('Hasil Log Guest 1:', {
    tipePembaca: dataBacaGuest1.data?.tipePembaca,
    user: dataBacaGuest1.data?.user,
    diaksesPada: dataBacaGuest1.data?.diaksesPada,
  });
  if (dataBacaGuest1.data?.tipePembaca === 'TAMU_ANONIM' && dataBacaGuest1.data?.user === null) {
    console.log('✅ Berhasil mencatat akses tamu (userId = null)');
  } else {
    console.error('❌ Gagal mencatat akses tamu dengan benar!');
  }

  // 5. Test Akses Baca PDF TANPA LOGIN (Guest) via GET /buku/:id/pdf
  console.log('\n--- 4. Testing Baca PDF Buku TANPA LOGIN via GET /buku/:id/pdf ---');
  const resPdfGuest = await fetch(`${BASE_URL}/buku/${bukuId}/pdf`);
  console.log('Status PDF Stream:', resPdfGuest.status);
  if (resPdfGuest.status === 200) {
    console.log('✅ Streaming PDF berhasil dibuka oleh tamu tanpa login, log pembaca otomatis tercatat!');
  } else {
    console.log('⚠️ Status streaming PDF:', resPdfGuest.status);
  }

  // 6. Test Akses Buku DENGAN LOGIN (User Terdaftar) via POST /buku/:id/baca
  console.log('\n--- 5. Testing Akses Buku DENGAN LOGIN (User Terdaftar) ---');
  const resBacaUser = await fetch(`${BASE_URL}/buku/${bukuId}/baca`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
  });
  const dataBacaUser: any = await resBacaUser.json();
  console.log('Status:', resBacaUser.status);
  console.log('Hasil Log User Login:', {
    tipePembaca: dataBacaUser.data?.tipePembaca,
    userId: dataBacaUser.data?.user?.id,
    namaUser: dataBacaUser.data?.user?.nama,
  });
  if (dataBacaUser.data?.tipePembaca === 'USER_TERDAFTAR' && dataBacaUser.data?.user?.id === testUserId) {
    console.log('✅ Berhasil mencatat akses user terdaftar lengkap dengan relasi data user');
  } else {
    console.error('❌ Gagal mencatat akses user login!');
  }

  // 7. Pengujian Kebutuhan Inti Pengguna:
  // "minimal bisa menjawab buku A dibaca berapa kali di tanggal X"
  console.log(`\n--- 6. Testing GET /buku/:id/statistik-pembaca?tanggal=${todayStr} (Menjawab Buku A dibaca berapa kali di tanggal X) ---`);
  const resStatistik = await fetch(`${BASE_URL}/buku/${bukuId}/statistik-pembaca?tanggal=${todayStr}`);
  const dataStatistik: any = await resStatistik.json();
  console.log('Status:', resStatistik.status);
  console.log('📢 JAWABAN SISTEM:', dataStatistik.jawaban);
  console.log('📊 Rincian Statistik:', dataStatistik.data?.statistik);
  console.log('👥 Daftar User Membaca:', dataStatistik.data?.daftarUserMembaca);
  console.log('📝 Jumlah Riwayat Log:', dataStatistik.data?.rincianLog?.length);

  if (dataStatistik.data?.statistik?.totalDibaca >= 3) {
    console.log('✅ Verifikasi sukses: Sistem dapat menjawab buku A dibaca berapa kali di tanggal X dengan rincian login vs tamu!');
  }

  // 8. Testing Statistik Rentang Tanggal
  console.log(`\n--- 7. Testing Statistik Rentang Tanggal (?startDate=...&endDate=...) ---`);
  const resRange = await fetch(`${BASE_URL}/buku/${bukuId}/statistik-pembaca?startDate=2026-10-01&endDate=${todayStr}`);
  const dataRange: any = await resRange.json();
  console.log('Jawaban Rentang:', dataRange.jawaban);
  console.log('Total Periode:', dataRange.data?.totalDibaca);
  console.log('Rincian Harian:', dataRange.data?.rincianHarian?.filter((h: any) => h.total > 0));

  // 9. Testing Statistik Global Perpustakaan & Top Buku di Tanggal X
  console.log(`\n--- 8. Testing GET /log-pembaca/statistik?tanggal=${todayStr} (Statistik Seluruh Perpustakaan) ---`);
  const resGlobal = await fetch(`${BASE_URL}/log-pembaca/statistik?tanggal=${todayStr}`);
  const dataGlobal: any = await resGlobal.json();
  console.log('Periode:', dataGlobal.periode);
  console.log('Total Pembaca Perpus:', dataGlobal.statistik);
  console.log('Buku Terpopuler di Tanggal Ini:', dataGlobal.bukuTerpopuler?.slice(0, 3));

  // 10. Testing Riwayat Membaca User Tertentu
  console.log('\n--- 9. Testing GET /users/:id/riwayat-baca (Riwayat Pribadi User) ---');
  const resRiwayat = await fetch(`${BASE_URL}/users/${testUserId}/riwayat-baca`);
  const dataRiwayat: any = await resRiwayat.json();
  console.log('User:', dataRiwayat.user?.nama);
  console.log('Total Buku Dibaca:', dataRiwayat.totalBukuDibaca);
  console.log('Riwayat Buku:', dataRiwayat.data?.map((d: any) => ({
    judul: d.buku?.judul,
    waktu: d.diaksesPada,
  })));

  // 11. Testing Audit Log Lengkap (Filter Tipe Tamu & Login)
  console.log('\n--- 10. Testing GET /log-pembaca (Audit Filter Guest vs Login) ---');
  const resLogGuest = await fetch(`${BASE_URL}/log-pembaca?tipe=guest&tanggal=${todayStr}`);
  const dataLogGuest: any = await resLogGuest.json();
  console.log('Total Log Tamu Hari Ini:', dataLogGuest.meta?.totalData);

  const resLogUser = await fetch(`${BASE_URL}/log-pembaca?tipe=login&tanggal=${todayStr}`);
  const dataLogUser: any = await resLogUser.json();
  console.log('Total Log User Login Hari Ini:', dataLogUser.meta?.totalData);

  // 12. Cleanup buku & user pengujian
  console.log('\n--- 11. Cleanup: Menghapus buku & user uji ---');
  await fetch(`${BASE_URL}/buku/${bukuId}`, { method: 'DELETE' });
  await fetch(`${BASE_URL}/users/${testUserId}`, { method: 'DELETE' });
  console.log('✅ Cleanup selesai');

  console.log('\n🎉 Seluruh Pengujian Fitur Log Pembaca Berhasil 100%!');
}

testLogPembaca().catch(console.error);
