import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getOrderById, confirmDelivery, returnOrderRequest, createVnpayUrl, cancelOrderByUser } from "../../api";
import { FaBoxOpen, FaCheckCircle, FaTruck, FaMapMarkerAlt, FaTimesCircle, FaChevronLeft, FaUndoAlt, FaCreditCard, FaMoneyBillWave, FaShieldAlt } from "react-icons/fa";

const STATUS_LABELS = {
  pending: "Chờ xử lý", confirmed: "Đã xác nhận", shipped: "Đang giao", delivered: "Đã giao",
  canceled: "Đã hủy", "return-request": "Yêu cầu hoàn hàng", accepted: "Đã chấp nhận hoàn", rejected: "Từ chối hoàn",
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
const getTrackingProgress = (status) => {
  if (status === "canceled") return -1;
  if (status === "return-request" || status === "accepted" || status === "rejected") return 3;
  return TRACKING_STEPS.indexOf(status);
};

const formatMoney = (v) => `${Number(v || 0).toLocaleString("vi-VN")}đ`;

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const handleConfirmDelivery = async () => {
    try {
      await confirmDelivery(id);
      setOrder((o) => (o ? { ...o, status: "delivered", paymentStatus: "paid" } : o));
      alert("Đã xác nhận nhận hàng.");
    } catch (err) { alert(err?.response?.data?.message || "Có lỗi."); }
  };

  const handleReturnRequest = async () => {
    if (!window.confirm("Bạn có chắc muốn yêu cầu hoàn hàng đơn này?")) return;
    try {
      await returnOrderRequest(id, "");
      setOrder((o) => (o ? { ...o, status: "return-request" } : o));
      alert("Đã gửi yêu cầu hoàn hàng.");
    } catch (err) { alert(err?.response?.data?.message || "Có lỗi."); }
  };

  const handleRepayVnpay = async () => {
    try {
      const baseUrl = window.location.origin;
      const res = await createVnpayUrl(id, `${baseUrl}/payment/return`, `${baseUrl}/orders/${id}`);
      if (res?.url) window.location.href = res.url;
      else alert("Không tạo được link thanh toán VNPay.");
    } catch (err) { alert(err?.response?.data?.message || "Không thể tạo thanh toán VNPay."); }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;
    try {
      await cancelOrderByUser(id);
      setOrder((o) => (o ? { ...o, status: "canceled" } : o));
      alert("Đã hủy đơn hàng.");
    } catch (err) { alert(err?.response?.data?.message || "Không thể hủy đơn hàng."); }
  };

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
            <span className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 flex items-center gap-2 shadow-sm ${STATUS_COLORS[order.status] || "bg-slate-800 text-white border-slate-700"}`}>
              {STATUS_ICONS[order.status] || <FaBoxOpen />} {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* MAIN COLUMN */}
          <div className="w-full lg:w-2/3 space-y-8">

            {/* TIMELINE */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-display font-black text-slate-800 mb-8 border-b border-slate-100 pb-4">Trạng Thái Giao Hàng</h3>
              {(order.status !== "canceled" && order.status !== "return-request" && order.status !== "rejected") ? (
                <div className="relative mb-8 pt-4 pb-2 px-4 md:px-8">
                  <div className="absolute top-8 left-4 md:left-8 right-4 md:right-8 h-1.5 bg-slate-100 rounded-full"></div>
                  <div className="absolute top-8 left-4 md:left-8 h-1.5 bg-primary rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(238,77,45,0.5)]" style={{ width: `calc(${Math.max(0, getTrackingProgress(order.status) / 3 * 100)}% - 2rem)` }}></div>

                  <div className="relative flex justify-between text-xs font-bold text-slate-400">
                    {TRACKING_STEPS.map((step, idx) => {
                      const active = getTrackingProgress(order.status) >= idx;
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
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4 text-slate-600 font-bold">
                  <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                    {STATUS_ICONS[order.status]}
                  </span>
                  {STATUS_LABELS[order.status]}
                </div>
              )}

              {/* HISTORY LOG */}
              {history?.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Chi Tiết Lịch Sử</h4>
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {history.slice().reverse().map((h, i) => (
                      <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-slate-300 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 group-first:bg-primary group-first:scale-125 transition-all"></div>
                        <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl border border-slate-100 bg-slate-50 shadow-sm transition-all group-first:border-primary/20 group-first:bg-primary/5">
                          <p className="font-bold text-slate-700 text-sm">{STATUS_LABELS[h.newStatus] || h.newStatus}</p>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5">{new Date(h.createdAt).toLocaleString("vi-VN")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ORDER ITEMS */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-display font-black text-slate-800 mb-6 border-b border-slate-100 pb-4">Danh Sách Sản Phẩm</h3>

              <div className="space-y-4">
                {order.products?.map((p, i) => (
                  <div key={i} className="flex gap-4 items-center p-3 border border-slate-100 rounded-2xl bg-slate-50">
                    <div className="w-20 h-20 bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0">
                      <img src={p.image ? (p.image.startsWith("http") ? p.image : `http://localhost:3002/${p.image.startsWith("/") ? p.image.slice(1) : p.image}`) : "https://via.placeholder.com/80/f0f0f0/999?text=SP"} alt={p.name} className="w-full h-full object-cover mix-blend-multiply p-1" />
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm md:text-base hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-tight mb-2"><Link to={`/product/${p.productId?._id || p.productId}`}>{p.productId?.name || p.name || "Sản phẩm"}</Link></h4>
                        <div className="flex gap-3 text-xs font-bold">
                          <span className="bg-white border shadow-sm px-2 py-1 rounded-md text-slate-500">Size: {p.size || "Mặc định"}</span>
                          <span className="bg-white border shadow-sm px-2 py-1 rounded-md text-slate-500">x{p.quantity}</span>
                        </div>
                      </div>
                      <span className="font-black text-slate-900 ml-4">{formatMoney(p.price * p.quantity)}</span>
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
                    {order.paymentMethod === "vnpay" ? <FaCreditCard className="text-blue-500" /> : <FaMoneyBillWave className="text-green-500" />}
                    {order.paymentMethod === "vnpay" ? "Ví VNPay" : "Tiền mặt (COD)"}
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded border ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700 border-green-200" : "bg-orange-100 text-orange-700 border-orange-200"}`}>
                    {order.paymentStatus === "paid" ? "Đã Thanh Toán" : "Chưa Thanh Toán"}
                  </span>
                </div>

                <div className="space-y-3 text-sm font-semibold text-slate-500 mb-6 border-b border-slate-100 pb-6">
                  <div className="flex justify-between"><span className="text-slate-400">Tạm tính:</span> <span className="text-slate-800">{formatMoney(order.totalAmount - (order.shippingFee || 0) + (order.discount || 0))}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Phí giao hàng:</span> <span className="text-slate-800">{formatMoney(order.shippingFee || 0)}</span></div>
                  {(order.discount || 0) > 0 && <div className="flex justify-between text-green-600"><span>Giảm giá:</span> <span>-{formatMoney(order.discount)}</span></div>}
                </div>

                <div className="flex justify-between items-end mb-6">
                  <span className="font-bold text-slate-700">Tổng cộng</span>
                  <span className="text-3xl font-black text-secondary">{formatMoney(order.totalAmount)}</span>
                </div>

                {/* ACTIONS */}
                <div className="space-y-3">
                  {order.paymentMethod === "vnpay" && order.paymentStatus !== "paid" && order.status !== "canceled" && (
                    <button onClick={handleRepayVnpay} className="w-full flex justify-center items-center gap-2 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-primary transition-colors shadow-lg"><FaShieldAlt /> Thanh Toán VNPay Lại</button>
                  )}

                  {(order.status === "pending" || order.status === "confirmed") && (
                    <button onClick={handleCancelOrder} className="w-full py-3.5 border-2 border-red-100 text-red-500 font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors">Hủy Đơn Hàng</button>
                  )}

                  {order.status === "shipped" && (
                    isLoggedIn ? (<button onClick={handleConfirmDelivery} className="w-full py-3.5 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20">Xác Nhận Đã Nhận Hàng</button>) : (<button onClick={() => navigate("/login")} className="w-full py-3.5 bg-slate-200 text-slate-700 font-bold rounded-xl">Đăng nhập để xác nhận</button>)
                  )}

                  {order.status === "delivered" && (
                    isLoggedIn ? (<button onClick={handleReturnRequest} className="w-full py-3.5 bg-orange-100 text-orange-600 font-bold rounded-xl hover:bg-orange-200 transition-colors">Yêu Cầu Hoàn Hàng</button>) : (<button onClick={() => navigate("/login")} className="w-full py-3.5 bg-slate-200 text-slate-700 font-bold rounded-xl">Đăng nhập để hoàn hàng</button>)
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
