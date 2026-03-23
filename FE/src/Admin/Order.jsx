import React, { useState } from "react";
import { Table, Select, Button, message } from "antd";
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

/** Nhãn bước tiếp theo trong Select (giữ nguyên value gửi API). */
const labelForNextStatus = (fromNormalized, toValue) => {
  if (fromNormalized === "delivered" && toValue === "return-request") {
    return "Giao hàng thành công";
  }
  return STATUS_OPTIONS.find((o) => o.value === toValue)?.label || toValue;
};

export default function Order({ mode = "all" }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [limit] = useState(10);

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
  const total = data?.total || 0;

  const allowedNext = (current) => TRANSITIONS[current] || [];

  const columns = [
    {
      title: "Mã đơn",
      dataIndex: "_id",
      key: "_id",
      width: 120,
      render: (id) => (id ? `#${String(id).slice(-8).toUpperCase()}` : "-"),
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, record) =>
        record.fullName || record.userId?.name || record.email || "-",
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 120,
      render: (v) => (v != null ? `${Number(v).toLocaleString()}đ` : "-"),
    },
    {
      title: "Thanh toán",
      key: "payment",
      width: 100,
      render: (_, record) =>
        record.paymentMethod === "vnpay" ? "VNPay" : "COD",
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
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 12,
                background: "#f0f0f0",
              }}
            >
              {STATUS_OPTIONS.find((o) => o.value === normalized)?.label ||
                status}
            </span>
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
      <h2 style={{ marginBottom: 16 }}>Quản lý đơn hàng</h2>
      {mode === "returns" && (
        <p style={{ marginBottom: 16, color: "#666" }}>
          Đang hiển thị các đơn liên quan hoàn hàng.
        </p>
      )}
      <Table
        rowKey="_id"
        loading={isLoading}
        dataSource={orders}
        columns={columns}
        pagination={{
          current: page + 1,
          total,
          pageSize: limit,
          onChange: (p) => setPage(p - 1),
        }}
      />
    </div>
  );
}
