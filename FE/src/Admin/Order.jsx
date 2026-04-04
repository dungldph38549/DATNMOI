import React, { useMemo, useState } from "react";
import { Table, Select, Button, message, Input, Pagination } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAllOrders, updateOrderStatus } from "../api/index";

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

const STATUS_STYLE = {
  pending: { bg: "#FFF7E6", color: "#D46B08", border: "#FFD591" },
  confirmed: { bg: "#E6F7FF", color: "#096DD9", border: "#91D5FF" },
  shipped: { bg: "#F9F0FF", color: "#722ED1", border: "#D3ADF7" },
  delivered: { bg: "#F6FFED", color: "#389E0D", border: "#B7EB8F" },
  canceled: { bg: "#FFF1F0", color: "#CF1322", border: "#FFA39E" },
  "return-request": { bg: "#FFFBE6", color: "#D48806", border: "#FFE58F" },
  accepted: { bg: "#F6FFED", color: "#237804", border: "#95DE64" },
  rejected: { bg: "#FFF1F0", color: "#A8071A", border: "#FFA39E" },
  paid: { bg: "#F6FFED", color: "#389E0D", border: "#B7EB8F" },
  unpaid: { bg: "#FFF7E6", color: "#D46B08", border: "#FFD591" },
};

/** Nhãn bước tiếp theo trong Select (giữ nguyên value gửi API). */
const labelForNextStatus = (fromNormalized, toValue) => {
  if (fromNormalized === "delivered" && toValue === "return-request") {
    return "Giao hàng thành công";
  }
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

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", page, limit],
    queryFn: () => getAllOrders(page, limit),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const totalOrdersInDb = data?.total ?? 0;

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateOrderStatus(id, body),
    onSuccess: () => {
      message.success("Cập nhật trạng thái thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (err) => {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || "Lỗi cập nhật";
      message.error(status ? `(${status}) ${msg}` : msg);
    },
  });

  const rawOrders = data?.data || [];
  const orders =
    mode === "returns"
      ? rawOrders.filter((o) =>
          ["return-request", "accepted", "rejected"].includes(o.status),
        )
      : rawOrders;
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

      return byKeyword && byPaymentStatus && byStatus && byMethod;
    });
  }, [orders, keyword, paymentFilter, statusFilter, methodFilter]);
  const allowedNext = (current) => TRANSITIONS[current] || [];

  /** Mỗi dòng = một sản phẩm trong đơn (tách dòng). */
  const tableRows = useMemo(() => {
    const rows = [];
    filteredOrders.forEach((order) => {
      const products = Array.isArray(order.products) ? order.products : [];
      if (products.length === 0) {
        rows.push({
          key: `order-empty-${order._id}`,
          order,
          line: null,
          lineIndex: 0,
        });
        return;
      }
      products.forEach((line, lineIndex) => {
        rows.push({
          key: `${order._id}-line-${lineIndex}-${String(line?.sku ?? "")}`,
          order,
          line,
          lineIndex,
        });
      });
    });
    return rows;
  }, [filteredOrders]);

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
      width: "7%",
      render: (_, record) => {
        const id = record.order?._id;
        return (
          <span style={{ fontWeight: 700, color: "#1F2937" }}>
            {id ? `#${String(id).slice(-8).toUpperCase()}` : "-"}
          </span>
        );
      },
    },
    {
      title: "Sản phẩm",
      key: "product",
      width: "28%",
      render: (_, record) => {
        const p = record.line;
        if (!p) {
          return (
            <span style={{ color: "#9CA3AF", fontSize: 12 }}>Không có dòng sản phẩm</span>
          );
        }
        const name = p?.productId?.name || p?.name || "—";
        const sub = formatLineLabel(p);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 600, color: "#111827", lineHeight: 1.35 }}>{name}</span>
            {sub ? (
              <span style={{ fontSize: 12, color: "#6B7280" }}>{sub}</span>
            ) : null}
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>
              SKU: {p?.sku || "—"} · SL: {p?.quantity ?? 0}
            </span>
          </div>
        );
      },
    },
    {
      title: "Khách hàng",
      key: "customer",
      width: "15%",
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
      title: (
        <span title="Thành tiền từng dòng sản phẩm (đơn giá × SL), không phải tổng cả đơn">
          Tổng đơn
        </span>
      ),
      key: "lineTotalAsOrderSplit",
      width: "8%",
      align: "right",
      render: (_, record) => {
        const p = record.line;
        if (!p) return "—";
        const t = Number(p.price || 0) * Number(p.quantity || 0);
        return (
          <span style={{ fontWeight: 700, color: "#0F766E" }}>
            {Number(t).toLocaleString("vi-VN")}đ
          </span>
        );
      },
    },
    {
      title: "Thanh toán",
      key: "payment",
      width: "6%",
      render: (_, record) => {
        const pm = paymentMethodLabel(record.order?.paymentMethod);
        return <StatusBadge status={pm.status} label={pm.label} />;
      },
    },
    {
      title: "TT tiền",
      key: "paymentStatus",
      width: "9%",
      render: (_, record) => {
        const paymentStatus = record.order?.paymentStatus;
        const normalized =
          typeof paymentStatus === "string"
            ? paymentStatus.trim().toLowerCase()
            : "";
        const isPaid = normalized === "paid";
        return <StatusBadge status={isPaid ? "paid" : "unpaid"} label={isPaid ? "Đã trả tiền" : "Chưa trả tiền"} />;
      },
    },
    {
      title: "Trạng thái đơn",
      key: "status",
      width: "14%",
      render: (_, record) => {
        const order = record.order;
        const status = order?.status;
        const normalized =
          typeof status === "string" ? status.trim().toLowerCase() : status;
        const next = allowedNext(normalized);
        if (next.length === 0) {
          return (
            <StatusBadge
              status={normalized}
              label={
                STATUS_OPTIONS.find((o) => o.value === normalized)?.label ||
                status
              }
            />
          );
        }
        return (
          <Select
            size="small"
            value={normalized}
            style={{ width: "100%", maxWidth: "100%" }}
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
                message.error("Đơn hàng không hợp lệ (thiếu ID).");
                return;
              }
              updateMutation.mutate({
                id: orderId,
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
    {
      title: "Ngày đặt",
      key: "createdAt",
      width: "7%",
      render: (_, record) => {
        const v = record.order?.createdAt;
        return v ? new Date(v).toLocaleDateString("vi-VN") : "-";
      },
    },
    {
      title: "Chi tiết",
      key: "detail",
      width: "6%",
      render: (_, record) => (
        <Link to={`/admin/orders/${record.order?._id || ""}`}>
          <Button size="small">Xem</Button>
        </Link>
      ),
    },
  ];

  return (
    <div style={{ padding: "12px 16px 20px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <style>{`
        .admin-order-table-wrap {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }
        .admin-order-table .ant-table-wrapper,
        .admin-order-table .ant-spin-nested-loading,
        .admin-order-table .ant-spin-container,
        .admin-order-table .ant-table,
        .admin-order-table .ant-table-container {
          width: 100% !important;
        }
        .admin-order-table table {
          table-layout: fixed !important;
          width: 100% !important;
        }
        .admin-order-table .ant-table-cell {
          word-break: break-word;
          overflow-wrap: anywhere;
          vertical-align: top;
          font-size: 13px;
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
          padding: 8px 10px !important;
        }
        .admin-order-table .ant-table-tbody > tr > td {
          padding: 8px 10px !important;
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
            { value: "all", label: "Tất cả trạng thái đơn" },
            ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
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
        <Button
          size="small"
          onClick={() => {
            setKeyword("");
            setStatusFilter("all");
            setMethodFilter("all");
            setPaymentFilter("all");
          }}
        >
          Xóa lọc
        </Button>
        <span style={{ fontSize: 12, color: "#888", marginLeft: "auto", whiteSpace: "nowrap" }}>
          {filteredOrders.length} đơn · {tableRows.length} dòng
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
          tableLayout="fixed"
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
          {tableRows.length} dòng / {filteredOrders.length} đơn (đã lọc)
        </span>
        <Pagination
          current={page + 1}
          total={totalOrdersInDb}
          pageSize={limit}
          onChange={(p) => setPage(p - 1)}
          showSizeChanger={false}
          showTotal={(t) => `Tổng ${t} đơn trong hệ thống`}
        />
      </div>
    </div>
  );
}
