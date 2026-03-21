import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  getOrderById,
  confirmDelivery,
  returnOrderRequest,
  createVnpayUrl,
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

  const handleCancelOrder = async () => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;
    try {
      await cancelOrderByUser(id);
      setOrder((o) => (o ? { ...o, status: "canceled" } : o));
      alert("Đã hủy đơn hàng.");
    } catch (err) {
      alert(err?.response?.data?.message || "Không thể hủy đơn hàng.");
    }
  };

  if (loading) return <div className="container py-5">Đang tải...</div>;
  if (!order) return <div className="container py-5">Không tìm thấy đơn hàng.</div>;

  return (
    <div className="container py-5">
      <Link to="/orders" className="link-primary text-decoration-none mb-3 d-inline-block">
        ← Lịch sử đơn hàng
      </Link>

      <h1 className="h2 fw-bold mb-4">
        Đơn hàng #{order._id?.slice(-8).toUpperCase()}
      </h1>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4 p-md-5">
          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 pb-3 border-bottom mb-3">
                <span className="text-secondary">Trạng thái</span>
                <span
                  className={`badge fs-6 px-3 py-2 rounded-pill ${
                    order.status === "delivered"
                      ? "text-bg-success"
                      : order.status === "canceled"
                        ? "text-bg-danger"
                        : "text-bg-primary"
                  }`}
                >
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>

              <div className="mb-4">
                <span className="text-secondary d-block mb-2">Theo dõi đơn hàng</span>
                <div className="row g-2">
                  {TRACKING_STEPS.map((step, idx) => {
                    const progress = getTrackingProgress(order.status);
                    const active = progress >= idx;
                    return (
                      <div
                        key={step}
                        className="col-6 col-md-3"
                      >
                        <div
                          className={`rounded-3 px-2 py-2 text-center border small ${
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

              <div className="d-flex justify-content-between flex-wrap gap-2 mb-2">
                <span className="text-secondary">Ngày đặt</span>
                <span>{new Date(order.createdAt).toLocaleString("vi-VN")}</span>
              </div>
              <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
                <span className="text-secondary">Thanh toán</span>
                <span>
                  {order.paymentMethod === "vnpay" ? "VNPay" : "COD"} -{" "}
                  {order.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                </span>
              </div>

              <div className="mb-3">
                <span className="text-secondary d-block">Địa chỉ giao hàng</span>
                <p className="mb-0 fw-medium">
                  {order.fullName}, {order.phone}, {order.address}
                </p>
              </div>

              <hr className="my-4" />

              <div className="mb-3">
                <h3 className="h4 fw-bold mb-3">Sản phẩm</h3>
                <ul className="list-group list-group-flush">
                  {order.products?.map((p, i) => (
                    <li key={i} className="list-group-item px-0 d-flex justify-content-between">
                      <span>{(p.productId?.name || p.name || "SP")} x{p.quantity}</span>
                      <span className="fw-semibold">{(p.price * p.quantity).toLocaleString()}đ</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="d-flex justify-content-between fw-bold fs-4 pt-3 border-top">
                <span>Tổng cộng</span>
                <span>{Number(order.totalAmount).toLocaleString()}đ</span>
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <div className="border rounded-3 p-3 bg-light sticky-lg-top" style={{ top: "90px" }}>
                <h4 className="h5 fw-bold mb-3">Thao tác</h4>
                <div className="d-grid gap-2">
                  {order.paymentMethod === "vnpay" &&
                    order.paymentStatus !== "paid" &&
                    order.status !== "canceled" && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleRepayVnpay}
                      >
                        Thanh toán lại bằng VNPay
                      </button>
                    )}

                  {(order.status === "pending" || order.status === "confirmed") && (
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={handleCancelOrder}
                    >
                      Hủy đơn hàng
                    </button>
                  )}

                  {order.status === "shipped" && (
                    isLoggedIn ? (
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={handleConfirmDelivery}
                      >
                        Xác nhận đã nhận hàng
                      </button>
                    ) : (
                      <Link
                        to="/login"
                        className="btn btn-secondary"
                      >
                        Đăng nhập để xác nhận
                      </Link>
                    )
                  )}

                  {order.status === "delivered" && (
                    isLoggedIn ? (
                      <button
                        type="button"
                        className="btn btn-warning"
                        onClick={handleReturnRequest}
                      >
                        Yêu cầu hoàn hàng
                      </button>
                    ) : (
                      <Link
                        to="/login"
                        className="btn btn-secondary"
                      >
                        Đăng nhập để hoàn hàng
                      </Link>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {history?.length > 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
          <h3 className="h3 fw-bold mb-3">Lịch sử trạng thái</h3>
          <ul className="list-unstyled mb-0 text-secondary">
            {history.map((h, i) => (
              <li key={i} className="mb-2">
                {h.oldStatus && `${STATUS_LABELS[h.oldStatus] || h.oldStatus} → `}
                {STATUS_LABELS[h.newStatus] || h.newStatus}
                {h.createdAt && ` (${new Date(h.createdAt).toLocaleString("vi-VN")})`}
              </li>
            ))}
          </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;
