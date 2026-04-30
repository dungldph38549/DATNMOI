import React from "react";
import { Table, Button } from "antd";
import { useQuery } from "@tanstack/react-query";
import { adminListWalletTransactions } from "../api/index";

const QUERY_KEY = ["admin-wallet-return-refunds"];

const typeStyle = () => ({
  text: "Hoàn tiền hoàn hàng",
  textColor: "#1677ff",
  bg: "#e6f4ff",
  border: "#91caff",
});

const WalletTopups = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const txRes = await adminListWalletTransactions(1, 200);
      const tx = Array.isArray(txRes?.data) ? txRes.data : [];
      return tx.filter((row) => row?.type === "return_refund");
    },
  });

  const rows = React.useMemo(() => {
    return (Array.isArray(data) ? data : []).map((row) => ({
      ...row,
      _rowId: `tx-${row._id}`,
    }));
  }, [data]);

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
      title: "Loại giao dịch",
      dataIndex: "type",
      width: 220,
      render: () => {
        const item = typeStyle();
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
      title: "Nội dung",
      key: "note",
      render: (_, r) => (
        <code style={{ fontSize: 12, background: "#f1f5f9", padding: "2px 6px" }}>
          {r?.note
            || (r?.orderId?._id ? `Order #${String(r.orderId._id).slice(-6).toUpperCase()}` : "—")}
        </code>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      width: 180,
      render: (d) => (d ? new Date(d).toLocaleString("vi-VN") : "—"),
    },
    {
      title: "Kết quả",
      key: "result",
      width: 160,
      render: () => (
        <span style={{ color: "#64748b", fontSize: 12 }}>Đã cộng ví</span>
      ),
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
            Hoàn tiền hoàn hàng vào ví
          </h2>
          <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: 13 }}>
            Chỉ hiển thị các lần admin chấp nhận hoàn hàng và tiền được cộng vào ví khách.
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
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
            Tổng giao dịch hoàn hàng
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
            {rows.length}
          </div>
        </div>
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
          rowKey="_rowId"
          loading={isLoading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 15 }}
          scroll={{ x: 1100 }}
        />
      </div>
    </div>
  );
};

export default WalletTopups;
