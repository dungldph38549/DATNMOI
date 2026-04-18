  import React from "react";
import { Table, Button, Space, message, Popconfirm, Input } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminListBankPendingTopups,
  adminConfirmBankTopup,
  adminRejectBankTopup,
} from "../api/index";

const WalletTopups = () => {
  const queryClient = useQueryClient();
  const [rejectNote, setRejectNote] = React.useState({});

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
          awaiting_transfer: "Chờ khách xác nhận",
          awaiting_admin: "Chờ xử lý (cũ)",
        };
        return map[s] || s;
      },
    },
    {
      title: "Tạo lúc",
      dataIndex: "createdAt",
      render: (d) =>
        d ? new Date(d).toLocaleString("vi-VN") : "—",
    },
    {
      title: "",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Button
            type="primary"
            size="small"
            loading={confirmMut.isPending}
            onClick={() => confirmMut.mutate(r._id)}
          >
            Xác nhận &amp; cộng ví
          </Button>
          <Popconfirm
            title="Từ chối yêu cầu này?"
            onConfirm={() =>
              rejectMut.mutate({
                id: r._id,
                note: rejectNote[r._id] || "",
              })
            }
            okText="Từ chối"
            cancelText="Hủy"
          >
            <Button danger size="small" loading={rejectMut.isPending}>
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
        Khách tự cộng ví ngay khi bấm xác nhận trên trang cá nhân. Trang này chỉ còn các yêu cầu CK{" "}
        <strong>đã tạo mã nhưng chưa bấm xác nhận</strong>, hoặc bản ghi <code>awaiting_admin</code> cũ — có thể xác nhận / từ chối thủ công nếu cần.
      </p>
      <Table
        rowKey="_id"
        loading={isLoading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 15 }}
      />
    </div>
  );
};

export default WalletTopups;
