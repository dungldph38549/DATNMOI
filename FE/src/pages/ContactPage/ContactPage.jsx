import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createContact } from "../../api";

const inputClass =
  "w-full rounded-2xl border border-neutral-200 bg-neutral-50/80 px-5 py-3.5 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-convot-sage focus:bg-white focus:ring-2 focus:ring-convot-sage/15";

const infoCard =
  "flex gap-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm transition hover:border-convot-sage/30 hover:shadow-md";

const ContactPage = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  const onChangeField = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setFeedback({ type: "", text: "" });

    const payload = {
      name: String(form.name || "").trim(),
      email: String(form.email || "").trim(),
      subject: String(form.subject || "").trim(),
      message: String(form.message || "").trim(),
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      setFeedback({
        type: "error",
        text: "Vui lòng nhập đầy đủ họ tên, email, tiêu đề và nội dung.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await createContact(payload);
      const autoReplySent = Boolean(res?.autoReplySent);
      setFeedback(
        autoReplySent
          ? {
              type: "success",
              text: "Đã gửi tin nhắn thành công. Kiểm tra email để nhận xác nhận từ SneakerConverse.",
            }
          : {
              type: "success",
              text: `Đã gửi liên hệ thành công. Email xác nhận chưa gửi được: ${
                res?.autoReplyReason || "SMTP chưa cấu hình hoặc cấu hình chưa đúng."
              }`,
            },
      );
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error?.response?.data?.message || "Không gửi được liên hệ. Vui lòng thử lại.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-convot-cream pb-16 pt-8 font-body text-neutral-800 md:pt-12">
      <div className="container mx-auto max-w-7xl px-4">
        <nav className="mb-8 text-sm text-neutral-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className="text-convot-sage transition-colors hover:underline">
                Trang chủ
              </Link>
            </li>
            <li className="text-neutral-300" aria-hidden>
              /
            </li>
            <li className="font-medium text-neutral-700">Liên hệ</li>
          </ol>
        </nav>

        {/* Tiêu đề */}
        <header className="mb-10">
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-neutral-900 md:text-4xl">
            Liên <span className="text-convot-sage">hệ</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base text-neutral-600 md:text-lg">
            Sneaker Converse luôn sẵn sàng lắng nghe góp ý, hỗ trợ đơn hàng và tư vấn size — phản hồi trong giờ làm việc.
          </p>
          <div className="mt-4 h-1 w-14 rounded-full bg-convot-sage" aria-hidden />
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Form */}
          <section className="lg:col-span-7">
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm md:p-10">
              <h2 className="font-display text-lg font-bold text-neutral-900 md:text-xl">
                Gửi tin nhắn cho chúng tôi
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Điền form bên dưới — chúng tôi sẽ liên hệ qua email hoặc điện thoại bạn đã nhập.
              </p>

              <form className="mt-8 space-y-5" onSubmit={onSubmit}>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="contact-name" className="text-sm font-bold text-neutral-700">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      placeholder="Nguyễn Văn A"
                      autoComplete="name"
                      className={inputClass}
                      value={form.name}
                      onChange={onChangeField}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="contact-email" className="text-sm font-bold text-neutral-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      placeholder="ban@email.com"
                      autoComplete="email"
                      className={inputClass}
                      value={form.email}
                      onChange={onChangeField}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact-subject" className="text-sm font-bold text-neutral-700">
                    Tiêu đề <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    name="subject"
                    placeholder="Ví dụ: Hỏi về đơn hàng, đổi size…"
                    className={inputClass}
                    value={form.subject}
                    onChange={onChangeField}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact-body" className="text-sm font-bold text-neutral-700">
                    Nội dung <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="contact-body"
                    name="message"
                    rows={5}
                    placeholder="Nhập chi tiết nội dung cần hỗ trợ…"
                    className={`${inputClass} resize-none`}
                    value={form.message}
                    onChange={onChangeField}
                  />
                </div>

                {feedback.text ? (
                  <p
                    className={`text-sm font-medium ${
                      feedback.type === "error" ? "text-red-600" : "text-emerald-700"
                    }`}
                  >
                    {feedback.text}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-convot-sage px-8 text-sm font-bold text-white shadow-md transition hover:bg-[#7a9680]"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  {submitting ? "Đang gửi..." : "Gửi lời nhắn"}
                </button>
              </form>
            </div>
          </section>

          {/* Thông tin */}
          <aside className="flex flex-col gap-4 lg:col-span-5">
            <div className={infoCard}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-convot-sage/15 text-convot-sage">
                <span className="material-symbols-outlined text-[24px]">location_on</span>
              </span>
              <div>
                <h3 className="font-display font-bold text-neutral-900">Địa chỉ</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                  FPT Polytechnic, Tòa nhà F, Phố Trịnh Văn Bô, Nam Từ Liêm, Hà Nội
                </p>
              </div>
            </div>

            <div className={infoCard}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-convot-sage/15 text-convot-sage">
                <span className="material-symbols-outlined text-[24px]">call</span>
              </span>
              <div>
                <h3 className="font-display font-bold text-neutral-900">Điện thoại</h3>
                <p className="mt-1 text-sm text-neutral-600">0123 456 789</p>
                <p className="text-sm text-neutral-600">0987 654 321</p>
              </div>
            </div>

            <div className={infoCard}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-convot-sage/15 text-convot-sage">
                <span className="material-symbols-outlined text-[24px]">mail</span>
              </span>
              <div>
                <h3 className="font-display font-bold text-neutral-900">Email</h3>
                <a
                  href="mailto:support@sneakerconverse.vn"
                  className="mt-1 block text-sm font-medium text-convot-sage hover:underline"
                >
                  support@sneakerconverse.vn
                </a>
                <a
                  href="mailto:contact@sneakerconverse.vn"
                  className="mt-0.5 block text-sm font-medium text-convot-sage hover:underline"
                >
                  contact@sneakerconverse.vn
                </a>
              </div>
            </div>

            <div className={infoCard}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-convot-sage/15 text-convot-sage">
                <span className="material-symbols-outlined text-[24px]">schedule</span>
              </span>
              <div>
                <h3 className="font-display font-bold text-neutral-900">Giờ làm việc</h3>
                <p className="mt-1 text-sm text-neutral-600">Thứ 2 – Chủ nhật: 9h00 – 21h00</p>
              </div>
            </div>
          </aside>
        </div>

        {/* Bản đồ */}
        <section className="mt-12 overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-sm">
          <div className="relative aspect-[21/9] min-h-[220px] w-full md:min-h-[280px]">
            <iframe
              title="Bản đồ Sneaker Converse — Hà Nội"
              src="https://www.google.com/maps?q=21.0383,105.7474&z=15&output=embed"
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-convot-cream/40 to-transparent" />
          </div>
          <p className="border-t border-neutral-100 px-4 py-3 text-center text-xs text-neutral-500">
            Vị trí minh họa — có thể cập nhật tọa độ cửa hàng trong mã nguồn.
          </p>
        </section>
      </div>
    </div>
  );
};

export default ContactPage;
