import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { addToCart } from "../../redux/cart/cartSlice";
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
import { FaBoxOpen, FaCheckCircle, FaTruck, FaTimesCircle, FaChevronLeft, FaUndoAlt, FaShieldAlt, FaTimes, FaStar, FaImage, FaVideo, FaChevronDown, FaCoins, FaPrint, FaGlobe, FaCreditCard } from "react-icons/fa";
import notify from "../../utils/notify";
import { confirmShopee, pickCancelReasonShopee } from "../../utils/shopeeNotify";

const STATUS_LABELS = {
  pending: "Chờ xử lý", confirmed: "Đã xác nhận", shipped: "Đang giao", delivered: "Đã giao",
  received: "Giao hàng thành công",
  canceled: "Đã hủy",
  "return-request": "Hoàn hàng: Đang yêu cầu",
  accepted: "Hoàn hàng: Đã chấp nhận",
  rejected: "Hoàn hàng: Bị từ chối",
  returned: "Hoàn hàng: Hoàn tất",
};

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

/** Timeline ngang 4 bước (mock Chi tiết đơn hàng) */
const buildFourStepTimeline = (order, st, history) => {
  const created = order?.createdAt;
  const h = historyChronological(history || []);

  const fmt = (d) => {
    if (!d) return null;
    try {
      return new Date(d).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  const findHist = (status) =>
    h.find((x) => normHistoryStatus(x.newStatus) === status)?.createdAt;

  if (st === "canceled") {
    const cancelH = [...h]
      .reverse()
      .find((x) => normHistoryStatus(x.newStatus) === "canceled");
    const hasRefund = Number(order?.walletRefundAmount) > 0;
    return [
      {
        label: "Đã đặt hàng",
        stepState: "done",
        date: fmt(created),
        Icon: FaCheckCircle,
      },
      {
        label: "Đang xử lý",
        stepState: "done",
        date: fmt(findHist("confirmed") || h[0]?.createdAt || created),
        Icon: FaBoxOpen,
      },
      {
        label: "Đã hủy",
        stepState: "danger",
        date: fmt(cancelH?.createdAt),
        Icon: FaTimesCircle,
      },
      {
        label: "Đã hoàn tiền",
        stepState: hasRefund ? "done" : "muted",
        date: hasRefund ? fmt(order?.walletRefundedAt) : null,
        sub: hasRefund ? null : "Dự kiến: —",
        Icon: FaCoins,
      },
    ];
  }

  if (RETURN_STATUSES.has(st)) {
    return [
      {
        label: "Đã đặt hàng",
        stepState: "done",
        date: fmt(created),
        Icon: FaCheckCircle,
      },
      {
        label: "Đang xử lý",
        stepState: "done",
        date: fmt(h[1]?.createdAt || created),
        Icon: FaBoxOpen,
      },
      {
        label: STATUS_LABELS[st] || "Hoàn hàng",
        stepState: "current",
        date: fmt(h[h.length - 1]?.createdAt),
        Icon: FaUndoAlt,
      },
      {
        label: "Hoàn tất",
        stepState: "muted",
        date: null,
        sub: "Xem lịch sử bên dưới",
        Icon: FaBoxOpen,
      },
    ];
  }

  const stepStates =
    st === "pending" || st === "confirmed"
      ? ["done", "current", "upcoming", "upcoming"]
      : st === "shipped"
        ? ["done", "done", "current", "upcoming"]
        : st === "delivered" || st === "received"
          ? ["done", "done", "done", "done"]
          : ["done", "current", "upcoming", "upcoming"];

  return [
    {
      label: "Đã đặt hàng",
      stepState: stepStates[0],
      date: fmt(created),
      Icon: FaCheckCircle,
    },
    {
      label: "Đang xử lý",
      stepState: stepStates[1],
      date: fmt(findHist("confirmed") || findHist("pending") || created),
      Icon: FaBoxOpen,
    },
    {
      label: "Đang giao",
      stepState: stepStates[2],
      date: fmt(findHist("shipped")),
      Icon: FaTruck,
    },
    {
      label: "Đã giao",
      stepState: stepStates[3],
      date: fmt(findHist("received") || findHist("delivered")),
      Icon: FaCheckCircle,
    },
  ];
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

const getLineColorFromAttributes = (line) => {
  const attrs = line?.attributes;
  if (!attrs || typeof attrs !== "object") return null;
  const entries =
    typeof attrs.entries === "function"
      ? Array.from(attrs.entries())
      : Object.entries(attrs);
  for (const [k, v] of entries) {
    const lk = String(k || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
    if (
      (lk === "color" || lk === "mau") &&
      v != null &&
      String(v).trim() !== ""
    ) {
      return String(v).trim();
    }
  }
  return null;
};

const getReviewVariantLabel = (line) => {
  if (line?.size) {
    const col = getLineColorFromAttributes(line);
    return col ? `${line.size} · ${col}` : String(line.size);
  }
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
  const dispatch = useDispatch();
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
      notify.error(err?.response?.data?.message || "Có lỗi xảy ra.");
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
      notify.warning("Vui lòng nhập lý do hoàn hàng (tối thiểu 5 ký tự).");
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
      notify.success("Đã gửi yêu cầu hoàn hàng.");
    } catch (err) {
      notify.error(err?.response?.data?.message || "Có lỗi xảy ra.");
    } finally {
      setReturnSubmitting(false);
    }
  };

  const handleRepayVnpay = async () => {
    try {
      const baseUrl = window.location.origin;
      const res = await createVnpayUrl(id, `${baseUrl}/payment/return`, `${baseUrl}/orders/${id}`);
      if (res?.url) window.location.href = res.url;
      else notify.error("Không tạo được liên kết thanh toán VNPay.");
    } catch (err) { notify.error(err?.response?.data?.message || "Không thể tạo thanh toán VNPay."); }
  };

  const handleCancelOrder = async () => {
    const ok = await confirmShopee({
      text: "Bạn có chắc muốn hủy toàn bộ đơn hàng này?",
      confirmText: "Đồng ý",
      cancelText: "Đóng",
    });
    if (!ok) return;
    const selectedReason = await pickCancelReasonShopee();
    if (selectedReason == null) return;
    const cancelReason = String(selectedReason).trim();
    if (cancelReason.length < 5) {
      notify.warning("Bạn cần nhập lý do hủy đơn (tối thiểu 5 ký tự).");
      return;
    }
    try {
      await cancelOrderByUser(id, cancelReason);
      setOrder((o) => (o ? { ...o, status: "canceled" } : o));
      notify.success("Đã hủy đơn hàng.");
    } catch (err) { notify.error(err?.response?.data?.message || "Không thể hủy đơn hàng."); }
  };

  const handleReorder = () => {
    const lines = (order?.products || []).filter(isOrderLineActive);
    if (!lines.length) {
      notify.warning("Không có sản phẩm để mua lại.");
      return;
    }
    lines.forEach((p) => {
      dispatch(
        addToCart({
          productId: p.productId?._id || p.productId,
          name: p.productId?.name || p.name || "Sản phẩm",
          image: p.image || p.productId?.image || "",
          price: Number(p.price || 0),
          qty: Math.max(1, Number(p.quantity || 1)),
          size: p.size ?? null,
          sku: p.sku ?? null,
          color:
            getLineColorFromAttributes(p) ??
            (p.color != null && String(p.color).trim() !== ""
              ? String(p.color).trim()
              : null),
        }),
      );
    });
    notify.success("Đã thêm sản phẩm vào giỏ hàng.");
    navigate("/cart");
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleTrackPackage = () => {
    const t = order?.trackingNumber ?? order?.tracking ?? order?.trackingCode;
    if (t && String(t).trim()) {
      window.open(
        `https://www.google.com/search?q=${encodeURIComponent(`${String(t).trim()} vận đơn`)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } else {
      notify.info("Đơn hàng chưa có mã vận đơn để theo dõi.");
    }
  };

  const handleCancelOrderLine = async (lineIndex) => {
    const selectedReason = await pickCancelReasonShopee({
      title: "Lý do hủy dòng hàng",
    });
    if (selectedReason == null) return;
    const cancelReason = String(selectedReason).trim();
    if (cancelReason.length < 5) {
      notify.warning("Bạn cần nhập lý do hủy (tối thiểu 5 ký tự).");
      return;
    }
    try {
      const data = await cancelOrderLineByUser(id, lineIndex, cancelReason);
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
            status: "approved",
          },
        }));
      }
      notify.success("Đã gửi đánh giá. Đánh giá hiển thị ngay trên trang sản phẩm.");
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

  const timelineSteps = buildFourStepTimeline(order, st, history);
  const orderRefDisplay = `#CV-${String(order._id || "").slice(-6).toUpperCase()}`;
  const orderedAtLabel = order?.createdAt
    ? (() => {
        const d = new Date(order.createdAt);
        return `Đặt vào lúc ${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}, ${d.toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })}`;
      })()
    : "";

  const paymentMethodLong =
    order.paymentMethod === "vnpay"
      ? "VNPay"
      : order.paymentMethod === "wallet"
        ? "Ví tài khoản"
        : "Thanh toán khi nhận hàng (COD)";

  const subtotalExShip =
    Number(order.totalAmount || 0) -
    Number(order.shippingFee || 0) +
    Number(order.discount || 0);

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-body pb-16 pt-24 print:pt-4">
      <div className="container mx-auto max-w-6xl px-4" id="order-detail-print">

        <Link
          to="/orders"
          className="print:hidden mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:border-[#2E5BFF]/30 hover:text-[#2E5BFF]"
        >
          <FaChevronLeft className="text-xs" /> Quay lại lịch sử đơn hàng
        </Link>

        {/* Page header — mock Convot */}
        <div className="mb-8 flex flex-col gap-6 print:mb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#2E5BFF]">
              Mã đơn hàng:{" "}
              <span className="font-black">{orderRefDisplay}</span>
            </p>
            <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              Chi tiết đơn hàng
            </h1>
            {orderedAtLabel ? (
              <p className="mt-2 text-sm font-medium text-slate-500">{orderedAtLabel}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <button
              type="button"
              onClick={handlePrintInvoice}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <FaPrint className="text-slate-400" />
              In hóa đơn
            </button>
            <button
              type="button"
              onClick={handleTrackPackage}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2E5BFF] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[#2E5BFF]/25 transition-colors hover:bg-[#2550e0]"
            >
              <FaGlobe className="text-white/90" />
              Theo dõi kiện hàng
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">

          {/* MAIN COLUMN */}
          <div className="w-full space-y-6 lg:w-2/3">
            {/* TIMELINE — 4 bước ngang */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
              <h3 className="mb-6 border-b border-slate-100 pb-4 font-display text-lg font-black text-slate-900 md:text-xl">
                Trạng thái đơn hàng
              </h3>
              <div className="relative overflow-x-auto pb-2">
                <div className="relative min-w-[600px] px-1">
                  <div
                    className="absolute left-[12%] right-[12%] top-5 hidden h-0.5 bg-slate-200 md:block"
                    aria-hidden
                  />
                  <div className="relative z-[1] flex justify-between gap-2">
                    {timelineSteps.map((step, idx) => {
                      const Icon = step.Icon;
                      const circle =
                        step.stepState === "done"
                          ? "border-[#2E5BFF] bg-[#2E5BFF] text-white shadow-md shadow-[#2E5BFF]/25"
                          : step.stepState === "current"
                            ? "border-2 border-[#2E5BFF] bg-white text-[#2E5BFF] shadow-sm"
                            : step.stepState === "danger"
                              ? "border-red-500 bg-red-500 text-white shadow-md"
                              : step.stepState === "muted"
                                ? "border-slate-200 bg-slate-100 text-slate-400"
                                : "border-2 border-slate-200 bg-white text-slate-300";
                      return (
                        <div
                          key={`${step.label}-${idx}`}
                          className="flex max-w-[140px] flex-1 flex-col items-center text-center"
                        >
                          <div
                            className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full border ${circle}`}
                          >
                            <Icon className="h-4 w-4" aria-hidden />
                          </div>
                          <p className="text-xs font-bold leading-tight text-slate-800">
                            {step.label}
                          </p>
                          {step.date ? (
                            <p className="mt-1 text-[11px] font-medium leading-snug text-slate-500">
                              {step.date.replace(", ", " • ")}
                            </p>
                          ) : step.sub ? (
                            <p className="mt-1 text-[11px] font-medium text-slate-400">{step.sub}</p>
                          ) : (
                            <p className="mt-1 text-[11px] text-slate-400">—</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {st === "canceled" && latestCancelNote ? (
                <div className="mt-6 rounded-xl border border-red-100 bg-red-50/80 p-4 text-sm font-medium text-slate-800">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-red-700">
                    Lý do hủy
                  </span>
                  {latestCancelNote}
                </div>
              ) : null}

              {/* HISTORY LOG */}
              {history?.length > 0 && (
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                    Chi tiết lịch sử
                  </h4>
                  <div className="relative space-y-4 before:absolute before:inset-0 before:ml-2 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent md:before:mx-auto md:before:translate-x-0">
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
                            className="group relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse"
                          >
                            <div
                              className={`z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm transition-all md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${
                                current
                                  ? "scale-125 bg-[#2E5BFF] shadow-md shadow-[#2E5BFF]/25"
                                  : "bg-slate-300"
                              }`}
                            />
                            <div
                              className={`w-[calc(100%-2rem)] rounded-xl border-2 p-3 shadow-sm transition-all md:w-[calc(50%-1.5rem)] ${
                                current
                                  ? "border-[#2E5BFF]/30 bg-[#2E5BFF]/5 ring-1 ring-[#2E5BFF]/10"
                                  : "border-slate-100 bg-slate-50"
                              }`}
                            >
                              <p
                                className={`text-sm font-bold ${
                                  current ? "text-[#2E5BFF]" : "text-slate-700"
                                }`}
                              >
                                {STATUS_LABELS[h.newStatus] || h.newStatus}
                              </p>
                              <p className="mt-0.5 text-xs font-semibold text-slate-400">
                                {new Date(h.createdAt).toLocaleString("vi-VN")}
                              </p>
                              {h?.note != null && String(h.note).trim() !== "" ? (
                                <p className="mt-2 border-t border-slate-100 pt-2 text-xs leading-relaxed text-slate-600">
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

            {/* SẢN PHẨM */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
              <h3 className="mb-6 border-b border-slate-100 pb-4 font-display text-lg font-black text-slate-900 md:text-xl">
                Sản phẩm đã chọn
              </h3>

              <div className="space-y-6">
                {order.products?.map((p, i) => (
                  <div
                    key={i}
                    className={`flex flex-col gap-4 border-b border-slate-100 pb-6 last:border-0 last:pb-0 sm:flex-row sm:items-start ${
                      isOrderLineActive(p) ? "" : "opacity-60"
                    }`}
                  >
                    <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <img
                        src={(() => {
                          const imgName = p.image || p.productId?.image;
                          if (!imgName) {
                            return "https://via.placeholder.com/80/f0f0f0/999?text=SP";
                          }
                          if (imgName.startsWith("http")) return imgName;
                          return `http://localhost:3002/uploads/${imgName.startsWith("/") ? imgName.slice(1) : imgName}`;
                        })()}
                        alt={p.productId?.name || p.name || "Sản phẩm"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row">
                      <div className="min-w-0">
                        <h4 className="font-bold leading-snug text-slate-900">
                          <Link
                            to={`/product/${p.productId?._id || p.productId}`}
                            className="transition-colors hover:text-[#2E5BFF]"
                          >
                            {p.productId?.name || p.name || "Sản phẩm"}
                          </Link>
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          {getReviewVariantLabel(p)}
                        </p>
                        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                          Số lượng:{" "}
                          <span className="text-slate-700">
                            {String(p.quantity || 1).padStart(2, "0")}
                          </span>
                        </p>
                        <Link
                          to={`/product/${p.productId?._id || p.productId}`}
                          className="mt-2 inline-block text-sm font-bold text-[#2E5BFF] hover:underline"
                        >
                          Xem chi tiết sản phẩm
                        </Link>
                        {!isOrderLineActive(p) && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs font-bold text-red-600">
                              Đã hủy dòng
                              {p.canceledBy === "admin" ? " (admin)" : ""}
                            </p>
                            {p.cancelReason ? (
                              <p className="text-xs font-medium text-amber-900">
                                Lý do: {p.cancelReason}
                              </p>
                            ) : null}
                          </div>
                        )}
                        {canReviewOrder && isLoggedIn && isOrderLineActive(p) && (() => {
                          const productIdKey = String(
                            p?.productId?._id || p?.productId || "",
                          );
                          const myReview = myReviewsByProduct[productIdKey];
                          if (myReview) {
                            return (
                              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
                                  <span>Đánh giá của bạn:</span>
                                  <span className="inline-flex items-center gap-1 text-secondary">
                                    <FaStar size={11} />
                                    {myReview.rating || 0}/5
                                  </span>
                                </div>
                                {myReview.title && (
                                  <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-700">
                                    {myReview.title}
                                  </p>
                                )}
                                {myReview.content && (
                                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                    {myReview.content}
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return (
                            <button
                              type="button"
                              onClick={() => openReviewModal(p)}
                              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#2E5BFF]/10 px-3 py-1.5 text-xs font-bold text-[#2E5BFF] hover:bg-[#2E5BFF]/15"
                            >
                              <FaStar size={12} />
                              Đánh giá
                            </button>
                          );
                        })()}
                      </div>
                      <div className="flex shrink-0 flex-col items-start gap-2 text-left sm:items-end sm:text-right">
                        {Number(p.basePrice || 0) > Number(p.price || 0) && (
                          <p className="text-xs font-bold text-slate-400 line-through">
                            {formatMoney((p.basePrice || 0) * (p.quantity || 0))}
                          </p>
                        )}
                        <span className="text-lg font-black text-slate-900">
                          {formatMoney(p.price * p.quantity)}
                        </span>
                        {(st === "pending" || st === "confirmed") &&
                          isOrderLineActive(p) && (
                            <button
                              type="button"
                              onClick={() => handleCancelOrderLine(i)}
                              className="inline-flex min-h-[36px] items-center justify-center rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
                            >
                              Hủy dòng này
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Thông tin nhận hàng + Thanh toán */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-display text-base font-black text-slate-900">
                  Thông tin nhận hàng
                </h3>
                <p className="text-base font-bold text-slate-900">{order.fullName}</p>
                <p className="mt-1 font-semibold text-slate-600">{order.phone}</p>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                  {order.address}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-display text-base font-black text-slate-900">
                  Hình thức thanh toán
                </h3>
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  {order.paymentMethod === "vnpay" || order.paymentMethod === "wallet" ? (
                    <FaCreditCard className="mt-0.5 shrink-0 text-lg text-slate-600" />
                  ) : (
                    <FaTruck className="mt-0.5 shrink-0 text-lg text-slate-600" />
                  )}
                  <div>
                    <p className="font-bold text-slate-800">{paymentMethodLong}</p>
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Tình trạng thanh toán
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            st === "canceled"
                              ? "bg-red-500"
                              : order.paymentStatus === "paid"
                                ? "bg-emerald-500"
                                : "bg-amber-400"
                          }`}
                        />
                        <span className="font-bold text-slate-800">
                          {st === "canceled"
                            ? "Đã hủy giao dịch"
                            : order.paymentStatus === "paid"
                              ? "Đã thanh toán"
                              : "Chưa thanh toán"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SIDEBAR — tổng kết tối + thao tác */}
          <div className="w-full lg:w-1/3">
            <div className="space-y-6 lg:sticky lg:top-28">
              <div className="overflow-hidden rounded-2xl bg-[#2D3142] text-white shadow-xl shadow-slate-900/15">
                <div className="border-b border-white/10 px-6 py-5">
                  <h3 className="font-display text-lg font-black tracking-tight">
                    Tổng kết đơn hàng
                  </h3>
                </div>
                <div className="space-y-3 px-6 py-5 text-sm">
                  <div className="flex justify-between font-semibold text-white/90">
                    <span className="text-white/70">Tạm tính</span>
                    <span>{formatMoney(subtotalExShip)}</span>
                  </div>
                  {saleDiscountTotal > 0 && (
                    <div className="flex justify-between font-semibold text-sky-200/90">
                      <span>Giảm giá sản phẩm</span>
                      <span>-{formatMoney(saleDiscountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-white/90">
                    <span className="text-white/70">Phí giao hàng</span>
                    <span>{formatMoney(order.shippingFee || 0)}</span>
                  </div>
                  {(order.discount || 0) > 0 && (
                    <div className="flex justify-between font-semibold text-[#7BA3FF]">
                      <span>
                        {order.voucherCode
                          ? `Mã giảm giá (${order.voucherCode})`
                          : "Giảm giá"}
                      </span>
                      <span>-{formatMoney(order.discount)}</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-white/10 px-6 py-6">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <span className="text-sm font-bold text-white/80">
                      Tổng thanh toán
                    </span>
                    <span className="font-display text-3xl font-black tracking-tight text-[#6B9FFF]">
                      {formatMoney(order.totalAmount)}
                    </span>
                  </div>
                </div>

                {st === "canceled" && (
                  <div className="mx-6 mb-6 rounded-xl bg-black/25 px-4 py-3 text-sm leading-relaxed text-white/85">
                    Đơn hàng đã được hủy. Nếu bạn đã thanh toán trước đó, khoản hoàn sẽ được xử lý
                    trong khoảng{" "}
                    <span className="font-bold text-white">3–5 ngày làm việc</span>.
                  </div>
                )}

                <div className="space-y-4 px-6 pb-6 print:hidden">
                  <button
                    type="button"
                    onClick={handleReorder}
                    className="w-full rounded-xl bg-white py-3.5 text-center text-sm font-black text-slate-900 shadow-lg transition hover:bg-slate-100"
                  >
                    Mua lại đơn hàng này
                  </button>
                  <Link
                    to="/contact"
                    className="block text-center text-xs font-semibold text-white/60 transition hover:text-white"
                  >
                    Cần trợ giúp với đơn hàng này?
                  </Link>
                </div>
              </div>

              {Number(order.walletRefundAmount) > 0 && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
                  Đã hoàn {formatMoney(order.walletRefundAmount)} vào ví tài khoản của bạn.
                  {order.walletRefundedAt && (
                    <span className="mt-1 block text-xs font-semibold text-emerald-700">
                      {new Date(order.walletRefundedAt).toLocaleString("vi-VN")}
                    </span>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm print:hidden">
                <p className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Thao tác đơn hàng
                </p>
                <div className="space-y-3">
                  {order.paymentMethod === "vnpay" &&
                    order.paymentStatus !== "paid" &&
                    st !== "canceled" && (
                      <button
                        type="button"
                        onClick={handleRepayVnpay}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#2E5BFF]"
                      >
                        <FaShieldAlt /> Thanh toán VNPay lại
                      </button>
                    )}

                  {(st === "pending" || st === "confirmed") && (
                    <button
                      type="button"
                      onClick={handleCancelOrder}
                      className="w-full rounded-xl border-2 border-red-100 py-3.5 text-sm font-bold text-red-500 transition hover:bg-red-50"
                    >
                      Hủy đơn hàng
                    </button>
                  )}

                  {(st === "shipped" || st === "delivered") && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {isLoggedIn ? (
                        <button
                          type="button"
                          onClick={handleConfirmDelivery}
                          className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
                        >
                          Đã nhận hàng
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate("/login")}
                          className="w-full rounded-xl bg-slate-200 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-300"
                        >
                          Đăng nhập
                        </button>
                      )}
                      {isLoggedIn ? (
                        <button
                          type="button"
                          onClick={openReturnModal}
                          className="w-full rounded-xl bg-orange-100 py-3.5 text-sm font-bold text-orange-700 transition hover:bg-orange-200"
                        >
                          Yêu cầu hoàn hàng
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate("/login")}
                          className="w-full rounded-xl bg-slate-200 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-300"
                        >
                          Đăng nhập
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
                <p className="font-display text-base font-black text-slate-900">
                  Trở thành Member
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Tích điểm và ưu đãi độc quyền cho thành viên Convot.
                </p>
                <Link
                  to="/voucher"
                  className="mt-3 inline-block text-sm font-bold text-[#2E5BFF] hover:underline"
                >
                  Tìm hiểu thêm
                </Link>
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
