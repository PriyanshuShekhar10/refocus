/**
 * Vietnamese blog niches for /vi/blog auto-publishing.
 * Exam topics are Vietnam-specific — not India/Indonesia/Philippines exams.
 */

export const CATEGORIES_VI = {
  productivity: {
    id: "productivity",
    label: "Năng suất",
    pillar: { path: "/body-doubling", label: "body doubling" },
    audience:
      "người Việt cần thói quen tập trung thực tế — deep work, time-boxing, bắt đầu công việc — thường tìm accountability hoặc phòng focus ảo",
    voice:
      "rõ ràng, cụ thể, tiếng Việt tự nhiên (không dịch máy cứng). Nêu vấn đề ở đoạn đầu. Body doubling khi phù hợp.",
    mustInclude:
      "ít nhất một routine hoặc tactic đánh số có thể thử ngay hôm nay",
    avoid: "động viên rỗng, số liệu giả, JEE, UPSC, UTBK, board exam Philippines",
    topics: [
      "body doubling cho năng suất: làm việc cạnh người khác để thực sự bắt đầu",
      "tạo phòng focus tại nhà cho accountability",
      "bắt đầu khối deep work 50 phút khi cứ mở tab mới",
      "time-boxing buổi chiều sau buổi sáng đầy meeting",
      "vì sao to-do list mở ended làm bạn stuck — thay bằng 3 mục",
      "bảo vệ giờ focus đầu tiên sau khi thức dậy",
    ],
  },

  adhd: {
    id: "adhd",
    label: "ADHD & tập trung",
    pillar: { path: "/body-doubling", label: "body doubling cho ADHD" },
    audience:
      "người có ADHD hoặc khó tập trung tương tự — xấu hổ vì 'cố gắng hơn' — hay tìm body doubling",
    voice:
      "đồng cảm và thực tế. Không phải tư vấn y khoa. Acknowledge executive dysfunction.",
    mustInclude:
      "ít nhất một tactic body doubling hoặc cấu trúc bên ngoài không dựa willpower",
    avoid: "ngôn ngữ chữa khỏi, stigma, cliché ADHD superpower",
    topics: [
      "body doubling cho ADHD: vì sao có người khác trong phòng thay đổi cách bắt đầu",
      "task initiation paralysis: thu nhỏ bước đầu",
      "xấu hổ sau ngày học/uổng — restart không cần reset toàn bộ",
      "timer như bộ nhớ làm việc bên ngoài",
      "accountability không áp lực cho phiên học ADHD",
    ],
  },

  exams: {
    id: "exams",
    label: "Thi cử & ôn thi",
    pillar: { path: "/study-with-me", label: "học cùng online" },
    audience:
      "học sinh, sinh viên Việt Nam — ôn thi tốt nghiệp THPT, đại học, IELTS — học một mình lâu, tìm study with me",
    voice:
      "bối cảnh thi Việt Nam: THPT, đại học, IELTS. Không dùng kỳ thi Ấn Độ, Indonesia, Philippines.",
    mustInclude:
      "nêu ít nhất một bối cảnh thi Việt Nam và một tactic phiên học cụ thể",
    avoid: "JEE, UPSC, NEET, UTBK, SNBT, PNLE; hứa rank; quảng cáo lớp học",
    topics: [
      "study with me online: routine ôn thi THPT hàng ngày",
      "khối ôn 50 phút sau mock thi tệ mà không lãng phí cả ngày",
      "ba mục tiêu hôm nay khi syllabus đại học quá dài",
      "active recall vs đọc lại thụ động cho môn THPT",
      "học đêm khi mọi người đã ngủ — vẫn focus không scroll",
      "IELTS: phiên luyện nghe/đọc có timer",
    ],
  },

  loneliness: {
    id: "loneliness",
    label: "Cô đơn & học một mình",
    pillar: { path: "/virtual-coworking", label: "coworking ảo" },
    audience:
      "người học/làm remote tại VN cô đơn — nhớ năng lượng thư viện",
    voice:
      "thành thật về cô đơn. Co-presence yên lặng, không ép nói chuyện.",
    mustInclude:
      "phân biệt cần bạn vs cần trò chuyện — và một cách có co-presence",
    avoid: "toxic positivity, 'vào Discord đi'",
    topics: [
      "coworking ảo cho ai học/làm một mình cả ngày",
      "cô đơn khi ôn thi ở nhà hàng tháng",
      "vì sao focus tốt ở quán — thay thế khi không ra ngoài",
      "co-học im lặng vs nhóm thành tám",
    ],
  },

  remote: {
    id: "remote",
    label: "Remote & freelancer",
    pillar: { path: "/virtual-coworking", label: "coworking ảo" },
    audience:
      "freelancer HCMC/Hanoi, remote worker VN — WFH, client async, timezone global",
    voice:
      "thực tế về lịch, client, distraction nhà. Coworking ảo là cấu trúc phiên.",
    mustInclude:
      "kịch bản remote/freelance Việt Nam và cấu trúc phiên cụ thể",
    avoid: "hustle culture",
    topics: [
      "coworking ảo cho freelancer Việt làm một mình",
      "WFH sáng trượt vào email trước deep work",
      "freelancer: khối billable khi mọi giờ có thể bị gián đoạn",
      "làm từ phòng trọ một phòng không có bàn riêng",
      "timezone với client nước ngoài — phiên focus giờ yên",
      "remote Sài Gòn/Hà Nội: năng lượng văn phòng không commute",
    ],
  },
};

export const CATEGORY_IDS_VI = Object.keys(CATEGORIES_VI);

export function getCategoryVi(id) {
  const key = String(id || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  return CATEGORIES_VI[key] || null;
}
