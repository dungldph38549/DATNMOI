import React, { useEffect, useMemo, useState } from "react";
import { Table, Select, Button, Input, Pagination, Modal } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAllOrders, updateOrderStatus } from "../api/index";
import notify from "../utils/notify";

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
const RETURN_REASON_OPTIONS = [
  { value: "all", label: "Tất cả lý do hoàn" },
  { value: "wrong_size", label: "Sai size / không vừa" },
  { value: "wrong_item", label: "Giao sai mẫu / sai màu" },
  { value: "defective", label: "Lỗi sản xuất" },
  { value: "damaged_shipping", label: "Hư hỏng khi vận chuyển" },
  { value: "not_as_described", label: "Không đúng mô tả" },
  { value: "other", label: "Lý do khác" },
];
const RETURN_REASON_LABELS = RETURN_REASON_OPTIONS.reduce((acc, x) => {
  if (x.value !== "all") acc[x.value] = x.label;
  return acc;
}, {});

const toImageArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [value];
};
const toUploadUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `http://localhost:3002/uploads/${raw.replace(/^\/+/, "")}`;
};

const MIN_ADMIN_CANCEL_NOTE_LEN = 5;
const FETCH_LIMIT = 50;

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

const STATUS_STYLE = {
  pending: { bg: "#FFF7E6", color: "#D46B08", border: "#FFD591" },
  confirmed: { bg: "#E6F7FF", color: "#096DD9", border: "#91D5FF" },
  shipped: { bg: "#F9F0FF", color: "#722ED1", border: "#D3ADF7" },
  delivered: { bg: "#F6FFED", color: "#389E0D", border: "#B7EB8F" },
  received: { bg: "#E6FFFB", color: "#08979C", border: "#87E8DE" },
  canceled: { bg: "#FFF1F0", color: "#CF1322", border: "#FFA39E" },
  "return-request": { bg: "#FFFBE6", color: "#D48806", border: "#FFE58F" },
  accepted: { bg: "#F6FFED", color: "#237804", border: "#95DE64" },
  rejected: { bg: "#FFF1F0", color: "#A8071A", border: "#FFA39E" },
  paid: { bg: "#F6FFED", color: "#389E0D", border: "#B7EB8F" },
  unpaid: { bg: "#FFF7E6", color: "#D46B08", border: "#FFD591" },
};

/** Nhãn bước tiếp theo trong Select (giữ nguyên value gửi API). */
const labelForNextStatus = (fromNormalized, toValue) => {
  return STATUS_OPTIONS.find((o) => o.value === toValue)?.label || toValue;
};

/** Mô tả biến thể / phân loại một dòng đơn */
const formatLineLabel = (p) => {
  if (!p) return "";
  if (p.size && String(p.size).trim() && p.size !== "Mặc định") {
    return `Size: ${p.size}`;
  }
  const attrs = p.attributes;
  if (!attrs || typeof attrs !== "object") return "";
  const parts = Object.entries(attrs)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `${String(k).trim()}: ${String(v).trim()}`);
  return parts.length ? parts.join(" · ") : "";
};

const StatusBadge = ({ status, label }) => {
  const s = STATUS_STYLE[status] || {
    bg: "#F5F5F5",
    color: "#595959",
    border: "#D9D9D9",
  };
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
};

export default function Order({ mode = "all" }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [limit] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [returnReasonFilter, setReturnReasonFilter] = useState("all");
  const [cancelReasonFlow, setCancelReasonFlow] = useState(null);
  const [cancelReasonText, setCancelReasonText] = useState("");
  const [returnDetailOrder, setReturnDetailOrder] = useState(null);
  const [previewImage, setPreviewImage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders-all"],
    queryFn: async () => {
      let cursor = 0;
      let totalPage = 1;
      const all = [];
      do {
        const res = await getAllOrders(cursor, FETCH_LIMIT);
        const rows = Array.isArray(res?.data) ? res.data : [];
        all.push(...rows);
        totalPage = Number(res?.totalPage || 1);
        cursor += 1;
      } while (cursor < totalPage);
      return { orders: all };
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const totalOrdersInDb = Array.isArray(data?.orders) ? data.orders.length : 0;

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateOrderStatus(id, body),
    onSuccess: (data, variables) => {
      const from = variables?.fromStatus;
      const to = variables?.body?.status;
      if (to === "accepted" && from === "return-request") {
        const amt = Number(data?.walletRefundAmount);
        notify.success(
          amt > 0
            ? `Đã chuyển ${amt.toLocaleString("vi-VN")}đ về ví tài khoản khách hàng.`
            : "Đã chấp nhận hoàn hàng.",
        );
      } else if (to === "canceled") {
        notify.success("Đã hủy đơn hàng.");
      } else {
        notify.success("Cập nhật trạng thái thành công.");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (err) => {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || "Lỗi cập nhật";
      notify.error(status ? `(${status}) ${msg}` : msg);
    },
  });

  const rawOrders = data?.orders || [];
  const orders = useMemo(() => {
    const returnStatuses = ["return-request", "accepted", "rejected"];
    const finishedStatuses = ["delivered", "received"];
    if (mode === "returns") {
      return rawOrders.filter((o) => returnStatuses.includes(o.status));
    }
    if (mode === "completed") {
      return rawOrders.filter((o) => finishedStatuses.includes(o.status));
    }
    // mode === "all" -> Ẩn các đơn liên quan đến hoàn hàng + các đơn đã xong (vận chuyển/khách xác nhận)
    return rawOrders.filter(
      (o) =>
        !returnStatuses.includes(o.status) &&
        !finishedStatuses.includes(o.status),
    );
  }, [rawOrders, mode]);
  const filteredOrders = useMemo(() => {
    const keywordNormalized = keyword.trim().toLowerCase();
    return orders.filter((o) => {
      const paymentStatus = String(o?.paymentStatus || "").trim().toLowerCase();
      const orderStatus = String(o?.status || "").trim().toLowerCase();
      const paymentMethod = String(o?.paymentMethod || "").trim().toLowerCase();
      const shortId = String(o?._id || "").slice(-8).toLowerCase();
      const fullName = String(o?.fullName || o?.userId?.name || "").toLowerCase();
      const email = String(o?.email || "").toLowerCase();
      const phone = String(o?.phone || "").toLowerCase();

      const byKeyword =
        !keywordNormalized ||
        shortId.includes(keywordNormalized) ||
        fullName.includes(keywordNormalized) ||
        email.includes(keywordNormalized) ||
        phone.includes(keywordNormalized);
      const byPaymentStatus =
        paymentFilter === "all" || paymentStatus === paymentFilter;
      const byStatus = statusFilter === "all" || orderStatus === statusFilter;
      const byMethod = methodFilter === "all" || paymentMethod === methodFilter;
      const reasonCode = String(o?.returnRequestReasonCode || "")
        .trim()
        .toLowerCase();
      const byReturnReason =
        mode !== "returns" ||
        returnReasonFilter === "all" ||
        reasonCode === returnReasonFilter;

      return byKeyword && byPaymentStatus && byStatus && byMethod && byReturnReason;
    });
  }, [orders, keyword, paymentFilter, statusFilter, methodFilter, mode, returnReasonFilter]);
  useEffect(() => {
    setPage(0);
  }, [mode, keyword, paymentFilter, statusFilter, methodFilter, returnReasonFilter]);
  const allowedNext = (current) => TRANSITIONS[current] || [];
  const pagedOrders = useMemo(
    () => filteredOrders.slice(page * limit, (page + 1) * limit),
    [filteredOrders, page, limit],
  );

  /** Một dòng = một đơn; sản phẩm hiển thị dạng danh sách con trong ô. */
  const tableRows = useMemo(
    () =>
      pagedOrders.map((order, idx) => ({
        key: `order-${String(order?._id ?? idx)}`,
        order,
      })),
    [pagedOrders],
  );

  const productLineCount = useMemo(
    () =>
      filteredOrders.reduce(
        (acc, o) => acc + (Array.isArray(o?.products) ? o.products.length : 0),
        0,
      ),
    [filteredOrders],
  );

  const isLineActive = (p) =>
    p && String(p.lineStatus || "active") !== "canceled";

  const paymentMethodLabel = (m) => {
    const x = String(m || "").toLowerCase();
    if (x === "vnpay") return { status: "confirmed", label: "VNPay" };
    if (x === "wallet") return { status: "paid", label: "Ví" };
    return { status: "pending", label: "COD" };
  };

  const columns = [
    {
      title: "Mã đơn",
      key: "orderId",
      width: 88,
      fixed: "left",
      className: "admin-order-col-id",
      render: (_, record) => {
        const id = record.order?._id;
        return (
          <span style={{ fontWeight: 700, color: "#1F2937", whiteSpace: "nowrap" }}>
            {id ? `#${String(id).slice(-8).toUpperCase()}` : "-"}
          </span>
        );
      },
    },
    {
      title: "Sản phẩm",
      key: "product",
      className: "admin-order-col-product",
      render: (_, record) => {
        const order = record.order;
        const products = Array.isArray(order?.products) ? order.products : [];
        if (products.length === 0) {
          return (
            <span style={{ color: "#9CA3AF", fontSize: 12 }}>Không có dòng sản phẩm</span>
          );
        }
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {products.map((p, idx) => {
              const name = p?.productId?.name || p?.name || "—";
              const sub = formatLineLabel(p);
              const lineTotal = Number(p.price || 0) * Number(p.quantity || 0);
              const canceled = !isLineActive(p);
              const isLast = idx === products.length - 1;
              return (
                <div
                  key={`${order._id}-p-${idx}-${String(p?.sku ?? "")}`}
                  style={{
                    paddingBottom: isLast ? 0 : 10,
                    marginBottom: isLast ? 0 : 10,
                    borderBottom: isLast ? "none" : "1px dashed #E5E7EB",
                    opacity: canceled ? 0.7 : 1,
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#111827", lineHeight: 1.35 }}>
                    {name}
                  </div>
                  {sub ? (
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{sub}</div>
                  ) : null}
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                    SKU: {p?.sku || "—"} · SL: {p?.quantity ?? 0}
                    {canceled ? (
                      <span style={{ color: "#CF1322", marginLeft: 8, fontWeight: 600 }}>
                        · Đã hủy dòng
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#0F766E",
                      marginTop: 4,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {Number(lineTotal).toLocaleString("vi-VN")} đ
                  </div>
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      title: "Khách hàng",
      key: "customer",
      width: 168,
      className: "admin-order-col-customer",
      render: (_, record) => {
        const o = record.order;
        const name = o?.fullName || o?.userId?.name || "-";
        const email = o?.email || "";
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 600, color: "#111827" }}>{name}</span>
            {email ? (
              <span style={{ fontSize: 12, color: "#6B7280" }}>{email}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "Tổng đơn",
      key: "orderTotal",
      width: 118,
      align: "right",
      className: "admin-order-col-total",
      render: (_, record) => {
        const t = Number(record.order?.totalAmount || 0);
        return (
          <span
            style={{
              fontWeight: 700,
              color: "#0F766E",
              fontSize: 14,
              whiteSpace: "nowrap",
              display: "inline-block",
              textAlign: "right",
              width: "100%",
            }}
          >
            {Number(t).toLocaleString("vi-VN")} đ
          </span>
        );
      },
    },
    {
      title: "Thanh toán",
      key: "payment",
      width: 100,
      align: "center",
      className: "admin-order-col-center",
      render: (_, record) => {
        const pm = paymentMethodLabel(record.order?.paymentMethod);
        return (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <StatusBadge status={pm.status} label={pm.label} />
          </div>
        );
      },
    },
    {
      title: "TT tiền",
      key: "paymentStatus",
      width: 124,
      align: "center",
      className: "admin-order-col-center",
      render: (_, record) => {
        const paymentStatus = record.order?.paymentStatus;
        const normalized =
          typeof paymentStatus === "string"
            ? paymentStatus.trim().toLowerCase()
            : "";
        const isPaid = normalized === "paid";
        return (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <StatusBadge
              status={isPaid ? "paid" : "unpaid"}
              label={isPaid ? "Đã trả tiền" : "Chưa trả tiền"}
            />
          </div>
        );
      },
    },
    {
      title: "Trạng thái đơn",
      key: "status",
      width: 168,
      className: "admin-order-col-status",
      render: (_, record) => {
        const order = record.order;
        const status = order?.status;
        const normalized =
          typeof status === "string" ? status.trim().toLowerCase() : status;
        const next = allowedNext(normalized);
        if (next.length === 0) {
          return (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <StatusBadge
                status={normalized}
                label={
                  STATUS_OPTIONS.find((o) => o.value === normalized)?.label ||
                  status
                }
              />
            </div>
          );
        }
        return (
          <Select
            size="small"
            value={normalized}
            style={{ width: "100%", maxWidth: 220 }}
            getPopupContainer={() => document.body}
            options={[
              {
                value: normalized,
                label:
                  STATUS_OPTIONS.find((o) => o.value === normalized)?.label ||
                  status,
              },
              ...next.map((v) => ({
                value: v,
                label: labelForNextStatus(normalized, v),
              })),
            ]}
            onChange={(newStatus) => {
              if (newStatus === normalized) return;
              const orderId = String(
                order?._id?.$oid || order?._id || order?.id || "",
              ).trim();
              if (!orderId) {
                notify.error("Đơn hàng không hợp lệ (thiếu ID).");
                return;
              }
              if (newStatus === "canceled") {
                setCancelReasonFlow({ id: orderId, fromStatus: normalized, order });
                setCancelReasonText("");
                return;
              }
              updateMutation.mutate({
                id: orderId,
                fromStatus: normalized,
                body: {
                  status: newStatus,
                  lookup: {
                    createdAt: order?.createdAt || null,
                    totalAmount: order?.totalAmount ?? null,
                    fullName: order?.fullName || order?.userId?.name || "",
                  },
                },
              });
            }}
          />
        );
      },
    },
    ...(mode === "returns"
      ? [
          {
            title: "Lý do hoàn",
            key: "returnReason",
            width: 140,
            render: (_, record) => {
              const code = String(record?.order?.returnRequestReasonCode || "")
                .trim()
                .toLowerCase();
              const label = RETURN_REASON_LABELS[code] || "—";
              return (
                <span style={{ fontSize: 12, color: "#4B5563", fontWeight: 600 }}>
                  {label}
                </span>
              );
            },
          },
          {
            title: "Chi tiết hoàn",
            key: "returnDetail",
            width: 260,
            render: (_, record) => {
              const order = record?.order || {};
              const note = String(order?.returnRequestReason || order?.note || "").trim();
              const imgs = toImageArray(order?.returnRequestImages);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.45 }}>
                    {note || "Chưa có mô tả chi tiết. Mở chi tiết đơn để xem lịch sử hoàn hàng."}
                  </span>
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                    Ảnh minh chứng: {imgs.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReturnDetailOrder(order)}
                    style={{ fontSize: 12, fontWeight: 700 }}
                  >
                    Xem chi tiết đơn hoàn
                  </button>
                </div>
              );
            },
          },
        ]
      : []),
    {
      title: "Ngày đặt",
      key: "createdAt",
      width: 104,
      align: "center",
      className: "admin-order-col-center",
      render: (_, record) => {
        const v = record.order?.createdAt;
        return (
          <span style={{ color: "#4B5563", whiteSpace: "nowrap" }}>
            {v ? new Date(v).toLocaleDateString("vi-VN") : "-"}
          </span>
        );
      },
    },
    {
      title: "Thao tác",
      key: "detail",
      width: 108,
      align: "center",
      fixed: "right",
      className: "admin-order-col-actions",
      render: (_, record) => {
        const order = record.order;
        const orderIdRaw = order?._id?.$oid || order?._id || order?.id || "";
        const orderId = String(orderIdRaw || "").trim();
        const normalized =
          typeof order?.status === "string"
            ? order.status.trim().toLowerCase()
            : "";
        const canCancelWhole =
          mode !== "returns" &&
          (normalized === "pending" || normalized === "confirmed");
        const mutatingId = updateMutation.isPending
          ? String(updateMutation.variables?.id || "")
          : "";
        const cancelLoading =
          updateMutation.isPending && mutatingId === orderId;

        const runCancelOrder = () => {
          if (!orderId) {
            notify.error("Đơn hàng không hợp lệ (thiếu ID).");
            return;
          }
          setCancelReasonFlow({ id: orderId, fromStatus: normalized, order });
          setCancelReasonText("");
        };

        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Link to={`/admin/orders/${orderId}`} style={{ lineHeight: 1 }}>
              <Button size="small" type="default" style={{ minWidth: 76 }}>
                Xem
              </Button>
            </Link>
            {canCancelWhole ? (
              <Button
                size="small"
                danger
                ghost
                loading={cancelLoading}
                onClick={runCancelOrder}
                style={{
                  minWidth: 76,
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 12,
                  borderColor: "#FECACA",
                  color: "#DC2626",
                }}
              >
                Hủy đơn
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ padding: "12px 16px 20px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <Modal
        title="Xem ảnh minh chứng"
        open={!!previewImage}
        onCancel={() => setPreviewImage("")}
        footer={null}
        width={840}
      >
        {previewImage ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img
              src={previewImage}
              alt="return-proof-preview"
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: 8,
                border: "1px solid #E5E7EB",
              }}
            />
          </div>
        ) : null}
      </Modal>
      <Modal
        title={`Chi tiết đơn hoàn #${String(returnDetailOrder?._id || "").slice(-8).toUpperCase()}`}
        open={!!returnDetailOrder}
        footer={null}
        onCancel={() => setReturnDetailOrder(null)}
        width={760}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <b>Lý do hoàn:</b>{" "}
            {String(returnDetailOrder?.returnRequestReason || "").trim() || "Chưa có mô tả"}
          </div>
          <div>
            <b>Danh mục lý do:</b>{" "}
            {RETURN_REASON_LABELS[
              String(returnDetailOrder?.returnRequestReasonCode || "").trim().toLowerCase()
            ] || "—"}
          </div>
          <div>
            <b>Ảnh minh chứng:</b>
            {toImageArray(returnDetailOrder?.returnRequestImages).length === 0 ? (
              <div style={{ marginTop: 6, color: "#6B7280" }}>Không có ảnh.</div>
            ) : (
              <div
                style={{
                  marginTop: 8,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 8,
                }}
              >
                {toImageArray(returnDetailOrder?.returnRequestImages).map((img, idx) => {
                  const src = toUploadUrl(img);
                  return (
                    <button
                      key={`${src}-${idx}`}
                      type="button"
                      onClick={() => setPreviewImage(src)}
                      style={{ padding: 0, background: "transparent", border: "none" }}
                    >
                      <img
                        src={src}
                        alt={`return-proof-${idx + 1}`}
                        style={{
                          width: "100%",
                          height: 120,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #E5E7EB",
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>
      <Modal
        title="Lý do hủy đơn (bắt buộc)"
        open={!!cancelReasonFlow}
        okText="Xác nhận hủy"
        cancelText="Đóng"
        destroyOnClose
        onCancel={() => {
          setCancelReasonFlow(null);
          setCancelReasonText("");
        }}
        onOk={() => {
          const t = cancelReasonText.trim();
          if (t.length < MIN_ADMIN_CANCEL_NOTE_LEN) {
            notify.error(
              `Vui lòng nhập lý do hủy (ít nhất ${MIN_ADMIN_CANCEL_NOTE_LEN} ký tự).`,
            );
            return Promise.reject(new Error("invalid-note"));
          }
          const flow = cancelReasonFlow;
          if (!flow?.id) return Promise.reject(new Error("no-flow"));
          updateMutation.mutate({
            id: flow.id,
            fromStatus: flow.fromStatus,
            body: {
              status: "canceled",
              note: t,
              lookup: {
                createdAt: flow.order?.createdAt || null,
                totalAmount: flow.order?.totalAmount ?? null,
                fullName: flow.order?.fullName || flow.order?.userId?.name || "",
              },
            },
          });
          setCancelReasonFlow(null);
          setCancelReasonText("");
        }}
      >
        <p style={{ marginBottom: 8, color: "#4B5563", fontSize: 13 }}>
          Nhập lý do hủy (bắt buộc). Lý do được lưu trong lịch sử đơn. Khi xác nhận,
          hệ thống sẽ hoàn tồn và hoàn ví (nếu có) theo cấu hình.
        </p>
        <Input.TextArea
          rows={4}
          maxLength={2000}
          showCount
          value={cancelReasonText}
          onChange={(e) => setCancelReasonText(e.target.value)}
          placeholder="Ví dụ: Khách yêu cầu hủy — hết hàng, sai thông tin giao hàng..."
        />
      </Modal>
      <style>{`
        .admin-order-table-wrap {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
        }
        .admin-order-table .ant-table-wrapper,
        .admin-order-table .ant-spin-nested-loading,
        .admin-order-table .ant-spin-container,
        .admin-order-table .ant-table,
        .admin-order-table .ant-table-container {
          width: 100% !important;
        }
        .admin-order-table .ant-table-content table {
          table-layout: auto !important;
          width: 100% !important;
        }
        .admin-order-table .ant-table-cell {
          word-break: break-word;
          overflow-wrap: break-word;
          vertical-align: top;
          font-size: 13px;
        }
        .admin-order-table .admin-order-col-total .ant-table-cell,
        .admin-order-table th.admin-order-col-total {
          text-align: right !important;
        }
        .admin-order-table .admin-order-col-center .ant-table-cell,
        .admin-order-table th.admin-order-col-center {
          text-align: center !important;
        }
        .admin-order-table .admin-order-col-actions .ant-table-cell,
        .admin-order-table th.admin-order-col-actions {
          text-align: center !important;
        }
        .admin-order-table .admin-order-col-id .ant-table-cell,
        .admin-order-table th.admin-order-col-id {
          vertical-align: middle;
        }
        .admin-order-table .ant-select { min-width: 0 !important; }
        .admin-order-table .ant-table {
          border: 1px solid #E8E8E8;
          border-radius: 10px;
          overflow: hidden;
        }
        .admin-order-table .ant-table-thead > tr > th {
          background: #F5F5F5 !important;
          font-weight: 700;
          color: #374151;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 10px 12px !important;
          vertical-align: middle !important;
        }
        .admin-order-table .ant-table-tbody > tr > td {
          padding: 10px 12px !important;
        }
        .admin-order-table .ant-table-tbody > tr:hover > td {
          background: #FFFBF5 !important;
        }
      `}</style>
      <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 700, color: "#111827" }}>
        Quản lý đơn hàng
      </h2>
      <div
        style={{
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          background: "#fff",
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid #ECECEC",
        }}
      >
        <Input
          allowClear
          placeholder="Tìm mã đơn / khách / email / SĐT"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ flex: "1 1 200px", minWidth: 160, maxWidth: 420 }}
        />
        <Select
          size="small"
          value={statusFilter}
          style={{ flex: "1 1 160px", minWidth: 150 }}
          options={[
            { value: "all", label: "Tất cả trạng thái" },
            ...STATUS_OPTIONS.filter((s) => {
              const isRet = ["return-request", "accepted", "rejected"].includes(s.value);
              const isFin = ["delivered", "received"].includes(s.value);
              if (mode === "returns") return isRet;
              if (mode === "completed") return isFin;
              return !isRet && !isFin;
            }).map((s) => ({ value: s.value, label: s.label })),
          ]}
          onChange={setStatusFilter}
        />
        <Select
          size="small"
          value={methodFilter}
          style={{ flex: "1 1 140px", minWidth: 130 }}
          options={[
            { value: "all", label: "Phương thức" },
            { value: "vnpay", label: "VNPay" },
            { value: "cod", label: "COD" },
          ]}
          onChange={setMethodFilter}
        />
        <Select
          size="small"
          value={paymentFilter}
          style={{ flex: "1 1 140px", minWidth: 130 }}
          options={[
            { value: "all", label: "TT tiền" },
            { value: "paid", label: "Đã trả" },
            { value: "unpaid", label: "Chưa trả" },
          ]}
          onChange={setPaymentFilter}
        />
        {mode === "returns" && (
          <Select
            size="small"
            value={returnReasonFilter}
            style={{ flex: "1 1 180px", minWidth: 170 }}
            options={RETURN_REASON_OPTIONS}
            onChange={setReturnReasonFilter}
          />
        )}
        <Button
          size="small"
          onClick={() => {
            setKeyword("");
            setStatusFilter("all");
            setMethodFilter("all");
            setPaymentFilter("all");
            setReturnReasonFilter("all");
          }}
        >
          Xóa lọc
        </Button>
        <span style={{ fontSize: 12, color: "#888", marginLeft: "auto", whiteSpace: "nowrap" }}>
          {filteredOrders.length} đơn · {productLineCount} dòng SP
        </span>
      </div>
      {mode === "returns" && (
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#666" }}>
          Đơn liên quan hoàn hàng.
        </p>
      )}
      <div className="admin-order-table-wrap">
        <Table
          className="admin-order-table"
          rowKey="key"
          loading={isLoading}
          dataSource={tableRows}
          columns={columns}
          tableLayout="auto"
          scroll={{ x: 1180 }}
          size="small"
          pagination={false}
        />
      </div>
      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "#666", marginRight: "auto" }}>
          {filteredOrders.length} đơn · {productLineCount} dòng SP (đã lọc trang này)
        </span>
        <Pagination
          current={page + 1}
          total={filteredOrders.length}
          pageSize={limit}
          onChange={(p) => setPage(p - 1)}
          showSizeChanger={false}
          showTotal={(t) => `Tổng ${t} đơn (theo bộ lọc hiện tại)`}
        />
      </div>
    </div>
  );
}
