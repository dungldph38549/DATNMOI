import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getOrdersByUserOrGuest, confirmDelivery, returnOrderRequest, cancelOrderByUser } from "../../api";
import { FaBoxOpen, FaCheckCircle, FaTruck, FaMapMarkerAlt, FaTimesCircle, FaChevronRight, FaUndoAlt, FaTimes } from "react-icons/fa";
import BackButton from "../../components/Common/BackButton";

const STATUS_LABELS = {
  pending: "Chờ xử lý", confirmed: "Đã xác nhận", shipped: "Đang giao", delivered: "Đã giao",
  canceled: "Đã hủy",
  "return-request": "Hoàn hàng: Đang yêu cầu",
  accepted: "Hoàn hàng: Đã chấp nhận",
  rejected: "Hoàn hàng: Bị từ chối",
  returned: "Hoàn hàng: Hoàn tất",
};

const STATUS_ICONS = {
  pending: <FaBoxOpen />, confirmed: <FaCheckCircle />, shipped: <FaTruck />, delivered: <FaMapMarkerAlt />,
  canceled: <FaTimesCircle />, "return-request": <FaUndoAlt />, accepted: <FaCheckCircle />, rejected: <FaTimesCircle />
};

const STATUS_COLORS = {
  pending: "bg-blue-50 text-blue-600 border-blue-200", confirmed: "bg-indigo-50 text-indigo-600 border-indigo-200",
  shipped: "bg-purple-50 text-purple-600 border-purple-200", delivered: "bg-green-50 text-green-600 border-green-200",
  canceled: "bg-red-50 text-red-600 border-red-200", "return-request": "bg-orange-50 text-orange-600 border-orange-200",
  accepted: "bg-teal-50 text-teal-600 border-teal-200", rejected: "bg-red-50 text-red-600 border-red-200",
};

const TRACKING_STEPS = ["pending", "confirmed", "shipped", "delivered"];
const RETURN_STATUSES = new Set(["return-request", "accepted", "rejected", "returned"]);
const PAGE_SIZE = 10;
const getTrackingProgress = (status) => {
  if (status === "canceled") return -1;
  if (RETURN_STATUSES.has(status)) return 3;
  return TRACKING_STEPS.indexOf(status);
};

const formatMoney = (v) => `${Number(v || 0).toLocaleString("vi-VN")}đ`;

const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [returnModalOrderId, setReturnModalOrderId] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  const isLoggedIn = !!user?.login;
  const userId = isLoggedIn ? user?.id || user?._id : null;
  const guestId = !isLoggedIn ? String(user?.id || user?._id || "") : null;

  useEffect(() => {
    if (!userId && !guestId) { setOrders([]); setLoading(false); return; }
    let mounted = true;
    const load = async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const requests = [];
        if (userId) requests.push(getOrdersByUserOrGuest({ userId, page: 1, limit: 100 }));
        if (guestId && guestId !== userId) requests.push(getOrdersByUserOrGuest({ guestId, page: 1, limit: 100 }));
        const responses = await Promise.all(requests);
        const mergedOrders = responses.flatMap((res) => (Array.isArray(res?.data) ? res.data : [])).reduce((acc, order) => {
          if (!acc.some((x) => String(x._id) === String(order._id))) acc.push(order);
          return acc;
        }, []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (mounted) setOrders(mergedOrders);
      } catch (err) { if (mounted) setOrders([]); } finally { if (mounted) setLoading(false); }
    };
    load(true);
    const intervalId = setInterval(() => load(false), 12000);
    return () => { mounted = false; clearInterval(intervalId); };
  }, [userId, guestId]);

  const totalPage = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const currentOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPage) setPage(totalPage); }, [page, totalPage]);

  const handleConfirmDelivery = async (orderId, wasPaid) => {
    try {
      await confirmDelivery(orderId);
      setOrders((prev) =>
        prev.map((o) =>
          String(o._id) === String(orderId)
            ? { ...o, status: "delivered", paymentStatus: "paid" }
            : o,
        ),
      );
      alert(
        wasPaid
          ? "Cảm ơn bạn đã xác nhận đã nhận hàng."
          : "Đã xác nhận nhận hàng.",
      );
    } catch (err) {
      alert(err?.response?.data?.message || "Có lỗi xảy ra.");
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
      alert("Vui lòng nhập lý do hoàn hàng (tối thiểu 5 ký tự).");
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
      alert("Đã gửi yêu cầu hoàn hàng.");
    } catch (err) {
      alert(err?.response?.data?.message || "Có lỗi xảy ra.");
    } finally {
      setReturnSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;
    try {
      await cancelOrderByUser(orderId);
      setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status: "canceled" } : o)));
      alert("Đã hủy đơn hàng.");
    } catch (err) { alert(err?.response?.data?.message || "Không thể hủy đơn hàng."); }
  };

  if (!userId && !guestId) return null;

  return (
    <div className="bg-background-light min-h-screen font-body pb-20 pt-24">
      {/* HEADER */}
      <div className="bg-slate-900 border-b border-slate-800 relative mb-10">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 z-0"></div>
        <div className="container mx-auto px-4 max-w-5xl relative z-10 py-12 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-display font-black text-white tracking-tight mb-4">Lịch Sử Đơn Hàng.</h1>
          <p className="text-slate-400 max-w-xl text-lg md:text-xl">Quản lý và theo dõi các sản phẩm bạn đã mua tại SneakerHouse.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-6">
          <BackButton />
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-20"><div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div></div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-4xl text-slate-400">📦</div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Chưa có đơn hàng</h3>
            <p className="text-slate-500 mb-8 max-w-md">Bạn chưa thực hiện đơn đặt hàng nào. Hãy khám phá ngay các bộ sưu tập mới nhất nhé.</p>
            <Link to="/product" className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-primary transition-colors">Mua Sắm Ngay</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {currentOrders.map((order) => {
              const st =
                typeof order.status === "string"
                  ? order.status.trim().toLowerCase()
                  : order.status;
              return (
              <div key={order._id} className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">

                {/* ORDER HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 md:px-8 py-5 border-b border-slate-100 bg-slate-50/50 gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-display font-black text-lg text-slate-900">#{order._id?.slice(-8).toUpperCase()}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${STATUS_COLORS[st] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {STATUS_ICONS[st] || <FaBoxOpen />} {STATUS_LABELS[st] || order.status}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-400">{new Date(order.createdAt).toLocaleString("vi-VN")}</span>
                  </div>

                  <Link to={`/orders/${order._id}`} className="group flex items-center gap-2 text-primary font-bold hover:text-secondary transition-colors text-sm bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl">
                    Chi tiết đơn hàng <FaChevronRight className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* ORDER DETAILS */}
                <div className="p-6 md:p-8">
                  {/* PRODUCTS */}
                  <div className="space-y-4 mb-8">
                    {order.products?.slice(0, 2).map((p, i) => (
                      <div key={i} className="flex gap-4 items-center">
                        <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shrink-0">
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
                        <div className="flex-1 flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm md:text-base line-clamp-1">{p.productId?.name || p.name || "Sản phẩm"}</h4>
                            <p className="text-sm font-semibold text-slate-400">x{p.quantity}</p>
                          </div>
                          <div className="text-right">
                            {Number(p.basePrice || 0) > Number(p.price || 0) && (
                              <p className="text-xs text-slate-400 line-through font-bold">
                                {formatMoney((p.basePrice || 0) * (p.quantity || 0))}
                              </p>
                            )}
                            <span className="font-black text-slate-800">{formatMoney(p.price * p.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {order.products?.length > 2 && <p className="text-sm font-semibold text-slate-400 pt-2 border-t border-slate-100">... và {order.products.length - 2} sản phẩm khác</p>}
                  </div>

                  {/* TIMELINE */}
                  {(st !== "canceled" && !RETURN_STATUSES.has(st)) && (
                    <div className="relative mb-8 pt-4">
                      <div className="absolute top-8 left-0 w-full h-1 bg-slate-100 rounded-full pointer-events-none" aria-hidden />
                      <div className="absolute top-8 left-0 h-1 bg-primary rounded-full transition-all duration-500 pointer-events-none" style={{ width: `${Math.max(0, getTrackingProgress(st) / 3 * 100)}%` }} aria-hidden />

                      <div className="relative flex justify-between text-xs font-bold text-slate-400">
                        {TRACKING_STEPS.map((step, idx) => {
                          const active = getTrackingProgress(st) >= idx;
                          return (
                            <div key={step} className={`flex flex-col items-center gap-2 ${active ? 'text-primary' : ''} w-1/4`}>
                              <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center bg-white z-10 transition-colors ${active ? 'border-primary text-primary' : 'border-slate-100 text-slate-300'}`}>
                                {active && <FaCheckCircle size={12} />}
                              </div>
                              <span className="text-center">{STATUS_LABELS[step]}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SUMMARY & ACTIONS */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-6 border-t border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Tổng Tiền</p>
                      <span className="text-3xl font-black text-secondary">{formatMoney(order.totalAmount)}</span>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                      {st === "delivered" && (
                        <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:min-w-[320px]">
                          <div className="min-w-0">
                            {isLoggedIn ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleConfirmDelivery(
                                    order._id,
                                    order.paymentStatus === "paid",
                                  )
                                }
                                className="w-full px-3 py-3 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors shadow-md shadow-green-600/15"
                              >
                                Đã nhận hàng
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => navigate("/login")}
                                className="w-full px-3 py-3 bg-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-300 transition-colors"
                              >
                                Đăng nhập
                              </button>
                            )}
                          </div>
                          <div className="min-w-0">
                            {isLoggedIn ? (
                              <button
                                type="button"
                                onClick={() => openReturnModal(order._id)}
                                className="w-full px-3 py-3 bg-orange-100 text-orange-600 text-sm font-bold rounded-xl hover:bg-orange-200 transition-colors"
                              >
                                Yêu cầu hoàn hàng
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => navigate("/login")}
                                className="w-full px-3 py-3 bg-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-300 transition-colors"
                              >
                                Đăng nhập
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {(st === "pending" || st === "confirmed") && (
                        <button type="button" onClick={() => handleCancelOrder(order._id)} className="flex-1 md:flex-none px-6 py-3 border-2 border-slate-200 text-slate-500 font-bold rounded-xl hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors">Hủy Đơn Hàng</button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            );
            })}
          </div>
        )}

        {totalPage > 1 && (
          <div className="flex justify-center items-center gap-4 mt-10">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary transition-all disabled:opacity-50 font-bold">{"<"}</button>
            <div className="px-4 py-2 bg-white rounded-xl font-bold border border-slate-200 text-slate-800">Trang {page} / {totalPage}</div>
            <button disabled={page >= totalPage} onClick={() => setPage((p) => p + 1)} className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary transition-all disabled:opacity-50 font-bold">{">"}</button>
          </div>
        )}

        {returnModalOrderId && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="return-modal-title-history"
            onClick={(e) => {
              if (e.target === e.currentTarget && !returnSubmitting) closeReturnModal();
            }}
          >
            <div
              className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full p-6 md:p-8 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start gap-4 mb-5">
                <h3 id="return-modal-title-history" className="text-xl font-display font-black text-slate-800 leading-tight">
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
              <label htmlFor="return-reason-history" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Lý do hoàn hàng <span className="text-red-500">*</span>
              </label>
              <textarea
                id="return-reason-history"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value.slice(0, 2000))}
                rows={5}
                maxLength={2000}
                placeholder="Ví dụ: Sản phẩm không đúng size, lỗi sản xuất, không còn nhu cầu..."
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-slate-800 font-medium placeholder:text-slate-400 focus:border-primary focus:ring-0 focus:outline-none resize-y min-h-[120px]"
              />
              <p className="text-xs text-slate-400 mt-2 text-right">{returnReason.length}/2000</p>
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
      </div>
    </div>
  );
};

export default OrderHistoryPage;
