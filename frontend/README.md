# Perpustakaan Digital Karanganyar

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Menjalankan frontend dan backend

Backend berada di `BACKEND PERPUS/BACKEND PERPUS/Perpustakaan-digital` dan menggunakan
TypeScript, Node.js, Express, Prisma, serta MySQL. Atur `DATABASE_URL` dan `JWT_SECRET`
di file `.env` backend. MinIO dapat digunakan untuk menyimpan PDF; backend menyediakan
folder `uploads/` sebagai fallback lokal.

Jalankan backend di satu terminal:

```bash
cd "BACKEND PERPUS/BACKEND PERPUS/Perpustakaan-digital"
npm install
npx prisma generate
npm run dev
```

Backend menggunakan port `4000`. Frontend memakai Nuxt dan berjalan di port `3001`,
agar tidak berbenturan dengan layanan lain yang mungkin memakai port `3000`:

```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:3001`. Frontend meminta API backend di `http://localhost:4000`.
Untuk alamat backend yang berbeda, set `NUXT_PUBLIC_API_BASE` sebelum menjalankan Nuxt.
Backend mengizinkan origin frontend lokal tersebut; untuk deployment, atur
`FRONTEND_ORIGIN` pada backend ke origin frontend yang digunakan.

Katalog buku, unggah PDF, dan autentikasi memakai data backend. Daftar usulan, sumbangan,
dan beberapa pengaturan admin lainnya masih disimpan di browser. Pemulihan kata sandi
otomatis belum tersedia karena backend belum dikonfigurasi untuk mengirim email pemulihan.

## Build frontend

```bash
# npm
npm run build
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
