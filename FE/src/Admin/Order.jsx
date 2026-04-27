import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Select,
  Button,
  Input,
  Pagination,
  Modal,
  DatePicker,
  Drawer,
  Badge,
} from "antd";
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  FilterOutlined,
  PrinterOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { getAllOrders, updateOrderStatus, cancelOrderLineByAdmin } from "../api/index";
import notify from "../utils/notify";
import { pickAdminCancelReason } from "../utils/shopeeNotify";

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
const FETCH_LIMIT = 300;
const ADMIN_ORDER_REFETCH_MS = 3000;
const RETURN_RELATED_STATUSES = ["return-request", "accepted", "rejected"];
const DATE_PRESETS = [
  { key: "today", label: "Hôm nay" },
  { key: "7d", label: "7 ngày qua" },
  { key: "30d", label: "30 ngày qua" },
  { key: "month", label: "Tháng này" },
  { key: "all", label: "Tất cả" },
];
const ORDER_SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "total_desc", label: "Tổng đơn: cao đến thấp" },
  { value: "total_asc", label: "Tổng đơn: thấp đến cao" },
];

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

/** Accent theo mẫu InventoryFlow / Logistics */
const ACCENT_ORANGE = "#F28B20";
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
const isLineActive = (p) => p && String(p.lineStatus || "active") !== "canceled";

const formatLineLabel = (p) => {
  if (!p) return "";
  const parts = [];
  const sizeVal =
    p.size && String(p.size).trim() && String(p.size).trim() !== "Mặc định"
      ? String(p.size).trim()
      : null;
  if (sizeVal) parts.push(`Size: ${sizeVal}`);

  let colorVal =
    p.color != null && String(p.color).trim() !== ""
      ? String(p.color).trim()
      : null;
  const attrs = p.attributes;
  if (!colorVal && attrs && typeof attrs === "object") {
    const entries =
      typeof attrs.entries === "function"
        ? Array.from(attrs.entries())
        : Object.entries(attrs);
    for (const [k, v] of entries) {
      const lk = String(k || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");
      if (
        (lk === "color" || lk === "mau") &&
        v != null &&
        String(v).trim() !== ""
      ) {
        colorVal = String(v).trim();
        break;
      }
    }
  }
  if (colorVal) parts.push(`Màu: ${colorVal}`);
  if (parts.length) return parts.join(" · ");

  if (!attrs || typeof attrs !== "object") return "";
  const attrParts = Object.entries(attrs)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `${String(k).trim()}: ${String(v).trim()}`);
  return attrParts.length ? attrParts.join(" · ") : "";
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

/** Nhóm trạng thái hiển thị kiểu dashboard vận hành (badge chữ HOA). */
const orderFlowBucket = (status) => {
  const s = String(status || "").trim().toLowerCase();
  if (s === "canceled")
    return { key: "canceled", label: "HỦY ĐƠN", bg: "#FFECEC", color: "#C41D3D", border: "#FFCCC7" };
  if (s === "shipped")
    return { key: "shipping", label: "VẬN CHUYỂN", bg: "#E6F4FF", color: "#0958D9", border: "#91CAFF" };
  if (s === "delivered" || s === "received")
    return { key: "done", label: "HOÀN TẤT", bg: "#F6FFED", color: "#237804", border: "#B7EB8F" };
  if (s === "pending" || s === "confirmed")
    return { key: "processing", label: "CẦN XỬ LÝ", bg: "#FFF7E6", color: "#D46B08", border: "#FFD591" };
  return {
    key: s,
    label: STATUS_OPTIONS.find((o) => o.value === s)?.label || status || "—",
    bg: "#F5F5F5",
    color: "#595959",
    border: "#D9D9D9",
  };
};

const FlowStatusBadge = ({ status }) => {
  const b = orderFlowBucket(status);
  return (
    <span
      style={{
        padding: "4px 12px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.02em",
        background: b.bg,
        color: b.color,
        border: `1px solid ${b.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {b.label}
    </span>
  );
};

const toInputDate = (date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const startOfLocalDay = (dateStr) => {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfLocalDay = (dateStr) => {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
};

const resolvePresetRange = (preset) => {
  const today = new Date();
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);

  if (preset === "today") {
    const x = toInputDate(end);
    return { startDate: x, endDate: x };
  }
  if (preset === "7d" || preset === "30d") {
    const days = preset === "7d" ? 6 : 29;
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    return { startDate: toInputDate(start), endDate: toInputDate(end) };
  }
  if (preset === "month") {
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return { startDate: toInputDate(start), endDate: toInputDate(end) };
  }
  return { startDate: "", endDate: "" };
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
  const [returnDetailOrder, setReturnDetailOrder] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const hasDateFilter = !!(startDate || endDate);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders-all", startDate, endDate],
    queryFn: async () => {
      const params = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const first = await getAllOrders(0, FETCH_LIMIT, params);
      const totalPage = Math.max(1, Number(first?.totalPage || 1));
      const all = [...(Array.isArray(first?.data) ? first.data : [])];
      if (totalPage > 1) {
        const rest = await Promise.all(
          Array.from({ length: totalPage - 1 }, (_, i) =>
            getAllOrders(i + 1, FETCH_LIMIT, params),
          ),
        );
        for (const res of rest) {
          const rows = Array.isArray(res?.data) ? res.data : [];
          all.push(...rows);
        }
      }
      return { orders: all };
    },
    refetchInterval: ADMIN_ORDER_REFETCH_MS,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
    staleTime: 1500,
  });

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

  const cancelLineMutation = useMutation({
    mutationFn: ({ orderId, lineIndex, cancelReason }) =>
      cancelOrderLineByAdmin(orderId, lineIndex, cancelReason),
    onSuccess: () => {
      notify.success("Đã hủy dòng sản phẩm.");
      queryClient.invalidateQueries({ queryKey: ["admin-orders-all"] });
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message || err?.message || "Không hủy được dòng hàng.";
      notify.error(msg);
    },
  });

  const orders = useMemo(() => {
    const rawOrders = Array.isArray(data?.orders) ? data.orders : [];
    const finishedStatuses = ["delivered", "received"];
    if (mode === "returns") {
      return rawOrders.filter((o) => RETURN_RELATED_STATUSES.includes(o.status));
    }
    if (mode === "completed") {
      return rawOrders.filter((o) => finishedStatuses.includes(o.status));
    }
    // mode === "all": hiển thị tất cả, kể cả đơn có yêu cầu hoàn hàng.
    return rawOrders;
  }, [data?.orders, mode]);
  const filteredOrders = useMemo(() => {
    const keywordNormalized = keyword.trim().toLowerCase();
    const filtered = orders.filter((o) => {
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
      const orderCreatedAt = o?.createdAt ? new Date(o.createdAt) : null;
      const byDateStart =
        !startDate ||
        (orderCreatedAt instanceof Date &&
          !Number.isNaN(orderCreatedAt.getTime()) &&
          orderCreatedAt >= startOfLocalDay(startDate));
      const byDateEnd =
        !endDate ||
        (orderCreatedAt instanceof Date &&
          !Number.isNaN(orderCreatedAt.getTime()) &&
          orderCreatedAt <= endOfLocalDay(endDate));

      return (
        byKeyword &&
        byPaymentStatus &&
        byStatus &&
        byMethod &&
        byReturnReason &&
        byDateStart &&
        byDateEnd
      );
    });
    const sorted = [...filtered];
    if (sortBy === "oldest") {
      sorted.sort((a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0));
    } else if (sortBy === "total_desc") {
      sorted.sort((a, b) => Number(b?.totalAmount || 0) - Number(a?.totalAmount || 0));
    } else if (sortBy === "total_asc") {
      sorted.sort((a, b) => Number(a?.totalAmount || 0) - Number(b?.totalAmount || 0));
    } else {
      sorted.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
    }
    return sorted;
  }, [
    orders,
    keyword,
    paymentFilter,
    statusFilter,
    methodFilter,
    mode,
    returnReasonFilter,
    startDate,
    endDate,
    sortBy,
  ]);

  const dashboardStats = useMemo(() => {
    const list = filteredOrders;
    const todayStr = toInputDate(new Date());
    const startT = startOfLocalDay(todayStr);
    const endT = endOfLocalDay(todayStr);
    let completedToday = 0;
    for (const o of list) {
      const st = String(o?.status || "").toLowerCase();
      if (st !== "delivered" && st !== "received") continue;
      const u = o?.updatedAt ? new Date(o.updatedAt) : null;
      if (u && !Number.isNaN(u.getTime()) && u >= startT && u <= endT) completedToday += 1;
    }
    const pendingOnly = list.filter(
      (o) => String(o?.status || "").toLowerCase() === "pending",
    ).length;
    const processing = list.filter((o) =>
      ["pending", "confirmed"].includes(String(o?.status || "").toLowerCase()),
    ).length;
    const inTransit = list.filter((o) => String(o?.status || "").toLowerCase() === "shipped").length;
    return {
      total: list.length,
      pendingOnly,
      processing,
      inTransit,
      completedToday,
    };
  }, [filteredOrders]);

  const activeFilterCount =
    (keyword.trim() ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (methodFilter !== "all" ? 1 : 0) +
    (paymentFilter !== "all" ? 1 : 0) +
    (mode === "returns" && returnReasonFilter !== "all" ? 1 : 0) +
    (hasDateFilter ? 1 : 0);

  useEffect(() => {
    setPage(0);
  }, [mode, keyword, paymentFilter, statusFilter, methodFilter, returnReasonFilter, startDate, endDate, sortBy]);

  useEffect(() => {
    setExpandedRowKeys([]);
  }, [page, mode, keyword, paymentFilter, statusFilter, methodFilter, returnReasonFilter, startDate, endDate, sortBy]);
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

  const paymentMethodLabel = (m) => {
    const x = String(m || "").toLowerCase();
    if (x === "vnpay") return { status: "confirmed", label: "VNPay" };
    if (x === "wallet") return { status: "paid", label: "Ví" };
    return { status: "pending", label: "COD" };
  };

  const shippingMethodLabel = (m) => {
    const x = String(m || "").toLowerCase();
    if (x === "fast") return "Giao nhanh";
    if (x === "standard") return "Giao chuẩn";
    return m ? String(m) : "—";
  };

  const columnsReturns = [
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
        const orderIdStr = String(
          order?._id?.$oid || order?._id || order?.id || "",
        ).trim();
        const orderSt = String(order?.status || "").trim().toLowerCase();
        const canCancelLineInOrder =
          mode !== "returns" &&
          (orderSt === "pending" || orderSt === "confirmed");

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {products.map((p, idx) => {
              const name = p?.productId?.name || p?.name || "—";
              const sub = formatLineLabel(p);
              const lineTotal = Number(p.price || 0) * Number(p.quantity || 0);
              const canceled = !isLineActive(p);
              const isLast = idx === products.length - 1;
              const lineCancelLoading =
                cancelLineMutation.isPending &&
                cancelLineMutation.variables?.orderId === orderIdStr &&
                cancelLineMutation.variables?.lineIndex === idx;
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
                  {canceled && p?.cancelReason ? (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#92400E",
                        marginTop: 6,
                        lineHeight: 1.4,
                      }}
                    >
                      Lý do hủy dòng: {p.cancelReason}
                    </div>
                  ) : null}
                  {canCancelLineInOrder && !canceled && orderIdStr ? (
                    <div style={{ marginTop: 8 }}>
                      <Button
                        size="small"
                        danger
                        ghost
                        loading={lineCancelLoading}
                        onClick={async () => {
                          const selected = await pickAdminCancelReason({
                            title: "Lý do hủy dòng hàng (cửa hàng)",
                          });
                          if (selected == null) return;
                          const cancelReason = String(selected).trim();
                          if (cancelReason.length < MIN_ADMIN_CANCEL_NOTE_LEN) {
                            notify.warning(
                              `Vui lòng nhập lý do (ít nhất ${MIN_ADMIN_CANCEL_NOTE_LEN} ký tự).`,
                            );
                            return;
                          }
                          cancelLineMutation.mutate({
                            orderId: orderIdStr,
                            lineIndex: idx,
                            cancelReason,
                          });
                        }}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          borderColor: "#FECACA",
                          color: "#DC2626",
                        }}
                      >
                        Hủy dòng
                      </Button>
                    </div>
                  ) : null}
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
                label:
                  v === "accepted"
                    ? "Chấp nhận hoàn hàng"
                    : v === "rejected"
                      ? "Không chấp nhận hoàn hàng"
                      : labelForNextStatus(normalized, v),
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
        const canCancelWhole = mode !== "returns" && normalized === "pending";
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
          void (async () => {
            const note = await pickAdminCancelReason({
              title: "Lý do hủy đơn (cửa hàng)",
            });
            if (note == null) return;
            const t = String(note).trim();
            if (t.length < MIN_ADMIN_CANCEL_NOTE_LEN) {
              notify.warning(
                `Vui lòng nhập lý do hủy (ít nhất ${MIN_ADMIN_CANCEL_NOTE_LEN} ký tự).`,
              );
              return;
            }
            updateMutation.mutate({
              id: orderId,
              fromStatus: normalized,
              body: {
                status: "canceled",
                note: t,
                lookup: {
                  createdAt: order?.createdAt || null,
                  totalAmount: order?.totalAmount ?? null,
                  fullName: order?.fullName || order?.userId?.name || "",
                },
              },
            });
          })();
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

  const renderExpandedOrderRow = (record) => {
    const order = record.order;
    const products = Array.isArray(order?.products) ? order.products : [];
    const orderIdStr = String(order?._id?.$oid || order?._id || order?.id || "").trim();
    const orderIdShort = orderIdStr ? String(orderIdStr).slice(-8).toUpperCase() : "";
    const pm = paymentMethodLabel(order?.paymentMethod);
    const paid = String(order?.paymentStatus || "").toLowerCase() === "paid";
    const orderSt = String(order?.status || "").trim().toLowerCase();
    const isReturnRelatedOrder = RETURN_RELATED_STATUSES.includes(orderSt);
    const canCancelLineInOrder =
      mode !== "returns" &&
      !isReturnRelatedOrder &&
      (orderSt === "pending" || orderSt === "confirmed");
    const statusFineLabel =
      STATUS_OPTIONS.find((o) => o.value === orderSt)?.label || order?.status || "—";
    const shipFee = Number(order?.shippingFee ?? 0);
    const orderDiscount = Number(order?.discount ?? 0);
    const voucherCode = String(order?.voucherCode || "").trim();
    const voucherSku = String(order?.voucherTargetSku || "").trim();
    const subtotalLines = products.reduce((acc, p) => {
      const gross = Number(p?.price || 0) * Number(p?.quantity || 0);
      const disc = Number(p?.lineDiscount || 0);
      return acc + Math.max(0, gross - disc);
    }, 0);

    const fmtDt = (v) => {
      if (!v) return "—";
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("vi-VN");
    };

    const runShipUpdate = () => {
      if (!orderIdStr) {
        notify.error("Đơn hàng không hợp lệ (thiếu ID).");
        return;
      }
      if (orderSt === "confirmed") {
        updateMutation.mutate({
          id: orderIdStr,
          fromStatus: orderSt,
          body: {
            status: "shipped",
            lookup: {
              createdAt: order?.createdAt || null,
              totalAmount: order?.totalAmount ?? null,
              fullName: order?.fullName || order?.userId?.name || "",
            },
          },
        });
        return;
      }
      if (orderSt === "pending") {
        notify.info("Vui lòng xác nhận đơn trước khi cập nhật vận chuyển.");
        return;
      }
      if (orderSt === "shipped") {
        notify.info("Đơn đang được vận chuyển.");
        return;
      }
      notify.info("Không thể cập nhật vận chuyển ở trạng thái hiện tại.");
    };

    return (
      <div
        style={{
          margin: "0 0 8px 0",
          padding: "16px 20px 18px",
          background: "#F0F7FF",
          borderLeft: `4px solid ${ACCENT_ORANGE}`,
          borderRadius: "0 8px 8px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#1F2937",
                letterSpacing: "0.04em",
              }}
            >
              CHI TIẾT ĐƠN HÀNG · {products.length} sản phẩm
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 6, lineHeight: 1.5 }}>
              Mã hiển thị: <strong>#{orderIdShort || "—"}</strong>
              {orderIdStr && orderIdStr.length > 8 ? (
                <>
                  {" "}
                  <span style={{ color: "#94A3B8" }}>(ID: {orderIdStr})</span>
                </>
              ) : null}
            </div>
          </div>
          <Link
            to={`/admin/orders/${orderIdStr}`}
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: ACCENT_ORANGE,
              whiteSpace: "nowrap",
            }}
          >
            XEM ĐẦY ĐỦ HÓA ĐƠN →
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "10px 16px",
            padding: "12px 14px",
            marginBottom: 12,
            background: "#fff",
            border: "1px solid #E0E0E0",
            borderRadius: 8,
            fontSize: 12,
            color: "#374151",
          }}
        >
          <div>
            <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
              Khách hàng
            </div>
            <div style={{ fontWeight: 700 }}>{order?.fullName || order?.userId?.name || "—"}</div>
          </div>
          <div>
            <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
              Điện thoại
            </div>
            <div>{order?.phone || "—"}</div>
          </div>
          <div style={{ gridColumn: "span 2", minWidth: 0 }}>
            <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
              Email
            </div>
            <div style={{ wordBreak: "break-word" }}>{order?.email || "—"}</div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
              Địa chỉ giao hàng
            </div>
            <div style={{ lineHeight: 1.45 }}>{order?.address || "—"}</div>
          </div>
          <div>
            <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
              Trạng thái đơn
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <FlowStatusBadge status={order?.status} />
              <span style={{ color: "#64748B" }}>({statusFineLabel})</span>
            </div>
          </div>
          <div>
            <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
              Thanh toán
            </div>
            <div>
              <strong>{pm.label}</strong>
              {" · "}
              {paid ? "Đã trả tiền" : "Chưa trả tiền"}
            </div>
          </div>
          <div>
            <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
              Vận chuyển
            </div>
            <div>{shippingMethodLabel(order?.shippingMethod)}</div>
          </div>
          <div>
            <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
              Phí vận chuyển
            </div>
            <div style={{ fontWeight: 700 }}>{shipFee.toLocaleString("vi-VN")} đ</div>
          </div>
          <div>
            <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
              Giảm giá đơn
            </div>
            <div style={{ fontWeight: 700 }}>
              {orderDiscount > 0 ? `-${orderDiscount.toLocaleString("vi-VN")} đ` : "—"}
            </div>
          </div>
          <div style={{ gridColumn: "span 2", minWidth: 0 }}>
            <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
              Voucher
            </div>
            <div>
              {voucherCode ? (
                <>
                  <strong>{voucherCode}</strong>
                  {voucherSku ? <span style={{ color: "#64748B" }}> · áp SKU: {voucherSku}</span> : null}
                </>
              ) : (
                "—"
              )}
            </div>
          </div>
          <div>
            <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
              Tạm tính (dòng)
            </div>
            <div style={{ fontWeight: 700 }}>{subtotalLines.toLocaleString("vi-VN")} đ</div>
          </div>
          <div>
            <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
              Tổng thanh toán
            </div>
            <div style={{ fontWeight: 800, color: ACCENT_ORANGE, fontSize: 14 }}>
              {Number(order?.totalAmount ?? 0).toLocaleString("vi-VN")} đ
            </div>
          </div>
          <div>
            <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
              Đặt lúc
            </div>
            <div>{fmtDt(order?.createdAt)}</div>
          </div>
          <div>
            <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
              Cập nhật
            </div>
            <div>{fmtDt(order?.updatedAt)}</div>
          </div>
          {order?.guestId ? (
            <div>
              <div style={{ color: "#94A3B8", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 4 }}>
                Khách (guest)
              </div>
              <div style={{ wordBreak: "break-all" }}>{String(order.guestId)}</div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            overflowX: "auto",
            border: "1px solid #E0E0E0",
            borderRadius: 8,
            background: "#fff",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  background: "#F8FAFC",
                  color: "#64748B",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>Ảnh</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>
                  Tên sản phẩm
                </th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>Phân loại</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>SKU</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>SL</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>
                  Đơn giá
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>CK dòng</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>Thành tiền</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 16, color: "#9CA3AF" }}>
                    Không có dòng sản phẩm
                  </td>
                </tr>
              ) : (
                products.map((p, idx) => {
                  const imgRaw = p?.image || p?.productId?.image;
                  const imgSrc = imgRaw ? toUploadUrl(imgRaw) : "";
                  const name = p?.productId?.name || p?.name || "—";
                  const variant = formatLineLabel(p) || "—";
                  const lineDisc = Number(p?.lineDiscount || 0);
                  const qty = Number(p?.quantity ?? 0);
                  const price = Number(p?.price || 0);
                  const lineGross = price * qty;
                  const lineNet = Math.max(0, lineGross - lineDisc);
                  const canceled = !isLineActive(p);
                  const saleName = String(p?.appliedSaleName || "").trim();
                  const noteParts = [];
                  if (saleName) noteParts.push(`KM: ${saleName}`);
                  if (canceled) noteParts.push("Đã hủy dòng");
                  if (canceled && p?.cancelReason) noteParts.push(`Lý do: ${p.cancelReason}`);
                  const note = noteParts.length ? noteParts.join(" · ") : "—";
                  return (
                    <tr
                      key={`exp-${orderIdStr}-${idx}-${String(p?.sku ?? "")}-${String(p?.productId?._id ?? "")}`}
                      style={{
                        borderTop: "1px solid #ECECEC",
                        opacity: canceled ? 0.65 : 1,
                      }}
                    >
                      <td style={{ padding: "10px 12px", width: 56 }}>
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt=""
                            style={{
                              width: 44,
                              height: 44,
                              objectFit: "cover",
                              borderRadius: 6,
                              border: "1px solid #E5E7EB",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 6,
                              background: "#F3F4F6",
                            }}
                          />
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#111827" }}>
                        {name}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#64748B", maxWidth: 200, lineHeight: 1.35 }}>
                        {variant}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#64748B" }}>{p?.sku || "—"}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                        {qty}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#0F766E",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {price.toLocaleString("vi-VN")} đ
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", whiteSpace: "nowrap", color: "#64748B" }}>
                        {lineDisc > 0 ? `-${lineDisc.toLocaleString("vi-VN")} đ` : "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#0F766E",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {lineNet.toLocaleString("vi-VN")} đ
                      </td>
                      <td style={{ padding: "10px 12px", color: "#64748B", fontSize: 12, maxWidth: 220, lineHeight: 1.35 }}>
                        {note}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {canCancelLineInOrder ? (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {products.map((p, idx) => {
              if (!isLineActive(p)) return null;
              const lineCancelLoading =
                cancelLineMutation.isPending &&
                cancelLineMutation.variables?.orderId === orderIdStr &&
                cancelLineMutation.variables?.lineIndex === idx;
              const label = p?.productId?.name || p?.name || "Dòng hàng";
              return (
                <div
                  key={`cancel-row-${orderIdStr}-${idx}`}
                  style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
                >
                  <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{label}</span>
                  <Button
                    size="small"
                    danger
                    ghost
                    loading={lineCancelLoading}
                    onClick={async () => {
                      const selected = await pickAdminCancelReason({
                        title: "Lý do hủy dòng hàng (cửa hàng)",
                      });
                      if (selected == null) return;
                      const cancelReason = String(selected).trim();
                      if (cancelReason.length < MIN_ADMIN_CANCEL_NOTE_LEN) {
                        notify.warning(
                          `Vui lòng nhập lý do (ít nhất ${MIN_ADMIN_CANCEL_NOTE_LEN} ký tự).`,
                        );
                        return;
                      }
                      cancelLineMutation.mutate({
                        orderId: orderIdStr,
                        lineIndex: idx,
                        cancelReason,
                      });
                    }}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      borderColor: "#FECACA",
                      color: "#DC2626",
                    }}
                  >
                    Hủy dòng
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 16,
            flexWrap: "wrap",
          }}
        >
          <Button
            icon={<PrinterOutlined />}
            onClick={() => {
              if (!orderIdStr) return;
              window.open(`/admin/orders/${orderIdStr}`, "_blank", "noopener,noreferrer");
            }}
          >
            In vận đơn
          </Button>
          {!isReturnRelatedOrder ? (
            <Button
              type="primary"
              icon={<TruckOutlined />}
              style={{ background: ACCENT_ORANGE, borderColor: ACCENT_ORANGE }}
              onClick={runShipUpdate}
            >
              Cập nhật vận chuyển
            </Button>
          ) : null}
        </div>
      </div>
    );
  };

  const columnsModern = useMemo(
    () => [
      {
        title: "Mã đơn",
        key: "orderId",
        width: 100,
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
        title: "Khách hàng",
        key: "customer",
        width: 180,
        className: "admin-order-col-customer",
        render: (_, record) => {
          const o = record.order;
          const name = o?.fullName || o?.userId?.name || "-";
          const email = o?.email || "";
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 600, color: "#111827" }}>{name}</span>
              {email ? <span style={{ fontSize: 12, color: "#6B7280" }}>{email}</span> : null}
            </div>
          );
        },
      },
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
        title: "Số SP",
        key: "lineCount",
        width: 72,
        align: "center",
        className: "admin-order-col-center",
        render: (_, record) => {
          const products = Array.isArray(record.order?.products) ? record.order.products : [];
          const n = products.filter(isLineActive).length;
          return <span style={{ fontWeight: 700, color: "#374151" }}>{n}</span>;
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
        title: "Trạng thái",
        key: "status",
        width: 210,
        className: "admin-order-col-status",
        render: (_, record) => {
          const order = record.order;
          const status = order?.status;
          const normalized =
            typeof status === "string" ? status.trim().toLowerCase() : status;
          const lockProcessingInOrderPage =
            mode !== "returns" && RETURN_RELATED_STATUSES.includes(normalized);
          const next = allowedNext(normalized);
          if (next.length === 0 || lockProcessingInOrderPage) {
            return (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <FlowStatusBadge status={normalized} />
              </div>
            );
          }
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <FlowStatusBadge status={normalized} />
              <Select
                size="small"
                value={normalized}
                style={{ width: "100%", maxWidth: 200, minWidth: 150 }}
                getPopupContainer={() => document.body}
                options={[
                  {
                    value: normalized,
                    label:
                      STATUS_OPTIONS.find((o) => o.value === normalized)?.label || status,
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
                    void (async () => {
                      const note = await pickAdminCancelReason({
                        title: "Lý do hủy đơn (cửa hàng)",
                      });
                      if (note == null) return;
                      const t = String(note).trim();
                      if (t.length < MIN_ADMIN_CANCEL_NOTE_LEN) {
                        notify.warning(
                          `Vui lòng nhập lý do hủy (ít nhất ${MIN_ADMIN_CANCEL_NOTE_LEN} ký tự).`,
                        );
                        return;
                      }
                      updateMutation.mutate({
                        id: orderId,
                        fromStatus: normalized,
                        body: {
                          status: "canceled",
                          note: t,
                          lookup: {
                            createdAt: order?.createdAt || null,
                            totalAmount: order?.totalAmount ?? null,
                            fullName: order?.fullName || order?.userId?.name || "",
                          },
                        },
                      });
                    })();
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
            </div>
          );
        },
      },
      {
        title: "",
        key: "detail",
        width: 172,
        align: "center",
        fixed: "right",
        className: "admin-order-col-actions",
        render: (_, record) => {
          const order = record.order;
          const orderIdRaw = order?._id?.$oid || order?._id || order?.id || "";
          const orderId = String(orderIdRaw || "").trim();
          const normalized =
            typeof order?.status === "string" ? order.status.trim().toLowerCase() : "";
          const isReturnRelatedOrder = RETURN_RELATED_STATUSES.includes(normalized);
          const canCancelWhole =
            mode !== "returns" && !isReturnRelatedOrder && normalized === "pending";
          const mutatingId = updateMutation.isPending
            ? String(updateMutation.variables?.id || "")
            : "";
          const cancelLoading = updateMutation.isPending && mutatingId === orderId;

          const runCancelOrder = () => {
            if (!orderId) {
              notify.error("Đơn hàng không hợp lệ (thiếu ID).");
              return;
            }
            void (async () => {
              const note = await pickAdminCancelReason({
                title: "Lý do hủy đơn (cửa hàng)",
              });
              if (note == null) return;
              const t = String(note).trim();
              if (t.length < MIN_ADMIN_CANCEL_NOTE_LEN) {
                notify.warning(
                  `Vui lòng nhập lý do hủy (ít nhất ${MIN_ADMIN_CANCEL_NOTE_LEN} ký tự).`,
                );
                return;
              }
              updateMutation.mutate({
                id: orderId,
                fromStatus: normalized,
                body: {
                  status: "canceled",
                  note: t,
                  lookup: {
                    createdAt: order?.createdAt || null,
                    totalAmount: order?.totalAmount ?? null,
                    fullName: order?.fullName || order?.userId?.name || "",
                  },
                },
              });
            })();
          };

          return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <Link to={`/admin/orders/${orderId}`} onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="small"
                    type="text"
                    style={{
                      fontWeight: 700,
                      color: "#1677ff",
                      background: "#EFF6FF",
                      border: "1px solid #BFDBFE",
                      borderRadius: 6,
                      paddingInline: 10,
                    }}
                  >
                    Xem chi tiết
                  </Button>
                </Link>
                {canCancelWhole ? (
                  <Button
                    size="small"
                    danger
                    type="text"
                    loading={cancelLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      runCancelOrder();
                    }}
                    style={{
                      fontWeight: 700,
                      color: "#DC2626",
                      background: "#FEF2F2",
                      border: "1px solid #FECACA",
                      borderRadius: 6,
                      paddingInline: 10,
                    }}
                  >
                    Hủy đơn
                  </Button>
                ) : null}
              </div>
            </div>
          );
        },
      },
    ],
    [mode, updateMutation],
  );

  const columns = mode === "returns" ? columnsReturns : columnsModern;

  return (
    <div style={{ padding: "12px 16px 24px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
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
      <style>{`
        .admin-order-table-wrap {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          background: #fff;
          border: 1px solid #ECECEC;
          border-radius: 10px;
        }
        .admin-order-page-shell {
          max-width: 1220px;
          margin: 0 auto;
        }
        .admin-order-header {
          margin-bottom: 18px;
        }
        .admin-order-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
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
        .admin-order-table td.admin-order-col-total {
          text-align: right !important;
        }
        .admin-order-table .admin-order-col-center .ant-table-cell,
        .admin-order-table td.admin-order-col-center {
          text-align: center !important;
        }
        .admin-order-table .admin-order-col-actions .ant-table-cell,
        .admin-order-table td.admin-order-col-actions {
          text-align: right !important;
        }
        .admin-order-table .admin-order-col-id .ant-table-cell,
        .admin-order-table td.admin-order-col-id {
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
          text-align: center !important;
        }
        .admin-order-table .ant-table-tbody > tr > td {
          padding: 10px 12px !important;
        }
        .admin-order-table .ant-table-tbody > tr:hover > td {
          background: #FFFBF5 !important;
        }
        .admin-order-table tr.admin-order-row-expanded > td {
          background: #E8F4FF !important;
        }
        .admin-order-table .ant-table-expanded-row .ant-table-cell {
          background: #f7fbff !important;
          padding: 0 8px 12px !important;
          border-bottom: 1px solid #e8e8e8 !important;
        }
        .admin-order-stat-card {
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          padding: 14px 16px;
          background: #fff;
          min-height: 92px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .admin-order-toolbar {
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          background: #fff;
          border: 1px solid #ECECEC;
          border-radius: 10px;
          padding: 10px;
        }
        .admin-order-footer {
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          row-gap: 10px;
          align-items: center;
          padding: 10px 12px;
          background: #FAFAFB;
          border-radius: 8px;
          border: 1px solid #ECECEC;
        }
        .admin-date-quick-btn {
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          height: 34px;
          padding: 0 12px;
          background: #fff;
          color: #374151;
          font-size: 13px;
          font-family: "Lexend", "Plus Jakarta Sans", sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .admin-date-quick-btn:hover {
          border-color: #f49d25;
          color: #f49d25;
        }
        .admin-date-quick-btn.active {
          border-color: #f49d25;
          background: #FFF7E8;
          color: #b56600;
          font-weight: 600;
        }
        .admin-date-input {
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          height: 34px;
          padding: 0 10px;
          font-size: 13px;
          color: #111827;
          font-family: "Lexend", "Plus Jakarta Sans", sans-serif;
          outline: none;
          background: #fff;
        }
        .admin-date-input:focus {
          border-color: #f49d25;
          box-shadow: 0 0 0 2px rgba(244, 157, 37, 0.12);
        }
        @media (max-width: 1200px) {
          .admin-order-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 768px) {
          .admin-order-page-shell {
            max-width: 100%;
          }
          .admin-order-header {
            margin-bottom: 14px;
          }
          .admin-order-stats-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .admin-order-toolbar {
            padding: 8px;
          }
        }
      `}</style>
      <Drawer
        title="Bộ lọc đơn hàng"
        placement="right"
        width={380}
        onClose={() => setFilterDrawerOpen(false)}
        open={filterDrawerOpen}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#374151" }}>
              Sắp xếp
            </div>
            <Select
              style={{ width: "100%" }}
              value={sortBy}
              options={ORDER_SORT_OPTIONS}
              onChange={setSortBy}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#374151" }}>
              Trạng thái đơn
            </div>
            <Select
              style={{ width: "100%" }}
              value={statusFilter}
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
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#374151" }}>
              Phương thức thanh toán
            </div>
            <Select
              style={{ width: "100%" }}
              value={methodFilter}
              options={[
                { value: "all", label: "Tất cả" },
                { value: "vnpay", label: "VNPay" },
                { value: "cod", label: "COD" },
              ]}
              onChange={setMethodFilter}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#374151" }}>
              Trạng thái thanh toán
            </div>
            <Select
              style={{ width: "100%" }}
              value={paymentFilter}
              options={[
                { value: "all", label: "Tất cả" },
                { value: "paid", label: "Đã trả" },
                { value: "unpaid", label: "Chưa trả" },
              ]}
              onChange={setPaymentFilter}
            />
          </div>
          {mode === "returns" && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#374151" }}>
                Lý do hoàn
              </div>
              <Select
                style={{ width: "100%" }}
                value={returnReasonFilter}
                options={RETURN_REASON_OPTIONS}
                onChange={setReturnReasonFilter}
              />
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#374151" }}>
              Thời gian đặt
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`admin-date-quick-btn ${datePreset === p.key ? "active" : ""}`}
                  onClick={() => {
                    setDatePreset(p.key);
                    const range = resolvePresetRange(p.key);
                    setStartDate(range.startDate);
                    setEndDate(range.endDate);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <span style={{ color: "#9CA3AF", fontSize: 12 }}>Từ</span>
              <DatePicker
                size="small"
                format="DD/MM/YYYY"
                placeholder="DD/MM/YYYY"
                value={startDate ? dayjs(startDate, "YYYY-MM-DD") : null}
                onChange={(value) => {
                  setStartDate(value ? value.format("YYYY-MM-DD") : "");
                  setDatePreset("");
                }}
                style={{ minWidth: 132, borderRadius: 12 }}
              />
              <span style={{ color: "#6B7280", fontSize: 12 }}>đến</span>
              <DatePicker
                size="small"
                format="DD/MM/YYYY"
                placeholder="DD/MM/YYYY"
                value={endDate ? dayjs(endDate, "YYYY-MM-DD") : null}
                onChange={(value) => {
                  setEndDate(value ? value.format("YYYY-MM-DD") : "");
                  setDatePreset("");
                }}
                style={{ minWidth: 132, borderRadius: 12 }}
              />
              {hasDateFilter ? (
                <button
                  type="button"
                  className="admin-date-quick-btn"
                  onClick={() => {
                    setDatePreset("all");
                    setStartDate("");
                    setEndDate("");
                  }}
                  style={{ width: 34, minWidth: 34, padding: 0, fontWeight: 700 }}
                  title="Reset thời gian"
                >
                  X
                </button>
              ) : null}
            </div>
          </div>
          <Button
            block
            onClick={() => {
              setKeyword("");
              setStatusFilter("all");
              setMethodFilter("all");
              setPaymentFilter("all");
              setReturnReasonFilter("all");
              setSortBy("newest");
              setDatePreset("all");
              setStartDate("");
              setEndDate("");
            }}
          >
            Xóa tất cả bộ lọc
          </Button>
        </div>
      </Drawer>

      <div className="admin-order-page-shell">
      <div className="admin-order-header">
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111827" }}>
          Quản lý đơn hàng — Xem nhanh
        </h2>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
          {mode === "returns"
            ? "Đơn liên quan hoàn hàng."
            : "Theo dõi và quản lý các đơn hàng đang xử lý."}
        </p>
      </div>

      <div className="admin-order-stats-grid">
        <div className="admin-order-stat-card">
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Tổng đơn</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginTop: 6 }}>
            {dashboardStats.total.toLocaleString("vi-VN")}
          </div>
        </div>
        <div className="admin-order-stat-card">
          <div
            style={{
              fontSize: 12,
              color: "#64748B",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            Chờ xử lý
            {dashboardStats.pendingOnly > 0 ? (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "#FFECEC",
                  color: "#C41D3D",
                }}
              >
                Cao
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginTop: 6 }}>
            {dashboardStats.processing.toLocaleString("vi-VN")}
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Chờ + đã xác nhận</div>
        </div>
        <div className="admin-order-stat-card">
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Đang giao</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginTop: 6 }}>
            {dashboardStats.inTransit.toLocaleString("vi-VN")}
          </div>
        </div>
        <div className="admin-order-stat-card">
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Hoàn thành hôm nay</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: ACCENT_ORANGE, marginTop: 6 }}>
            {dashboardStats.completedToday.toLocaleString("vi-VN")}
          </div>
        </div>
      </div>

      <div className="admin-order-toolbar">
        <Input
          allowClear
          placeholder="Tìm kiếm mã đơn hàng, khách, email, SĐT…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ flex: "1 1 240px", minWidth: 200, maxWidth: 520, height: 40, borderRadius: 10 }}
        />
        <Badge count={activeFilterCount > 0 ? activeFilterCount : 0} size="small" showZero={false}>
          <Button
            icon={<FilterOutlined />}
            onClick={() => setFilterDrawerOpen(true)}
            style={{ height: 40, borderRadius: 10, borderColor: "#E0E0E0" }}
          >
            Bộ lọc
          </Button>
        </Badge>
      </div>

      <div className="admin-order-table-wrap">
        <Table
          className="admin-order-table"
          rowKey="key"
          loading={isLoading}
          dataSource={tableRows}
          columns={columns}
          tableLayout="auto"
          scroll={{ x: mode === "returns" ? 1180 : 1020 }}
          size="small"
          pagination={false}
          {...(mode !== "returns"
            ? {
                expandable: {
                  expandedRowRender: renderExpandedOrderRow,
                  expandedRowKeys,
                  onExpandedRowsChange: setExpandedRowKeys,
                  expandIcon: ({ expanded, onExpand, record }) => (
                    <Button
                      type="text"
                      size="small"
                      onClick={(e) => onExpand(record, e)}
                      icon={
                        expanded ? (
                          <EyeInvisibleOutlined style={{ color: ACCENT_ORANGE, fontSize: 16 }} />
                        ) : (
                          <EyeOutlined style={{ color: ACCENT_ORANGE, fontSize: 16 }} />
                        )
                      }
                      aria-label={expanded ? "Thu gọn chi tiết đơn" : "Xem nhanh chi tiết đơn"}
                    />
                  ),
                },
                onRow: (record) => ({
                  className: expandedRowKeys.includes(record.key)
                    ? "admin-order-row-expanded"
                    : "",
                }),
              }
            : {})}
        />
      </div>
      <div className="admin-order-footer">
        <span style={{ fontSize: 12, color: "#666", flex: "1 1 220px", minWidth: 0, lineHeight: 1.45 }}>
          {filteredOrders.length === 0 ? (
            <>Hiển thị 0 trên 0 đơn hàng</>
          ) : (
            <>
              Hiển thị{" "}
              <strong style={{ color: "#111827" }}>{page * limit + 1}</strong>
              –
              <strong style={{ color: "#111827" }}>
                {Math.min((page + 1) * limit, filteredOrders.length)}
              </strong>{" "}
              trên{" "}
              <strong style={{ color: "#111827" }}>
                {filteredOrders.length.toLocaleString("vi-VN")}
              </strong>{" "}
              đơn hàng
              <span style={{ color: "#9CA3AF", marginLeft: 6 }}>
                · {productLineCount} dòng SP
              </span>
            </>
          )}
        </span>
        <Pagination
          current={page + 1}
          total={filteredOrders.length}
          pageSize={limit}
          onChange={(p) => setPage(p - 1)}
          showSizeChanger={false}
          showTotal={(t) => `${t.toLocaleString("vi-VN")} đơn (lọc hiện tại)`}
        />
      </div>
      </div>
    </div>
  );
}
