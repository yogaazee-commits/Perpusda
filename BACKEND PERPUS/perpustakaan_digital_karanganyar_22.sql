-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 29, 2026 at 09:26 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `perpustakaan_digital_karanganyar%22`
--

-- --------------------------------------------------------

--
-- Table structure for table `buku`
--

CREATE TABLE `buku` (
  `id` int(11) NOT NULL,
  `judul` varchar(191) NOT NULL,
  `penulis` varchar(191) NOT NULL,
  `penerbit` varchar(191) DEFAULT NULL,
  `tahunTerbit` int(11) DEFAULT NULL,
  `stok` int(11) NOT NULL DEFAULT 0,
  `kategoriId` int(11) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `filePdf` varchar(191) DEFAULT NULL,
  `isGratis` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `buku`
--

INSERT INTO `buku` (`id`, `judul`, `penulis`, `penerbit`, `tahunTerbit`, `stok`, `kategoriId`, `createdAt`, `updatedAt`, `filePdf`, `isGratis`) VALUES
(1, 'Panduan Jaringan Zero Trust Diskominfo', 'Tim IT Karanganyar', 'Pemkab Karanganyar', 2026, 10, NULL, '2026-09-24 11:43:53.480', '2026-09-24 11:43:53.480', NULL, 1),
(2, 'Pada Zaman Dahulu', 'Tim IT Karanganyar', 'Pemkab Karanganyar', 2026, 10, NULL, '2026-09-29 07:04:52.043', '2026-09-29 07:04:52.043', NULL, 1),
(3, 'Pada Zaman Dahulu', 'Tim IT Karanganyar', 'Pemkab Karanganyar', 2026, 10, NULL, '2026-09-29 07:07:42.846', '2026-09-29 07:07:42.846', NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `kategori`
--

CREATE TABLE `kategori` (
  `id` int(11) NOT NULL,
  `nama` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `peminjaman`
--

CREATE TABLE `peminjaman` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `bukuId` int(11) NOT NULL,
  `tanggalPinjam` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `tanggalKembali` datetime(3) DEFAULT NULL,
  `status` enum('DIPINJAM','DIKEMBALIKAN','TERLAMBAT') NOT NULL DEFAULT 'DIPINJAM'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sumbanganbuku`
--

CREATE TABLE `sumbanganbuku` (
  `id` int(11) NOT NULL,
  `judulBuku` varchar(191) NOT NULL,
  `penulis` varchar(191) NOT NULL,
  `kondisi` varchar(191) NOT NULL,
  `userId` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `tahunTerbit` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sumbanganbuku`
--

INSERT INTO `sumbanganbuku` (`id`, `judulBuku`, `penulis`, `kondisi`, `userId`, `createdAt`, `tahunTerbit`) VALUES
(1, 'Panduan Praktis Basis Data MariaDB', 'Diskominfo Karanganyar', 'Baik', 1, '2026-09-29 02:55:42.459', 2025),
(2, 'Panduan Praktis Basis Data MariaDB', 'Diskominfo Karanganyar', 'Baik', 1, '2026-09-29 04:30:37.122', 2025);

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `nama` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password` varchar(191) NOT NULL,
  `role` enum('ADMIN','ANGGOTA') NOT NULL DEFAULT 'ANGGOTA',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `nama`, `email`, `password`, `role`, `createdAt`, `updatedAt`) VALUES
(1, 'Anggota Diskominfo', 'anggota@karanganyarkab.go.id', '$2b$10$0F7Qr5W0oGQuPGLaF9Jwcu4RAuL2R5Nw.AZC3UpjGTjwdJzO9XXsW', 'ANGGOTA', '2026-09-24 11:19:35.808', '2026-09-24 11:19:35.808'),
(2, 'Administrator', 'admin@karanganyarkab.go.id', '$2b$10$Zw0TNkM0Emhye217ww/XJeowfhRHSpWdAm5qT.Xj.29ImFc2hvkIS', 'ADMIN', '2026-09-24 11:30:11.345', '2026-09-24 11:30:11.345');

-- --------------------------------------------------------

--
-- Table structure for table `usulanbuku`
--

CREATE TABLE `usulanbuku` (
  `id` int(11) NOT NULL,
  `judul` varchar(191) NOT NULL,
  `penulis` varchar(191) NOT NULL,
  `alasan` varchar(191) DEFAULT NULL,
  `userId` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `usulanbuku`
--

INSERT INTO `usulanbuku` (`id`, `judul`, `penulis`, `alasan`, `userId`, `createdAt`) VALUES
(1, 'Pemrograman Web Modern dengan TypeScript', 'Tim IT', 'Sangat dibutuhkan untuk referensi belajar magang', 2, '2026-09-29 01:44:03.395'),
(2, 'Pemrograman Web Modern dengan TypeScript', 'Tim IT', 'Sangat dibutuhkan untuk referensi belajar magang', 1, '2026-09-29 01:46:05.124');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `buku`
--
ALTER TABLE `buku`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Buku_kategoriId_fkey` (`kategoriId`);

--
-- Indexes for table `kategori`
--
ALTER TABLE `kategori`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Kategori_nama_key` (`nama`);

--
-- Indexes for table `peminjaman`
--
ALTER TABLE `peminjaman`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Peminjaman_userId_fkey` (`userId`),
  ADD KEY `Peminjaman_bukuId_fkey` (`bukuId`);

--
-- Indexes for table `sumbanganbuku`
--
ALTER TABLE `sumbanganbuku`
  ADD PRIMARY KEY (`id`),
  ADD KEY `SumbanganBuku_userId_fkey` (`userId`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `User_email_key` (`email`);

--
-- Indexes for table `usulanbuku`
--
ALTER TABLE `usulanbuku`
  ADD PRIMARY KEY (`id`),
  ADD KEY `UsulanBuku_userId_fkey` (`userId`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `buku`
--
ALTER TABLE `buku`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `kategori`
--
ALTER TABLE `kategori`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `peminjaman`
--
ALTER TABLE `peminjaman`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sumbanganbuku`
--
ALTER TABLE `sumbanganbuku`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `usulanbuku`
--
ALTER TABLE `usulanbuku`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `buku`
--
ALTER TABLE `buku`
  ADD CONSTRAINT `Buku_kategoriId_fkey` FOREIGN KEY (`kategoriId`) REFERENCES `kategori` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `peminjaman`
--
ALTER TABLE `peminjaman`
  ADD CONSTRAINT `Peminjaman_bukuId_fkey` FOREIGN KEY (`bukuId`) REFERENCES `buku` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Peminjaman_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `sumbanganbuku`
--
ALTER TABLE `sumbanganbuku`
  ADD CONSTRAINT `SumbanganBuku_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `usulanbuku`
--
ALTER TABLE `usulanbuku`
  ADD CONSTRAINT `UsulanBuku_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
