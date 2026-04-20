import React from "react";
import { Link } from "react-router-dom";

const brownBtn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[#6B5344] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#5a4538]";

const benefitCard =
  "flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm transition hover:shadow-md";

const BENEFITS = [
  {
    icon: "payments",
    title: "Mức lương hấp dẫn",
    text: "Lương cạnh tranh theo năng lực, thưởng KPI hàng tháng.",
  },
  {
    icon: "trending_up",
    title: "Cơ hội thăng tiến",
    text: "Đánh giá hiệu suất định kỳ 6 tháng, lộ trình rõ ràng.",
  },
  {
    icon: "verified_user",
    title: "Chế độ hấp dẫn",
    text: "BHXH, BHYT, BHTN và các chính sách phúc lợi khác.",
  },
  {
    icon: "lightbulb",
    title: "Môi trường năng động",
    text: "Đào tạo nội bộ, phát triển kỹ năng bán hàng & chăm sóc khách.",
  },
];

const JOBS = [
  {
    title: "Chuyên viên tư vấn",
    type: "Toàn thời gian",
    place: "TP. HCM",
  },
  {
    title: "Nhân viên kho",
    type: "Bán thời gian",
    place: "TP. HCM",
  },
  {
    title: "Nhân viên cửa hàng",
    type: "Bán thời gian",
    place: "TP. HCM",
  },
];

const heroSrc = `${process.env.PUBLIC_URL || ""}/images/recruitment-hero.png`;

const RecruitmentPage = () => {
  return (
    <div className="min-h-screen bg-[#faf8f4] pb-16 pt-8 font-body md:pt-12">
      <div className="container mx-auto max-w-7xl px-4">
        <nav className="mb-8 text-sm text-neutral-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className="text-convot-sage hover:underline">
                Trang chủ
              </Link>
            </li>
            <li className="text-neutral-300" aria-hidden>
              /
            </li>
            <li className="font-medium text-neutral-700">Tuyển dụng</li>
          </ol>
        </nav>

        {/* Hero */}
        <section className="overflow-hidden rounded-3xl border border-neutral-200/70 bg-white px-6 py-10 shadow-sm md:px-10 md:py-12">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <h1 className="font-display text-3xl font-black uppercase tracking-tight text-[#4a5c42] md:text-4xl lg:text-[2.25rem]">
                Tuyển dụng
              </h1>
              <p className="mt-4 max-w-lg text-lg text-neutral-600">
                Cơ hội nghề nghiệp hấp dẫn đang chờ bạn
              </p>
              <a href="#vi-tri" className={`${brownBtn} mt-8`}>
                <span className="material-symbols-outlined text-[20px]">search</span>
                Ứng tuyển ngay
              </a>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-[#f0ebe3]">
                <img
                  src={heroSrc}
                  alt="Đội ngũ Sneaker Converse — tuyển dụng"
                  className="h-auto w-full object-contain object-center"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=80";
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Quyền lợi */}
        <section className="mt-12">
          <h2 className="sr-only">Quyền lợi khi làm việc</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className={benefitCard}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6B5344]/12 text-[#6B5344]">
                  <span className="material-symbols-outlined text-[28px]">{b.icon}</span>
                </span>
                <h3 className="mt-4 font-display text-base font-bold text-neutral-900">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{b.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vị trí tuyển */}
        <section id="vi-tri" className="mt-14 scroll-mt-24">
          <h2 className="font-display text-xl font-bold text-neutral-900 md:text-2xl">
            Vị trí đang tuyển dụng
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="flex items-center justify-center rounded-2xl border border-neutral-200/80 bg-[#f5f0e8] p-6 lg:col-span-4">
              <div className="aspect-square w-full max-w-[240px] text-[#6B5344]" aria-hidden>
                <svg viewBox="0 0 200 200" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M40 160 Q 100 40 160 160"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                    opacity="0.35"
                  />
                  <circle cx="70" cy="120" r="8" fill="currentColor" opacity="0.85" />
                  <circle cx="130" cy="100" r="8" fill="currentColor" opacity="0.85" />
                  <circle cx="100" cy="150" r="8" fill="currentColor" opacity="0.85" />
                  <path
                    d="M68 118 L128 98 M102 148 L72 122 M102 148 L128 102"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    opacity="0.4"
                  />
                </svg>
              </div>
            </div>
            <div className="flex flex-col gap-4 lg:col-span-8">
              {JOBS.map((job) => (
                <div
                  key={job.title}
                  className="flex flex-col gap-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-convot-sage/15 text-convot-sage">
                      <span className="material-symbols-outlined text-[22px]">headset_mic</span>
                    </span>
                    <div>
                      <p className="font-display font-bold text-neutral-900">{job.title}</p>
                      <p className="text-sm text-neutral-600">
                        {job.type} · {job.place}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`mailto:tuyendung@sneakerconverse.vn?subject=${encodeURIComponent(`Ứng tuyển — ${job.title}`)}`}
                    className={`${brownBtn} shrink-0 px-5 py-2.5 text-sm`}
                  >
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                    Ứng tuyển
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA cuối */}
        <section className="mt-14 rounded-3xl border border-[#e8e0d4] bg-[#f3ede4] px-6 py-10 text-center shadow-sm md:px-12">
          <p className="mx-auto max-w-2xl text-base font-medium text-neutral-700 md:text-lg">
            Ứng tuyển ngay hôm nay để trở thành thành viên trong đội ngũ của chúng tôi!
          </p>
          <Link to="/contact" className={`${brownBtn} mt-6`}>
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
            Nộp hồ sơ ngay
          </Link>
        </section>
      </div>
    </div>
  );
};

export default RecruitmentPage;
