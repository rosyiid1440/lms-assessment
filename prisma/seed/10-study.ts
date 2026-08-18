import { PrismaClient } from '@prisma/client';

export async function seedStudy(prisma: PrismaClient) {
  console.log('Seeding Study Platform (Aplikasi Penunjang Pembelajaran)...');

  const tenant = await prisma.tenant.findFirst({ where: { code: 'default-tenant' } });
  if (!tenant) throw new Error('Tenant not found');

  const teacher = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: { slug: 'teacher' } } });
  const teacherId = teacher?.id || null;

  // --- 1. Lessons per mapel ---
  const lessons: { subject: string; title: string; summary: string; sections: { heading: string; body: string }[] }[] = [
    {
      subject: 'matematika', title: 'Pengertian Fungsi & Grafik', summary: 'Relasi dan fungsi, domain, kodomain, range.',
      sections: [
        { heading: 'Apa itu Fungsi?', body: 'Fungsi adalah relasi yang memasangkan setiap anggota domain dengan tepat satu anggota kodomain. Notasi: f(x) = y.' },
        { heading: 'Menggambar Grafik', body: 'Untuk memplot fungsi, pilih nilai x, hitung f(x), lalu gambar titik-titiknya. Persamaan linear f(x)=ax+b menghasilkan garis lurus.' },
      ],
    },
    {
      subject: 'kimia', title: 'Tabel Periodik & Konsep Mol', summary: 'Struktur tabel periodik dan hitungan mol.',
      sections: [
        { heading: 'Golongan & Periode', body: 'Elemen pada golongan yang sama memiliki sifat kimia mirip. Periode menyatakan jumlah kulit elektron.' },
        { heading: 'Konsep Mol', body: 'n = m / Mr. Satu mol zat mengandung 6,022 × 10²³ partikel (bilangan Avogadro).' },
      ],
    },
    {
      subject: 'biologi', title: 'Sistem Organ pada Manusia', summary: 'Organ dan fungsinya dalam tubuh manusia.',
      sections: [
        { heading: 'Jantung', body: 'Memompa darah ke seluruh tubuh. Siklusnya: atrium menerima darah, ventrikel memompa keluar.' },
        { heading: 'Paru-paru', body: 'Tempat pertukaran O₂ dan CO₂. Alveolus meningkatkan luas permukaan penyerapan.' },
      ],
    },
    {
      subject: 'sejarah', title: 'Kedatangan Hindu-Buddha', summary: 'Pengaruh Hindu-Buddha di Nusantara.',
      sections: [
        { heading: 'Perdagangan & Penyebaran', body: 'Kontak dagang membawa budaya Hindu-Buddha. Kerajaan Kutai dan Tarumanegara menjadi bukti tertua.' },
        { heading: 'Peninggalan', body: 'Candi, prasasti, dan kitab menjadi peninggalan penting peradaban Hindu-Buddha.' },
      ],
    },
    {
      subject: 'geografi', title: 'Litosfer & Relief Indonesia', summary: 'Lapisan bumi dan bentang alam Indonesia.',
      sections: [
        { heading: 'Lapisan Bumi', body: 'Bumi tersusun atas litosfer (kerak), astenosfer, dan inti. Litosfer terpecah menjadi lempeng.' },
        { heading: 'Bentang Alam', body: 'Indonesia memiliki gunung api aktif sejak berada pada cincin api Pasifik.' },
      ],
    },
    {
      subject: 'ekonomi', title: 'Permintaan, Penawaran & Keseimbangan', summary: 'Hukum dasar ekonomi dan harga keseimbangan.',
      sections: [
        { heading: 'Hukum Permintaan', body: 'Harga naik, jumlah diminta turun (ceteris paribus).' },
        { heading: 'Harga Keseimbangan', body: 'Titik di mana jumlah yang diminta = jumlah yang ditawarkan (Qd = Qs).' },
      ],
    },
    {
      subject: 'sosiologi', title: 'Interaksi & Kelompok Sosial', summary: 'Dinamika interaksi dalam masyarakat.',
      sections: [
        { heading: 'Interaksi Sosial', body: 'Hubungan timbal balik antarindividu atau kelompok, syaratnya kontak dan komunikasi.' },
        { heading: 'Kelompok Sosial', body: 'Kumpulan orang yang memiliki kesadaran bersama dan saling berinteraksi.' },
      ],
    },
    {
      subject: 'bahasa-indonesia', title: 'Kaidah Kebahasaan Teks Deskripsi', summary: 'Struktur dan kaidah teks deskripsi.',
      sections: [
        { heading: 'Struktur', body: 'Identifikasi umum → deskripsi bagian → kesimpulan/penutup.' },
        { heading: 'Kaidah', body: 'Menggunakan kalimat perincian, kata sifat, dan majas untuk menggambarkan objek.' },
      ],
    },
    {
      subject: 'ppkn', title: 'Nilai-Nilai Pancasila', summary: 'Pengamalan sila-sila dalam kehidupan sehari-hari.',
      sections: [
        { heading: 'Lima Sila', body: 'Ketuhanan, Kemanusiaan, Persatuan, Kerakyatan, dan Keadilan sosial.' },
        { heading: 'Pengamalan', body: 'Toleransi beragama, menghormati orang lain, musyawarah, dan gotong royong.' },
      ],
    },
    {
      subject: 'pjok', title: 'Kebugaran Jasmani & IMT', summary: 'Komponen kebugaran dan indeks massa tubuh.',
      sections: [
        { heading: 'Komponen Kebugaran', body: 'Kekuatan, daya tahan, kelenturan, kecepatan, dan komposisi tubuh.' },
        { heading: 'IMT', body: 'IMT = berat(kg) / tinggi(m)². Kategori: kurus, normal, berlebih, obesitas.' },
      ],
    },
  ];

  for (const l of lessons) {
    const existing = await prisma.studyLesson.findFirst({ where: { tenantId: tenant.id, subject: l.subject, title: l.title } });
    if (!existing) {
      await prisma.studyLesson.create({ data: { tenantId: tenant.id, createdById: teacherId, subject: l.subject, title: l.title, summary: l.summary, sections: l.sections, status: 'VISIBLE' } });
    }
  }

  // --- 2. Quizzes per mapel (2 tiap mapel) ---
  const quizzes: { subject: string; title: string; description: string; questions: { q: string; options: string[]; correct: string; explain: string }[] }[] = [
    {
      subject: 'matematika', title: 'Dasar Fungsi', description: 'Kuis pengenalan fungsi',
      questions: [
        { q: 'Diberikan f(x) = 2x + 1. Berapakah f(3)?', options: ['6', '7', '8', '5'], correct: '7', explain: 'f(3) = 2(3)+1 = 7' },
        { q: 'Grafik fungsi linear berbentuk...', options: ['Garis lurus', 'Parabola', 'Lingkaran', 'Elips'], correct: 'Garis lurus', explain: 'Fungsi derajat satu menghasilkan garis lurus.' },
        { q: 'Domain dari f(x) = √x adalah nilai x ≥ ...', options: ['1', '2', '0', '-1'], correct: '0', explain: 'Akar kuadrat hanya terdefinisi untuk x ≥ 0.' },
      ],
    },
    {
      subject: 'matematika', title: 'Persamaan Linear', description: 'Soal persamaan linear satu variabel',
      questions: [
        { q: 'Selesaikan: 3x - 6 = 0', options: ['x = 1', 'x = 2', 'x = 3', 'x = -2'], correct: 'x = 2', explain: '3x = 6 → x = 2' },
        { q: 'Himpunan penyelesaian x + 4 = 2x - 1 adalah...', options: ['x = 3', 'x = 5', 'x = -5', 'x = 4'], correct: 'x = 5', explain: 'x = 5 → 9 = 9' },
      ],
    },
    {
      subject: 'kimia', title: 'Struktur Atom & Konfigurasi', description: 'Dasar-dasar struktur atom',
      questions: [
        { q: 'Partikel bermuatan negatif dalam atom adalah...', options: ['Proton', 'Neutron', 'Elektron', 'Positron'], correct: 'Elektron', explain: 'Elektron bermuatan negatif.' },
        { q: 'Nomor atom = jumlah ...', options: ['Neutron', 'Proton', 'Elektron + Neutron', 'Massa'], correct: 'Proton', explain: 'Nomor atom menunjukkan jumlah proton.' },
        { q: 'Isotop adalah atom dengan jumlah... yang berbeda', options: ['Proton', 'Neutron', 'Elektron', 'Muatan'], correct: 'Neutron', explain: 'Isotop memiliki nomor atom sama, neutron berbeda.' },
      ],
    },
    {
      subject: 'biologi', title: 'Sel & Jaringan', description: 'Struktur sel dan jaringan',
      questions: [
        { q: 'Organel tempat respirasi sel adalah...', options: ['Nukleus', 'Mitokondria', 'Ribosom', 'Lysosome'], correct: 'Mitokondria', explain: 'Mitokondria menghasilkan energi (ATP).' },
        { q: 'Dinding sel hanya dimiliki oleh sel...', options: ['Hewan', 'Tumbuhan', 'Bakteri & tumbuhan', 'Semua sel'], correct: 'Bakteri & tumbuhan', explain: 'Sel tumbuhan dan bakteri memiliki dinding sel.' },
      ],
    },
    {
      subject: 'sejarah', title: 'Pergerakan Nasional', description: 'Tokoh dan peristiwa kebangkitan nasional',
      questions: [
        { q: 'Organisasi pergerakan pertama (1908)?', options: ['Budi Utomo', 'PNI', 'Muhammadiyah', 'Indische Partij'], correct: 'Budi Utomo', explain: 'Budi Utomo didirikan 20 Mei 1908.' },
        { q: 'Sumpah Pemuda diikrarkan pada tahun...', options: ['1908', '1928', '1945', '1933'], correct: '1928', explain: 'Kongres Pemuda II 28 Oktober 1928.' },
      ],
    },
    {
      subject: 'geografi', title: 'Litosfer & Atmosfer', description: 'Lapisan bumi dan atmosfer',
      questions: [
        { q: 'Lapisan atmosfer paling dekat dengan bumi adalah...', options: ['Troposfer', 'Stratosfer', 'Mesosfer', 'Eksosfer'], correct: 'Troposfer', explain: 'Troposfer adalah lapisan tempat cuaca terjadi.' },
        { q: 'Tenaga yang membentuk relief bumi dari dalam disebut...', options: ['Eksogen', 'Endogen', 'Orogenik', 'Epirogenik'], correct: 'Endogen', explain: 'Tenaga endogen berasal dari dalam bumi.' },
      ],
    },
    {
      subject: 'ekonomi', title: 'Keseimbangan Pasar', description: 'Konsep harga keseimbangan',
      questions: [
        { q: 'Harga keseimbangan terjadi ketika...', options: ['Qd > Qs', 'Qd < Qs', 'Qd = Qs', 'Harga nol'], correct: 'Qd = Qs', explain: 'Keseimbangan: jumlah diminta sama dengan jumlah ditawarkan.' },
        { q: 'Jika harga naik, jumlah yang ditawarkan akan...', options: ['Turun', 'Naik', 'Tetap', 'Nol'], correct: 'Naik', explain: 'Hukum penawaran: harga naik → penawaran naik.' },
      ],
    },
    {
      subject: 'sosiologi', title: 'Dasar Sosiologi', description: 'Konsep dasar ilmu sosiologi',
      questions: [
        { q: 'Siapa tokoh yang dikenal sebagai Bapak Sosiologi?', options: ['Max Weber', 'Emile Durkheim', 'Auguste Comte', 'Karl Marx'], correct: 'Auguste Comte', explain: 'Auguste Comte memperkenalkan istilah sosiologi.' },
        { q: 'Syarat terjadinya interaksi sosial adalah...', options: ['Kontak & komunikasi', 'Kekayaan', 'Pendidikan', 'Kekuasaan'], correct: 'Kontak & komunikasi', explain: 'Interaksi memerlukan kontak dan komunikasi.' },
      ],
    },
    {
      subject: 'bahasa-indonesia', title: 'Kaidah Kebahasaan', description: 'Memahami teks dan kaidah bahasa',
      questions: [
        { q: 'Ciri teks deskripsi adalah...', options: ['Menceritakan urutan waktu', 'Menggambarkan objek secara rinci', 'Menyajikan data statistik', 'Menyampaikan prosedur'], correct: 'Menggambarkan objek secara rinci', explain: 'Deskripsi menggambarkan objek dengan kata yang detail.' },
        { q: 'Kalimat yang menyatakan pendapat disebut...', options: ['Fakta', 'Opini', 'Tesis', 'Simpulan'], correct: 'Opini', explain: 'Opini adalah pendapat yang bersifat subjektif.' },
      ],
    },
    {
      subject: 'ppkn', title: 'Pancasila & UUD 1945', description: 'Nilai dasar negara',
      questions: [
        { q: 'Sila dengan lambang pohon beringin adalah...', options: ['1', '2', '3', '4'], correct: '3', explain: 'Sila ke-3: Persatuan Indonesia, lambang pohon beringin.' },
        { q: 'Pembukaan UUD 1945 alinea keempat memuat...', options: ['Tujuan negara', 'Hak asasi', 'Peraturan pemilu', 'Agama negara'], correct: 'Tujuan negara', explain: 'Alinea keempat memuat tujuan negara dan dasar negara.' },
      ],
    },
    {
      subject: 'pjok', title: 'Kebugaran Jasmani', description: 'Komponen kebugaran dan kesehatan',
      questions: [
        { q: 'Latihan yang melatih daya tahan jantung-paru adalah...', options: ['Angkat beban', 'Lari interval', 'Push-up', 'Sit-up'], correct: 'Lari interval', explain: 'Latihan kardio/interval meningkatkan daya tahan kardiorespirasi.' },
        { q: 'Pemanasan bertujuan untuk...', options: ['Mengurangi risiko cedera', 'Menambah massa otot', 'Menurunkan denyut', 'Menguras energi'], correct: 'Mengurangi risiko cedera', explain: 'Pemanasan menyiapkan otot dan sendi sebelum latihan.' },
      ],
    },
  ];

  for (const qz of quizzes) {
    const existing = await prisma.studyQuiz.findFirst({ where: { tenantId: tenant.id, subject: qz.subject, title: qz.title } });
    if (!existing) {
      await prisma.studyQuiz.create({ data: { tenantId: tenant.id, createdById: teacherId, subject: qz.subject, title: qz.title, description: qz.description, questions: qz.questions, status: 'VISIBLE' } });
    }
  }

  // --- 3. Timeline per mapel ---
  const timelines: { subject: string; year: string; periodLabel: string; title: string; description: string }[] = [
    { subject: 'sejarah', year: '300', periodLabel: 'Hindu-Buddha', title: 'Kerajaan Kutai', description: 'Kerajaan Hindu tertua di Indonesia, ditandai prasasti Yupa.' },
    { subject: 'sejarah', year: '1908', periodLabel: 'Pergerakan', title: 'Budi Utomo', description: 'Organisasi modern pertama menandai kebangkitan nasional.' },
    { subject: 'sejarah', year: '1928', periodLabel: 'Pergerakan', title: 'Sumpah Pemuda', description: 'Ikrar satu tanah air, satu bangsa, satu bahasa.' },
    { subject: 'sejarah', year: '1945', periodLabel: 'Kemerdekaan', title: 'Proklamasi', description: 'Deklarasi kemerdekaan Republik Indonesia.' },
    { subject: 'biologi', year: '1859', periodLabel: 'Evolusi', title: 'Charles Darwin & On the Origin', description: 'Teori evolusi oleh seleksi alam dipublikasikan.' },
    { subject: 'biologi', year: '1953', periodLabel: 'Genetika', title: 'Struktur DNA', description: 'Watson, Crick mengungkap struktur heliks ganda DNA.' },
    { subject: 'kimia', year: '1869', periodLabel: 'Tabel Periodik', title: 'Tabel Periodik Mendeleev', description: 'Pengelompokan unsur berdasarkan massa atom.' },
    { subject: 'fisika', year: '1687', periodLabel: 'Mekanika', title: 'Hukum Newton', description: 'Principia memuat tiga hukum gerak.' },
  ];

  for (const tl of timelines) {
    const existing = await prisma.studyTimelineEvent.findFirst({ where: { tenantId: tenant.id, subject: tl.subject, title: tl.title } });
    if (!existing) {
      await prisma.studyTimelineEvent.create({ data: { tenantId: tenant.id, createdById: teacherId, subject: tl.subject, year: parseInt(tl.year), periodLabel: tl.periodLabel, title: tl.title, description: tl.description, icon: 'Flag' } });
    }
  }

  // --- 4. Flashcards per mapel ---
  const flashcards: { subject: string; deck: string; front: string; back: string }[] = [
    { subject: 'kimia', deck: 'Istilah Dasar', front: 'Atom', back: 'Partikel terkecil penyusun materi.' },
    { subject: 'kimia', deck: 'Istilah Dasar', front: 'Mol', back: 'Satuan jumlah zat; 1 mol = 6,022 × 10²³ partikel.' },
    { subject: 'kimia', deck: 'Istilah Dasar', front: 'Ikatan ion', back: 'Ikatan akibat serah-terima elektron (logam + nonlogam).' },
    { subject: 'biologi', deck: 'Sel', front: 'Mitokondria', back: 'Organel penghasil energi (ATP).' },
    { subject: 'biologi', deck: 'Sel', front: 'Ribosom', back: 'Tempat sintesis protein.' },
    { subject: 'biologi', deck: 'Sel', front: 'Nukleus', back: 'Pusat kendali sel, berisi DNA.' },
    { subject: 'sejarah', deck: 'Tokoh', front: 'Soekarno', back: 'Proklamator dan presiden pertama RI.' },
    { subject: 'sejarah', deck: 'Tokoh', front: 'Moh. Hatta', back: 'Proklamator dan wakil presiden pertama RI.' },
    { subject: 'sejarah', deck: 'Peristiwa', front: 'Sumpah Pemuda', back: 'Ikrar pemuda 1928: satu tanah air, satu bangsa, satu bahasa.' },
    { subject: 'matematika', deck: 'Rumus', front: 'Diskriminan (D)', back: 'D = b² - 4ac, menentukan banyak akar.' },
    { subject: 'matematika', deck: 'Rumus', front: 'Rumus ABC', back: 'x = (-b ± √D) / 2a.' },
    { subject: 'ekonomi', deck: 'Istilah', front: 'Inflasi', back: 'Kenaikan harga barang secara umum dan terus-menerus.' },
    { subject: 'ekonomi', deck: 'Istilah', front: 'Elastisitas', back: 'Tingkat kepekaan jumlah barang terhadap perubahan harga.' },
    { subject: 'bahasa-indonesia', deck: 'Kosakata', front: 'Diskrepasi', back: 'Perbedaan, ketidaksesuaian.' },
    { subject: 'bahasa-indonesia', deck: 'Kosakata', front: 'Daring', back: 'Dalam jaringan (online), terhubung internet.' },
    { subject: 'ppkn', deck: 'Pancasila', front: 'Sila ke-1', back: 'Ketuhanan Yang Maha Esa — lambang bintang.' },
    { subject: 'ppkn', deck: 'Pancasila', front: 'Sila ke-5', back: 'Keadilan sosial bagi seluruh rakyat Indonesia — padi dan kapas.' },
  ];

  for (const fc of flashcards) {
    const existing = await prisma.studyFlashcard.findFirst({ where: { tenantId: tenant.id, subject: fc.subject, front: fc.front } });
    if (!existing) {
      await prisma.studyFlashcard.create({ data: { tenantId: tenant.id, subject: fc.subject, deck: fc.deck, front: fc.front, back: fc.back } });
    }
  }

  console.log(`✅ Study: ${lessons.length} lessons, ${quizzes.length} quizzes, ${timelines.length} timeline, ${flashcards.length} flashcards.`);
}