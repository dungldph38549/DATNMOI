import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Select, Modal, Input } from "antd";
import { getOrderById, updateOrderStatus, cancelOrderLineByAdmin } from "../api";
import notify from "../utils/notify";
import { confirmShopee } from "../utils/shopeeNotify";

const STATUS_OPTIONS = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "shipped", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "received", label: "Đã giao thành công" },
  { value: "canceled", label: "Đã hủy" },
  { value: "return-request", label: "Yêu cầu hoàn hàng" },
  { value: "accepted", label: "Chấp nhận hoàn hàng" },
  { value: "rejected", label: "Từ chối hoàn hàng" },
];

const MIN_ADMIN_CANCEL_NOTE_LEN = 5;

const TRANSITIONS = {
  pending: ["confirmed", "canceled"],
  confirmed: ["shipped", "canceled"],
  shipped: [],
  delivered: [],
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

const formatLineVariant = (p) => {
  if (p?.size && String(p.size).trim() && p.size !== "Mặc định") {
    return `Size: ${p.size}`;
  }
  const attrs = p?.attributes;
  if (!attrs || typeof attrs !== "object") return null;
  const parts = Object.entries(attrs)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `${String(k).trim()}: ${String(v).trim()}`);
  return parts.length ? `Phân loại: ${parts.join(" · ")}` : null;
};

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [lineCanceling, setLineCanceling] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

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
        notify.error(err?.response?.data?.message || "Không tải được chi tiết đơn hàng.");
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

  const isLineLive = (p) => !p?.lineStatus || p.lineStatus !== "canceled";

  const onCancelOrderLine = async (lineIndex) => {
    if (!order?._id) return;
    const ok = await confirmShopee({
      text: `Hủy dòng này (#${lineIndex + 1}) khỏi đơn?`,
      confirmText: "Đồng ý",
      cancelText: "Đóng",
    });
    if (!ok) return;
    setLineCanceling(lineIndex);
    try {
      const data = await cancelOrderLineByAdmin(order._id, lineIndex);
      if (data?.order) setOrder(data.order);
      if (Array.isArray(data?.history)) setHistory(data.history);
      notify.success("Đã hủy dòng hàng.");
    } catch (err) {
      notify.error(err?.response?.data?.message || "Không hủy được dòng hàng.");
    } finally {
      setLineCanceling(null);
    }
  };

  const applyStatusChange = async (newStatus, note) => {
    if (!order?._id || newStatus === normalizedStatus) return;
    const prevStatus = normalizedStatus;
    setSaving(true);
    try {
      const body = {
        status: newStatus,
        lookup: {
          createdAt: order?.createdAt || null,
          totalAmount: order?.totalAmount ?? null,
          fullName: order?.fullName || order?.userId?.name || "",
        },
      };
      if (note != null && String(note).trim() !== "") {
        body.note = String(note).trim();
      }
      const data = await updateOrderStatus(order._id, body);
      setOrder((prev) => ({ ...prev, ...data, status: newStatus }));
      if (newStatus === "canceled") {
        notify.success("Đã hủy đơn hàng.");
      } else {
        notify.success("Cập nhật trạng thái thành công.");
      }
    } catch (err) {
      notify.error(err?.response?.data?.message || "Không cập nhật được trạng thái.");
    } finally {
      setSaving(false);
    }
  };

  const onChangeStatus = async (newStatus) => {
    if (!order?._id || newStatus === normalizedStatus) return;
    if (newStatus === "canceled") {
      setCancelNote("");
      setCancelModalOpen(true);
      return;
    }
    await applyStatusChange(newStatus);
  };

  if (loading) return <div style={{ padding: 24 }}>Đang tải chi tiết đơn hàng...</div>;
  if (!order) return <div style={{ padding: 24 }}>Không tìm thấy đơn hàng.</div>;

  return (
    <div style={{ padding: 24, background: "#F8F7F5", minHeight: "100vh" }}>
      <Modal
        title="Lý do hủy đơn (bắt buộc)"
        open={cancelModalOpen}
        okText="Xác nhận hủy"
        cancelText="Đóng"
        destroyOnClose
        confirmLoading={saving}
        onCancel={() => {
          setCancelModalOpen(false);
          setCancelNote("");
        }}
        onOk={async () => {
          const t = cancelNote.trim();
          if (t.length < MIN_ADMIN_CANCEL_NOTE_LEN) {
            notify.error(
              `Vui lòng nhập lý do hủy (ít nhất ${MIN_ADMIN_CANCEL_NOTE_LEN} ký tự).`,
            );
            return Promise.reject(new Error("invalid-note"));
          }
          setCancelModalOpen(false);
          setCancelNote("");
          await applyStatusChange("canceled", t);
        }}
      >
        <p style={{ marginBottom: 8, color: "#555", fontSize: 13 }}>
          Lý do sẽ được lưu trong lịch sử trạng thái đơn hàng.
        </p>
        <Input.TextArea
          rows={4}
          maxLength={2000}
          showCount
          value={cancelNote}
          onChange={(e) => setCancelNote(e.target.value)}
          placeholder="Ví dụ: Khách yêu cầu hủy — hết hàng, sai thông tin giao hàng..."
        />
      </Modal>
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
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <h3 style={{ margin: 0 }}>Sản phẩm ({(order?.products || []).length})</h3>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#888" }}>Mỗi dòng một khung</p>
          </div>
          <div style={{ padding: 12, background: "#f5f5f5" }}>
            {(order?.products || []).map((p, idx) => {
              const qty = Number(p?.quantity || 0);
              const unit = Number(p?.price || 0);
              const v = formatLineVariant(p);
              const lineLive = isLineLive(p);
              const canCancelLine =
                lineLive &&
                (normalizedStatus === "pending" ||
                  normalizedStatus === "confirmed");
              return (
                <div
                  key={`${order?._id}-${String(p?.sku ?? "")}-${idx}`}
                  style={{
                    marginBottom: idx < (order?.products || []).length - 1 ? 12 : 0,
                    padding: 16,
                    borderRadius: 10,
                    border: lineLive ? "1px solid #e8e8e8" : "1px dashed #ccc",
                    background: "#fff",
                    boxShadow: "0 1px 4px rgba(0,0,0,.06)",
                    opacity: lineLive ? 1 : 0.85,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700 }}>{p?.productId?.name || p?.name || "Sản phẩm"}</div>
                      {v ? <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>{v}</div> : null}
                      <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                        SKU: {p?.sku || "—"} · SL: {qty} · Đơn giá: {formatMoney(unit)}
                      </div>
                      {!lineLive ? (
                        <div style={{ fontSize: 12, color: "#cf1322", fontWeight: 700, marginTop: 8 }}>
                          Đã hủy dòng{p.canceledBy === "user" ? " (khách)" : ""}
                        </div>
                      ) : null}
                      {canCancelLine ? (
                        <Button
                          danger
                          size="small"
                          loading={lineCanceling === idx}
                          style={{ marginTop: 10 }}
                          onClick={() => onCancelOrderLine(idx)}
                        >
                          Hủy đơn này
                        </Button>
                      ) : null}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#999" }}>Thành tiền dòng</div>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{formatMoney(unit * qty)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
