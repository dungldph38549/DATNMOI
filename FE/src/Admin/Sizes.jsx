import React, { useMemo, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Tag,
  Tooltip,
  Popconfirm,
  Space,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  NumberOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSize, deleteSize, getAllSizes, updateSize } from "../api/index";

const T = {
  primary: "#D97706",
  primarySoft: "rgba(217,119,6,0.10)",
  primaryStrong: "#B45309",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  bg: "#F6F8FC",
  card: "#ffffff",
  dark: "#111827",
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)",
              display: "grid",
              placeItems: "center",
              color: "#92400E",
              fontSize: 16,
            }}
          >
            <NumberOutlined />
          </div>
          <Tag
            color="gold"
            style={{
              marginRight: 0,
              borderRadius: 999,
              borderColor: "#FDE68A",
              color: "#92400E",
              fontWeight: 600,
            }}
          >
            SIZE
          </Tag>
          <span style={{ fontWeight: 700, color: T.text, fontSize: 15 }}>{value}</span>
        </div>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 170,
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="Chỉnh sửa size">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              style={{
                borderRadius: 8,
                borderColor: "rgba(148, 163, 184, 0.4)",
                color: "#E2E8F0",
                background: "rgba(15, 23, 42, 0.7)",
              }}
            />
          </Tooltip>
          <Tooltip title="Xóa size">
            <Popconfirm
              title="Xóa size này?"
              description={`Size "${record?.name}" sẽ bị xóa khỏi hệ thống.`}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteMutation.mutate(record._id)}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                style={{
                  borderRadius: 8,
                  borderColor: "rgba(248, 113, 113, 0.65)",
                  color: "#DC2626",
                  background: "rgba(127, 29, 29, 0.16)",
                }}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
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
          border: "1px solid rgba(148, 163, 184, 0.25)",
          borderRadius: 20,
          padding: 22,
          marginBottom: 18,
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
          backgroundImage:
            "radial-gradient(circle at 100% -10%, rgba(253, 230, 138, 0.35) 0%, rgba(255, 255, 255, 0) 40%)",
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
            <h2
              style={{
                margin: 0,
                color: T.dark,
                fontSize: 26,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
              }}
            >
              Quản lý Size
            </h2>
            <p
              style={{
                margin: "8px 0 0",
                color: T.textMuted,
                fontSize: 14,
              }}
            >
              Quản lý danh sách size để dùng khi tạo biến thể sản phẩm
            </p>
          </div>
          <Button
            type="primary"
            onClick={openCreate}
            icon={<PlusOutlined />}
            style={{
              borderRadius: 999,
              fontWeight: 700,
              background: T.primary,
              borderColor: T.primary,
              height: 42,
              paddingInline: 18,
              boxShadow: "0 10px 20px rgba(217,119,6,0.32)",
            }}
          >
            Thêm size
          </Button>
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              minWidth: 165,
              borderRadius: 14,
              border: "1px solid rgba(245,158,11,0.45)",
              background: T.primarySoft,
              color: "#92400E",
              padding: "10px 12px",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.85 }}>Tổng size</div>
            <div style={{ marginTop: 2, fontSize: 20, fontWeight: 800 }}>{totalSizes}</div>
          </div>
          <div
            style={{
              minWidth: 190,
              borderRadius: 14,
              border: `1px solid ${T.border}`,
              background: "#FFFFFF",
              color: T.textMuted,
              padding: "10px 12px",
            }}
          >
            <div style={{ fontSize: 12 }}>Mới nhất</div>
            <div style={{ marginTop: 2, fontSize: 18, fontWeight: 700, color: T.text }}>
              {latestSize}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          background: T.card,
          border: "1px solid rgba(148, 163, 184, 0.25)",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
        }}
      >
        <Table
          rowKey="_id"
          loading={isLoading}
          dataSource={list}
          columns={columns}
          locale={{
            emptyText: (
              <div style={{ padding: "28px 0", color: T.textMuted }}>
                <AppstoreOutlined style={{ fontSize: 20, marginBottom: 8 }} />
                <div>Chưa có size nào. Bắt đầu bằng cách thêm size đầu tiên.</div>
              </div>
            ),
          }}
          style={{ background: "#fff" }}
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
        centered
        styles={{
          content: {
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(148, 163, 184, 0.25)",
          },
          header: {
            background: "linear-gradient(180deg, rgba(251,191,36,0.12), rgba(255,255,255,1))",
            paddingBottom: 14,
          },
        }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="name"
            label="Tên size"
            rules={[{ required: true, message: "Vui lòng nhập size" }]}
          >
            <Input
              placeholder="VD: 39, 40, 41, XL..."
              style={{
                color: T.text,
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}
              style={{
                borderRadius: 10,
                fontWeight: 700,
                background: T.primary,
                borderColor: T.primaryStrong,
              }}
            >
              {editingId ? "Cập nhật" : "Tạo size"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
