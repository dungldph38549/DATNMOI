import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Select, message } from "antd";
import { getOrderById, updateOrderStatus } from "../api";

const STATUS_OPTIONS = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "shipped", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "received", label: "Giao hàng thành công" },
  { value: "canceled", label: "Đã hủy" },
  { value: "return-request", label: "Yêu cầu hoàn hàng" },
  { value: "accepted", label: "Chấp nhận hoàn hàng" },
  { value: "rejected", label: "Từ chối hoàn hàng" },
];

const TRANSITIONS = {
  pending: ["confirmed", "canceled"],
  confirmed: ["shipped", "canceled"],
  shipped: ["delivered"],
  delivered: ["return-request"],
  received: [],
  canceled: [],
  "return-request": ["accepted", "rejected"],
  accepted: [],
  rejected: [],
};

const getAdminSession = () => {
  try {
    const raw =
      localStorage.getItem("admin_v1") || localStorage.getItem("admin");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const formatMoney = (v) => `${Number(v || 0).toLocaleString("vi-VN")}đ`;

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const admin = getAdminSession();
    if (!admin?.login || !admin?.isAdmin) {
      navigate("/login", { replace: true });
      return;
    }
    if (!id) return;
    const run = async () => {
      setLoading(true);
      try {
        const res = await getOrderById(id);
        setOrder(res?.order || res);
        setHistory(Array.isArray(res?.history) ? res.history : []);
      } catch (err) {
        message.error(err?.response?.data?.message || "Khong tai duoc chi tiet don.");
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id, navigate]);

  const normalizedStatus = useMemo(
    () =>
      typeof order?.status === "string"
        ? order.status.trim().toLowerCase()
        : order?.status,
    [order?.status],
  );
  const allowedNext = useMemo(
    () => TRANSITIONS[normalizedStatus] || [],
    [normalizedStatus],
  );

  const onChangeStatus = async (newStatus) => {
    if (!order?._id || newStatus === normalizedStatus) return;
    setSaving(true);
    try {
      await updateOrderStatus(order._id, {
        status: newStatus,
        lookup: {
          createdAt: order?.createdAt || null,
          totalAmount: order?.totalAmount ?? null,
          fullName: order?.fullName || order?.userId?.name || "",
        },
      });
      setOrder((prev) => ({ ...prev, status: newStatus }));
      message.success("Cap nhat trang thai thanh cong.");
    } catch (err) {
      message.error(err?.response?.data?.message || "Khong cap nhat duoc trang thai.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Dang tai chi tiet don hang...</div>;
  if (!order) return <div style={{ padding: 24 }}>Khong tim thay don hang.</div>;

  return (
    <div style={{ padding: 24, background: "#F8F7F5", minHeight: "100vh" }}>
      <div style={{ marginBottom: 14, display: "flex", gap: 10 }}>
        <Link to="/admin">
          <Button>Quay lai Admin</Button>
        </Link>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #eee", marginBottom: 12 }}>
        <h2 style={{ margin: 0, marginBottom: 10 }}>
          Chi tiet don #{String(order?._id || "").slice(-8).toUpperCase()}
        </h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span>Trang thai:</span>
          <Select
            size="small"
            loading={saving}
            value={normalizedStatus}
            style={{ width: 220 }}
            options={[
              {
                value: normalizedStatus,
                label:
                  STATUS_OPTIONS.find((o) => o.value === normalizedStatus)?.label ||
                  normalizedStatus,
              },
              ...allowedNext.map((v) => ({
                value: v,
                label: STATUS_OPTIONS.find((o) => o.value === v)?.label || v,
              })),
            ]}
            onChange={onChangeStatus}
          />
          <span>Thanh toan: {order?.paymentStatus || "-"}</span>
          <span>Phuong thuc: {order?.paymentMethod || "-"}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 12 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #eee" }}>
          <h3>San pham</h3>
          {(order?.products || []).map((p, idx) => (
            <div key={`${p?.productId?._id || p?.productId || idx}`} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f3f3", padding: "10px 0" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{p?.productId?.name || p?.name || "San pham"}</div>
                <div style={{ fontSize: 12, color: "#666" }}>Size: {p?.size || "Mac dinh"} - SL: {p?.quantity || 0}</div>
              </div>
              <div style={{ fontWeight: 700 }}>{formatMoney((p?.price || 0) * (p?.quantity || 0))}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #eee" }}>
          <h3>Thong tin don</h3>
          <p><b>Khach:</b> {order?.fullName || "-"}</p>
          <p><b>Email:</b> {order?.email || "-"}</p>
          <p><b>So dien thoai:</b> {order?.phone || "-"}</p>
          <p><b>Dia chi:</b> {order?.address || "-"}</p>
          <p><b>Phi ship:</b> {formatMoney(order?.shippingFee || 0)}</p>
          <p><b>Giam gia:</b> {formatMoney(order?.discount || 0)}</p>
          <p><b>Tong:</b> <b>{formatMoney(order?.totalAmount || 0)}</b></p>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #eee", marginTop: 12 }}>
        <h3>Lich su trang thai</h3>
        {history.length === 0 ? (
          <div>Chua co lich su.</div>
        ) : (
          history.map((h, idx) => (
            <div key={`${h?._id || idx}-${h?.createdAt || ""}`} style={{ padding: "8px 0", borderBottom: "1px dashed #f0f0f0" }}>
              <b>{h?.newStatus || "-"}</b> - {h?.createdAt ? new Date(h.createdAt).toLocaleString("vi-VN") : "-"}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
