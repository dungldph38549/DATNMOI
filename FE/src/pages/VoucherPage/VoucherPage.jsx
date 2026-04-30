import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Modal } from "antd";
import {
  FaCopy,
  FaGift,
  FaPercent,
  FaTag,
  FaTruck,
} from "react-icons/fa";
import { getActiveVouchers } from "../../api";
import notify from "../../utils/notify";

const ICONS = [FaTruck, FaTag, FaPercent, FaGift];

const HERO_IMG =
  "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=85&w=1200&auto=format&fit=crop";

const VoucherPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.user);
  const isLoggedIn = !!(user?.login && user?.token);
  const [loading, setLoading] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [collectedCodes, setCollectedCodes] = useState([]);
  const [expiredCodes, setExpiredCodes] = useState([]);

  const storageKey = useMemo(() => {
    const identity = user?._id || user?.id || user?.email || "guest";
    return `collected_vouchers_v1_${String(identity)}`;
  }, [user?._id, user?.id, user?.email]);

  const loadCollectedCodes = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(raw)) {
        return {
          active: raw.map((v) => String(v || "").trim().toUpperCase()).filter(Boolean),
          expired: [],
        };
      }
      if (raw && typeof raw === "object") {
        const active = Array.isArray(raw.active)
          ? raw.active.map((v) => String(v || "").trim().toUpperCase()).filter(Boolean)
          : [];
        const expired = Array.isArray(raw.expired)
          ? raw.expired.map((v) => String(v || "").trim().toUpperCase()).filter(Boolean)
          : [];
        return { active, expired };
      }
      return { active: [], expired: [] };
    } catch {
      return { active: [], expired: [] };
    }
  };

  const saveCollectedCodes = (active, expired) => {
    const nextActive = [...new Set((active || []).map((v) => String(v || "").trim().toUpperCase()).filter(Boolean))];
    const nextExpired = [...new Set((expired || []).map((v) => String(v || "").trim().toUpperCase()).filter(Boolean))];
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        active: nextActive,
        expired: nextExpired,
      }),
    );
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setCollectedCodes([]);
      setExpiredCodes([]);
      return;
    }
    const data = loadCollectedCodes();
    setCollectedCodes(data.active);
    setExpiredCodes(data.expired);
  }, [storageKey, isLoggedIn]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await getActiveVouchers();
        if (cancelled) return;
        const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
        setVouchers(arr);
      } catch {
        if (!cancelled) setVouchers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeVouchers = useMemo(() => {
    const now = new Date();
    const collectedSet = new Set(collectedCodes.map((code) => String(code).trim().toUpperCase()));
    const expiredSet = new Set(expiredCodes.map((code) => String(code).trim().toUpperCase()));
    return vouchers.filter((v) => {
      const code = String(v?.code || "").trim().toUpperCase();
      if (code && (collectedSet.has(code) || expiredSet.has(code))) return false;
      const start = v?.startDate ? new Date(v.startDate) : null;
      const end = v?.endDate ? new Date(v.endDate) : null;
      const statusOk = v?.status === "active";
      const timeOk = (!start || now >= start) && (!end || now <= end);
      const usageLimit = Number(v?.usageLimit ?? 0);
      const usedCount = Number(v?.usedCount ?? 0);
      const usageOk = usageLimit === 0 || usedCount < usageLimit;
      return statusOk && timeOk && usageOk;
    });
  }, [vouchers, collectedCodes, expiredCodes]);

  const sortedActive = useMemo(() => {
    const score = (v) => {
      if (v?.discountType === "percent") return Number(v?.discountValue || 0) * 1000;
      return Number(v?.discountValue || 0);
    };
    return [...activeVouchers].sort((a, b) => score(b) - score(a));
  }, [activeVouchers]);

  const featured = sortedActive[0];
  const gridVouchers = sortedActive.slice(1);
  const voucherByCode = useMemo(() => {
    const map = new Map();
    vouchers.forEach((voucher) => {
      const code = String(voucher?.code || "").trim().toUpperCase();
      if (code) map.set(code, voucher);
    });
    return map;
  }, [vouchers]);
  const savedVouchers = useMemo(
    () =>
      collectedCodes
        .map((code) => voucherByCode.get(String(code).trim().toUpperCase()))
        .filter((voucher) => {
          if (!voucher) return false;
          const now = new Date();
          const start = voucher?.startDate ? new Date(voucher.startDate) : null;
          const end = voucher?.endDate ? new Date(voucher.endDate) : null;
          const statusOk = voucher?.status === "active";
          const timeOk = (!start || now >= start) && (!end || now <= end);
          const usedCount = Number(voucher?.usedCount ?? 0);
          return statusOk && timeOk && usedCount < 1;
        }),
    [collectedCodes, voucherByCode],
  );

  const upcomingVouchers = useMemo(() => {
    const now = new Date();
    const collectedSet = new Set(collectedCodes.map((code) => String(code).trim().toUpperCase()));
    const expiredSet = new Set(expiredCodes.map((code) => String(code).trim().toUpperCase()));
    return vouchers
      .filter((v) => {
        const code = String(v?.code || "").trim().toUpperCase();
        if (code && (collectedSet.has(code) || expiredSet.has(code))) return false;
        const start = v?.startDate ? new Date(v.startDate) : null;
        const statusOk = v?.status === "active";
        const usageLimit = Number(v?.usageLimit ?? 0);
        const usedCount = Number(v?.usedCount ?? 0);
        const usageOk = usageLimit === 0 || usedCount < usageLimit;
        return statusOk && usageOk && start && now < start;
      })
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }, [vouchers, collectedCodes, expiredCodes]);

  const formatVoucherFromDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMoney = (v) => `${Number(v || 0).toLocaleString("vi-VN")}đ`;

  const discountHeadline = (v) => {
    if (!v) return "";
    if (v.discountType === "fixed") return `Giảm ${formatMoney(v.discountValue)}`;
    return `Giảm ${Number(v.discountValue || 0)}%`;
  };

  const discountShort = (v) => {
    if (!v) return "";
    if (v.discountType === "fixed") return formatMoney(v.discountValue);
    return `${Number(v.discountValue || 0)}%`;
  };

  const voucherTag = (v) => {
    const end = v?.endDate ? new Date(v.endDate) : null;
    if (!end || Number.isNaN(end.getTime())) return "Không giới hạn thời gian";
    const days = (end.getTime() - Date.now()) / 86400000;
    if (days <= 7 && days >= 0) return "Sắp hết hạn";
    if (days < 0) return "Hết hạn";
    return "Đang hiệu lực";
  };

  const collectVoucher = (code) => {
    if (!isLoggedIn) {
      Modal.confirm({
        title: "Cần đăng nhập",
        content: "Vui lòng đăng nhập để lưu voucher.",
        centered: true,
        okText: "Đăng nhập",
        cancelText: "Quay lại",
        width: 400,
        onOk: () => {
          navigate("/login", { state: { from: location.pathname || "/voucher" } });
        },
      });
      return;
    }
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) return;
    if (expiredCodes.includes(normalizedCode)) {
      notify.warning("Voucher này đã sử dụng/hết hiệu lực.");
      return;
    }
    const next = Array.from(new Set([...collectedCodes, normalizedCode]));
    setCollectedCodes(next);
    saveCollectedCodes(next, expiredCodes);
    notify.success("Đã lưu phiếu giảm giá vào tài khoản.");
  };

  const saveVoucherIntent = (code) => {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) return;
    try {
      localStorage.setItem("pending_checkout_voucher_v1", normalizedCode);
    } catch {
      /* ignore */
    }
  };

  const copyCode = async (code) => {
    const c = String(code || "").trim();
    if (!c) return;
    try {
      await navigator.clipboard.writeText(c);
      notify.success("Đã sao chép mã.");
    } catch {
      notify.warning("Không sao chép được. Hãy chọn mã và sao chép thủ công.");
    }
  };

  const VoucherMiniCard = ({ voucher, dark, upcoming }) => {
    const code = String(voucher?.code || "").trim().toUpperCase();
    const isCollected = collectedCodes.includes(code);
    const isExpired = expiredCodes.includes(code);
    const Icon = ICONsFromCode(code);
    const tag = upcoming
      ? "Sắp diễn ra"
      : voucherTag(voucher);
    const title = discountHeadline(voucher);
    const desc =
      voucher?.description ||
      (upcoming
        ? "Chưa đến thời gian áp dụng — mã sẽ dùng được khi đến ngày mở."
        : "Ưu đãi áp dụng theo điều kiện đơn hàng.");

    const base =
      "relative flex flex-col rounded-2xl border p-5 transition-shadow hover:shadow-md md:p-6";
    const light = "border-neutral-200/80 bg-white text-neutral-900";
    const deep = "border-[#3d4f42] bg-[#4a5d4e] text-white shadow-lg shadow-[#4a5d4e]/15";

    return (
      <div className={`${base} ${dark ? deep : light}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              dark ? "bg-white/15 text-white" : "bg-[#4a5d4e]/10 text-[#4a5d4e]"
            }`}
          >
            <Icon className="text-lg" />
          </div>
          <span
            className={`max-w-[140px] text-right text-[10px] font-bold uppercase leading-tight tracking-wider ${
              dark ? "text-white/80" : "text-neutral-400"
            }`}
          >
            {tag}
          </span>
        </div>
        <h3 className={`font-display text-lg font-bold leading-snug ${dark ? "text-white" : "text-neutral-900"}`}>
          {title}
        </h3>
        <p className={`mt-2 line-clamp-3 text-sm leading-relaxed ${dark ? "text-white/85" : "text-neutral-500"}`}>
          {desc}
        </p>
        {upcoming && voucher?.startDate && (
          <p className={`mt-2 text-xs font-semibold ${dark ? "text-amber-200" : "text-amber-800/90"}`}>
            Mở áp dụng: {formatVoucherFromDate(voucher.startDate)}
          </p>
        )}
        <p className={`mt-2 text-xs font-medium ${dark ? "text-white/70" : "text-neutral-400"}`}>
          Đơn tối thiểu {formatMoney(voucher?.minOrderValue || 0)}
        </p>
        <div className="mt-5 flex items-center gap-2">
          <div
            className={`min-w-0 flex-1 truncate rounded-xl px-3 py-2.5 font-mono text-sm font-semibold ${
              dark ? "bg-black/20 text-white" : "bg-neutral-100 text-neutral-900"
            }`}
          >
            {code}
          </div>
          <button
            type="button"
            onClick={() => copyCode(code)}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:opacity-90 ${
              dark ? "bg-white text-[#4a5d4e]" : "bg-[#4a5d4e] text-white"
            }`}
            aria-label="Sao chép mã"
          >
            <FaCopy className="text-sm" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isCollected || isExpired}
            onClick={() => collectVoucher(code)}
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
              isExpired
                ? "bg-red-100 text-red-700 hover:bg-red-100 cursor-not-allowed"
                :
              dark
                ? "bg-white/20 text-white hover:bg-white/30 disabled:opacity-50"
                : "bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
            }`}
          >
            {isExpired ? "Đã sử dụng" : isCollected ? "Đã lưu" : "Lưu voucher"}
          </button>
          {upcoming ? (
            <span
              className={`inline-flex cursor-not-allowed items-center rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide opacity-60 ${
                dark ? "border-white/30 text-white/80" : "border-neutral-200 text-neutral-500"
              }`}
              title="Chưa đến thời gian áp dụng"
            >
              Chưa áp dụng
            </span>
          ) : (
            <Link
              to={`/product?voucher=${encodeURIComponent(code)}`}
              onClick={() => saveVoucherIntent(code)}
              className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide ${
                dark ? "border border-white/40 text-white hover:bg-white/10" : "border border-neutral-200 text-neutral-800 hover:bg-neutral-50"
              }`}
            >
              Mua ngay
            </Link>
          )}
        </div>
      </div>
    );
  };

  function ICONsFromCode(code) {
    const s = String(code || "A");
    let n = 0;
    for (let i = 0; i < s.length; i += 1) n += s.charCodeAt(i);
    return ICONS[n % ICONS.length];
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] pb-16 pt-12 font-body text-neutral-900">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Hero */}
        <section className="mb-14 md:mb-20">
          <h1 className="font-display text-3xl font-bold leading-[1.15] tracking-tight text-black md:text-5xl lg:text-[2.75rem]">
            ƯU ĐÃI ĐỘC QUYỀN
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 md:text-lg">
            Tích lũy mã giảm giá, freeship và quà tặng dành cho thành viên Sneaker Converse — áp dụng khi thanh toán trong thời gian hiệu lực.
          </p>

          {!loading && featured && (
            <div className="mt-10 overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-sm">
              <div className="grid md:grid-cols-2">
                <div className="relative aspect-[4/3] min-h-[240px] bg-neutral-100 md:aspect-auto md:min-h-[320px]">
                  <img
                    src={HERO_IMG}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover object-center saturate-[0.88] contrast-[0.97]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/20 via-transparent to-white/10" />
                  <p className="absolute bottom-5 left-5 max-w-[85%] rounded-lg bg-white/90 px-3 py-2 text-[11px] font-semibold uppercase leading-relaxed tracking-[0.18em] text-neutral-800 shadow-sm backdrop-blur-sm">
                    Mùa mới / Chỉ dành cho thành viên
                  </p>
                </div>
                <div className="flex flex-col justify-center p-8 md:p-12">
                  <p className="font-display text-4xl font-bold text-[#4a5d4e] md:text-5xl">{discountShort(featured)}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                    {discountHeadline(featured)}
                  </p>
                  <p className="mt-6 text-sm text-neutral-600">
                    {featured?.description || "Ưu đãi có thời hạn. Không kết hợp cùng chương trình khác trừ khi ghi rõ."}
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 font-mono text-lg font-bold tracking-wide text-neutral-900">
                      {String(featured.code || "").toUpperCase()}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyCode(featured.code)}
                      className="shrink-0 rounded-2xl bg-[#4a5d4e] px-8 py-3 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#3d4f42]"
                    >
                      Sao chép mã
                    </button>
                  </div>
                  <p className="mt-4 text-xs italic text-neutral-400">
                    * Áp dụng theo điều kiện đơn tối thiểu và danh mục sản phẩm được cấu hình trên hệ thống.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {loading && (
          <div className="mb-10 rounded-2xl border border-neutral-200 bg-white p-8 text-center text-neutral-500">
            Đang tải voucher...
          </div>
        )}

        {/* Available grid */}
        {!loading && (activeVouchers.length > 0 || featured) && (
          <section className="mb-16">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-display text-2xl font-bold text-neutral-900">Voucher khả dụng</h2>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                {activeVouchers.length} ưu đãi đang mở
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {gridVouchers.map((voucher, idx) => (
                <VoucherMiniCard key={voucher._id || voucher.code} voucher={voucher} dark={idx === 1} />
              ))}

              {/* Placeholder card */}
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-white/50 p-8 text-center">
                <span className="text-4xl text-neutral-300" aria-hidden>
                  ◈
                </span>
                <p className="mt-4 font-display text-sm font-semibold text-neutral-600">
                  Còn nhiều đợt drop sắp tới
                </p>
                <p className="mt-2 max-w-xs text-xs leading-relaxed text-neutral-400">
                  Theo dõi trang này để không bỏ lỡ mã mới.
                </p>
              </div>
            </div>
          </section>
        )}

        {!loading && isLoggedIn && savedVouchers.length > 0 && (
          <section className="mb-16">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-display text-2xl font-bold text-neutral-900">Voucher đã lưu</h2>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                {savedVouchers.length} mã đã lưu
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {savedVouchers.map((voucher, idx) => (
                <VoucherMiniCard
                  key={voucher._id || voucher.code}
                  voucher={voucher}
                  dark={idx % 3 === 1}
                />
              ))}
            </div>
          </section>
        )}

        {!loading && upcomingVouchers.length > 0 && (
          <section className="mb-16">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-display text-2xl font-bold text-neutral-900">Voucher sắp diễn ra</h2>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                {upcomingVouchers.length} mã sắp mở
              </p>
            </div>
            <p className="mb-8 max-w-2xl text-sm text-neutral-600">
              Các mã dưới đây chưa đến thời điểm áp dụng — bạn vẫn có thể sao chép hoặc lưu để dùng sau.
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingVouchers.map((voucher, idx) => (
                <VoucherMiniCard key={voucher._id || voucher.code} voucher={voucher} dark={idx === 1} upcoming />
              ))}
            </div>
          </section>
        )}

        {!loading && activeVouchers.length === 0 && upcomingVouchers.length === 0 && (
          <div className="mb-16 rounded-2xl border border-neutral-200 bg-white p-12 text-center text-neutral-500">
            Hiện chưa có voucher khả dụng. Vui lòng quay lại sau.
          </div>
        )}
      </div>
    </main>
  );
};

export default VoucherPage;
