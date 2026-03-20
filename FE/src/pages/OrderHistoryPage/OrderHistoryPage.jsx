import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  getOrdersByUser,
  getOrdersByUserOrGuest,
  confirmDelivery,
  returnOrderRequest,
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

const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);

  const isLoggedIn = !!user?.login;
  const userId = isLoggedIn ? user?.id || user?._id : null;
  const guestId = !isLoggedIn ? String(user?.id || user?._id || "") : null;

  useEffect(() => {
    if (!userId && !guestId) return;

    const load = async () => {
      setLoading(true);
      try {
        const res = userId
          ? await getOrdersByUser(userId, page, 10)
          : await getOrdersByUserOrGuest({
              guestId,
              page,
              limit: 10,
            });
        setOrders(res?.data || []);
        setTotalPage(res?.totalPage || 1);
      } catch (err) {
        console.error(err);
        setOrders([]);
      }
      setLoading(false);
    };
    load();
  }, [userId, guestId, page, navigate]);

  const handleConfirmDelivery = async (orderId) => {
    try {
      await confirmDelivery(orderId);
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId
            ? { ...o, status: "delivered", paymentStatus: "paid" }
            : o,
        ),
      );
      alert("Đã xác nhận nhận hàng.");
    } catch (err) {
      alert(err?.response?.data?.message || "Có lỗi xảy ra.");
    }
  };

  const handleReturnRequest = async (orderId) => {
    if (!window.confirm("Bạn có chắc muốn yêu cầu hoàn hàng đơn này?")) return;
    try {
      await returnOrderRequest(orderId, "");
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId ? { ...o, status: "return-request" } : o,
        ),
      );
      alert("Đã gửi yêu cầu hoàn hàng.");
    } catch (err) {
      alert(err?.response?.data?.message || "Có lỗi xảy ra.");
    }
  };

  if (!userId && !guestId) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Lịch sử đơn hàng</h1>

      {loading ? (
        <p>Đang tải...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">Bạn chưa có đơn hàng nào.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order._id}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <span className="text-gray-500 text-sm">
                    #{order._id?.slice(-8).toUpperCase()}
                  </span>
                  <span className="ml-2 text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <span
                  className={`px-2 py-1 rounded text-sm font-medium ${
                    order.status === "delivered"
                      ? "bg-green-100 text-green-800"
                      : order.status === "canceled"
                        ? "bg-red-100 text-red-800"
                        : order.status === "return-request"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>

              <div className="mt-2 text-sm text-gray-600">
                {order.products?.length > 0 &&
                  order.products.map((p, i) => (
                    <div key={i}>
                      {(p.productId?.name || p.name || "Sản phẩm")} x{p.quantity}{" "}
                      - {(p.price * p.quantity).toLocaleString()}đ
                    </div>
                  ))}
              </div>

              <div className="mt-2 flex justify-between items-center flex-wrap gap-2">
                <span className="font-bold">
                  Tổng: {Number(order.totalAmount).toLocaleString()}đ
                </span>
                <div className="flex gap-2">
                  <Link
                    to={`/orders/${order._id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Chi tiết
                  </Link>
                  {order.status === "shipped" && (
                    isLoggedIn ? (
                      <button
                        type="button"
                        className="text-sm bg-green-600 text-white px-2 py-1 rounded"
                        onClick={() => handleConfirmDelivery(order._id)}
                      >
                        Đã nhận hàng
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-sm bg-gray-200 text-gray-700 px-2 py-1 rounded"
                        onClick={() => navigate("/login", { replace: true })}
                      >
                        Đăng nhập để xác nhận
                      </button>
                    )
                  )}
                  {order.status === "delivered" && (
                    isLoggedIn ? (
                      <button
                        type="button"
                        className="text-sm bg-amber-600 text-white px-2 py-1 rounded"
                        onClick={() => handleReturnRequest(order._id)}
                      >
                        Yêu cầu hoàn hàng
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-sm bg-gray-200 text-gray-700 px-2 py-1 rounded"
                        onClick={() => navigate("/login", { replace: true })}
                      >
                        Đăng nhập để hoàn hàng
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1">Theo dõi đơn hàng</p>
                <div className="grid grid-cols-4 gap-2">
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
            </div>
          ))}
        </div>
      )}

      {totalPage > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Trước
          </button>
          <span className="px-3 py-1">
            {page} / {totalPage}
          </span>
          <button
            type="button"
            disabled={page >= totalPage}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderHistoryPage;
