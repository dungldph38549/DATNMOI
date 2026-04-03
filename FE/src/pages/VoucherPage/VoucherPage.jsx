import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { getAllVouchers } from "../../api";
import BackButton from "../../components/Common/BackButton";

const VoucherPage = () => {
  const user = useSelector((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [collectedCodes, setCollectedCodes] = useState([]);

  const storageKey = useMemo(() => {
    const identity = user?._id || user?.id || user?.email || "guest";
    return `collected_vouchers_v1_${String(identity)}`;
  }, [user?._id, user?.id, user?.email]);

  const loadCollectedCodes = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.map((v) => String(v || "").trim().toUpperCase()).filter(Boolean);
    } catch {
      return [];
    }
  };

  useEffect(() => {
    setCollectedCodes(loadCollectedCodes());
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await getAllVouchers();
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
    return vouchers.filter((v) => {
      const start = v?.startDate ? new Date(v.startDate) : null;
      const end = v?.endDate ? new Date(v.endDate) : null;
      const statusOk = v?.status === "active";
      const timeOk = (!start || now >= start) && (!end || now <= end);
      const usageLimit = Number(v?.usageLimit ?? 0);
      const usedCount = Number(v?.usedCount ?? 0);
      const usageOk = usageLimit === 0 || usedCount < usageLimit;
      return statusOk && timeOk && usageOk;
    });
  }, [vouchers]);

  const upcomingVouchers = useMemo(() => {
    const now = new Date();
    return vouchers
      .filter((v) => {
        const start = v?.startDate ? new Date(v.startDate) : null;
        const statusOk = v?.status === "active";
        const usageLimit = Number(v?.usageLimit ?? 0);
        const usedCount = Number(v?.usedCount ?? 0);
        const usageOk = usageLimit === 0 || usedCount < usageLimit;
        return statusOk && usageOk && start && now < start;
      })
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }, [vouchers]);

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

  const collectVoucher = (code) => {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) return;
    const next = Array.from(new Set([...collectedCodes, normalizedCode]));
    setCollectedCodes(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const saveVoucherIntent = (code) => {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) return;
    try {
      localStorage.setItem("pending_checkout_voucher_v1", normalizedCode);
    } catch {
      // ignore localStorage write error
    }
  };

  const formatMoney = (v) => `${Number(v || 0).toLocaleString("vi-VN")}đ`;

  return (
    <main className="bg-background-light min-h-screen font-body pb-20 pt-24">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-6">
          <BackButton />
        </div>
        <div className="mb-8">
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight">Kho Voucher</h1>
          <p className="text-slate-500 mt-2">Thu thập mã giảm giá tại đây và dùng ở bước thanh toán.</p>
        </div>

        {loading && <div className="bg-white rounded-2xl p-6 border border-slate-100 text-slate-500 font-semibold">Đang tải voucher...</div>}

        {!loading && activeVouchers.length === 0 && upcomingVouchers.length === 0 && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 text-slate-500 font-semibold">
            Hiện chưa có voucher khả dụng.
          </div>
        )}

        {upcomingVouchers.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-black text-slate-900 mb-2">Voucher sắp diễn ra</h2>
            <p className="text-slate-600 text-sm mb-4">
              Các mã này chưa đến thời gian áp dụng. Nếu nhập mã ở thanh toán quá sớm, hệ thống sẽ báo: voucher chưa có hiệu lực và thời điểm được dùng.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {upcomingVouchers.map((voucher) => {
                const code = String(voucher?.code || "").trim().toUpperCase();
                const isCollected = collectedCodes.includes(code);
                const discountText =
                  voucher?.discountType === "fixed"
                    ? `Giảm ${formatMoney(voucher?.discountValue)}`
                    : `Giảm ${Number(voucher?.discountValue || 0)}%`;
                const fromLabel = formatVoucherFromDate(voucher?.startDate);
                return (
                  <div
                    key={voucher?._id || code}
                    className="bg-white rounded-3xl border border-amber-100 shadow-sm p-6 flex flex-col gap-4 ring-1 ring-amber-100/80"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Mã Voucher</p>
                        <h2 className="text-2xl font-black text-primary mt-1">{code}</h2>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        Chưa đến hạn
                      </span>
                    </div>
                    <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
                      Có hiệu lực từ {fromLabel || "—"}
                    </div>
                    <p className="text-lg font-black text-slate-800">{discountText}</p>
                    <p className="text-sm font-semibold text-slate-500">
                      Đơn tối thiểu: <span className="text-slate-700">{formatMoney(voucher?.minOrderValue || 0)}</span>
                    </p>
                    <p className="text-sm text-slate-500">{voucher?.description || "Ưu đãi dành cho bạn."}</p>
                    <div className="flex gap-3 mt-2 flex-wrap">
                      <button
                        type="button"
                        disabled={isCollected}
                        onClick={() => collectVoucher(code)}
                        className="h-11 px-5 rounded-xl bg-slate-900 text-white font-bold hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCollected ? "Đã thu thập" : "Thu thập"}
                      </button>
                      <button
                        type="button"
                        disabled
                        title="Voucher chưa có hiệu lực"
                        className="h-11 px-5 rounded-xl bg-slate-100 text-slate-400 font-bold cursor-not-allowed border border-slate-200"
                      >
                        Dùng ngay
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeVouchers.map((voucher) => {
            const code = String(voucher?.code || "").trim().toUpperCase();
            const isCollected = collectedCodes.includes(code);
            const discountText =
              voucher?.discountType === "fixed"
                ? `Giảm ${formatMoney(voucher?.discountValue)}`
                : `Giảm ${Number(voucher?.discountValue || 0)}%`;
            return (
              <div key={voucher?._id || code} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Mã Voucher</p>
                    <h2 className="text-2xl font-black text-primary mt-1">{code}</h2>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-50 text-green-600 border border-green-100">Khả dụng</span>
                </div>

                <p className="text-lg font-black text-slate-800">{discountText}</p>
                <p className="text-sm font-semibold text-slate-500">
                  Đơn tối thiểu: <span className="text-slate-700">{formatMoney(voucher?.minOrderValue || 0)}</span>
                </p>
                <p className="text-sm font-semibold text-slate-500">
                  Áp dụng:{" "}
                  <span className="text-slate-700">
                    {Array.isArray(voucher?.applicableProductIds) &&
                    voucher.applicableProductIds.length > 0
                      ? `${voucher.applicableProductIds.length} sản phẩm`
                      : "Toàn bộ sản phẩm"}
                  </span>
                </p>
                <p className="text-sm text-slate-500">{voucher?.description || "Ưu đãi dành cho bạn."}</p>

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    disabled={isCollected}
                    onClick={() => collectVoucher(code)}
                    className="h-11 px-5 rounded-xl bg-slate-900 text-white font-bold hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCollected ? "Đã thu thập" : "Thu thập"}
                  </button>
                  <Link
                    to={`/product?voucher=${encodeURIComponent(code)}`}
                    onClick={() => saveVoucherIntent(code)}
                    className="h-11 px-5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors inline-flex items-center"
                  >
                    Dùng ngay
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default VoucherPage;
