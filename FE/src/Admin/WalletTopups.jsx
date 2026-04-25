import React from "react";
import { Table, Button, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import { adminListTopupTransactions } from "../api/index";

const formatMoney = (v) => `${Number(v || 0).toLocaleString("vi-VN")}đ`;

const shortId = (v) => String(v || "").slice(-8).toUpperCase();

const txTypeLabel = (type) => {
  switch (type) {
    case "topup_vnpay":
      return "Nạp ví qua VNPay";
    case "topup_bank":
      return "Nạp ví chuyển khoản";
    case "order_payment":
      return "Thanh toán đơn hàng";
    case "order_cancel_refund":
      return "Hoàn ví do hủy đơn";
    case "order_line_cancel_refund":
      return "Hoàn ví do hủy dòng hàng";
    case "return_refund":
      return "Hoàn tiền hoàn hàng";
    default:
      return "Giao dịch ví";
  }
};

const methodLabel = (row) => {
  const method = row?.topUpId?.method;
  if (method === "vnpay") return "VNPay";
  if (method === "bank_transfer") return "Chuyển khoản";
  if (row?.type === "order_payment") {
    const paymentMethod = String(row?.orderId?.paymentMethod || "").toLowerCase();
    if (paymentMethod === "wallet") return "Thanh toán bằng ví";
    if (paymentMethod === "vnpay") return "Thanh toán VNPay";
    if (paymentMethod === "cod") return "Thanh toán COD";
  }
  return "Hệ thống ví";
};

const purposeLabel = (row) => {
  const oid = row?.orderId?._id || row?.orderId;
  if (row?.type === "order_payment" && oid) {
    return `Thanh toán cho đơn #${shortId(oid)}`;
  }
  if (
    (row?.type === "order_cancel_refund" ||
      row?.type === "order_line_cancel_refund" ||
      row?.type === "return_refund") &&
    oid
  ) {
    return `Hoàn tiền liên quan đơn #${shortId(oid)}`;
  }
  if (row?.type === "topup_vnpay" || row?.type === "topup_bank") {
    return "Cộng số dư ví người dùng";
  }
  return row?.note || "Giao dịch ví";
};

const WalletTopups = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-wallet-topup-transactions"],
    queryFn: () => adminListTopupTransactions(1, 100),
  });

  const rows = data?.data || [];

  const columns = [
    {
      title: "Khách",
      key: "user",
      render: (_, r) => {
        const u = r.userId;
        if (u && typeof u === "object") {
          return (
            <div>
              <div style={{ fontWeight: 700 }}>{u.name || "—"}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{u.email}</div>
            </div>
          );
        }
        return String(r.userId || "—");
      },
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      width: 140,
      render: (v) => <span style={{ fontWeight: 700 }}>{formatMoney(v)}</span>,
    },
    {
      title: "Loại giao dịch",
      dataIndex: "type",
      width: 190,
      render: (v) => {
        const color =
          v === "order_payment" ? "volcano" : v?.includes("refund") ? "green" : "gold";
        return <Tag color={color}>{txTypeLabel(v)}</Tag>;
      },
    },
    {
      title: "Phương thức",
      width: 170,
      render: (_, r) => methodLabel(r),
    },
    {
      title: "Mục đích / Thanh toán cho",
      key: "purpose",
      render: (_, r) => (
        <div style={{ lineHeight: 1.35 }}>
          <div style={{ fontWeight: 600, color: "#0f172a" }}>{purposeLabel(r)}</div>
          {r?.orderId?._id ? (
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Trạng thái đơn: {r?.orderId?.status || "—"}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Nội dung CK",
      key: "referenceCode",
      render: (_, r) => (
        <code style={{ fontSize: 12, background: "#f1f5f9", padding: "2px 6px" }}>
          {r?.topUpId?.referenceCode || "—"}
        </code>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 130,
      render: (_, r) => {
        const status = r?.topUpId?.status;
        if (!status || status === "completed") return <Tag color="green">Thành công</Tag>;
        if (status === "pending" || status === "awaiting_admin") {
          return <Tag color="orange">Đang xử lý</Tag>;
        }
        return <Tag color="red">{status}</Tag>;
      },
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      width: 180,
      render: (d) => (d ? new Date(d).toLocaleString("vi-VN") : "—"),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>Lịch sử giao dịch ví</h2>
          <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: 13 }}>
            Hiển thị cả nạp ví, thanh toán đơn bằng ví và các giao dịch hoàn tiền.
          </p>
        </div>
        <Button onClick={() => refetch()} type="primary">
          Làm mới
        </Button>
      </div>
      {isError ? (
        <p style={{ color: "#dc2626", marginBottom: 12, fontSize: 13 }}>
          Không tải được giao dịch nạp ví: {error?.response?.data?.message || error?.message || "Lỗi không xác định"}.
        </p>
      ) : null}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
          overflow: "hidden",
        }}
      >
        <Table
          rowKey="_id"
          loading={isLoading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 15 }}
          scroll={{ x: 1200 }}
        />
      </div>
    </div>
  );
};

export default WalletTopups;
