"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BASE_URL = 'http://localhost:3000';
async function testRoles() {
    console.log('🚀 Memulai pengujian Many-to-Many User & Role (Pivot Table user_roles)...\n');
    // 1. Get Semua Role
    console.log('--- 1. Testing GET /roles ---');
    const resRoles = await fetch(`${BASE_URL}/roles`);
    const dataRoles = await resRoles.json();
    console.log('Daftar Role:', dataRoles);
    // 2. Tambah Master Role Baru
    console.log('\n--- 2. Testing POST /roles (Tambah Role PETUGAS) ---');
    const resAddRole = await fetch(`${BASE_URL}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: 'PETUGAS' }),
    });
    const dataAddRole = await resAddRole.json();
    console.log('Hasil Buat Role:', dataAddRole);
    // 3. Register User dengan Multiple Roles
    const randomEmail = `user_${Date.now()}@karanganyar.go.id`;
    console.log(`\n--- 3. Testing POST /register dengan Multiple Roles: ['ANGGOTA', 'PETUGAS'] ---`);
    const resReg = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nama: 'Budi Petugas Perpus',
            email: randomEmail,
            password: 'password123',
            roles: ['ANGGOTA', 'PETUGAS'],
        }),
    });
    const dataReg = await resReg.json();
    console.log('Hasil Registrasi:', dataReg);
    const userId = dataReg.user?.id;
    // 4. Login User & Periksa Roles dalam Payload
    console.log('\n--- 4. Testing POST /login ---');
    const resLogin = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: randomEmail,
            password: 'password123',
        }),
    });
    const dataLogin = await resLogin.json();
    console.log('Hasil Login:', dataLogin);
    console.log('Role dalam Token:', dataLogin.user?.roles);
    if (userId) {
        // 5. Tambah Role Tambahan ke User via Pivot Table
        console.log(`\n--- 5. Testing POST /users/${userId}/roles (Tambah Role ADMIN) ---`);
        const resAddUserRole = await fetch(`${BASE_URL}/users/${userId}/roles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'ADMIN' }),
        });
        const dataAddUserRole = await resAddUserRole.json();
        console.log('Hasil Tambah Role User:', dataAddUserRole);
        // 6. Cek Daftar Role User
        console.log(`\n--- 6. Testing GET /users/${userId}/roles ---`);
        const resUserRoles = await fetch(`${BASE_URL}/users/${userId}/roles`);
        const dataUserRoles = await resUserRoles.json();
        console.log('Role User Sekarang:', dataUserRoles.user?.roles);
        // 7. Hapus salah satu Role (PETUGAS) dari User
        console.log(`\n--- 7. Testing DELETE /users/${userId}/roles/PETUGAS ---`);
        const resDelRole = await fetch(`${BASE_URL}/users/${userId}/roles/PETUGAS`, {
            method: 'DELETE',
        });
        const dataDelRole = await resDelRole.json();
        console.log('Hasil Hapus Role:', dataDelRole);
        // 8. Cek Semua User
        console.log('\n--- 8. Testing GET /users (List User & Daftar Rolenya) ---');
        const resUsers = await fetch(`${BASE_URL}/users`);
        const dataUsers = await resUsers.json();
        console.log('Total User:', dataUsers.total);
        console.log('Contoh User:', dataUsers.data?.[0]);
    }
    console.log('\n🎉 Pengujian Many-to-Many User & Role Selesai dengan Sukses!');
}
testRoles().catch(console.error);
