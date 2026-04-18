import React, { useMemo, useState } from "react";
import { Table, Button, Modal, Form, Input, message, Tag } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSize, deleteSize, getAllSizes, updateSize } from "../api/index";

const T = {
  primary: "#f49d25",
  primarySoft: "rgba(244,157,37,0.10)",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  bg: "#F8F7F5",
  card: "#ffffff",
};

export default function Sizes() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-sizes"],
    queryFn: getAllSizes,
  });

  const list = data?.data ?? (Array.isArray(data) ? data : []);
  const totalSizes = list.length;
  const latestSize = useMemo(() => list?.[0]?.name || "Chưa có", [list]);

  const createMutation = useMutation({
    mutationFn: createSize,
    onSuccess: () => {
      message.success("Tạo kích cỡ thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-sizes"] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Không thể tạo kích cỡ");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateSize(id, payload),
    onSuccess: () => {
      message.success("Cập nhật kích cỡ thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-sizes"] });
      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Không thể cập nhật kích cỡ");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSize,
    onSuccess: () => {
      message.success("Đã xóa kích cỡ");
      queryClient.invalidateQueries({ queryKey: ["admin-sizes"] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Không thể xóa kích cỡ");
    },
  });

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingId(record._id);
    form.setFieldsValue({ name: record.name });
    setModalOpen(true);
  };

  const onFinish = (values) => {
    const payload = {
      name: values.name?.trim(),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    {
      title: "Tên size",
      dataIndex: "name",
      key: "name",
      render: (value) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tag
            color="gold"
            style={{
              marginRight: 0,
              borderRadius: 999,
              borderColor: "#FDE68A",
              color: "#92400E",
            }}
          >
            SIZE
          </Tag>
          <span style={{ fontWeight: 700, color: T.text }}>{value}</span>
        </div>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 140,
      render: (_, record) => (
        <>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            Sửa
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => {
              if (window.confirm("Xóa size này?")) deleteMutation.mutate(record._id);
            }}
          >
            Xóa
          </Button>
        </>
      ),
    },
  ];

  return (
    <div
      style={{
        padding: 24,
        background: T.bg,
        minHeight: "100%",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: T.text }}>Quản lý Size</h2>
            <p style={{ margin: "6px 0 0", color: T.textMuted, fontSize: 13 }}>
              Quản lý danh sách size để dùng khi tạo biến thể sản phẩm
            </p>
          </div>
          <Button
            type="primary"
            onClick={openCreate}
            style={{
              borderRadius: 999,
              fontWeight: 700,
              background: T.primary,
              borderColor: T.primary,
              boxShadow: "0 6px 16px rgba(244,157,37,0.28)",
            }}
          >
            Thêm size
          </Button>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Tag
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              borderColor: "#FDE68A",
              background: T.primarySoft,
              color: "#92400E",
              marginRight: 0,
              fontWeight: 600,
            }}
          >
            Tổng size: {totalSizes}
          </Tag>
          <Tag
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              borderColor: T.border,
              color: T.textMuted,
              marginRight: 0,
              fontWeight: 600,
            }}
          >
            Mới nhất: {latestSize}
          </Tag>
        </div>
      </div>

      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <Table
          rowKey="_id"
          loading={isLoading}
          dataSource={list}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </div>

      <Modal
        title={editingId ? "Chỉnh sửa size" : "Thêm size mới"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingId(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="name"
            label="Tên size"
            rules={[{ required: true, message: "Vui lòng nhập size" }]}
          >
            <Input placeholder="VD: 39, 40, 41, XL..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}
              style={{ borderRadius: 10, fontWeight: 700 }}
            >
              {editingId ? "Cập nhật" : "Tạo size"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
