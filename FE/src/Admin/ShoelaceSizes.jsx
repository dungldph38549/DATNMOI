import React, { useMemo, useState } from "react";
import { Table, Button, Modal, Form, Input, message, Empty } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createShoelaceSize,
  deleteShoelaceSize,
  getAllShoelaceSizes,
  updateShoelaceSize,
} from "../api/index";
import {
  FaRulerHorizontal,
  FaPlus,
  FaPen,
  FaTrash,
  FaLayerGroup,
  FaClock,
} from "react-icons/fa";

const T = {
  primary: "#0d9488",
  primaryDark: "#0f766e",
  primarySoft: "rgba(13,148,136,0.12)",
  primaryGlow: "rgba(13,148,136,0.35)",
  text: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
  bg: "#f1f5f9",
  card: "#ffffff",
};

const cardBase = {
  background: T.card,
  borderRadius: 20,
  border: `1px solid ${T.border}`,
  boxShadow: "0 4px 24px rgba(15, 23, 42, 0.06)",
};

export default function ShoelaceSizes() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-shoelace-sizes"],
    queryFn: getAllShoelaceSizes,
  });

  const list = data?.data ?? (Array.isArray(data) ? data : []);
  const total = list.length;
  const latest = useMemo(() => list?.[0]?.name || "—", [list]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => String(row?.name || "").toLowerCase().includes(q));
  }, [list, search]);

  const createMutation = useMutation({
    mutationFn: createShoelaceSize,
    onSuccess: () => {
      message.success("Đã thêm kích thước dây giày");
      queryClient.invalidateQueries({ queryKey: ["admin-shoelace-sizes"] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Không thể tạo");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateShoelaceSize(id, payload),
    onSuccess: () => {
      message.success("Đã cập nhật");
      queryClient.invalidateQueries({ queryKey: ["admin-shoelace-sizes"] });
      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Không thể cập nhật");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteShoelaceSize,
    onSuccess: () => {
      message.success("Đã xóa");
      queryClient.invalidateQueries({ queryKey: ["admin-shoelace-sizes"] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Không thể xóa");
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
    const payload = { name: values.name?.trim() };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    {
      title: (
        <span style={{ fontSize: 11, letterSpacing: "0.08em", color: T.textMuted, fontWeight: 700 }}>
          TÊN HIỂN THỊ
        </span>
      ),
      dataIndex: "name",
      key: "name",
      render: (value) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "4px 0",
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${T.primarySoft} 0%, rgba(94, 234, 212, 0.25) 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.primaryDark,
              flexShrink: 0,
            }}
          >
            <FaRulerHorizontal size={16} />
          </span>
          <span style={{ fontWeight: 700, color: T.text, fontSize: 15 }}>{value}</span>
        </div>
      ),
    },
    {
      title: (
        <span style={{ fontSize: 11, letterSpacing: "0.08em", color: T.textMuted, fontWeight: 700 }}>
          THAO TÁC
        </span>
      ),
      key: "action",
      width: 200,
      align: "right",
      render: (_, record) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={() => openEdit(record)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 10,
              border: `1px solid ${T.border}`,
              background: "#fff",
              color: T.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = T.primary;
              e.currentTarget.style.color = T.primaryDark;
              e.currentTarget.style.background = T.primarySoft;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = T.border;
              e.currentTarget.style.color = T.text;
              e.currentTarget.style.background = "#fff";
            }}
          >
            <FaPen size={12} /> Sửa
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Xóa mục này?")) deleteMutation.mutate(record._id);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              background: "#fff",
              color: "#b91c1c",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fef2f2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
            }}
          >
            <FaTrash size={12} /> Xóa
          </button>
        </div>
      ),
    },
  ];

  return (
    <div
      style={{
        padding: "28px 24px 40px",
        background: `linear-gradient(180deg, ${T.bg} 0%, #e8eef4 100%)`,
        minHeight: "100%",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Hero */}
      <div
        style={{
          ...cardBase,
          marginBottom: 20,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "55%",
            height: "100%",
            background: `radial-gradient(ellipse at top right, ${T.primaryGlow} 0%, transparent 65%)`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            padding: "28px 28px 24px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start", maxWidth: 560 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: `0 12px 28px ${T.primaryGlow}`,
                flexShrink: 0,
              }}
            >
              <FaLayerGroup size={26} />
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: T.primaryDark,
                  textTransform: "uppercase",
                }}
              >
                Phụ kiện
              </p>
              <h1
                style={{
                  margin: "6px 0 10px",
                  fontSize: 26,
                  fontWeight: 800,
                  color: T.text,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                Kích thước dây giày
              </h1>
              <p style={{ margin: 0, color: T.textMuted, fontSize: 14, lineHeight: 1.55 }}>
                Quản lý độ dài / quy cách dây riêng — không dùng chung với size giày trong sản phẩm.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreate}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 22px",
              borderRadius: 14,
              border: "none",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: "#fff",
              background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%)`,
              boxShadow: `0 8px 24px ${T.primaryGlow}`,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = `0 12px 32px ${T.primaryGlow}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = `0 8px 24px ${T.primaryGlow}`;
            }}
          >
            <FaPlus size={14} /> Thêm kích thước
          </button>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
            padding: "0 28px 28px",
            position: "relative",
          }}
        >
          <div
            style={{
              padding: "16px 18px",
              borderRadius: 16,
              background: `linear-gradient(135deg, #fff 0%, ${T.primarySoft} 100%)`,
              border: `1px solid rgba(13,148,136,0.15)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <FaLayerGroup style={{ color: T.primaryDark, opacity: 0.85 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted }}>Tổng mục</span>
            </div>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: T.text, letterSpacing: "-0.03em" }}>
              {total}
            </p>
          </div>
          <div
            style={{
              padding: "16px 18px",
              borderRadius: 16,
              background: "#f8fafc",
              border: `1px solid ${T.border}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <FaClock style={{ color: T.textMuted }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted }}>Thêm gần nhất</span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                color: T.text,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={latest}
            >
              {latest}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar + table */}
      <div style={{ ...cardBase, padding: "4px 4px 8px" }}>
        <div
          style={{
            padding: "16px 20px 12px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span style={{ fontWeight: 700, color: T.text, fontSize: 15 }}>Danh sách</span>
          <Input
            allowClear
            placeholder="Tìm theo tên…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              maxWidth: 280,
              borderRadius: 12,
              height: 40,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          />
        </div>

        {!isLoading && filteredList.length === 0 ? (
          <div style={{ padding: "48px 24px" }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: T.textMuted }}>
                  {search.trim() ? "Không có mục khớp bộ lọc." : "Chưa có kích thước — nhấn “Thêm kích thước” để bắt đầu."}
                </span>
              }
            />
          </div>
        ) : (
          <Table
            rowKey="_id"
            loading={isLoading}
            dataSource={filteredList}
            columns={columns}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              hideOnSinglePage: filteredList.length <= 10,
              showTotal: (t) => (
                <span style={{ color: T.textMuted, fontSize: 13 }}>{t} mục</span>
              ),
            }}
            locale={{ emptyText: " " }}
            style={{ padding: "0 8px 8px" }}
          />
        )}
      </div>

      <Modal
        title={null}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingId(null);
          form.resetFields();
        }}
        footer={null}
        width={440}
        styles={{
          body: { padding: 0 },
        }}
        centered
      >
        <div
          style={{
            padding: "28px 28px 24px",
            borderBottom: `1px solid ${T.border}`,
            background: `linear-gradient(180deg, ${T.primarySoft} 0%, #fff 100%)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: T.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <FaRulerHorizontal />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>
                {editingId ? "Chỉnh sửa" : "Thêm mới"}
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>
                Tên hiển thị khi gắn vào UI phụ kiện (VD: 120cm, 140cm…)
              </p>
            </div>
          </div>
        </div>
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ padding: "24px 28px 28px" }}>
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 600, color: T.text }}>Tên hiển thị</span>}
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input
              placeholder="VD: 120cm, 140cm, Bộ 2 sợi…"
              size="large"
              style={{
                borderRadius: 12,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                padding: "10px 14px",
              }}
            />
          </Form.Item>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <Button
              size="large"
              onClick={() => {
                setModalOpen(false);
                setEditingId(null);
                form.resetFields();
              }}
              style={{ borderRadius: 12, minWidth: 100, height: 44 }}
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={createMutation.isPending || updateMutation.isPending}
              style={{
                borderRadius: 12,
                minWidth: 120,
                height: 44,
                fontWeight: 700,
                background: T.primary,
                borderColor: T.primary,
                boxShadow: `0 6px 16px ${T.primaryGlow}`,
              }}
            >
              {editingId ? "Cập nhật" : "Tạo mới"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
