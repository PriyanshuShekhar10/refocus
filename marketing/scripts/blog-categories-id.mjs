/**
 * Bahasa Indonesia blog niches for /id/blog auto-publishing.
 * Exam topics are Indonesia-specific (UTBK/SNBT) — not JEE/UPSC/NEET.
 */

export const CATEGORIES_ID = {
  productivity: {
    id: "productivity",
    label: "Produktivitas",
    pillar: {
      path: "/id/body-doubling",
      label: "body doubling",
    },
    audience:
      "pembaca Indonesia yang ingin rutinitas fokus praktis — deep work, time-boxing, memulai tugas — sering mencari accountability atau ruang fokus virtual",
    voice:
      "jelas, konkret, Bahasa Indonesia natural (bukan terjemahan kaku). Sebut masalah spesifik di paragraf pertama. Body doubling / ruang fokus bila relevan.",
    mustInclude:
      "minimal satu rutinitas, template, atau taktik bernomor yang bisa dicoba hari ini",
    avoid: "motivasi kosong, statistik palsu, campur aduk istilah India (JEE, UPSC)",
    topics: [
      "body doubling untuk produktivitas: bekerja di samping orang lain agar benar-benar mulai",
      "cara membuat ruang fokus pribadi di rumah untuk accountability",
      "memulai blok deep work 50 menit saat terus membuka tab baru",
      "time-boxing sore hari setelah pagi penuh meeting",
      "mengapa to-do list terbuka membuat stuck — dan pengganti 3 item",
      "melindungi jam fokus pertama setelah bangun tidur",
      "Pomodoro vs blok lebih panjang: kapan 25 menit kurang",
      "coworking virtual gratis yang layak dicoba tanpa langganan mahal",
    ],
  },

  adhd: {
    id: "adhd",
    label: "ADHD & fokus",
    pillar: {
      path: "/id/body-doubling",
      label: "body doubling untuk ADHD",
    },
    audience:
      "pembaca dengan ADHD atau kesulitan fokus serupa, malu soal 'tinggal lebih keras' — sering mencari body doubling atau partner fokus",
    voice:
      "empati dan praktis. Bukan nasihat medis. Acknowledge executive dysfunction dan body doubling.",
    mustInclude:
      "minimal satu taktik body doubling atau struktur eksternal yang tidak bergantung pada willpower",
    avoid: "bahasa cure, stigma, klise 'superpower ADHD'",
    topics: [
      "body doubling untuk ADHD: mengapa orang lain di ruangan mengubah awal mengerjakan",
      "task initiation paralysis: menciutkan langkah pertama sampai terasa kecil",
      "malu setelah hari belajar terbuang — restart tanpa reset total",
      "timer sebagai memori kerja eksternal saat otak tidak menahan rencana",
      "transisi antar tugas tanpa shutdown",
      "accountability tanpa tekanan untuk sesi belajar ADHD",
      "body doubling gratis tanpa langganan deep-work mahal",
    ],
  },

  exams: {
    id: "exams",
    label: "Ujian & seleksi",
    pillar: {
      path: "/id/study-with-me",
      label: "belajar bersama online",
    },
    audience:
      "siswa dan calon mahasiswa Indonesia — persiapan UTBK/SNBT, seleksi PTN, ujian sekolah — belajar sendirian lama, sering cari 'study with me' atau ruang belajar online",
    voice:
      "spesifik konteks ujian Indonesia. Sebut UTBK, SNBT, seleksi PTN bila relevan. Bukan JEE, UPSC, NEET, atau ujian India.",
    mustInclude:
      "sebut minimal satu konteks ujian Indonesia (UTBK, SNBT, seleksi PTN, ujian nasional) dan satu taktik sesi belajar konkret",
    avoid: "JEE, UPSC, NEET, CAT, GATE, ujian India; janji rank; iklan bimbel",
    topics: [
      "study with me online: rutinitas belajar UTBK/SNBT yang konsisten",
      "ruang belajar online untuk persiapan seleksi PTN sendirian di rumah",
      "UTBK: blok revisi harian yang benar-benar bisa dimulai",
      "SNBT: struktur sesi setelah tryout buruk tanpa spiral seharian",
      "belajar sendirian persiapan ujian: mengatasi isolasi dengan co-presence",
      "active recall untuk materi UTBK: sesi fokus vs baca ulang pasif",
      "tiga target belajar hari ini saat silabus UTBK terasa tak berujung",
      "belajar malam hari saat semua sudah tidur — tetap fokus tanpa scroll",
    ],
  },

  loneliness: {
    id: "loneliness",
    label: "Kesepian saat belajar",
    pillar: {
      path: "/id/virtual-coworking",
      label: "coworking virtual",
    },
    audience:
      "pelajar dan pekerja remote Indonesia yang merasa sendirian — ingin energi perpustakaan tanpa perpustakaan",
    voice:
      "jujur tentang kesepian. Co-presence tenang, bukan paksa ngobrol. Coworking virtual sebagai jembatan.",
    mustInclude:
      "bedakan butuh teman vs butuh obrolan — dan satu cara dapat co-presence",
    avoid: "toxic positivity, 'join Discord aja'",
    topics: [
      "coworking virtual untuk yang belajar atau kerja sendirian seharian",
      "kesepian belajar sendiri di rumah berbulan-bulan",
      "mengapa fokus di kafe works — alternatif saat tidak bisa keluar",
      "co-belajar diam vs grup yang jadi hangout",
      "merindukan energi asrama/perpustakaan setelah pulang ke rumah",
      "partner accountability yang tidak perlu banyak bicara",
    ],
  },

  remote: {
    id: "remote",
    label: "Kerja remote & freelancer",
    pillar: {
      path: "/id/virtual-coworking",
      label: "coworking virtual",
    },
    audience:
      "remote worker, freelancer, dan maker Indonesia — WFH, klien async, timezone dengan klien global",
    voice:
      "realistis soal kalender, klien, gangguan rumah. Coworking virtual sebagai struktur sesi.",
    mustInclude:
      "skenario WFH/freelance Indonesia dan struktur sesi konkret",
    avoid: "hustle culture, 'rise and grind'",
    topics: [
      "coworking virtual untuk freelancer Indonesia yang kerja sendirian",
      "WFH pagi hari larut ke email sebelum deep work",
      "freelancer: blok fokus billable saat setiap jam terasa bisa diinterupsi",
      "kerja dari kos/kontrakan satu kamar tanpa meja proper",
      "timezone dengan klien global — sesi fokus di jam quiet",
      "remote di Jakarta/Bali: rekreate energi kantor tanpa commute",
    ],
  },
};

export const CATEGORY_IDS_ID = Object.keys(CATEGORIES_ID);

export function getCategoryId(id) {
  const key = String(id || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  return CATEGORIES_ID[key] || null;
}
