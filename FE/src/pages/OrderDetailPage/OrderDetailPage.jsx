import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  getOrderById,
  confirmDelivery,
  returnOrderRequest,
  createVnpayUrl,
} from "../../api";

const STATUS_LABELS = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  shipped: "Đang giao",
  delivered: "Đã giao",
  canceled: "Đã hủy",
  "return-request": "Yêu cầu hoàn hàng",
  accepted: "Đã chấp nhận hoàn hàng",
  rejected: "Từ chối hoàn hàng",
};

const TRACKING_STEPS = ["pending", "confirmed", "shipped", "delivered"];
const getTrackingProgress = (status) => {
  if (status === "canceled") return -1;
  if (status === "return-request") return 3;
  if (status === "accepted" || status === "rejected") return 3;
  return TRACKING_STEPS.indexOf(status);
};

const OrderDetailPage = () => {
  const { id } = useParams();
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
      } catch (err) {
        console.error(err);
        setOrder(null);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleConfirmDelivery = async () => {
    try {
      await confirmDelivery(id);
      setOrder((o) => (o ? { ...o, status: "delivered", paymentStatus: "paid" } : o));
      alert("Đã xác nhận nhận hàng.");
    } catch (err) {
      alert(err?.response?.data?.message || "Có lỗi.");
    }
  };

  const handleReturnRequest = async () => {
    if (!window.confirm("Bạn có chắc muốn yêu cầu hoàn hàng đơn này?")) return;
    try {
      await returnOrderRequest(id, "");
      setOrder((o) => (o ? { ...o, status: "return-request" } : o));
      alert("Đã gửi yêu cầu hoàn hàng.");
    } catch (err) {
      alert(err?.response?.data?.message || "Có lỗi.");
    }
  };

  const handleRepayVnpay = async () => {
    try {
      const baseUrl = window.location.origin;
      const res = await createVnpayUrl(
        id,
        `${baseUrl}/payment/return`,
        `${baseUrl}/orders/${id}`,
      );
      if (res?.url) {
        window.location.href = res.url;
      } else {
        alert("Không tạo được link thanh toán VNPay.");
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Không thể tạo thanh toán VNPay.");
    }
  };

  if (loading) return <div className="max-w-2xl mx-auto p-6">Đang tải...</div>;
  if (!order) return <div className="max-w-2xl mx-auto p-6">Không tìm thấy đơn hàng.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/orders" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Lịch sử đơn hàng
      </Link>

      <h1 className="text-2xl font-bold mb-4">
        Đơn hàng #{order._id?.slice(-8).toUpperCase()}
      </h1>

      <div className="border rounded-lg p-4 bg-white shadow-sm space-y-4">
        <div className="flex justify-between">
          <span className="text-gray-500">Trạng thái</span>
          <span
            className={`px-2 py-1 rounded text-sm font-medium ${
              order.status === "delivered"
                ? "bg-green-100 text-green-800"
                : order.status === "canceled"
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800"
            }`}
          >
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>

        <div>
          <span className="text-gray-500 block mb-2">Theo dõi đơn hàng</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TRACKING_STEPS.map((step, idx) => {
              const progress = getTrackingProgress(order.status);
              const active = progress >= idx;
              return (
                <div
                  key={step}
                  className={`text-xs rounded px-2 py-1 text-center ${
                    active
                      ? "bg-primary/20 text-primary font-semibold"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {STATUS_LABELS[step]}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Ngày đặt</span>
          <span>{new Date(order.createdAt).toLocaleString("vi-VN")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Thanh toán</span>
          <span>
            {order.paymentMethod === "vnpay" ? "VNPay" : "COD"} -{" "}
            {order.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
          </span>
        </div>
        {order.paymentMethod === "vnpay" &&
          order.paymentStatus !== "paid" &&
          order.status !== "canceled" && (
            <button
              type="button"
              className="w-full py-2 bg-blue-600 text-white rounded"
              onClick={handleRepayVnpay}
            >
              Thanh toán lại bằng VNPay
            </button>
          )}
        <div>
          <span className="text-gray-500 block">Địa chỉ giao hàng</span>
          <p>
            {order.fullName}, {order.phone}, {order.address}
          </p>
        </div>

        <hr />

        <div>
          <h3 className="font-semibold mb-2">Sản phẩm</h3>
          <ul className="space-y-1">
            {order.products?.map((p, i) => (
              <li key={i}>
                {(p.productId?.name || p.name || "SP")} x{p.quantity} -{" "}
                {(p.price * p.quantity).toLocaleString()}đ
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-between font-bold">
          <span>Tổng cộng</span>
          <span>{Number(order.totalAmount).toLocaleString()}đ</span>
        </div>

        {order.status === "shipped" && (
          isLoggedIn ? (
            <button
              type="button"
              className="w-full py-2 bg-green-600 text-white rounded"
              onClick={handleConfirmDelivery}
            >
              Xác nhận đã nhận hàng
            </button>
          ) : (
            <Link
              to="/login"
              className="w-full block text-center py-2 rounded bg-gray-200 text-gray-700"
            >
              Đăng nhập để xác nhận
            </Link>
          )
        )}
        {order.status === "delivered" && (
          isLoggedIn ? (
            <button
              type="button"
              className="w-full py-2 bg-amber-600 text-white rounded"
              onClick={handleReturnRequest}
            >
              Yêu cầu hoàn hàng
            </button>
          ) : (
            <Link
              to="/login"
              className="w-full block text-center py-2 rounded bg-gray-200 text-gray-700"
            >
              Đăng nhập để hoàn hàng
            </Link>
          )
        )}
      </div>

      {history?.length > 0 && (
        <div className="mt-6 border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Lịch sử trạng thái</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            {history.map((h, i) => (
              <li key={i}>
                {h.oldStatus && `${STATUS_LABELS[h.oldStatus] || h.oldStatus} → `}
                {STATUS_LABELS[h.newStatus] || h.newStatus}
                {h.createdAt && ` (${new Date(h.createdAt).toLocaleString("vi-VN")})`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;
