import React from "react";
import { Table, Button, Space, message, Popconfirm, Input, Select } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminListTopupTransactions,
  adminConfirmBankTopup,
  adminRejectBankTopup,
} from "../api/index";

const QUERY_KEY = ["admin-wallet-bank-topups"];
const getTopupCode = (row) => {
  const rawId = row?._id ? String(row._id) : "";
  if (!rawId) return "—";
  return `TOPUP-${rawId.slice(-8).toUpperCase()}`;
};

const statusStyle = (s) => {
  const map = {
    awaiting_transfer: {
      text: "Chờ khách bấm đã chuyển khoản",
      textColor: "#475569",
      bg: "#f8fafc",
      border: "#cbd5e1",
    },
    awaiting_admin: {
      text: "Chờ admin xác nhận",
      textColor: "#1677ff",
      bg: "#e6f4ff",
      border: "#91caff",
    },
    completed: {
      text: "Đã cộng ví",
      textColor: "#389e0d",
      bg: "#f6ffed",
      border: "#95de64",
    },
    rejected: {
      text: "Đã từ chối",
      textColor: "#cf1322",
      bg: "#fff1f0",
      border: "#ffa39e",
    },
    failed: {
      text: "Thất bại",
      textColor: "#d4380d",
      bg: "#fff2e8",
      border: "#ffbb96",
    },
    cancelled: {
      text: "Đã hủy",
      textColor: "#d48806",
      bg: "#fffbe6",
      border: "#ffe58f",
    },
    pending: {
      text: "Đang xử lý",
      textColor: "#475569",
      bg: "#f1f5f9",
      border: "#cbd5e1",
    },
  };
  return map[s] || { text: s || "—", textColor: "#475569", bg: "#fafafa", border: "#d9d9d9" };
};

const WalletTopups = () => {
  const queryClient = useQueryClient();
  const [rejectNote, setRejectNote] = React.useState({});
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [methodFilter, setMethodFilter] = React.useState("all");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => adminListTopupTransactions(1, 100),
  });

  const confirmMut = useMutation({
    mutationFn: adminConfirmBankTopup,
    onSuccess: () => {
      message.success("Đã cộng ví cho khách");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (e) => message.error(e?.response?.data?.message || "Thất bại"),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, note }) => adminRejectBankTopup(id, note),
    onSuccess: () => {
      message.info("Đã từ chối yêu cầu");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (e) => message.error(e?.response?.data?.message || "Thất bại"),
  });

  const filteredRows = React.useMemo(() => {
    const list = Array.isArray(data?.data) ? data.data : [];
    return list.filter((row) => {
      const matchStatus = statusFilter === "all" || row.status === statusFilter;
      const matchMethod = methodFilter === "all" || row.method === methodFilter;
      return matchStatus && matchMethod;
    });
  }, [data?.data, statusFilter, methodFilter]);

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
      title: "Phương thức",
      dataIndex: "method",
      width: 150,
      render: (m) => {
        const isVnpay = m === "vnpay";
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 10px",
              borderRadius: 999,
              border: `1px solid ${isVnpay ? "#b7eb8f" : "#cbd5e1"}`,
              background: isVnpay ? "#f6ffed" : "#f8fafc",
              color: isVnpay ? "#389e0d" : "#334155",
              fontWeight: 600,
              fontSize: 12,
              lineHeight: "18px",
              whiteSpace: "nowrap",
            }}
          >
            {isVnpay ? "VNPay" : "Chuyển khoản"}
          </span>
        );
      },
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      width: 140,
      render: (v) => (
        <span style={{ fontWeight: 700 }}>
          {`${Number(v || 0).toLocaleString("vi-VN")}đ`}
        </span>
      ),
    },
    {
      title: "Nội dung CK",
      key: "referenceCode",
      render: (_, r) => (
        <code style={{ fontSize: 12, background: "#f1f5f9", padding: "2px 6px" }}>
          {r?.method === "bank_transfer"
            ? (r?.referenceCode || "—")
            : getTopupCode(r)}
        </code>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 200,
      render: (s) => {
        const item = statusStyle(s);
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 10px",
              borderRadius: 999,
              border: `1px solid ${item.border}`,
              background: item.bg,
              color: item.textColor,
              fontWeight: 600,
              fontSize: 12,
              lineHeight: "18px",
              whiteSpace: "nowrap",
            }}
          >
            {item.text}
          </span>
        );
      },
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      width: 180,
      render: (d) => (d ? new Date(d).toLocaleString("vi-VN") : "—"),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 360,
      render: (_, r) => {
        if (r.method !== "bank_transfer") {
          return <span style={{ color: "#64748b", fontSize: 12 }}>Nạp VNPay tự động, không cần duyệt tay</span>;
        }
        return (
          <Space wrap>
            <Button
              type="primary"
              size="small"
              disabled={r.status !== "awaiting_admin"}
              loading={confirmMut.isPending}
              onClick={() => confirmMut.mutate(r._id)}
            >
              Xác nhận & cộng ví
            </Button>
            <Popconfirm
              title="Từ chối yêu cầu này?"
              disabled={!["awaiting_transfer", "awaiting_admin"].includes(r.status)}
              onConfirm={() =>
                rejectMut.mutate({
                  id: r._id,
                  note: rejectNote[r._id] || "",
                })
              }
              okText="Từ chối"
              cancelText="Hủy"
            >
              <Button
                danger
                size="small"
                disabled={!["awaiting_transfer", "awaiting_admin"].includes(r.status)}
                loading={rejectMut.isPending}
              >
                Từ chối
              </Button>
            </Popconfirm>
            <Input
              size="small"
              placeholder="Ghi chú từ chối"
              style={{ width: 140 }}
              value={rejectNote[r._id] || ""}
              onChange={(e) =>
                setRejectNote((prev) => ({ ...prev, [r._id]: e.target.value }))
              }
            />
          </Space>
        );
      },
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
          <h2 style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>
            Giao dịch nạp ví
          </h2>
          <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: 13 }}>
            Hiển thị cả nạp VNPay và chuyển khoản; chỉ yêu cầu chuyển khoản trạng thái{" "}
            <code style={{ fontSize: 12 }}>awaiting_admin</code> mới xác nhận cộng ví được.
          </p>
        </div>
        <Button onClick={() => refetch()} type="primary">
          Làm mới
        </Button>
      </div>
      {isError ? (
        <p style={{ color: "#dc2626", marginBottom: 12, fontSize: 13 }}>
          Không tải được dữ liệu:{" "}
          {error?.response?.data?.message || error?.message || "Lỗi không xác định"}.
        </p>
      ) : null}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "end",
        }}
      >
        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Phương thức</div>
          <Select
            value={methodFilter}
            onChange={setMethodFilter}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: "Tất cả phương thức" },
              { value: "vnpay", label: "VNPay" },
              { value: "bank_transfer", label: "Chuyển khoản" },
            ]}
          />
        </div>
        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Trạng thái</div>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "awaiting_transfer", label: "Chờ khách bấm đã chuyển khoản" },
              { value: "awaiting_admin", label: "Chờ admin xác nhận" },
              { value: "completed", label: "Đã cộng ví" },
              { value: "rejected", label: "Đã từ chối" },
              { value: "failed", label: "Thất bại" },
              { value: "cancelled", label: "Đã hủy" },
            ]}
          />
        </div>
        <Button
          type="default"
          onClick={() => {
            setStatusFilter("all");
            setMethodFilter("all");
          }}
        >
          Xóa lọc
        </Button>
      </div>
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
          dataSource={filteredRows}
          pagination={{ pageSize: 15 }}
          scroll={{ x: 1100 }}
        />
      </div>
    </div>
  );
};

export default WalletTopups;
