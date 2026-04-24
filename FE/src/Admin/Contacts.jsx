import React, { useMemo, useState } from "react";
import {
  Button,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminDeleteContactMessage,
  adminGetContactMessages,
  adminUpdateContactStatus,
} from "../api";

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "new", label: "Mới" },
  { value: "in_progress", label: "Đang xử lý" },
  { value: "resolved", label: "Đã xử lý" },
  { value: "archived", label: "Lưu trữ" },
];

const STATUS_LABEL = {
  new: { text: "Mới", color: "gold" },
  in_progress: { text: "Đang xử lý", color: "blue" },
  resolved: { text: "Đã xử lý", color: "green" },
  archived: { text: "Lưu trữ", color: "default" },
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Contacts() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [paging, setPaging] = useState({ current: 1, pageSize: 20 });
  const [detailItem, setDetailItem] = useState(null);
  const [nextStatus, setNextStatus] = useState("new");
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-contacts", status, keyword, paging.current, paging.pageSize],
    queryFn: () =>
      adminGetContactMessages({
        page: paging.current,
        limit: paging.pageSize,
        status,
        keyword: keyword.trim(),
      }),
  });

  const items = useMemo(() => data?.data?.items || [], [data]);
  const total = data?.data?.total || 0;

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, payload }) => adminUpdateContactStatus(id, payload),
    onSuccess: () => {
      message.success("Đã cập nhật liên hệ.");
      setDetailItem(null);
      queryClient.invalidateQueries({ queryKey: ["admin-contacts"] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Không thể cập nhật liên hệ.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminDeleteContactMessage(id),
    onSuccess: () => {
      message.success("Đã xóa liên hệ.");
      queryClient.invalidateQueries({ queryKey: ["admin-contacts"] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Không thể xóa liên hệ.");
    },
  });

  const columns = [
    {
      title: "Người gửi",
      key: "sender",
      width: 220,
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 700 }}>{row.name || "-"}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>{row.email || "-"}</div>
          <div style={{ color: "#94a3b8", fontSize: 12 }}>{row.phone || "Không có SĐT"}</div>
        </div>
      ),
    },
    {
      title: "Tiêu đề",
      dataIndex: "subject",
      key: "subject",
      width: 260,
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{v || "-"}</div>
          <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
            {String(row.message || "").length > 90
              ? `${String(row.message).slice(0, 90)}...`
              : row.message || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (v) => {
        const meta = STATUS_LABEL[v] || { text: v || "-", color: "default" };
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    {
      title: "Ngày gửi",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (v) => formatDateTime(v),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 170,
      fixed: "right",
      render: (_, row) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setDetailItem(row);
              setNextStatus(row.status || "new");
              setNote(row.adminNote || "");
            }}
          >
            Xem
          </Button>
          <Popconfirm
            title="Xóa liên hệ này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => deleteMutation.mutate(row._id)}
          >
            <Button danger type="link">
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0 }}>Quản lý liên hệ</h2>
        <Space wrap>
          <Select
            value={status}
            options={STATUS_OPTIONS}
            style={{ width: 160 }}
            onChange={(value) => {
              setStatus(value);
              setPaging((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <Input.Search
            placeholder="Tìm theo tên/email/tiêu đề"
            allowClear
            onSearch={(value) => {
              setKeyword(value || "");
              setPaging((prev) => ({ ...prev, current: 1 }));
            }}
            style={{ width: 280 }}
          />
        </Space>
      </div>

      <Table
        rowKey="_id"
        loading={isLoading}
        dataSource={items}
        columns={columns}
        scroll={{ x: 900 }}
        pagination={{
          current: paging.current,
          pageSize: paging.pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          onChange: (page, pageSize) => {
            setPaging({ current: page, pageSize });
          },
        }}
      />

      <Modal
        title="Chi tiết liên hệ"
        open={!!detailItem}
        onCancel={() => setDetailItem(null)}
        onOk={() => {
          if (!detailItem?._id) return;
          updateStatusMutation.mutate({
            id: detailItem._id,
            payload: {
              status: nextStatus,
              adminNote: note.trim(),
            },
          });
        }}
        okText="Lưu cập nhật"
        confirmLoading={updateStatusMutation.isPending}
        width={700}
      >
        {detailItem && (
          <div>
            <p>
              <strong>Người gửi:</strong> {detailItem.name || "-"}
            </p>
            <p>
              <strong>Email:</strong> {detailItem.email || "-"}
            </p>
            <p>
              <strong>Điện thoại:</strong> {detailItem.phone || "Không có"}
            </p>
            <p>
              <strong>Tiêu đề:</strong> {detailItem.subject || "-"}
            </p>
            <p>
              <strong>Ngày gửi:</strong> {formatDateTime(detailItem.createdAt)}
            </p>
            <p>
              <strong>Nội dung:</strong>
            </p>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: 12,
                whiteSpace: "pre-wrap",
                marginBottom: 12,
              }}
            >
              {detailItem.message || "-"}
            </div>

            <div style={{ marginBottom: 12 }}>
              <strong>Trạng thái:</strong>
              <Select
                value={nextStatus}
                options={STATUS_OPTIONS.filter((x) => x.value !== "all")}
                style={{ width: 180, marginLeft: 8 }}
                onChange={setNextStatus}
              />
            </div>
            <Input.TextArea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú nội bộ cho admin..."
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
