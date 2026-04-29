import React from "react";
import { Table, Button, Select } from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  adminListTopupTransactions,
  adminListWalletTransactions,
} from "../api/index";

const QUERY_KEY = ["admin-wallet-transactions"];
const typeStyle = (type) => {
  const map = {
    topup_vnpay: {
      text: "Nạp tiền VNPay",
      textColor: "#389e0d",
      bg: "#f6ffed",
      border: "#95de64",
    },
    return_refund: {
      text: "Hoàn hàng / hoàn tiền",
      textColor: "#1677ff",
      bg: "#e6f4ff",
      border: "#91caff",
    },
    order_cancel_refund: {
      text: "Hoàn ví do hủy đơn",
      textColor: "#1677ff",
      bg: "#e6f4ff",
      border: "#91caff",
    },
    order_line_cancel_refund: {
      text: "Hoàn ví do hủy dòng đơn",
      textColor: "#1677ff",
      bg: "#e6f4ff",
      border: "#91caff",
    },
  };
  return map[type] || { text: type || "—", textColor: "#475569", bg: "#fafafa", border: "#d9d9d9" };
};

const WalletTopups = () => {
  const [typeFilter, setTypeFilter] = React.useState("all");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const [topupsRes, txRes] = await Promise.all([
        adminListTopupTransactions(1, 100),
        adminListWalletTransactions(1, 100),
      ]);
      return {
        topups: Array.isArray(topupsRes?.data) ? topupsRes.data : [],
        tx: Array.isArray(txRes?.data) ? txRes.data : [],
      };
    },
  });

  const allRows = React.useMemo(() => {
    const txRows = (Array.isArray(data?.tx) ? data.tx : []).map((row) => ({
      ...row,
      _rowId: `tx-${row._id}`,
      _source: "tx",
    }));
    const txTopupIds = new Set(
      txRows
        .map((row) => row?.topUpId)
        .filter(Boolean)
        .map((id) => String(id)),
    );
    const topupRows = (Array.isArray(data?.topups) ? data.topups : [])
      .filter((row) => row?.method === "vnpay")
      .filter((row) => {
        const topupId = String(row?._id || "");
        // Nếu đã có bản ghi WalletTransaction cho topup này thì ưu tiên bản ghi tx để tránh trùng.
        return !txTopupIds.has(topupId);
      })
      .map((row) => ({
        ...row,
        _rowId: `topup-${row._id}`,
        _source: "topup",
        type: "topup_vnpay",
        note: row?.status === "completed" ? "Nạp tiền VNPay" : "Yêu cầu nạp VNPay",
      }));
    const list = [...txRows, ...topupRows].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );
    return list;
  }, [data?.tx, data?.topups]);

  const filteredRows = React.useMemo(() => {
    return allRows.filter((row) => {
      const matchType = typeFilter === "all" || row.type === typeFilter;
      return matchType;
    });
  }, [allRows, typeFilter]);

  const stats = React.useMemo(() => {
    const topupCount = allRows.filter((r) => r.type === "topup_vnpay").length;
    const refundCount = allRows.filter((r) =>
      ["return_refund", "order_cancel_refund", "order_line_cancel_refund"].includes(r.type),
    ).length;
    const pendingCount = allRows.filter(
      (r) => r._source === "topup" && r.status !== "completed",
    ).length;
    return {
      total: allRows.length,
      topupCount,
      refundCount,
      pendingCount,
    };
  }, [allRows]);

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
      render: (type) => {
        const item = typeStyle(type);
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
      render: (_, r) => (
        <span style={{ color: "#64748b", fontSize: 12 }}>
          {r?._source === "topup" ? (r?.status === "completed" ? "Đã cộng ví" : "Đang xử lý") : "Đã cộng ví"}
        </span>
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
            Lịch sử giao dịch ví
          </h2>
          <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: 13 }}>
            Bao gồm nạp VNPay và các giao dịch hoàn tiền/hoàn hàng.
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
        {[
          { label: "Tổng giao dịch", value: stats.total },
          { label: "Nạp VNPay", value: stats.topupCount },
          { label: "Hoàn tiền/hoàn hàng", value: stats.refundCount },
          { label: "Đang xử lý", value: stats.pendingCount },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              padding: "12px 14px",
            }}
          >
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
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
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Loại giao dịch</div>
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: "Tất cả giao dịch" },
              { value: "topup_vnpay", label: "Nạp VNPay" },
              { value: "return_refund", label: "Hoàn hàng/hoàn tiền" },
              { value: "order_cancel_refund", label: "Hoàn ví do hủy đơn" },
              { value: "order_line_cancel_refund", label: "Hoàn ví do hủy dòng đơn" },
            ]}
          />
        </div>
        <Button
          type="default"
          onClick={() => {
            setTypeFilter("all");
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
          rowKey="_rowId"
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
