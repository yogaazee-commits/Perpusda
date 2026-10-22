export interface Book {
  id: number | string
  title: string
  author: string
  genre: string
  year: number
  reads: string
  readCount?: number
  seed: string
  description: string
  cover?: string
  pdf?: string
  pdfName?: string
  pdfStorageKey?: string
}

export const books: Book[] = [
  { id: 1, title: 'Laskar Pelangi', author: 'Andrea Hirata', genre: 'Sastra', year: 2005, reads: '12.4 rb', seed: 'laskar-pelangi', description: 'Kisah sepuluh anak Belitung yang berjuang meraih mimpi meski dihadang keterbatasan. Menginspirasi jutaan pembaca di seluruh dunia.' },
  { id: 2, title: 'Bumi Manusia', author: 'Pramoedya Ananta Toer', genre: 'Sejarah', year: 1980, reads: '9.8 rb', seed: 'bumi-manusia', description: 'Minke, seorang pemuda Jawa berdarah bangsawan, harus memilih antara akal budi dan cinta di bawah bayang-bayang kolonialisme.' },
  { id: 3, title: 'Saman', author: 'Ayu Utami', genre: 'Sastra', year: 1998, reads: '7.2 rb', seed: 'saman', description: 'Empat perempuan bersahabat menemukan keberanian, kebebasan, dan suara mereka sendiri.' },
  { id: 4, title: 'Negeri 5 Menara', author: 'Ahmad Fuadi', genre: 'Fiksi', year: 2009, reads: '11.1 rb', seed: 'negeri-5-menara', description: 'Enam santri bersahabat menjaga mimpi mereka tetap tinggi, setinggi menara yang mereka pandangi.' },
  { id: 5, title: 'Cantik Itu Luka', author: 'Eka Kurniawan', genre: 'Sastra', year: 2002, reads: '6.5 rb', seed: 'cantik-itu-luka', description: 'Kisah lintas generasi tentang keluarga, sejarah, dan takdir di sebuah kota pesisir.' },
  { id: 6, title: 'Perahu Kertas', author: 'Dee Lestari', genre: 'Fiksi', year: 2009, reads: '5.7 rb', seed: 'perahu-kertas', description: 'Dua jiwa kreatif mengarungi persahabatan, cinta, dan panggilan untuk berkarya.' },
  { id: 7, title: 'Filosofi Kopi', author: 'Dee Lestari', genre: 'Fiksi', year: 2006, reads: '4.9 rb', seed: 'filosofi-kopi', description: 'Kumpulan cerita tentang rasa, perjalanan, dan makna yang tersembunyi di balik secangkir kopi.' },
  { id: 8, title: 'Pulang', author: 'Tere Liye', genre: 'Fiksi', year: 2015, reads: '4.6 rb', seed: 'pulang-tere-liye', description: 'Perjalanan panjang seorang anak muda menemukan arti pulang dan kekuatan keluarga.' },
  { id: 9, title: 'Hujan', author: 'Tere Liye', genre: 'Fiksi', year: 2016, reads: '4.3 rb', seed: 'hujan-tere-liye', description: 'Kisah tentang kehilangan, persahabatan, dan masa depan dalam dunia yang berubah.' },
  { id: 10, title: 'Supernova', author: 'Dee Lestari', genre: 'Fiksi', year: 2001, reads: '4.1 rb', seed: 'supernova-dee', description: 'Sains, spiritualitas, dan cinta bertemu dalam perjalanan mencari makna kehidupan.' },
  { id: 11, title: 'Tenggelamnya Kapal Van Der Wijck', author: 'Hamka', genre: 'Sastra', year: 1938, reads: '3.9 rb', seed: 'kapal-van-der-wijck', description: 'Romansa klasik tentang cinta, adat, dan pilihan hidup di tanah Minangkabau.' },
  { id: 12, title: 'Di Bawah Lindungan Ka\'bah', author: 'Hamka', genre: 'Sastra', year: 1936, reads: '3.5 rb', seed: 'lindungan-kabah', description: 'Kisah cinta dan pengabdian yang tumbuh di tengah keterbatasan dan tradisi.' },
  { id: 13, title: 'Jejak Langkah', author: 'Pramoedya Ananta Toer', genre: 'Sejarah', year: 1985, reads: '3.1 rb', seed: 'jejak-langkah', description: 'Perjalanan seorang pemuda membangun suara perubahan di masa kolonial.' },
  { id: 14, title: 'Ronggeng Dukuh Paruk', author: 'Ahmad Tohari', genre: 'Sastra', year: 1982, reads: '2.8 rb', seed: 'ronggeng-dukuh-paruk', description: 'Kehidupan sebuah desa dan tradisi yang membentuk nasib para warganya.' },
  { id: 15, title: 'Negeri Para Bedebah', author: 'Tere Liye', genre: 'Fiksi', year: 2012, reads: '2.4 rb', seed: 'negeri-para-bedebah', description: 'Sebuah thriller tentang kekuasaan, uang, dan keberanian mengambil sikap.' },
  { id: 16, title: 'Ensiklopedia Nusantara', author: 'Tim Literasi', genre: 'Ilmu Pengetahuan', year: 2022, reads: '1.8 rb', seed: 'ensiklopedia-nusantara', description: 'Pengenalan ringkas tentang alam, budaya, dan kekayaan kepulauan Indonesia.' },
  { id: 17, title: 'Kisah dari Karanganyar', author: 'Dinas Kearsipan', genre: 'Lokal & Budaya Jawa', year: 2024, reads: '1.2 rb', seed: 'karanganyar', description: 'Cerita dan pengetahuan lokal dari masyarakat Kabupaten Karanganyar.' },
  { id: 18, title: 'Atlas Sains Anak', author: 'Nadia Pratiwi', genre: 'Anak-anak', year: 2023, reads: '980', seed: 'atlas-sains-anak', description: 'Eksplorasi sains sederhana yang mengajak pembaca muda bertanya dan mencoba.' },
]

export const categories = [
  { name: 'Fiksi', symbol: '◈' },
  { name: 'Nonfiksi', symbol: '▤' },
  { name: 'Sastra', symbol: '✳' },
  { name: 'Sejarah', symbol: '⌂' },
  { name: 'Ilmu Pengetahuan', symbol: '⌬' },
  { name: 'Anak-anak', symbol: '✿' },
  { name: 'Biografi', symbol: '◉' },
  { name: 'Agama', symbol: '✦' },
  { name: 'Lokal & Budaya Jawa', symbol: '⌘' },
]