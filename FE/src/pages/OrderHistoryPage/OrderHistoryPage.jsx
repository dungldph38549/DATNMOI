import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  getOrdersByUserOrGuest,
  confirmDelivery,
  returnOrderRequest,
  cancelOrderByUser,
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
const PAGE_SIZE = 10;
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
        if (userId) {
          requests.push(
            getOrdersByUserOrGuest({
              userId,
              page: 1,
              limit: 100,
            }),
          );
        }
        if (guestId && guestId !== userId) {
          requests.push(
            getOrdersByUserOrGuest({
              guestId,
              page: 1,
              limit: 100,
            }),
          );
        }

        const responses = await Promise.all(requests);
        const mergedOrders = responses
          .flatMap((res) => (Array.isArray(res?.data) ? res.data : []))
          .reduce((acc, order) => {
            if (!acc.some((x) => String(x._id) === String(order._id))) {
              acc.push(order);
            }
            return acc;
          }, [])
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (mounted) setOrders(mergedOrders);
      } catch (err) {
        console.error(err);
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

  const totalPage = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const currentOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPage) setPage(totalPage);
  }, [page, totalPage]);

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

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;
    try {
      await cancelOrderByUser(orderId);
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: "canceled" } : o)),
      );
      alert("Đã hủy đơn hàng.");
    } catch (err) {
      alert(err?.response?.data?.message || "Không thể hủy đơn hàng.");
    }
  };

  if (!userId && !guestId) return null;

  return (
    <div className="container py-5">
      <h1 className="display-5 fw-bold mb-4">Lịch sử đơn hàng</h1>

      {loading ? (
        <p>Đang tải...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">Bạn chưa có đơn hàng nào.</p>
      ) : (
        <div className="d-flex flex-column gap-4">
          {currentOrders.map((order) => (
            <div
              key={order._id}
              className="card border-0 shadow-sm"
            >
              <div className="card-body p-4 p-md-5">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 pb-3 border-bottom">
                <div>
                  <span className="fs-5 fw-bold text-dark">
                    #{order._id?.slice(-8).toUpperCase()}
                  </span>
                  <span className="ms-3 text-secondary">
                    {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <span
                  className={`badge fs-6 px-3 py-2 rounded-pill ${
                    order.status === "delivered"
                      ? "text-bg-success"
                      : order.status === "canceled"
                        ? "text-bg-danger"
                        : order.status === "return-request"
                          ? "text-bg-warning"
                          : "text-bg-primary"
                  }`}
                >
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>

              <div className="mt-4 d-flex flex-column gap-2">
                {order.products?.length > 0 &&
                  order.products.map((p, i) => (
                    <div
                      key={i}
                      className="d-flex align-items-center justify-content-between gap-3 bg-light rounded-3 px-3 py-2"
                    >
                      <span className="fw-medium text-dark">
                        {(p.productId?.name || p.name || "Sản phẩm")} x{p.quantity}
                      </span>
                      <span className="fw-semibold text-nowrap">
                        {(p.price * p.quantity).toLocaleString()}đ
                      </span>
                    </div>
                  ))}
              </div>

              <div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-3">
                <span className="fs-3 fw-bold text-dark">
                  Tổng: {Number(order.totalAmount).toLocaleString()}đ
                </span>
                <div className="d-flex gap-2 flex-wrap">
                  <Link
                    to={`/orders/${order._id}`}
                    className="btn btn-outline-primary"
                  >
                    Chi tiết
                  </Link>
                  {order.status === "shipped" && (
                    isLoggedIn ? (
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => handleConfirmDelivery(order._id)}
                      >
                        Đã nhận hàng
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary"
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
                        className="btn btn-warning"
                        onClick={() => handleReturnRequest(order._id)}
                      >
                        Yêu cầu hoàn hàng
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate("/login", { replace: true })}
                      >
                        Đăng nhập để hoàn hàng
                      </button>
                    )
                  )}
                  {(order.status === "pending" || order.status === "confirmed") && (
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => handleCancelOrder(order._id)}
                    >
                      Hủy đơn
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <p className="small text-secondary mb-2 fw-semibold">Theo dõi đơn hàng</p>
                <div className="row g-2">
                  {TRACKING_STEPS.map((step, idx) => {
                    const progress = getTrackingProgress(order.status);
                    const active = progress >= idx;
                    return (
                      <div
                        key={step}
                        className="col-12 col-sm-6 col-lg-3"
                      >
                        <div
                          className={`rounded-3 px-2 py-2 text-center border ${
                            active
                              ? "bg-warning-subtle border-warning text-warning-emphasis fw-semibold"
                              : "bg-light border-light-subtle text-secondary"
                          }`}
                        >
                          {STATUS_LABELS[step]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPage > 1 && (
        <div className="d-flex justify-content-center align-items-center gap-2 mt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn btn-outline-secondary"
          >
            Trước
          </button>
          <span className="fw-semibold px-2">
            {page} / {totalPage}
          </span>
          <button
            type="button"
            disabled={page >= totalPage}
            onClick={() => setPage((p) => p + 1)}
            className="btn btn-outline-secondary"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderHistoryPage;
