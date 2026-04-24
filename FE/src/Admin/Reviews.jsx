import React, { useMemo, useState } from "react";
import { Table, Button, Modal, Input, Tag, message } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminReviews, approveAdminReview, rejectAdminReview } from "../api/index";
import {
  getOrderStatusLabelForReview,
  shouldShowOrderStatusOnReview,
} from "../utils/orderStatusForReview";

// Backend đang chạy tại 3002.
const BACKEND_BASE_URL = (
  process.env.REACT_APP_API_URL_BACKEND || "http://localhost:3002/api"
)
  .replace(/\/api\/?$/, "")
  .replace(/localhost:\d+/, "localhost:3002")
  .replace(/127\.0\.0\.1:\d+/, "127.0.0.1:3002");

function getReviewImageSrc(img) {
  const v = img?.url ?? img;
  if (!v) return "";
  if (typeof v !== "string") return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("/uploads/")) return `${BACKEND_BASE_URL}${v}`;
  if (v.startsWith("uploads/")) return `${BACKEND_BASE_URL}/${v}`;
  return `${BACKEND_BASE_URL}/uploads/${v}`;
}

function parseSizeFromVariantLabel(label) {
  if (!label || typeof label !== "string") return null;
  for (const part of label.split("·")) {
    const t = part.trim();
    const m = t.match(/^(?:Size|EU|Kích\s*cỡ)\s*:\s*(.+)$/i);
    if (m) return m[1].trim();
  }
  return null;
}

function reviewDateAndSizeLine(r) {
  const snap = r.productSnapshot;
  const purchaseSizeLine =
    snap?.purchaseSize ||
    parseSizeFromVariantLabel(snap?.orderedVariantText) ||
    parseSizeFromVariantLabel(r.variantLabel) ||
    null;
  const raw = r.createdAt ?? r.updatedAt;
  const dateStr = raw
    ? new Date(raw).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const sizeLine = `Phân loại hàng: ${purchaseSizeLine || "—"}`;
  return { dateStr, sizeLine };
}

function formatVnd(n) {
  if (n == null || n === "") return "—";
  const x = Number(n);
  if (Number.isNaN(x)) return "—";
  return `${x.toLocaleString("vi-VN")}₫`;
}

export default function Reviews() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [detailReview, setDetailReview] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", statusFilter],
    queryFn: () =>
      getAdminReviews({
        ...(statusFilter === "all" ? {} : { status: statusFilter }),
        page: 1,
        limit: 200,
      }),
  });

  const reviews = useMemo(() => data?.reviews ?? [], [data]);

  const approveMutation = useMutation({
    mutationFn: (id) => approveAdminReview(id),
    onSuccess: () => {
      message.success("Đã duyệt đánh giá");
      setDetailReview(null);
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Lỗi duyệt đánh giá");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectAdminReview(id, reason),
    onSuccess: () => {
      message.success("Đã từ chối đánh giá");
      setDetailReview(null);
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setRejectModalOpen(false);
      setSelectedReviewId(null);
      setRejectReason("");
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Lỗi từ chối đánh giá");
    },
  });

  const openReject = (id) => {
    setSelectedReviewId(id);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const columns = [
    {
      title: "Sản phẩm",
      key: "productInfo",
      width: 300,
      render: (_, r) => {
        const snap = r.productSnapshot;
        const p = r.productId;
        const name = snap?.name || p?.name || "—";
        const imgRaw = snap?.image || p?.image || (Array.isArray(p?.srcImages) ? p.srcImages[0] : null);
        const cat = snap?.categoryName || p?.categoryId?.name;
        const { dateStr, sizeLine } = reviewDateAndSizeLine(r);
        return (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {imgRaw ? (
              <img
                src={getReviewImageSrc(imgRaw)}
                alt=""
                style={{
                  width: 56,
                  height: 56,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  background: "#f1f5f9",
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.35 }}>{name}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                {cat || "—"}
              </div>
              {dateStr ? (
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{dateStr}</div>
              ) : null}
              <div style={{ fontSize: 12, color: "#334155", marginTop: 4, fontWeight: 500 }}>{sizeLine}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Người dùng",
      dataIndex: "userId",
      key: "userId",
      width: 220,
      render: (u) => u?.name ?? u?._id ?? "-",
    },
    {
      title: "Sao",
      dataIndex: "rating",
      key: "rating",
      width: 72,
      align: "center",
      render: (v) => <span style={{ fontWeight: 700, color: "#ea580c" }}>{v ?? 0}★</span>,
    },
    {
      title: "Nội dung",
      key: "text",
      width: 220,
      render: (_, r) => {
        const preview = r.content ? String(r.content).trim() : "";
        const short =
          preview.length > 72 ? `${preview.slice(0, 72)}…` : preview || "—";
        const imgCount = Array.isArray(r.images) ? r.images.length : 0;
        return (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{r.title || "Đánh giá"}</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>{short}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
              {imgCount > 0 ? `${imgCount} ảnh đính kèm` : "Không có ảnh"}
            </div>
          </div>
        );
      },
    },
    {
      title: "Duyệt",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v) => {
        if (v === "approved") return <Tag color="green">Đã duyệt</Tag>;
        if (v === "rejected") return <Tag color="red">Đã từ chối</Tag>;
        return <Tag color="gold">Chờ duyệt</Tag>;
      },
    },
    {
      title: "Mua hàng / Đơn",
      key: "purchaseOrder",
      width: 200,
      render: (_, r) => {
        const ost = r.orderId?.status;
        const orderLbl =
          shouldShowOrderStatusOnReview(ost) && getOrderStatusLabelForReview(ost);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
            {r.verifiedPurchase ? (
              <Tag color="green">Đã mua hàng</Tag>
            ) : (
              <Tag>Chưa xác thực</Tag>
            )}
            {orderLbl ? (
              <Tag color="orange" style={{ margin: 0, whiteSpace: "normal", maxWidth: 210, lineHeight: 1.35 }}>
                {orderLbl}
              </Tag>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: 160,
      fixed: "right",
      render: (_, r) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
          <button
            type="button"
            onClick={() => setDetailReview(r)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 10,
              border: "1.5px solid #E2E8F0",
              background: "#fff",
              color: "#475569",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily:
                "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
              boxShadow: "0 1px 2px rgba(15,23,42,0.05)",
              transition: "border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(244,157,37,0.55)";
              e.currentTarget.style.color = "#c2410c";
              e.currentTarget.style.boxShadow =
                "0 2px 10px rgba(244,157,37,0.16)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#E2E8F0";
              e.currentTarget.style.color = "#475569";
              e.currentTarget.style.boxShadow =
                "0 1px 2px rgba(15,23,42,0.05)";
            }}
          >
            <EyeOutlined style={{ fontSize: 13, opacity: 0.9 }} />
            Xem chi tiết
          </button>
          {r.status === "pending" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button size="small" onClick={() => approveMutation.mutate(r._id)} loading={approveMutation.isPending}>
                Duyệt
              </Button>
              <Button danger size="small" onClick={() => openReject(r._id)}>
                Từ chối
              </Button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Quản lý đánh giá</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type={statusFilter === "all" ? "primary" : "default"} onClick={() => setStatusFilter("all")}>
            Tất cả
          </Button>
          <Button type={statusFilter === "pending" ? "primary" : "default"} onClick={() => setStatusFilter("pending")}>
            Chờ duyệt
          </Button>
          <Button type={statusFilter === "approved" ? "primary" : "default"} onClick={() => setStatusFilter("approved")}>
            Đã duyệt
          </Button>
          <Button type={statusFilter === "rejected" ? "primary" : "default"} onClick={() => setStatusFilter("rejected")}>
            Đã từ chối
          </Button>
        </div>
      </div>

      <Table
        rowKey="_id"
        loading={isLoading}
        dataSource={reviews}
        columns={columns}
        scroll={{ x: 1100 }}
        size="middle"
        pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "20", "50"] }}
      />

      <Modal
        title="Chi tiết đánh giá"
        open={!!detailReview}
        onCancel={() => setDetailReview(null)}
        footer={null}
        width={720}
        destroyOnClose
      >
        {detailReview && (() => {
          const r = detailReview;
          const snap = r.productSnapshot || {};
          const p = r.productId || {};
          const name = snap?.name || p?.name || "—";
          const imgRaw = snap?.image || p?.image || (Array.isArray(p?.srcImages) ? p.srcImages[0] : null);
          const cat = snap?.categoryName || p?.categoryId?.name;
          const priceSnap = snap?.price != null ? snap.price : p?.price;
          const shortDesc = (snap?.shortDescription || p?.shortDescription || "").trim();
          const variantFull = [snap?.orderedVariantText, r.variantLabel].filter(Boolean).join(" · ") || "—";
          const { dateStr, sizeLine } = reviewDateAndSizeLine(r);
          const ost = r.orderId?.status;
          const orderLbl =
            shouldShowOrderStatusOnReview(ost) && getOrderStatusLabelForReview(ost);

          const row = (label, value, { multiline } = {}) => (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              <span style={{ color: "#64748b", fontWeight: 600 }}>{label}: </span>
              <span
                style={{
                  color: "#0f172a",
                  whiteSpace: multiline ? "pre-wrap" : "normal",
                  lineHeight: multiline ? 1.55 : undefined,
                }}
              >
                {value || "—"}
              </span>
            </div>
          );

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#0f172a",
                    paddingBottom: 10,
                    borderBottom: "2px solid #e2e8f0",
                    letterSpacing: "0.02em",
                  }}
                >
                  Thông tin sản phẩm
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 14, alignItems: "flex-start" }}>
                  {imgRaw ? (
                    <img
                      src={getReviewImageSrc(imgRaw)}
                      alt=""
                      style={{
                        width: 96,
                        height: 96,
                        objectFit: "cover",
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 10,
                        background: "#f1f5f9",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", lineHeight: 1.35 }}>{name}</div>
                    {row("Danh mục", cat)}
                    {row("Giá (theo snapshot / SP)", formatVnd(priceSnap))}
                    {row("Biến thể / phân loại đặt mua", variantFull, { multiline: true })}
                    <div style={{ marginTop: 10, fontSize: 13, color: "#334155", fontWeight: 600 }}>{sizeLine}</div>
                    {shortDesc ? row("Mô tả ngắn", shortDesc.length > 280 ? `${shortDesc.slice(0, 280)}…` : shortDesc, { multiline: true }) : null}
                  </div>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#0f172a",
                    paddingBottom: 10,
                    borderBottom: "2px solid #e2e8f0",
                    letterSpacing: "0.02em",
                  }}
                >
                  Thông tin đánh giá
                </div>
                <div style={{ marginTop: 14 }}>
                  {row("Người đánh giá", r.userId?.name ?? r.userId?._id ?? "—")}
                  {r.userId?.email ? row("Email", r.userId.email) : null}
                  {row("Ngày đánh giá", dateStr)}
                  <div style={{ marginTop: 10, fontSize: 13 }}>
                    <span style={{ color: "#64748b", fontWeight: 600 }}>Số sao: </span>
                    <span style={{ fontWeight: 800, color: "#ea580c", fontSize: 15 }}>{r.rating ?? 0} / 5</span>
                  </div>
                  <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <span style={{ color: "#64748b", fontWeight: 600, fontSize: 13 }}>Trạng thái: </span>
                    {r.status === "approved" ? (
                      <Tag color="green">Đã duyệt</Tag>
                    ) : r.status === "rejected" ? (
                      <Tag color="red">Đã từ chối</Tag>
                    ) : (
                      <Tag color="gold">Chờ duyệt</Tag>
                    )}
                    {r.verifiedPurchase ? <Tag color="green">Đã mua hàng</Tag> : <Tag>Chưa xác thực mua</Tag>}
                    {orderLbl ? (
                      <Tag color="orange" style={{ margin: 0, whiteSpace: "normal", maxWidth: "100%", lineHeight: 1.35 }}>
                        Đơn: {orderLbl}
                      </Tag>
                    ) : null}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>Nội dung đánh giá</div>
                    {r.title ? <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15, color: "#0f172a" }}>{r.title}</div> : null}
                    <div style={{ whiteSpace: "pre-wrap", color: "#334155", fontSize: 14, lineHeight: 1.6, background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                      {r.content?.trim() ? r.content : "—"}
                    </div>
                  </div>
                  {Array.isArray(r.images) && r.images.length > 0 ? (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginBottom: 10 }}>Ảnh / video đính kèm</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {r.images.map((img, i) => (
                          <img
                            key={i}
                            src={getReviewImageSrc(img)}
                            alt=""
                            style={{
                              width: 100,
                              height: 100,
                              objectFit: "cover",
                              borderRadius: 8,
                              border: "1px solid #E2E8F0",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {r.status === "rejected" && r.rejectedReason ? (
                    <div style={{ marginTop: 16, padding: 12, background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>Lý do từ chối</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: "#991b1b", whiteSpace: "pre-wrap" }}>{r.rejectedReason}</div>
                    </div>
                  ) : null}
                  {r.status === "pending" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
                      <Button type="primary" onClick={() => approveMutation.mutate(r._id)} loading={approveMutation.isPending}>
                        Duyệt
                      </Button>
                      <Button
                        danger
                        onClick={() => {
                          setDetailReview(null);
                          openReject(r._id);
                        }}
                      >
                        Từ chối
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal
        title="Từ chối review"
        open={rejectModalOpen}
        onCancel={() => {
          setRejectModalOpen(false);
          setSelectedReviewId(null);
          setRejectReason("");
        }}
        onOk={() => {
          if (!selectedReviewId) return;
          rejectMutation.mutate({ id: selectedReviewId, reason: rejectReason.trim() });
        }}
        okText="Xác nhận"
        confirmLoading={rejectMutation.isPending}
      >
        <p style={{ marginBottom: 8, color: "#64748b", fontSize: 13 }}>
          (Tuỳ chọn) Nhập lý do từ chối.
        </p>
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Ví dụ: nội dung vi phạm..."
        />
      </Modal>
    </div>
  );
}

