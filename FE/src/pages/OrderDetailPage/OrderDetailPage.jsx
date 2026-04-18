import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  getOrderById,
  confirmDelivery,
  returnOrderRequest,
  createVnpayUrl,
  cancelOrderByUser,
  cancelOrderLineByUser,
  createReview,
  uploadImages,
  getMyReviewByProduct,
} from "../../api";
import { FaBoxOpen, FaCheckCircle, FaTruck, FaMapMarkerAlt, FaTimesCircle, FaChevronLeft, FaUndoAlt, FaCreditCard, FaMoneyBillWave, FaShieldAlt, FaTimes, FaStar, FaImage, FaVideo, FaChevronDown, FaCoins } from "react-icons/fa";
import notify from "../../utils/notify";
import { confirmShopee } from "../../utils/shopeeNotify";

const STATUS_LABELS = {
  pending: "Chờ xử lý", confirmed: "Đã xác nhận", shipped: "Đang giao", delivered: "Đã giao",
  received: "Giao hàng thành công",
  canceled: "Đã hủy",
  "return-request": "Hoàn hàng: Đang yêu cầu",
  accepted: "Hoàn hàng: Đã chấp nhận",
  rejected: "Hoàn hàng: Bị từ chối",
  returned: "Hoàn hàng: Hoàn tất",
};

const STATUS_ICONS = {
  pending: <FaBoxOpen />, confirmed: <FaCheckCircle />, shipped: <FaTruck />, delivered: <FaMapMarkerAlt />,
  received: <FaCheckCircle />,
  canceled: <FaTimesCircle />, "return-request": <FaUndoAlt />, accepted: <FaCheckCircle />, rejected: <FaTimesCircle />
};

const STATUS_COLORS = {
  pending: "bg-blue-50 text-blue-600 border-blue-200", confirmed: "bg-indigo-50 text-indigo-600 border-indigo-200",
  shipped: "bg-purple-50 text-purple-600 border-purple-200", delivered: "bg-green-50 text-green-600 border-green-200",
  received: "bg-emerald-50 text-emerald-700 border-emerald-200",
  canceled: "bg-red-50 text-red-600 border-red-200", "return-request": "bg-orange-50 text-orange-600 border-orange-200",
  accepted: "bg-teal-50 text-teal-600 border-teal-200", rejected: "bg-red-50 text-red-600 border-red-200",
};

const TRACKING_STEPS = ["pending", "confirmed", "shipped", "delivered", "received"];
const RETURN_STATUSES = new Set(["return-request", "accepted", "rejected", "returned"]);
const REVIEWABLE_STATUSES = new Set(["delivered", "received"]);
const RETURN_REASON_OPTIONS = [
  { value: "wrong_size", label: "Sai size / không vừa", requireImage: false },
  { value: "wrong_item", label: "Giao sai mẫu / sai màu", requireImage: true },
  { value: "defective", label: "Lỗi sản xuất", requireImage: true },
  { value: "damaged_shipping", label: "Hư hỏng khi vận chuyển", requireImage: true },
  { value: "not_as_described", label: "Không đúng mô tả", requireImage: false },
  { value: "other", label: "Lý do khác", requireImage: false },
];
const getTrackingProgress = (status) => {
  if (status === "canceled") return -1;
  if (RETURN_STATUSES.has(status)) return 3;
  return TRACKING_STEPS.indexOf(status);
};

const formatMoney = (v) => `${Number(v || 0).toLocaleString("vi-VN")}đ`;

const isOrderLineActive = (p) =>
  !p?.lineStatus || p.lineStatus !== "canceled";

const normHistoryStatus = (s) =>
  typeof s === "string" ? s.trim().toLowerCase() : s;

/** Lịch sử sắp cũ → mới; tô đậm mục trùng `order.status` (lần xuất hiện cuối), không thì mục mới nhất. */
const historyChronological = (items) =>
  [...(items || [])].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );

const getHistoryHighlightIndex = (chron, orderStatus) => {
  if (!chron.length) return -1;
  const st = normHistoryStatus(orderStatus);
  let idx = -1;
  chron.forEach((h, i) => {
    if (normHistoryStatus(h.newStatus) === st) idx = i;
  });
  return idx >= 0 ? idx : chron.length - 1;
};

const RATING_LABELS = {
  0: "",
  1: "Rất tệ",
  2: "Tệ",
  3: "Bình thường",
  4: "Tốt",
  5: "Tuyệt vời",
};

const buildMergedReviewContent = (quality, diversity) => {
  const q = String(quality || "").trim();
  const d = String(diversity || "").trim();
  const parts = [];
  if (q) parts.push(`Chất lượng: ${q}`);
  if (d) parts.push(`Đa dạng: ${d}`);
  return parts.join("\n\n").slice(0, 500);
};

const getReviewProductThumb = (line) => {
  const imgName = line?.image || line?.productId?.image;
  if (!imgName) return "https://via.placeholder.com/80/f0f0f0/999?text=SP";
  if (typeof imgName === "string" && imgName.startsWith("http")) return imgName;
  return `http://localhost:3002/uploads/${String(imgName).startsWith("/") ? String(imgName).slice(1) : imgName}`;
};

const getReviewVariantLabel = (line) => {
  if (line?.size) return String(line.size);
  const attrs = line?.attributes;
  if (attrs && typeof attrs === "object") {
    const entries = Object.entries(attrs).filter(([, v]) => v != null && String(v).trim() !== "");
    if (entries.length) return entries.map(([k, v]) => `${k}: ${v}`).join(" · ");
  }
  if (line?.sku) return `SKU: ${line.sku}`;
  return "Mặc định";
};

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnReasonCode, setReturnReasonCode] = useState("wrong_size");
  const [returnFiles, setReturnFiles] = useState([]);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewQuality, setReviewQuality] = useState("");
  const [reviewDiversity, setReviewDiversity] = useState("");
  const [reviewFiles, setReviewFiles] = useState([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [myReviewsByProduct, setMyReviewsByProduct] = useState({});
  const user = useSelector((state) => state.user);
  const isLoggedIn = !!user?.login;

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getOrderById(id);
        setOrder(res?.order || res);
        setHistory(res?.history || []);
      } catch (err) { setOrder(null); }
      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    const run = async () => {
      const status = typeof order?.status === "string" ? order.status.trim().toLowerCase() : order?.status;
      if (
        !isLoggedIn ||
        !REVIEWABLE_STATUSES.has(status) ||
        !Array.isArray(order?.products) ||
        order.products.length === 0
      ) {
        setMyReviewsByProduct({});
        return;
      }
      const productIds = Array.from(
        new Set(
          order.products
            .filter(isOrderLineActive)
            .map((p) => String(p?.productId?._id || p?.productId || ""))
            .filter(Boolean),
        ),
      );
      const entries = await Promise.all(
        productIds.map(async (pid) => {
          try {
            const review = await getMyReviewByProduct(pid, id);
            return [pid, review];
          } catch (_) {
            return [pid, null];
          }
        }),
      );
      setMyReviewsByProduct(Object.fromEntries(entries));
    };
    run();
  }, [isLoggedIn, order]);

  const handleConfirmDelivery = async () => {
    const wasPaid = order?.paymentStatus === "paid";
    try {
      await confirmDelivery(id);
      setOrder((o) =>
        o ? { ...o, status: "received", paymentStatus: "paid" } : o,
      );
      notify.success(
        wasPaid
          ? "Cảm ơn bạn đã xác nhận đã nhận hàng."
          : "Đã xác nhận nhận hàng.",
      );
    } catch (err) {
      notify.error(err?.response?.data?.message || "Co loi.");
    }
  };

  const openReturnModal = () => {
    setReturnReason("");
    setReturnReasonCode("wrong_size");
    setReturnFiles([]);
    setReturnModalOpen(true);
  };

  const closeReturnModal = () => {
    if (returnSubmitting) return;
    setReturnModalOpen(false);
    setReturnReason("");
    setReturnReasonCode("wrong_size");
    setReturnFiles([]);
  };

  const handleSelectReturnFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = Math.max(0, 5 - returnFiles.length);
    if (remaining <= 0) return;
    setReturnFiles((prev) => [...prev, ...files.slice(0, remaining)]);
    e.target.value = null;
  };

  const submitReturnRequest = async () => {
    const reason = returnReason.trim();
    if (reason.length < 5) {
      notify.warning("Vui long nhap ly do hoan hang (toi thieu 5 ky tu).");
      return;
    }
    const selectedReason = RETURN_REASON_OPTIONS.find(
      (x) => x.value === returnReasonCode,
    );
    if (!selectedReason) {
      notify.warning("Vui lòng chọn lý do hoàn hàng.");
      return;
    }
    if (selectedReason.requireImage && returnFiles.length === 0) {
      notify.warning("Lý do này yêu cầu ít nhất 1 ảnh minh chứng.");
      return;
    }
    setReturnSubmitting(true);
    try {
      let images = [];
      if (returnFiles.length > 0) {
        const fd = new FormData();
        returnFiles.forEach((f) => fd.append("files", f));
        const uploadRes = await uploadImages(fd);
        const paths = uploadRes?.paths ?? uploadRes?.data?.paths ?? uploadRes?.data ?? [];
        if (Array.isArray(paths)) images = paths;
      }
      await returnOrderRequest(id, reason, images, returnReasonCode);
      setOrder((o) => (o ? { ...o, status: "return-request" } : o));
      setReturnModalOpen(false);
      setReturnReason("");
      setReturnFiles([]);
      notify.success("Da gui yeu cau hoan hang.");
    } catch (err) {
      notify.error(err?.response?.data?.message || "Co loi.");
    } finally {
      setReturnSubmitting(false);
    }
  };

  const handleRepayVnpay = async () => {
    try {
      const baseUrl = window.location.origin;
      const res = await createVnpayUrl(id, `${baseUrl}/payment/return`, `${baseUrl}/orders/${id}`);
      if (res?.url) window.location.href = res.url;
      else notify.error("Khong tao duoc link thanh toan VNPay.");
    } catch (err) { notify.error(err?.response?.data?.message || "Khong the tao thanh toan VNPay."); }
  };

  const handleCancelOrder = async () => {
    const ok = await confirmShopee({
      text: "Bạn có chắc muốn hủy toàn bộ đơn hàng này?",
      confirmText: "Đồng ý",
      cancelText: "Đóng",
    });
    if (!ok) return;
    try {
      await cancelOrderByUser(id);
      setOrder((o) => (o ? { ...o, status: "canceled" } : o));
      notify.success("Da huy don hang.");
    } catch (err) { notify.error(err?.response?.data?.message || "Khong the huy don hang."); }
  };

  const handleCancelOrderLine = async (lineIndex) => {
    const ok = await confirmShopee({
      text: "Hủy đơn nầy khỏi đơn? Tiền ví (nếu có) sẽ được hoàn tương ứng.",
      confirmText: "Đồng ý",
      cancelText: "Đóng",
    });
    if (!ok) return;
    try {
      const data = await cancelOrderLineByUser(id, lineIndex);
      if (data?.order) {
        setOrder(data.order);
        setHistory(Array.isArray(data.history) ? data.history : []);
      }
      notify.success("Đã hủy dòng hàng.");
    } catch (err) {
      notify.error(err?.response?.data?.message || "Không thể hủy dòng hàng.");
    }
  };

  const openReviewModal = (item) => {
    setReviewTarget(item);
    setReviewRating(5);
    setReviewQuality("");
    setReviewDiversity("");
    setReviewFiles([]);
    setReviewError("");
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    if (reviewSubmitting) return;
    setReviewModalOpen(false);
    setReviewTarget(null);
    setReviewFiles([]);
    setReviewError("");
  };

  const handleSelectReviewFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = Math.max(0, 5 - reviewFiles.length);
    if (remaining <= 0) return;
    setReviewFiles((prev) => [...prev, ...files.slice(0, remaining)]);
    e.target.value = null;
  };

  const submitReview = async () => {
    if (!reviewTarget?.productId?._id && !reviewTarget?.productId) return;
    if (!order?._id) {
      setReviewError("Không xác định được đơn hàng — không thể gửi đánh giá.");
      return;
    }
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      setReviewError("Vui lòng chọn số sao từ 1 đến 5.");
      return;
    }
    setReviewSubmitting(true);
    setReviewError("");
    try {
      let images = [];
      if (reviewFiles.length > 0) {
        const fd = new FormData();
        reviewFiles.forEach((f) => fd.append("files", f));
        const uploadRes = await uploadImages(fd);
        const paths = uploadRes?.paths ?? uploadRes?.data?.paths ?? uploadRes?.data ?? [];
        if (Array.isArray(paths)) images = paths.map((p) => ({ url: p }));
      }

      const mergedContent = buildMergedReviewContent(reviewQuality, reviewDiversity);
      await createReview({
        productId: reviewTarget?.productId?._id || reviewTarget?.productId,
        orderId: order._id,
        rating: reviewRating,
        title: null,
        content: mergedContent || null,
        images,
      });
      const productIdKey = String(reviewTarget?.productId?._id || reviewTarget?.productId || "");
      if (productIdKey) {
        setMyReviewsByProduct((prev) => ({
          ...prev,
          [productIdKey]: {
            rating: reviewRating,
            title: null,
            content: mergedContent || null,
            status: "pending",
          },
        }));
      }
      notify.success("Da gui danh gia. Danh gia se hien thi sau khi duoc duyet.");
      closeReviewModal();
    } catch (err) {
      setReviewError(err?.response?.data?.message || "Không thể gửi đánh giá.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const st =
    typeof order?.status === "string"
      ? order.status.trim().toLowerCase()
      : order?.status;
  const canReviewOrder = REVIEWABLE_STATUSES.has(st);

  const latestCancelNote = useMemo(() => {
    const list = Array.isArray(history) ? history : [];
    const sorted = [...list].sort(
      (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0),
    );
    const entry = sorted.find(
      (h) => normHistoryStatus(h?.newStatus) === "canceled",
    );
    return entry?.note != null ? String(entry.note).trim() : "";
  }, [history]);

  const reviewMergedPreview = useMemo(
    () => buildMergedReviewContent(reviewQuality, reviewDiversity),
    [reviewQuality, reviewDiversity],
  );

  const reviewFilePreviews = useMemo(
    () => reviewFiles.map((f) => URL.createObjectURL(f)),
    [reviewFiles],
  );
  useEffect(() => {
    return () => {
      reviewFilePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [reviewFilePreviews]);

  useEffect(() => {
    if (!location?.state?.openReview) return;
    if (!canReviewOrder || !isLoggedIn) return;
    const firstProduct = Array.isArray(order?.products)
      ? order.products.find(isOrderLineActive)
      : null;
    if (!firstProduct) return;
    openReviewModal(firstProduct);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location?.state, canReviewOrder, isLoggedIn, order, navigate, location.pathname]);

  if (loading) return (
    <div className="min-h-screen bg-background-light pt-24 pb-20 flex justify-center items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold">Đang tải...</p>
      </div>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen bg-background-light pt-24 pb-20 flex justify-center items-center">
      <div className="bg-white p-12 rounded-3xl shadow-sm text-center border border-slate-100">
        <h2 className="text-2xl font-black text-slate-800 mb-2">Đơn hàng không tồn tại</h2>
        <p className="text-slate-500 mb-6">Xin lỗi, chúng tôi không thể tìm thấy thông tin đơn hàng này.</p>
        <Link to="/orders" className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-primary transition-colors">Quay Lại Lịch Sử</Link>
      </div>
    </div>
  );

  const saleDiscountTotal = (order?.products || [])
    .filter(isOrderLineActive)
    .reduce(
      (sum, p) =>
        sum +
        Math.max(
          0,
          Number((p.basePrice ?? p.price) - (p.price ?? 0)),
        ) *
          Number(p.quantity || 0),
      0,
    );

  return (
    <div className="bg-background-light min-h-screen font-body pb-20 pt-24">
      <div className="container mx-auto px-4 max-w-5xl">

        {/* TOP NAV */}
        <Link to="/orders" className="inline-flex items-center gap-2 text-primary font-bold hover:text-secondary transition-colors mb-6 text-sm bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
          <FaChevronLeft /> Quay lại lịch sử đơn hàng
        </Link>

        {/* HEADER BAR */}
        <div className="bg-slate-900 rounded-3xl p-6 md:p-8 mb-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl shadow-slate-900/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-display font-black mb-2 tracking-tight">Chi tiết đơn hàng.</h1>
            <p className="text-slate-400 font-medium">Mã Đơn: <span className="text-white font-bold ml-1 uppercase">#{order._id?.slice(-8)}</span></p>
          </div>
          <div className="relative z-10">
            <span className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 flex items-center gap-2 shadow-sm ${STATUS_COLORS[st] || "bg-slate-800 text-white border-slate-700"}`}>
              {STATUS_ICONS[st] || <FaBoxOpen />} {STATUS_LABELS[st] || order.status}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* MAIN COLUMN */}
          <div className="w-full lg:w-2/3 space-y-8">

            {/* TIMELINE */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-display font-black text-slate-800 mb-8 border-b border-slate-100 pb-4">Trạng Thái Giao Hàng</h3>
              {(st !== "canceled" && !RETURN_STATUSES.has(st)) ? (
                <div className="relative mb-8 pt-4 pb-2 px-4 md:px-8">
                  <div className="absolute top-8 left-4 md:left-8 right-4 md:right-8 h-1.5 bg-slate-100 rounded-full pointer-events-none" aria-hidden />
                  <div className="absolute top-8 left-4 md:left-8 h-1.5 bg-primary rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(238,77,45,0.5)] pointer-events-none" style={{ width: `calc(${Math.max(0, getTrackingProgress(st) / Math.max(1, TRACKING_STEPS.length - 1) * 100)}% - 2rem)` }} aria-hidden />

                  <div className="relative flex justify-between text-xs font-bold text-slate-400">
                    {TRACKING_STEPS.map((step, idx) => {
                      const active = getTrackingProgress(st) >= idx;
                      return (
                        <div key={step} className={`flex flex-col items-center gap-3 ${active ? 'text-primary' : ''} w-1/4`}>
                          <div className={`w-10 h-10 rounded-full border-[3px] flex items-center justify-center bg-white z-10 transition-colors ${active ? 'border-primary text-primary shadow-lg shadow-primary/20' : 'border-slate-200 text-slate-300'}`}>
                            {active ? <FaCheckCircle size={16} /> : <div className="w-2 h-2 rounded-full bg-slate-200"></div>}
                          </div>
                          <span className="text-center">{STATUS_LABELS[step]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 text-slate-600 font-bold">
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                      {STATUS_ICONS[st]}
                    </span>
                    {STATUS_LABELS[st]}
                  </div>
                  {st === "canceled" && latestCancelNote ? (
                    <p className="text-sm font-medium text-slate-800 leading-relaxed border-t border-slate-200 pt-3 sm:border-t-0 sm:pt-0 sm:flex-1">
                      <span className="text-slate-500 font-bold text-xs uppercase tracking-wide block mb-1">
                        Lý do hủy
                      </span>
                      {latestCancelNote}
                    </p>
                  ) : null}
                </div>
              )}

              {/* HISTORY LOG */}
              {history?.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Chi Tiết Lịch Sử</h4>
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {(() => {
                      const chron = historyChronological(history);
                      const hi = getHistoryHighlightIndex(chron, st);
                      return chron.map((h, i) => {
                        const current = i === hi;
                        const rowKey = h._id
                          ? String(h._id)
                          : `hist-${i}-${h.createdAt}-${h.newStatus}`;
                        return (
                          <div
                            key={rowKey}
                            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
                          >
                            <div
                              className={`flex items-center justify-center w-5 h-5 rounded-full border-2 border-white shadow-sm z-10 transition-all md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${
                                current
                                  ? "bg-primary scale-125 shadow-md shadow-primary/25"
                                  : "bg-slate-300"
                              }`}
                            />
                            <div
                              className={`w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl border-2 shadow-sm transition-all ${
                                current
                                  ? "border-primary/30 bg-primary/5 ring-1 ring-primary/10"
                                  : "border-slate-100 bg-slate-50"
                              }`}
                            >
                              <p
                                className={`font-bold text-sm ${
                                  current ? "text-primary" : "text-slate-700"
                                }`}
                              >
                                {STATUS_LABELS[h.newStatus] || h.newStatus}
                              </p>
                              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                                {new Date(h.createdAt).toLocaleString("vi-VN")}
                              </p>
                              {h?.note != null && String(h.note).trim() !== "" ? (
                                <p className="text-xs text-slate-600 mt-2 leading-relaxed border-t border-slate-100 pt-2">
                                  {normHistoryStatus(h.newStatus) === "canceled"
                                    ? "Lý do hủy: "
                                    : "Ghi chú: "}
                                  {String(h.note).trim()}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* ORDER ITEMS */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-display font-black text-slate-800 mb-6 border-b border-slate-100 pb-4">Danh Sách Sản Phẩm</h3>

              <div className="space-y-4">
                {order.products?.map((p, i) => (
                  <div
                    key={i}
                    className={`flex gap-4 items-center p-3 border border-slate-100 rounded-2xl bg-slate-50 ${isOrderLineActive(p) ? "" : "opacity-60 border-dashed"}`}
                  >
                    <div className="w-20 h-20 bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0">
                      <img 
                        src={
                          (() => {
                            const imgName = p.image || p.productId?.image;
                            if (!imgName) return "https://via.placeholder.com/80/f0f0f0/999?text=SP";
                            if (imgName.startsWith("http")) return imgName;
                            return `http://localhost:3002/uploads/${imgName.startsWith("/") ? imgName.slice(1) : imgName}`;
                          })()
                        } 
                        alt={p.productId?.name || p.name || "Sản phẩm"} 
                        className="w-full h-full object-cover p-1" 
                      />
                    </div>
                    <div className="flex flex-1 justify-between gap-3 items-start">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm md:text-base hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-tight mb-2"><Link to={`/product/${p.productId?._id || p.productId}`}>{p.productId?.name || p.name || "Sản phẩm"}</Link></h4>
                        <div className="flex gap-3 text-xs font-bold">
                          <span className="bg-white border shadow-sm px-2 py-1 rounded-md text-slate-500">Size: {p.size || "Mặc định"}</span>
                          <span className="bg-white border shadow-sm px-2 py-1 rounded-md text-slate-500">x{p.quantity}</span>
                        </div>
                        {!isOrderLineActive(p) && (
                          <p className="mt-2 text-xs font-bold text-red-600">
                            Đã hủy dòng{p.canceledBy === "admin" ? " (admin)" : ""}
                          </p>
                        )}
                        {canReviewOrder && isLoggedIn && isOrderLineActive(p) && (() => {
                          const productIdKey = String(p?.productId?._id || p?.productId || "");
                          const myReview = myReviewsByProduct[productIdKey];
                          if (myReview) {
                            return (
                              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                  <span>Đánh giá của bạn:</span>
                                  <span className="inline-flex items-center gap-1 text-secondary">
                                    <FaStar size={11} />
                                    {myReview.rating || 0}/5
                                  </span>
                                  <span className={`ml-auto px-2 py-0.5 rounded border text-[10px] ${myReview.status === "approved" ? "bg-green-50 text-green-700 border-green-200" : myReview.status === "rejected" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                                    {myReview.status === "approved" ? "Đã duyệt" : myReview.status === "rejected" ? "Bị từ chối" : "Chờ duyệt"}
                                  </span>
                                </div>
                                {myReview.title && <p className="mt-1 text-xs font-semibold text-slate-700 line-clamp-1">{myReview.title}</p>}
                                {myReview.content && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{myReview.content}</p>}
                              </div>
                            );
                          }
                          return (
                            <button
                              type="button"
                              onClick={() => openReviewModal(p)}
                              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/15 transition-colors"
                            >
                              <FaStar size={12} />
                              Đánh giá
                            </button>
                          );
                        })()}
                      </div>
                      <div className="ml-4 flex shrink-0 flex-col items-end gap-2 text-right">
                        {Number(p.basePrice || 0) > Number(p.price || 0) && (
                          <p className="text-xs text-slate-400 line-through font-bold">
                            {formatMoney((p.basePrice || 0) * (p.quantity || 0))}
                          </p>
                        )}
                        <span className="font-black text-slate-900">{formatMoney(p.price * p.quantity)}</span>
                        {(st === "pending" || st === "confirmed") &&
                          isOrderLineActive(p) && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrderLine(i)}
                            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border-2 border-red-100 bg-white px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
                          >
                            Hủy đơn nầy
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR */}
          <div className="w-full lg:w-1/3">
            <div className="sticky top-28 space-y-6">

              {/* ADDRESS INFO */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-display font-black text-slate-800 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2"><FaMapMarkerAlt className="text-primary" /> Giao Hàng</h3>
                <div className="space-y-3">
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Người nhận</span>
                    <span className="block font-bold text-slate-800 text-lg">{order.fullName}</span>
                    <span className="block font-semibold text-slate-600">{order.phone}</span>
                  </div>
                  <div className="pt-2">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Địa chỉ</span>
                    <p className="font-medium text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{order.address}</p>
                  </div>
                </div>
              </div>

              {/* PAYMENT INFO */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-display font-black text-slate-800 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2"><FaCreditCard className="text-primary" /> Thanh Toán</h3>

                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 mb-6">
                  <div className="flex items-center gap-2 font-bold text-slate-700">
                    {order.paymentMethod === "vnpay" ? (
                      <FaCreditCard className="text-blue-500" />
                    ) : order.paymentMethod === "wallet" ? (
                      <FaCreditCard className="text-emerald-500" />
                    ) : (
                      <FaMoneyBillWave className="text-green-500" />
                    )}
                    {order.paymentMethod === "vnpay"
                      ? "VNPay"
                      : order.paymentMethod === "wallet"
                        ? "Ví tài khoản"
                        : "Tiền mặt (COD)"}
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded border ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700 border-green-200" : "bg-orange-100 text-orange-700 border-orange-200"}`}>
                    {order.paymentStatus === "paid" ? "Đã Thanh Toán" : "Chưa Thanh Toán"}
                  </span>
                </div>

                <div className="space-y-3 text-sm font-semibold text-slate-500 mb-6 border-b border-slate-100 pb-6">
                  <div className="flex justify-between"><span className="text-slate-400">Tạm tính:</span> <span className="text-slate-800">{formatMoney(order.totalAmount - (order.shippingFee || 0) + (order.discount || 0))}</span></div>
                  {saleDiscountTotal > 0 && <div className="flex justify-between text-blue-600"><span>Giảm giá sản phẩm:</span> <span>-{formatMoney(saleDiscountTotal)}</span></div>}
                  <div className="flex justify-between"><span className="text-slate-400">Phí giao hàng:</span> <span className="text-slate-800">{formatMoney(order.shippingFee || 0)}</span></div>
                  {(order.discount || 0) > 0 && <div className="flex justify-between text-green-600"><span>Giảm giá:</span> <span>-{formatMoney(order.discount)}</span></div>}
                </div>

                <div className="flex justify-between items-end mb-6">
                  <span className="font-bold text-slate-700">Tổng cộng</span>
                  <span className="text-3xl font-black text-secondary">{formatMoney(order.totalAmount)}</span>
                </div>

                {Number(order.walletRefundAmount) > 0 && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-bold">
                    Đã hoàn {formatMoney(order.walletRefundAmount)} vào ví tài khoản của bạn.
                    {order.walletRefundedAt && (
                      <span className="block text-xs font-semibold text-emerald-700 mt-1">
                        {new Date(order.walletRefundedAt).toLocaleString("vi-VN")}
                      </span>
                    )}
                  </div>
                )}

                {/* ACTIONS */}
                <div className="space-y-3">
                  {order.paymentMethod === "vnpay" && order.paymentStatus !== "paid" && st !== "canceled" && (
                    <button type="button" onClick={handleRepayVnpay} className="w-full flex justify-center items-center gap-2 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-primary transition-colors shadow-lg"><FaShieldAlt /> Thanh Toán VNPay Lại</button>
                  )}

                  {(st === "pending" || st === "confirmed") && (
                    <button type="button" onClick={handleCancelOrder} className="w-full py-3.5 border-2 border-red-100 text-red-500 font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors">Hủy Đơn Hàng</button>
                  )}

                  {(st === "delivered" || st === "received") && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="min-w-0">
                        {isLoggedIn ? (
                          <button
                            type="button"
                            onClick={handleConfirmDelivery}
                            className="w-full py-3.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors shadow-md shadow-green-600/15"
                          >
                            Đã nhận hàng
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="w-full py-3.5 bg-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-300 transition-colors"
                          >
                            Đăng nhập
                          </button>
                        )}
                      </div>
                      <div className="min-w-0">
                        {isLoggedIn ? (
                          <button
                            type="button"
                            onClick={openReturnModal}
                            className="w-full py-3.5 bg-orange-100 text-orange-600 text-sm font-bold rounded-xl hover:bg-orange-200 transition-colors"
                          >
                            Yêu cầu hoàn hàng
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="w-full py-3.5 bg-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-300 transition-colors"
                          >
                            Đăng nhập
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {returnModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !returnSubmitting) closeReturnModal();
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full p-6 md:p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-4 mb-5">
              <h3 id="return-modal-title" className="text-xl font-display font-black text-slate-800 leading-tight">
                Yêu cầu hoàn hàng
              </h3>
              <button
                type="button"
                onClick={closeReturnModal}
                disabled={returnSubmitting}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                aria-label="Đóng"
              >
                <FaTimes size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Vui lòng mô tả lý do bạn muốn hoàn hàng. Shop sẽ xem xét và phản hồi sớm nhất.
            </p>
            <label htmlFor="return-reason-detail" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Lý do hoàn hàng <span className="text-red-500">*</span>
            </label>
            <select
              value={returnReasonCode}
              onChange={(e) => setReturnReasonCode(String(e.target.value || ""))}
              className="mb-3 w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-slate-800 font-medium focus:border-primary focus:ring-0 focus:outline-none"
            >
              {RETURN_REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <textarea
              id="return-reason-detail"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value.slice(0, 2000))}
              rows={5}
              maxLength={2000}
              placeholder="Ví dụ: Sản phẩm không đúng size, lỗi sản xuất, không còn nhu cầu..."
              className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-slate-800 font-medium placeholder:text-slate-400 focus:border-primary focus:ring-0 focus:outline-none resize-y min-h-[120px]"
            />
            <p className="text-xs text-slate-400 mt-2 text-right">{returnReason.length}/2000</p>
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Ảnh minh chứng (tối đa 5 ảnh)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleSelectReturnFiles}
                disabled={returnSubmitting || returnFiles.length >= 5}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold"
              />
              {returnFiles.length > 0 ? (
                <div className="mt-2 text-xs text-slate-500">
                  Đã chọn {returnFiles.length}/5 ảnh
                </div>
              ) : null}
              {RETURN_REASON_OPTIONS.find((x) => x.value === returnReasonCode)
                ?.requireImage ? (
                <div className="mt-2 text-xs text-amber-600">
                  Lý do này yêu cầu tối thiểu 1 ảnh minh chứng.
                </div>
              ) : null}
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
              <button
                type="button"
                onClick={closeReturnModal}
                disabled={returnSubmitting}
                className="flex-1 py-3.5 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submitReturnRequest}
                disabled={returnSubmitting}
                className="flex-1 py-3.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-60"
              >
                {returnSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewModalOpen && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !reviewSubmitting) closeReviewModal();
          }}
        >
          <div
            className="bg-white rounded-none sm:rounded-2xl shadow-2xl border border-slate-200/80 max-w-lg w-full max-h-[92vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-white/95 backdrop-blur">
              <h3 id="review-modal-title" className="text-lg font-black text-slate-900 tracking-tight">
                Đánh Giá Sản Phẩm
              </h3>
              <button
                type="button"
                onClick={closeReviewModal}
                disabled={reviewSubmitting}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50"
                aria-label="Đóng"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div className="px-4 pt-3 pb-4 space-y-4">
              <div className="w-full flex items-center justify-between gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 text-sm text-amber-900">
                <span className="flex items-center gap-2 font-semibold">
                  <FaCoins className="text-amber-600 shrink-0" />
                  Xem hướng dẫn đánh giá để bài viết hữu ích hơn
                </span>
                <FaChevronDown className="text-amber-600/70 shrink-0 text-xs" aria-hidden />
              </div>

              {reviewTarget && (
                <div className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                    <img
                      src={getReviewProductThumb(reviewTarget)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-3">
                      {reviewTarget?.productId?.name || reviewTarget?.name || "Sản phẩm"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1.5">
                      <span className="font-semibold text-slate-600">Phân loại hàng:</span>{" "}
                      {getReviewVariantLabel(reviewTarget)}
                    </p>
                  </div>
                </div>
              )}

              {reviewError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
                  {reviewError}
                </div>
              )}

              <div>
                <p className="text-sm font-bold text-slate-800 mb-2">Chất lượng sản phẩm</p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        className="p-0.5 rounded transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                        aria-label={`${n} sao`}
                      >
                        <FaStar
                          className={`text-2xl sm:text-[26px] ${reviewRating >= n ? "text-amber-400" : "text-slate-200"}`}
                        />
                      </button>
                    ))}
                  </div>
                  {reviewRating > 0 && (
                    <span className="text-sm font-bold text-amber-600">
                      {RATING_LABELS[reviewRating]}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chất lượng:</label>
                  <textarea
                    value={reviewQuality}
                    onChange={(e) => setReviewQuality(e.target.value)}
                    rows={2}
                    maxLength={250}
                    placeholder="Ví dụ: Tôi thấy chất lượng sản phẩm rất tốt và ổn định."
                    className="w-full text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-0 bg-transparent"
                  />
                </div>
                <div className="px-3 py-2.5">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Đa dạng:</label>
                  <textarea
                    value={reviewDiversity}
                    onChange={(e) => setReviewDiversity(e.target.value)}
                    rows={2}
                    maxLength={250}
                    placeholder="Ví dụ: Sản phẩm phù hợp với nhu cầu sử dụng của tôi."
                    className="w-full text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-0 bg-transparent"
                  />
                </div>
                <p className="px-3 pb-3 text-xs text-slate-400 leading-relaxed border-t border-slate-50 pt-2.5">
                  Hãy chia sẻ những điều bạn thích về sản phẩm này với những người mua khác nhé.
                </p>
              </div>

              <p className="text-xs text-slate-400 text-right">
                {reviewMergedPreview.length}/500 ký tự (gộp nội dung)
              </p>

              {reviewFilePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {reviewFilePreviews.map((src, i) => (
                    <div key={i} className="w-14 h-14 rounded-lg border border-slate-200 overflow-hidden">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">
                  <FaImage className="text-slate-500" />
                  Thêm Hình ảnh
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={reviewSubmitting}
                    onChange={handleSelectReviewFiles}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  disabled
                  title="Video sẽ được hỗ trợ sau"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-400 cursor-not-allowed"
                >
                  <FaVideo />
                  Thêm Video
                </button>
                <span className="text-xs font-semibold text-slate-500 ml-auto">{reviewFiles.length}/5 ảnh</span>
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeReviewModal}
                  disabled={reviewSubmitting}
                  className="flex-1 py-3 text-sm font-black text-slate-600 uppercase tracking-wide hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  Trở lại
                </button>
                <button
                  type="button"
                  onClick={submitReview}
                  disabled={reviewSubmitting}
                  className="flex-[1.4] py-3 rounded-lg bg-orange-500 text-white text-sm font-black uppercase tracking-wide hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/25 disabled:opacity-60"
                >
                  {reviewSubmitting ? "Đang gửi..." : "Hoàn thành"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;
