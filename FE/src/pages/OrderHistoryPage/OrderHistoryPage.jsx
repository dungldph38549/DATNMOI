import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  getOrdersByUserOrGuest,
  confirmDelivery,
  returnOrderRequest,
  cancelOrderByUser,
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

const SHOPEE_ORANGE = "#ee4d2d";
const BORDER = "#e8e8e8";
const SHOP_NAME = "SneakerHouse";

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

const TABS = [
  { id: "all", label: "Tất cả" },
  { id: "pending_payment", label: "Chờ thanh toán" },
  { id: "shipping", label: "Vận chuyển" },
  { id: "awaiting_delivery", label: "Chờ giao hàng" },
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
    if (st === "confirmed" || st === "shipped") return true;
    if (st === "pending") {
      if (pay === "unpaid" && (method === "vnpay" || method === "wallet"))
        return false;
      return true;
    }
    return false;
  }

  if (tabId === "awaiting_delivery") return st === "delivered";
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
  if (st === "confirmed") return { text: "Shop đã xác nhận", icon: "ok" };
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
    const load = async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const requests = [];
        if (userId)
          requests.push(getOrdersByUserOrGuest({ userId, page: 1, limit: 100 }));
        if (guestId && guestId !== userId)
          requests.push(
            getOrdersByUserOrGuest({ guestId, page: 1, limit: 100 }),
          );
        const responses = await Promise.all(requests);
        const mergedOrders = responses
          .flatMap((res) => (Array.isArray(res?.data) ? res.data : []))
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
  };

  const closeReturnModal = () => {
    if (returnSubmitting) return;
    setReturnModalOrderId(null);
    setReturnReason("");
  };

  const submitReturnRequest = async () => {
    const reason = returnReason.trim();
    if (reason.length < 5) {
      notify.warning("Vui lòng nhập lý do hoàn hàng (tối thiểu 5 ký tự).");
      return;
    }
    if (!returnModalOrderId) return;
    setReturnSubmitting(true);
    try {
      await returnOrderRequest(returnModalOrderId, reason);
      const oid = returnModalOrderId;
      setOrders((prev) =>
        prev.map((o) =>
          String(o._id) === String(oid) ? { ...o, status: "return-request" } : o,
        ),
      );
      setReturnModalOrderId(null);
      setReturnReason("");
      notify.success("Đã gửi yêu cầu hoàn hàng.");
    } catch (err) {
      notify.error(err?.response?.data?.message || "Có lỗi xảy ra.");
    } finally {
      setReturnSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;
    try {
      await cancelOrderByUser(orderId);
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId ? { ...o, status: "canceled" } : o,
        ),
      );
      notify.success("Đã hủy đơn hàng.");
    } catch (err) {
      notify.error(err?.response?.data?.message || "Không thể hủy đơn hàng.");
    }
  };

  const subIcon = (kind) => {
    const green = "#26aa99";
    if (kind === "truck") return <FaTruck className="inline" style={{ color: green }} />;
    if (kind === "ok") return <FaCheckCircle className="inline" style={{ color: green }} />;
    if (kind === "x") return <FaTimesCircle className="inline text-red-500" />;
    if (kind === "return") return <FaUndoAlt className="inline text-orange-500" />;
    return <FaBoxOpen className="inline text-slate-400" />;
  };

  if (!userId && !guestId) return null;

  return (
    <div
      className="min-h-screen font-body pb-10 pt-4 sm:pt-5"
      style={{ background: "#fafafa" }}
    >
      <div className="container mx-auto max-w-7xl px-4">
        <header className="mb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Đơn mua
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi và quản lý đơn hàng của bạn
          </p>
        </header>

        {/* Tabs — cùng lề với tiêu đề; tab chia đều trên màn lớn */}
        <div
          className="bg-white rounded-t-lg border shadow-sm"
          style={{ borderColor: BORDER }}
        >
          <div className="overflow-x-auto scrollbar-thin lg:overflow-visible">
            <div
              className="flex w-max min-w-full lg:w-full"
              role="tablist"
            >
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative min-w-[100px] flex-shrink-0 px-2 py-3.5 text-center text-base font-medium transition-colors sm:min-w-[112px] sm:px-3 lg:min-w-0 lg:flex-1 lg:px-3"
                    style={{
                      color: active ? SHOPEE_ORANGE : "#555",
                    }}
                  >
                    <span className="inline-block max-w-[8.5rem] leading-snug sm:max-w-none">
                      {tab.label}
                    </span>
                    {active && (
                      <span
                        className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full sm:left-4 sm:right-4"
                        style={{ background: SHOPEE_ORANGE }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="h-px bg-transparent" />

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div
              className="w-10 h-10 border-4 rounded-full animate-spin"
              style={{
                borderColor: `${BORDER}`,
                borderTopColor: SHOPEE_ORANGE,
              }}
            />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div
            className="bg-white border rounded-b-lg p-12 sm:p-16 text-center"
            style={{ borderColor: BORDER }}
          >
            <div className="text-5xl mb-4 opacity-40">📦</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Chưa có đơn hàng
            </h3>
            <p className="text-slate-500 text-sm mb-8 max-w-md mx-auto">
              {orders.length === 0
                ? "Bạn chưa có đơn nào. Khám phá sản phẩm mới nhé."
                : "Không có đơn hàng ở trạng thái này."}
            </p>
            <Link
              to="/product"
              className="inline-block px-8 py-3 rounded text-white text-sm font-semibold"
              style={{ background: SHOPEE_ORANGE }}
            >
              Mua sắm ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {currentOrders.flatMap((order) => {
              const st = normalize(order);
              const canReviewOrder = REVIEWABLE_STATUSES.has(st);
              const sub = statusSubline(st);
              const lines = order.products;
              if (!lines?.length) {
                return [];
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
                        : st === "shipped" || st === "confirmed"
                          ? "ĐANG GIAO"
                          : st === "pending"
                            ? "CHỜ XÁC NHẬN"
                            : (STATUS_LABELS[st] || String(st)).toUpperCase();

              return lines.map((p, lineIndex) => {
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
                const cardKey = `${order._id}-${String(p?.sku ?? "")}-${lineIndex}`;

                return (
                  <div
                    key={cardKey}
                    className="bg-white border rounded-md overflow-hidden shadow-sm"
                    style={{ borderColor: BORDER }}
                  >
                    <div
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b"
                      style={{ borderColor: BORDER }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-sm text-white"
                          style={{ background: SHOPEE_ORANGE }}
                        >
                          Yêu thích
                        </span>
                        <span className="font-semibold text-slate-800 text-sm">
                          {SHOP_NAME}
                        </span>
                        <Link
                          to="/chat"
                          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded border text-white"
                          style={{
                            background: SHOPEE_ORANGE,
                            borderColor: SHOPEE_ORANGE,
                          }}
                        >
                          <FaCommentDots size={12} />
                          Chat
                        </Link>
                        <Link
                          to="/product"
                          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded border bg-white text-slate-700"
                          style={{ borderColor: BORDER }}
                        >
                          <FaStore size={12} />
                          Xem Shop
                        </Link>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 justify-end text-sm">
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          {subIcon(sub.icon)}
                          <span>{sub.text}</span>
                        </span>
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                          title="Trợ giúp"
                          aria-label="Trợ giúp"
                        >
                          <FaQuestionCircle size={14} />
                        </button>
                        <span
                          className="font-bold text-xs tracking-wide ml-1"
                          style={{ color: SHOPEE_ORANGE }}
                        >
                          {headline}
                        </span>
                      </div>
                    </div>

                    <div className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link
                          to={`/orders/${order._id}`}
                          className="w-[72px] h-[72px] shrink-0 border overflow-hidden bg-slate-50 rounded"
                          style={{ borderColor: BORDER }}
                        >
                          <img
                            src={productImageUrl(p)}
                            alt={name}
                            className="w-full h-full object-cover"
                          />
                        </Link>
                        <div className="flex-1 min-w-0 flex gap-2">
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/orders/${order._id}`}
                              className="font-medium text-slate-900 text-sm line-clamp-2 hover:opacity-90"
                            >
                              {name}
                            </Link>
                            {variant && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                {variant}
                              </p>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                              x{qty}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {showStrike && (
                              <p className="text-xs text-slate-400 line-through">
                                {formatMoney(base * qty)}
                              </p>
                            )}
                            <p
                              className="text-sm font-medium"
                              style={{ color: SHOPEE_ORANGE }}
                            >
                              {formatMoney(lineTotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className="px-4 py-3 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      style={{ borderColor: BORDER }}
                    >
                      <p className="text-xs text-slate-500 order-2 sm:order-1">
                        Mã đơn #{String(order._id).slice(-8).toUpperCase()} ·{" "}
                        {new Date(order.createdAt).toLocaleString("vi-VN")}
                      </p>
                      <div className="order-1 sm:order-2 text-right w-full sm:w-auto">
                        <span className="text-sm text-slate-700 mr-2">
                          Thành tiền:
                        </span>
                        <span
                          className="text-lg font-bold"
                          style={{ color: SHOPEE_ORANGE }}
                        >
                          {formatMoney(lineTotal)}
                        </span>
                      </div>
                    </div>

                    <div className="px-4 pb-4 flex flex-wrap justify-end gap-2">
                      <Link
                        to="/chat"
                        className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded border bg-white text-slate-800 min-h-[36px]"
                        style={{ borderColor: BORDER }}
                      >
                        Liên hệ Người Bán
                      </Link>
                      <Link
                        to={buyAgainTo}
                        className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded border bg-white text-slate-800 min-h-[36px]"
                        style={{ borderColor: BORDER }}
                      >
                        Mua lại
                      </Link>
                      <Link
                        to={`/orders/${order._id}`}
                        className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded border bg-white text-slate-800 min-h-[36px]"
                        style={{ borderColor: BORDER }}
                      >
                        Chi tiết
                      </Link>
                      {canReviewOrder && (
                        <Link
                          to={`/orders/${order._id}`}
                          state={{ openReview: true }}
                          className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded text-white min-h-[36px]"
                          style={{ background: SHOPEE_ORANGE }}
                        >
                          Đánh giá
                        </Link>
                      )}
                      {lineIndex === 0 && st === "delivered" && (
                        <>
                          {isLoggedIn ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleConfirmDelivery(
                                    order._id,
                                    order.paymentStatus === "paid",
                                  )
                                }
                                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded text-white min-h-[36px] bg-emerald-600 hover:bg-emerald-700"
                              >
                                Đã nhận hàng
                              </button>
                              <button
                                type="button"
                                onClick={() => openReturnModal(order._id)}
                                className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded border min-h-[36px]"
                                style={{ borderColor: BORDER }}
                              >
                                Yêu cầu hoàn hàng
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate("/login")}
                              className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded border bg-slate-100 min-h-[36px]"
                              style={{ borderColor: BORDER }}
                            >
                              Đăng nhập
                            </button>
                          )}
                        </>
                      )}
                      {lineIndex === 0 &&
                        (st === "pending" || st === "confirmed") && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order._id)}
                            className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded border text-red-600 border-red-200 hover:bg-red-50 min-h-[36px]"
                          >
                            Hủy đơn
                          </button>
                        )}
                    </div>
                  </div>
                );
              });
            })}
          </div>
        )}

        {totalPage > 1 && !loading && filteredOrders.length > 0 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-10 h-10 flex items-center justify-center rounded border bg-white text-slate-600 disabled:opacity-40"
              style={{ borderColor: BORDER }}
            >
              {"<"}
            </button>
            <div className="px-3 py-2 text-sm font-medium text-slate-700">
              Trang {page} / {totalPage}
            </div>
            <button
              type="button"
              disabled={page >= totalPage}
              onClick={() => setPage((p) => p + 1)}
              className="w-10 h-10 flex items-center justify-center rounded border bg-white text-slate-600 disabled:opacity-40"
              style={{ borderColor: BORDER }}
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
              className="bg-white rounded-xl shadow-xl border max-w-lg w-full p-6 relative"
              style={{ borderColor: BORDER }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start gap-4 mb-5">
                <h3
                  id="return-modal-title-history"
                  className="text-lg font-bold text-slate-800"
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
              <p className="text-sm text-slate-500 mb-4">
                Vui lòng mô tả lý do bạn muốn hoàn hàng. Shop sẽ xem xét và phản
                hồi sớm nhất.
              </p>
              <label
                htmlFor="return-reason-history"
                className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2"
              >
                Lý do hoàn hàng <span className="text-red-500">*</span>
              </label>
              <textarea
                id="return-reason-history"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value.slice(0, 2000))}
                rows={5}
                maxLength={2000}
                placeholder="Ví dụ: Sản phẩm không đúng size..."
                className="w-full border-2 rounded-lg px-4 py-3 text-slate-800 focus:outline-none focus:border-orange-400 resize-y min-h-[120px]"
                style={{ borderColor: BORDER }}
              />
              <p className="text-xs text-slate-400 mt-2 text-right">
                {returnReason.length}/2000
              </p>
              <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeReturnModal}
                  disabled={returnSubmitting}
                  className="flex-1 py-3 border-2 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-50"
                  style={{ borderColor: BORDER }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={submitReturnRequest}
                  disabled={returnSubmitting}
                  className="flex-1 py-3 text-white font-semibold rounded-lg disabled:opacity-60"
                  style={{ background: SHOPEE_ORANGE }}
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
