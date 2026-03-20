import React, { useMemo, useState } from "react";
import { Table, Button, Modal, Input, Tag, message } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminReviews, approveAdminReview, rejectAdminReview } from "../api/index";

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

export default function Reviews() {
  const queryClient = useQueryClient();

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedReviewId, setSelectedReviewId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", "pending"],
    queryFn: () => getAdminReviews({ status: "pending" }),
  });

  const reviews = useMemo(() => data?.reviews ?? [], [data]);

  const approveMutation = useMutation({
    mutationFn: (id) => approveAdminReview(id),
    onSuccess: () => {
      message.success("Đã duyệt review");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews", "pending"] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Lỗi duyệt review");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectAdminReview(id, reason),
    onSuccess: () => {
      message.success("Đã từ chối review");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews", "pending"] });
      setRejectModalOpen(false);
      setSelectedReviewId(null);
      setRejectReason("");
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Lỗi từ chối review");
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
      dataIndex: "productId",
      key: "productId",
      width: 220,
      render: (p) => p?.name ?? p?._id ?? "-",
    },
    {
      title: "Người dùng",
      dataIndex: "userId",
      key: "userId",
      width: 220,
      render: (u) => u?.name ?? u?._id ?? "-",
    },
    {
      title: "Đánh giá",
      dataIndex: "rating",
      key: "rating",
      width: 110,
      render: (v) => `${v ?? 0}★`,
    },
    {
      title: "Nội dung",
      key: "text",
      width: 320,
      render: (_, r) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{r.title || "Đánh giá"}</div>
          {r.content ? (
            <div style={{ color: "#475569", fontSize: 12, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {r.content}
            </div>
          ) : (
            <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 4 }}>—</div>
          )}
          <div style={{ marginTop: 8 }}>
            {Array.isArray(r.images) && r.images.length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {r.images.slice(0, 3).map((img, i) => (
                  <img
                    key={i}
                    src={getReviewImageSrc(img)}
                    alt="review"
                    style={{
                      width: 44,
                      height: 44,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                    }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ color: "#94A3B8", fontSize: 12 }}>Không có ảnh</div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Verified",
      dataIndex: "verifiedPurchase",
      key: "verifiedPurchase",
      width: 120,
      render: (v) => (v ? <Tag color="green">Đã mua hàng</Tag> : <Tag>Chưa xác thực</Tag>),
    },
    {
      title: "Ngày",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (d) => (d ? new Date(d).toLocaleDateString() : "-"),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 180,
      render: (_, r) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="small" onClick={() => approveMutation.mutate(r._id)} loading={approveMutation.isPending}>
            Duyệt
          </Button>
          <Button danger size="small" onClick={() => openReject(r._id)}>
            Từ chối
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Quản lý đánh giá</h2>
        <Tag color="gold">Chờ duyệt</Tag>
      </div>

      <Table rowKey="_id" loading={isLoading} dataSource={reviews} columns={columns} />

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

