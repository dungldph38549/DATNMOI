import React, { useMemo, useState } from "react";
import { Table, Select, Button, message, Input } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllOrders,
  updateOrderStatus,
  acceptReturn,
  rejectReturn,
} from "../api/index";

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

  const acceptReturnMutation = useMutation({
    mutationFn: (id) => acceptReturn(id),
    onSuccess: () => {
      message.success("Đã chấp nhận hoàn hàng");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Lỗi");
    },
  });

  const rejectReturnMutation = useMutation({
    mutationFn: (id) => rejectReturn(id),
    onSuccess: () => {
      message.success("Đã từ chối hoàn hàng");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Lỗi");
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

  const columns = [
    {
      title: "Mã đơn",
      dataIndex: "_id",
      key: "_id",
      width: 120,
      render: (id) => (
        <span style={{ fontWeight: 700, color: "#1F2937" }}>
          {id ? `#${String(id).slice(-8).toUpperCase()}` : "-"}
        </span>
      ),
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, record) => {
        const name = record.fullName || record.userId?.name || "-";
        const email = record.email || "";
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
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 120,
      render: (v) => (
        <span style={{ fontWeight: 700, color: "#0F766E" }}>
          {v != null ? `${Number(v).toLocaleString()}đ` : "-"}
        </span>
      ),
    },
    {
      title: "Thanh toán",
      key: "payment",
      width: 100,
      render: (_, record) => (
        <StatusBadge
          status={record.paymentMethod === "vnpay" ? "confirmed" : "pending"}
          label={record.paymentMethod === "vnpay" ? "VNPay" : "COD"}
        />
      ),
    },
    {
      title: "Trạng thái TT",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      width: 140,
      render: (paymentStatus) => {
        const normalized =
          typeof paymentStatus === "string"
            ? paymentStatus.trim().toLowerCase()
            : "";
        const isPaid = normalized === "paid";
        return <StatusBadge status={isPaid ? "paid" : "unpaid"} label={isPaid ? "Đã trả tiền" : "Chưa trả tiền"} />;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 180,
      render: (status, record) => {
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
            style={{ width: 160 }}
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
                record?._id?.$oid || record?._id || record?.id || "",
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
                    createdAt: record?.createdAt || null,
                    totalAmount: record?.totalAmount ?? null,
                    fullName: record?.fullName || record?.userId?.name || "",
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
      dataIndex: "createdAt",
      key: "createdAt",
      width: 110,
      render: (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : "-"),
    },
    {
      title: "Hoàn hàng",
      key: "return",
      width: 140,
      render: (_, record) => {
        if (record.status !== "return-request") return null;
        return (
          <div style={{ display: "flex", gap: 4 }}>
            <Button
              type="primary"
              size="small"
              onClick={() => acceptReturnMutation.mutate(record._id)}
              loading={acceptReturnMutation.isPending}
            >
              Chấp nhận
            </Button>
            <Button
              size="small"
              danger
              onClick={() => rejectReturnMutation.mutate(record._id)}
              loading={rejectReturnMutation.isPending}
            >
              Từ chối
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <style>{`
        .admin-order-table .ant-table {
          border: 1px solid #F0F2F5;
          border-radius: 14px;
          overflow: hidden;
        }
        .admin-order-table .ant-table-thead > tr > th {
          background: #FAFAFA !important;
          font-weight: 700;
          color: #374151;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .02em;
        }
        .admin-order-table .ant-table-tbody > tr > td {
          padding-top: 12px;
          padding-bottom: 12px;
        }
        .admin-order-table .ant-table-tbody > tr:hover > td {
          background: #FFFDF7 !important;
        }
      `}</style>
      <h2 style={{ marginBottom: 16 }}>Quản lý đơn hàng</h2>
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          background: "#fff",
          padding: 12,
          borderRadius: 10,
          border: "1px solid #f0f0f0",
          boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
        }}
      >
        <Input
          allowClear
          placeholder="Tìm mã đơn / khách hàng / email / SĐT"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 280 }}
        />
        <Select
          size="small"
          value={statusFilter}
          style={{ width: 180 }}
          options={[
            { value: "all", label: "Tất cả trạng thái đơn" },
            ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
          ]}
          onChange={setStatusFilter}
        />
        <Select
          size="small"
          value={methodFilter}
          style={{ width: 170 }}
          options={[
            { value: "all", label: "Tất cả phương thức" },
            { value: "vnpay", label: "VNPay" },
            { value: "cod", label: "COD" },
          ]}
          onChange={setMethodFilter}
        />
        <Select
          size="small"
          value={paymentFilter}
          style={{ width: 170 }}
          options={[
            { value: "all", label: "Tất cả TT" },
            { value: "paid", label: "Đã trả tiền" },
            { value: "unpaid", label: "Chưa trả tiền" },
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
          Xóa bộ lọc
        </Button>
        <span style={{ fontSize: 12, color: "#999" }}>
          Hiển thị: {filteredOrders.length} đơn
        </span>
      </div>
      {mode === "returns" && (
        <p style={{ marginBottom: 16, color: "#666" }}>
          Đang hiển thị các đơn liên quan hoàn hàng.
        </p>
      )}
      <Table
        className="admin-order-table"
        rowKey="_id"
        loading={isLoading}
        dataSource={filteredOrders}
        columns={columns}
        scroll={{ x: 1180 }}
        size="middle"
        pagination={{
          current: page + 1,
          total: filteredOrders.length,
          pageSize: limit,
          onChange: (p) => setPage(p - 1),
          showSizeChanger: false,
          showTotal: (t, range) => `${range[0]}-${range[1]} / ${t} đơn`,
        }}
      />
    </div>
  );
}
