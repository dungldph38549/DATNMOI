  import React from "react";
import { Table, Button, Space, message, Popconfirm, Input, Select } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminListBankPendingTopups,
  adminConfirmBankTopup,
  adminRejectBankTopup,
} from "../api/index";

const WalletTopups = () => {
  const queryClient = useQueryClient();
  const [rejectNote, setRejectNote] = React.useState({});
  const [statusFilter, setStatusFilter] = React.useState("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-wallet-bank-pending"],
    queryFn: adminListBankPendingTopups,
  });

  const confirmMut = useMutation({
    mutationFn: adminConfirmBankTopup,
    onSuccess: () => {
      message.success("Đã cộng ví cho khách");
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-bank-pending"] });
    },
    onError: (e) =>
      message.error(e?.response?.data?.message || "Thất bại"),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, note }) => adminRejectBankTopup(id, note),
    onSuccess: () => {
      message.info("Đã từ chối yêu cầu");
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-bank-pending"] });
    },
    onError: (e) =>
      message.error(e?.response?.data?.message || "Thất bại"),
  });

  const rows = data?.data || [];
  const filteredRows = React.useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [rows, statusFilter]);

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
      render: (v) => `${Number(v || 0).toLocaleString("vi-VN")}đ`,
    },
    {
      title: "Nội dung CK",
      dataIndex: "referenceCode",
      render: (v) => (
        <code style={{ fontSize: 12, background: "#f1f5f9", padding: "2px 6px" }}>
          {v}
        </code>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (s) => {
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
        };
        const item = map[s];
        const text = item?.text || s;
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 10px",
              borderRadius: 999,
              border: `1px solid ${item?.border || "#d9d9d9"}`,
              background: item?.bg || "#fafafa",
              color: item?.textColor || "#475569",
              fontWeight: 600,
              fontSize: 12,
              lineHeight: "18px",
              whiteSpace: "nowrap",
            }}
          >
            {text}
          </span>
        );
      },
    },
    {
      title: "Tạo lúc",
      dataIndex: "createdAt",
      render: (d) =>
        d ? new Date(d).toLocaleString("vi-VN") : "—",
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Button
            type="primary"
            size="small"
            disabled={r.status !== "awaiting_admin"}
            loading={confirmMut.isPending}
            onClick={() => confirmMut.mutate(r._id)}
          >
            Xác nhận &amp; cộng ví
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
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0, fontWeight: 800 }}>Nạp ví — chuyển khoản</h2>
        <Button onClick={() => refetch()}>Làm mới</Button>
      </div>
      <p style={{ color: "#64748b", marginBottom: 16, fontSize: 13 }}>
        Hiển thị tất cả yêu cầu nạp CK (mọi trạng thái), mới nhất ở trên cùng.{" "}
        Chỉ dòng <code>awaiting_admin</code> có thể xác nhận cộng ví; từ chối áp dụng cho{" "}
        <code>awaiting_transfer</code> hoặc <code>awaiting_admin</code>.
      </p>
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
          onClick={() => {
            setStatusFilter("all");
          }}
        >
          Xóa lọc
        </Button>
      </div>
      <Table
        rowKey="_id"
        loading={isLoading}
        columns={columns}
        dataSource={filteredRows}
        pagination={{ pageSize: 15 }}
      />
    </div>
  );
};

export default WalletTopups;
