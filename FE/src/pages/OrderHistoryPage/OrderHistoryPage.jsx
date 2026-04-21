import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  getOrdersByUserOrGuest,
  confirmDelivery,
  returnOrderRequest,
  cancelOrderByUser,
  cancelOrderLineByUser,
  uploadImages,
} from "../../api";
import {
  FaBoxOpen,
  FaCheckCircle,
  FaTruck,
  FaTimesCircle,
  FaUndoAlt,
  FaTimes,
  FaStore,
  FaCommentDots,
  FaQuestionCircle,
} from "react-icons/fa";
import notify from "../../utils/notify";
import { confirmShopee, pickCancelReasonShopee } from "../../utils/shopeeNotify";

const SHOP_NAME = "SneakerConverse";

const STATUS_LABELS = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  shipped: "Đang giao",
  delivered: "Đã giao",
  received: "Giao hàng thành công",
  canceled: "Đã hủy",
  "return-request": "Hoàn hàng: Đang yêu cầu",
  accepted: "Hoàn hàng: Đã chấp nhận",
  rejected: "Hoàn hàng: Bị từ chối",
};

const RETURN_STATUSES = new Set(["return-request", "accepted", "rejected"]);
const REVIEWABLE_STATUSES = new Set(["delivered", "received"]);
const PAGE_SIZE = 10;
const FETCH_LIMIT = 50;
const RETURN_REASON_OPTIONS = [
  { value: "wrong_size", label: "Sai size / không vừa", requireImage: false },
  { value: "wrong_item", label: "Giao sai mẫu / sai màu", requireImage: true },
  { value: "defective", label: "Lỗi sản xuất", requireImage: true },
  { value: "damaged_shipping", label: "Hư hỏng khi vận chuyển", requireImage: true },
  { value: "not_as_described", label: "Không đúng mô tả", requireImage: false },
  { value: "other", label: "Lý do khác", requireImage: false },
];

const TABS = [
  { id: "all", label: "Tất cả" },
  { id: "pending_payment", label: "Chờ thanh toán" },
  { id: "awaiting_delivery", label: "Chờ giao hàng" },
  { id: "shipping", label: "Vận chuyển" },
  { id: "completed", label: "Hoàn thành" },
  { id: "canceled", label: "Đã hủy" },
  { id: "return_refund", label: "Trả hàng/Hoàn tiền" },
];

const formatMoney = (v) => `${Number(v || 0).toLocaleString("vi-VN")}₫`;

const normalize = (order) =>
  String(order?.status || "")
    .trim()
    .toLowerCase();

function orderMatchesTab(order, tabId) {
  const st = normalize(order);
  const pay = order.paymentStatus;
  const method = order.paymentMethod;

  if (tabId === "all") return true;

  if (tabId === "pending_payment") {
    return (
      pay === "unpaid" &&
      (method === "vnpay" || method === "wallet") &&
      st === "pending"
    );
  }

  if (tabId === "shipping") {
    if (st === "canceled" || RETURN_STATUSES.has(st)) return false;
    if (st === "shipped") return true;
    if (st === "pending") {
      if (pay === "unpaid" && (method === "vnpay" || method === "wallet"))
        return false;
      return true;
    }
    return false;
  }

  if (tabId === "awaiting_delivery") return st === "confirmed" || st === "delivered";
  if (tabId === "completed") return st === "received";
  if (tabId === "canceled") return st === "canceled";
  if (tabId === "return_refund") return RETURN_STATUSES.has(st);

  return true;
}

function productImageUrl(p) {
  const imgName = p.image || p.productId?.image;
  if (!imgName) return "https://via.placeholder.com/80/f0f0f0/999?text=SP";
  if (String(imgName).startsWith("http")) return imgName;
  return `http://localhost:3002/uploads/${String(imgName).startsWith("/") ? String(imgName).slice(1) : imgName}`;
}

function isOrderLineActive(p) {
  return !p?.lineStatus || p.lineStatus !== "canceled";
}

function formatVariantLine(p) {
  const attrs = p.attributes;
  if (!attrs || typeof attrs !== "object") return null;
  const parts = Object.entries(attrs)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => {
      const key = String(k).trim();
      const val = String(v).trim();
      if (!val) return null;
      if (/^phân loại|^variant|^size|^màu/i.test(key))
        return `${key}: ${val}`;
      return val;
    })
    .filter(Boolean);
  if (!parts.length) return null;
  return `Phân loại hàng: ${parts.join(" · ")}`;
}

function statusSubline(st) {
  if (st === "received") return { text: "Giao hàng thành công", icon: "ok" };
  if (st === "delivered")
    return { text: "Đang giao đến bạn", icon: "truck" };
  if (st === "shipped") return { text: "Đang vận chuyển", icon: "truck" };
  if (st === "confirmed") return { text: "Đang chờ lấy hàng", icon: "box" };
  if (st === "pending") return { text: "Chờ shop xác nhận", icon: "box" };
  if (st === "canceled") return { text: "Đơn đã hủy", icon: "x" };
  if (RETURN_STATUSES.has(st))
    return { text: STATUS_LABELS[st] || "Trả hàng / Hoàn tiền", icon: "return" };
  return { text: STATUS_LABELS[st] || st, icon: "box" };
}

const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [returnModalOrderId, setReturnModalOrderId] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnReasonCode, setReturnReasonCode] = useState("wrong_size");
  const [returnFiles, setReturnFiles] = useState([]);
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  const isLoggedIn = !!user?.login;
  const userId = isLoggedIn ? user?.id || user?._id : null;
  const guestId = !isLoggedIn ? String(user?.id || user?._id || "") : null;

  useEffect(() => {
    if (!userId && !guestId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    const fetchAllOrders = async (identity) => {
      const all = [];
      let pageCursor = 1;
      let totalPage = 1;
      do {
        const res = await getOrdersByUserOrGuest({
          ...identity,
          page: pageCursor,
          limit: FETCH_LIMIT,
        });
        const rows = Array.isArray(res?.data) ? res.data : [];
        all.push(...rows);
        totalPage = Number(res?.totalPage || 1);
        pageCursor += 1;
      } while (pageCursor <= totalPage);
      return all;
    };
    const load = async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const requests = [];
        if (userId)
          requests.push(fetchAllOrders({ userId }));
        if (guestId && guestId !== userId)
          requests.push(fetchAllOrders({ guestId }));
        const responses = await Promise.all(requests);
        const mergedOrders = responses
          .flatMap((rows) => (Array.isArray(rows) ? rows : []))
          .reduce((acc, order) => {
            if (!acc.some((x) => String(x._id) === String(order._id)))
              acc.push(order);
            return acc;
          }, [])
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (mounted) setOrders(mergedOrders);
      } catch (err) {
        if (mounted) setOrders([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load(true);
    const intervalId = setInterval(() => load(false), 12000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [userId, guestId]);

  const filteredOrders = useMemo(
    () => orders.filter((o) => orderMatchesTab(o, activeTab)),
    [orders, activeTab],
  );
  const tabCounts = useMemo(
    () =>
      TABS.reduce((acc, tab) => {
        acc[tab.id] = orders.reduce(
          (sum, order) => sum + (orderMatchesTab(order, tab.id) ? 1 : 0),
          0,
        );
        return acc;
      }, {}),
    [orders],
  );

  const totalPage = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentOrders = filteredOrders.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    if (page > totalPage) setPage(totalPage);
  }, [page, totalPage]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const handleConfirmDelivery = async (orderId, wasPaid) => {
    try {
      await confirmDelivery(orderId);
      setOrders((prev) =>
        prev.map((o) =>
          String(o._id) === String(orderId)
            ? { ...o, status: "received", paymentStatus: "paid" }
            : o,
        ),
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

  const openReturnModal = (orderId) => {
    setReturnModalOrderId(orderId);
    setReturnReason("");
    setReturnReasonCode("wrong_size");
    setReturnFiles([]);
  };

  const closeReturnModal = () => {
    if (returnSubmitting) return;
    setReturnModalOrderId(null);
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
    if (!returnModalOrderId) return;
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
      await returnOrderRequest(
        returnModalOrderId,
        reason,
        images,
        returnReasonCode,
      );
      const oid = returnModalOrderId;
      setOrders((prev) =>
        prev.map((o) =>
          String(o._id) === String(oid) ? { ...o, status: "return-request" } : o,
        ),
      );
      setReturnModalOrderId(null);
      setReturnReason("");
      setReturnFiles([]);
      notify.success("Đã gửi yêu cầu hoàn hàng.");
    } catch (err) {
      notify.error(err?.response?.data?.message || "Có lỗi xảy ra.");
    } finally {
      setReturnSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
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
      await cancelOrderByUser(orderId, cancelReason);
      setOrders((prev) =>
        prev.map((o) =>
          String(o._id) === String(orderId) ? { ...o, status: "canceled" } : o,
        ),
      );
      notify.success("Đã hủy đơn hàng.");
    } catch (err) {
      notify.error(err?.response?.data?.message || "Không thể hủy đơn hàng.");
    }
  };

  const handleCancelOrderLine = async (orderId, lineIndex) => {
    const ok = await confirmShopee({
      text: "Hủy dòng này khỏi đơn? Tiền (nếu đã trừ ví) sẽ được hoàn tương ứng.",
      confirmText: "Đồng ý",
      cancelText: "Đóng",
    });
    if (!ok) return;
    try {
      const data = await cancelOrderLineByUser(orderId, lineIndex);
      const updated = data?.order;
      if (updated?._id) {
        setOrders((prev) =>
          prev.map((o) =>
            String(o._id) === String(orderId) ? updated : o,
          ),
        );
      }
      notify.success("Đã hủy dòng hàng.");
    } catch (err) {
      notify.error(err?.response?.data?.message || "Không thể hủy dòng hàng.");
    }
  };

  const subIcon = (kind) => {
    const s = 16;
    if (kind === "truck")
      return <FaTruck className="inline shrink-0 text-convot-sage" size={s} />;
    if (kind === "ok")
      return <FaCheckCircle className="inline shrink-0 text-convot-sage" size={s} />;
    if (kind === "x") return <FaTimesCircle className="inline shrink-0 text-red-500" size={s} />;
    if (kind === "return") return <FaUndoAlt className="inline shrink-0 text-orange-500" size={s} />;
    return <FaBoxOpen className="inline shrink-0 text-slate-400" size={s} />;
  };

  const headlineClass = (st) => {
    if (st === "canceled") return "text-red-600";
    if (RETURN_STATUSES.has(st)) return "text-orange-600";
    return "text-primary";
  };

  if (!userId && !guestId) return null;

  return (
    <div className="min-h-screen bg-[#f7f6f3] font-body pb-10 pt-4 sm:pt-5">
      <div className="container mx-auto max-w-7xl px-4">
        <header className="mb-5">
          <h1 className="font-display text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
            Đơn mua
          </h1>
          <p className="mt-1.5 text-base leading-relaxed text-slate-600">
            Theo dõi và quản lý đơn hàng của bạn
          </p>
        </header>

        {/* Tabs — cùng lề với tiêu đề; tab chia đều trên màn lớn */}
        <div className="rounded-t-md border border-neutral-200 bg-white">
          <div className="overflow-x-auto scrollbar-thin lg:overflow-visible">
            <div
              className="flex w-max min-w-full lg:w-full"
              role="tablist"
            >
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                const count = Number(tabCounts?.[tab.id] || 0);
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative min-w-[108px] flex-shrink-0 px-2.5 py-3 text-center text-base font-medium transition-colors sm:min-w-[128px] sm:px-3 sm:py-3.5 lg:min-w-0 lg:flex-1 lg:px-3 ${
                      active ? "text-primary" : "text-neutral-600 hover:text-neutral-800"
                    }`}
                  >
                    <span className="inline-block max-w-[8rem] leading-tight sm:max-w-none">
                      {tab.label}
                    </span>
                    {count > 0 && (
                      <span
                        className={`ml-1.5 inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                          active
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                    {active && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary sm:left-3 sm:right-3" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="h-px bg-transparent" />

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-b-md border border-neutral-200 bg-white p-8 text-center sm:p-10">
            <div className="text-4xl mb-3 opacity-40">📦</div>
            <h3 className="mb-2 text-lg font-semibold text-slate-800">
              Chưa có đơn hàng
            </h3>
            <p className="mx-auto mb-6 max-w-md text-base text-slate-500">
              {orders.length === 0
                ? "Bạn chưa có đơn nào. Khám phá sản phẩm mới nhé."
                : "Không có đơn hàng ở trạng thái này."}
            </p>
            <Link
              to="/product"
              className="inline-block rounded-xl bg-slate-900 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-primary"
            >
              Mua sắm ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {currentOrders.map((order) => {
              const st = normalize(order);
              const canReviewOrder = REVIEWABLE_STATUSES.has(st);
              const sub = statusSubline(st);
              const lines = order.products;
              if (!lines?.length) {
                return null;
              }

              const headline =
                st === "received"
                  ? "HOÀN THÀNH"
                  : st === "delivered"
                    ? "CHỜ NHẬN HÀNG"
                    : st === "canceled"
                      ? "ĐÃ HỦY"
                      : RETURN_STATUSES.has(st)
                        ? "TRẢ HÀNG"
                        : st === "shipped"
                          ? "ĐANG GIAO"
                          : st === "confirmed"
                            ? "CHỜ LẤY HÀNG"
                          : st === "pending"
                            ? "CHỜ XÁC NHẬN"
                            : (STATUS_LABELS[st] || String(st)).toUpperCase();

              const orderTotal =
                typeof order.totalAmount === "number" && !Number.isNaN(order.totalAmount)
                  ? order.totalAmount
                  : lines.reduce((sum, p) => {
                      const q = p.quantity ?? 1;
                      return sum + Number(p.price || 0) * q;
                    }, 0) +
                    Number(order.shippingFee || 0) -
                    Number(order.discount || 0);

              return (
                <div
                  key={order._id}
                  className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-2.5 border-b border-neutral-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-convot-sage px-2 py-0.5 text-sm font-semibold text-white">
                        Yêu thích
                      </span>
                      <span className="text-base font-semibold text-slate-800">
                        {SHOP_NAME}
                      </span>
                      <Link
                        to="/chat"
                        className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary px-3 py-1.5 text-base font-medium text-white transition-colors hover:bg-primary/90"
                      >
                        <FaCommentDots size={15} />
                        Chat
                      </Link>
                      <Link
                        to="/product"
                        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-base font-medium text-slate-700 transition-colors hover:border-convot-sage/40"
                      >
                        <FaStore size={15} />
                        Xem Shop
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-end text-base">
                      <span className="inline-flex items-center gap-2 text-slate-600">
                        {subIcon(sub.icon)}
                        <span>{sub.text}</span>
                      </span>
                      <button
                        type="button"
                        className="p-0.5 text-slate-400 hover:text-slate-600"
                        title="Trợ giúp"
                        aria-label="Trợ giúp"
                      >
                        <FaQuestionCircle size={16} />
                      </button>
                      <span
                        className={`ml-0.5 text-sm font-bold tracking-wide sm:text-base ${headlineClass(st)}`}
                      >
                        {headline}
                      </span>
                    </div>
                  </div>

                  {st === "canceled" && order.cancelReasonNote ? (
                    <div
                      className="mx-4 mt-3 rounded-lg border px-3 py-2.5 text-sm leading-snug"
                      style={{
                        borderColor: "#FDE68A",
                        background: "#FFFBEB",
                        color: "#78350F",
                      }}
                    >
                      <span className="font-semibold">Lý do hủy: </span>
                      {order.cancelReasonNote}
                    </div>
                  ) : null}

                  <div>
                    {lines.map((p, lineIndex) => {
                      const lineLive = isOrderLineActive(p);
                      const name =
                        p.productId?.name || p.name || "Sản phẩm";
                      const variant = formatVariantLine(p);
                      const qty = p.quantity ?? 1;
                      const base = Number(p.basePrice || 0);
                      const unit = Number(p.price || 0);
                      const showStrike = base > unit && base > 0;
                      const lineTotal = unit * qty;
                      const rawPid = p.productId;
                      const lineProductId =
                        rawPid && typeof rawPid === "object"
                          ? rawPid._id
                          : rawPid;
                      const buyAgainTo =
                        lineProductId != null
                          ? `/product/${String(lineProductId)}`
                          : "/product";
                      const rowKey = `${order._id}-${String(p?.sku ?? "")}-${lineIndex}`;

                      return (
                        <div
                          key={rowKey}
                          className={`px-4 py-4${lineIndex > 0 ? " border-t border-neutral-200" : ""}${lineLive ? "" : " bg-slate-50/80"}`}
                        >
                          <div className={`flex gap-4${lineLive ? "" : " opacity-65"}`}>
                            <Link
                              to={`/orders/${order._id}`}
                              className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-slate-50"
                            >
                              <img
                                src={productImageUrl(p)}
                                alt={name}
                                className="h-full w-full object-cover"
                              />
                            </Link>
                            <div className="flex min-w-0 flex-1 gap-3">
                              <div className="min-w-0 flex-1">
                                <Link
                                  to={`/orders/${order._id}`}
                                  className="line-clamp-2 text-base font-medium leading-snug text-slate-900 hover:opacity-90 sm:text-lg"
                                >
                                  {name}
                                </Link>
                                {variant && (
                                  <p className="mt-1.5 line-clamp-2 text-base text-slate-600">
                                    {variant}
                                  </p>
                                )}
                                <p className="mt-1.5 text-base text-slate-500">
                                  x{qty}
                                </p>
                                {!lineLive && (
                                  <p className="mt-2 text-sm font-semibold text-red-600">
                                    Đã hủy 
                                    {p.canceledBy === "admin" ? " (admin)" : ""}
                                  </p>
                                )}
                                {lineLive ? (
                                  <Link
                                    to={buyAgainTo}
                                    className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                                  >
                                    Mua lại
                                  </Link>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                                {showStrike && (
                                  <p className="text-base text-slate-400 line-through tabular-nums">
                                    {formatMoney(base * qty)}
                                  </p>
                                )}
                                <p className="text-base font-black tabular-nums text-slate-900 sm:text-lg">
                                  {formatMoney(lineTotal)}
                                </p>
                                {(st === "pending" || st === "confirmed") &&
                                  lineLive && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCancelOrderLine(order._id, lineIndex)
                                    }
                                    className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                  >
                                    Hủy
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-2 border-t border-neutral-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:py-4">
                    <p className="order-2 text-base leading-relaxed text-slate-600 sm:order-1">
                      Mã đơn #{String(order._id).slice(-8).toUpperCase()} ·{" "}
                      {new Date(order.createdAt).toLocaleString("vi-VN")}
                    </p>
                    <div className="order-1 w-full text-right sm:order-2 sm:w-auto">
                      <span className="mr-2 text-base text-slate-600">
                        Thành tiền:
                      </span>
                      <span className="text-xl font-black tabular-nums text-secondary sm:text-2xl">
                        {formatMoney(orderTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2.5 px-4 pb-4 pt-0.5">
                    <Link
                      to="/chat"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-sky-200 bg-sky-50 px-4 py-2 text-base font-semibold text-sky-700 transition-colors hover:bg-sky-100"
                    >
                      Liên hệ Người Bán
                    </Link>
                    <Link
                      to={`/orders/${order._id}`}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-base font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                    >
                      Chi tiết
                    </Link>
                    {canReviewOrder && (
                      <Link
                        to={`/orders/${order._id}`}
                        state={{ openReview: true }}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-5 py-2 text-base font-semibold text-white transition-colors hover:bg-primary/90"
                      >
                        Đánh giá
                      </Link>
                    )}
                    {(st === "shipped" || st === "delivered") &&
                      (isLoggedIn ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleConfirmDelivery(
                              order._id,
                              order.paymentStatus === "paid",
                            )
                          }
                          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-emerald-600 px-5 py-2 text-base font-semibold text-white hover:bg-emerald-700"
                        >
                          Đã nhận hàng
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate("/login")}
                          className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-neutral-200 bg-slate-100 px-4 py-2 text-base font-medium"
                        >
                          Đăng nhập
                        </button>
                      ))}
                    {(st === "delivered" || st === "received") &&
                      (isLoggedIn ? (
                        <button
                          type="button"
                          onClick={() => openReturnModal(order._id)}
                          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-base font-semibold text-white shadow-sm hover:from-orange-600 hover:to-amber-600"
                        >
                          Yêu cầu hoàn hàng
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate("/login")}
                          className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-neutral-200 bg-slate-100 px-4 py-2 text-base font-medium"
                        >
                          Đăng nhập
                        </button>
                      ))}
                    {(st === "pending" || st === "confirmed") && (
                      <button
                        type="button"
                        onClick={() => handleCancelOrder(order._id)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-red-200 px-4 py-2 text-base font-medium text-red-600 hover:bg-red-50"
                      >
                        Hủy đơn hàng
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPage > 1 && !loading && filteredOrders.length > 0 && (
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-200 bg-white text-lg text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
            >
              {"<"}
            </button>
            <div className="px-4 py-2 text-base font-medium text-slate-800">
              Trang {page} / {totalPage}
            </div>
            <button
              type="button"
              disabled={page >= totalPage}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-200 bg-white text-lg text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
            >
              {">"}
            </button>
          </div>
        )}

        {returnModalOrderId && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="return-modal-title-history"
            onClick={(e) => {
              if (e.target === e.currentTarget && !returnSubmitting)
                closeReturnModal();
            }}
          >
            <div
              className="relative w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start gap-4 mb-5">
                <h3
                  id="return-modal-title-history"
                  className="text-xl font-bold text-slate-800"
                >
                  Yêu cầu hoàn hàng
                </h3>
                <button
                  type="button"
                  onClick={closeReturnModal}
                  disabled={returnSubmitting}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  aria-label="Đóng"
                >
                  <FaTimes size={18} />
                </button>
              </div>
              <p className="mb-4 text-base leading-relaxed text-slate-600">
                Vui lòng mô tả lý do bạn muốn hoàn hàng. Shop sẽ xem xét và phản
                hồi sớm nhất.
              </p>
              <label
                htmlFor="return-reason-history"
                className="mb-2 block text-base font-semibold uppercase tracking-wide text-slate-700"
              >
                Lý do hoàn hàng <span className="text-red-500">*</span>
              </label>
              <select
                value={returnReasonCode}
                onChange={(e) => setReturnReasonCode(String(e.target.value || ""))}
                className="mb-3 w-full rounded-lg border-2 border-neutral-200 px-4 py-3 text-base text-slate-800 focus:border-primary focus:outline-none"
              >
                {RETURN_REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <textarea
                id="return-reason-history"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value.slice(0, 2000))}
                rows={5}
                maxLength={2000}
                placeholder="Ví dụ: Sản phẩm không đúng size..."
                className="min-h-[120px] w-full resize-y rounded-lg border-2 border-neutral-200 px-4 py-3 text-base text-slate-800 focus:border-primary focus:outline-none"
              />
              <p className="mt-2 text-right text-sm text-slate-400">
                {returnReason.length}/2000
              </p>
              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
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
                  <p className="mt-2 text-xs text-slate-500">
                    Đã chọn {returnFiles.length}/5 ảnh
                  </p>
                ) : null}
                {RETURN_REASON_OPTIONS.find((x) => x.value === returnReasonCode)
                  ?.requireImage ? (
                  <p className="mt-2 text-xs text-amber-600">
                    Lý do này yêu cầu tối thiểu 1 ảnh minh chứng.
                  </p>
                ) : null}
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={closeReturnModal}
                  disabled={returnSubmitting}
                  className="flex-1 rounded-lg border-2 border-neutral-200 py-3.5 text-base font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={submitReturnRequest}
                  disabled={returnSubmitting}
                  className="flex-1 rounded-lg bg-primary py-3.5 text-base font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {returnSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistoryPage;
