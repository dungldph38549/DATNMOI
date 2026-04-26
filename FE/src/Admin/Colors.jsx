import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Tag,
  ColorPicker,
  Tooltip,
  Popconfirm,
  Space,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BgColorsOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColor, deleteColor, getAllColors, updateColor } from "../api/index";

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

const normalizeHex = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  const hex = withHash.toUpperCase();
  return /^#[0-9A-F]{6}$/.test(hex) ? hex : raw;
};

/** rgb(255, 0, 0) từ HEX hợp lệ */
const hexToRgbString = (value) => {
  const hex = normalizeHex(value);
  if (!/^#[0-9A-F]{6}$/.test(hex)) return "";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
};

const hexToRgbParts = (value) => {
  const hex = normalizeHex(value);
  if (!/^#[0-9A-F]{6}$/.test(hex)) return null;
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
};

const rgbStringToParts = (rgbStr) => {
  const parsed = parseRgbInput(rgbStr);
  if (!parsed) return null;
  const m = String(parsed).match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!m) return null;
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
};

const rgbDistanceSq = (a, b) => {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
};

/**
 * Chuẩn hóa nhập: rgb(10, 20, 30) / rgba(...) / "10 20 30" / "10,20,30"
 * Trả về chuỗi rgb(r, g, b) hoặc null
 */
const parseRgbInput = (value) => {
  const s = String(value || "").trim();
  if (!s) return null;
  const rgba =
    s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i) ||
    s.match(/^rgba?\(\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/i);
  if (rgba) {
    const r = Number(rgba[1]);
    const g = Number(rgba[2]);
    const b = Number(rgba[3]);
    if ([r, g, b].every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      return `rgb(${r}, ${g}, ${b})`;
    }
    return null;
  }
  const parts = s.split(/[\s,;]+/).filter(Boolean);
  if (parts.length === 3) {
    const r = Number(parts[0]);
    const g = Number(parts[1]);
    const b = Number(parts[2]);
    if ([r, g, b].every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return null;
};

const cssColorForPreview = (hex, rgbStr) => {
  const rgb = parseRgbInput(rgbStr);
  if (rgb) return rgb;
  const h = normalizeHex(hex);
  return /^#[0-9A-F]{6}$/.test(h) ? h : "#E2E8F0";
};

export default function Colors() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const watchedCode = Form.useWatch("code", form);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const prevAutoMatchedNameRef = useRef(null);

  const pickerHex = useMemo(() => {
    const h = normalizeHex(watchedCode || "");
    return /^#[0-9A-F]{6}$/.test(h) ? h : "#000000";
  }, [watchedCode]);

  const applyHexToForm = (hexRaw) => {
    const hex = normalizeHex(hexRaw);
    if (!/^#[0-9A-F]{6}$/.test(hex)) return;
    form.setFieldsValue({
      code: hex,
      rgb: hexToRgbString(hex),
    });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-colors"],
    queryFn: getAllColors,
  });

  const list = data?.data ?? (Array.isArray(data) ? data : []);
  const totalColors = list.length;
  const latestColor = useMemo(() => list?.[0]?.name || "Chưa có", [list]);

  // Auto-fill "Tên màu" theo màu đã tồn tại (lookup theo HEX trước).
  // Nếu không khớp và tên hiện tại đang là tên auto điền trước đó => xóa để tránh sai.
  useEffect(() => {
    if (!modalOpen) return;
    const hex = normalizeHex(watchedCode || "");
    if (!/^#[0-9A-F]{6}$/.test(hex)) return;

    const rgb = hexToRgbString(hex);
    const currentParts = hexToRgbParts(hex);

    const matchedByCode = (list || []).find(
      (c) => normalizeHex(c?.code) === hex,
    );

    const matchedByRgb = matchedByCode
      ? null
      : (list || []).find((c) => {
          if (!c?.rgb) return false;
          const normalizedRgb = parseRgbInput(c.rgb);
          return normalizedRgb && normalizedRgb === rgb;
        });

    let matched = matchedByCode || matchedByRgb;

    // Nếu không khớp exact HEX/RGB thì chọn màu "gần nhất" theo khoảng cách RGB.
    // Việc này giúp trường hợp user kéo "gần tới" swatch nhưng không ra đúng HEX tuyệt đối.
    if (!matched && currentParts) {
      let best = null;
      let bestDist = Number.POSITIVE_INFINITY;

      for (const c of list || []) {
        const parts = hexToRgbParts(c?.code) || rgbStringToParts(c?.rgb);
        const dist = rgbDistanceSq(currentParts, parts);
        if (dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      }

      // Ngưỡng xấp xỉ: ~sqrt(bestDist) < 30 (trên tổng bình phương RGB)
      // Điều chỉnh nếu bạn thấy match quá rộng.
      const thresholdSq = 900;
      if (best && bestDist <= thresholdSq) {
        matched = best;
      }
    }

    const currentName = form.getFieldValue("name");
    const currentNameStr = String(currentName || "").trim();
    const prevAutoName = prevAutoMatchedNameRef.current;

    // Nếu không match, vẫn cần update "Tên màu" để user thấy thay đổi khi kéo.
    // Fallback: hiển thị theo HEX để đảm bảo luôn có "tên" cho đúng shade.
    const fallbackName = `Màu ${hex}`;
    const nextAutoName = matched?.name || fallbackName;

    // Chỉ ghi đè khi:
    // - user chưa nhập gì (currentName rỗng), hoặc
    // - tên hiện tại đúng là tên vừa auto điền trước đó (đang đồng bộ).
    if (!currentNameStr || currentNameStr === prevAutoName) {
      prevAutoMatchedNameRef.current = nextAutoName;
      form.setFieldsValue({ name: nextAutoName });
    }
  }, [watchedCode, list, modalOpen, form]);

  const createMutation = useMutation({
    mutationFn: createColor,
    onSuccess: () => {
      message.success("Tạo màu thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-colors"] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Không thể tạo màu");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateColor(id, payload),
    onSuccess: () => {
      message.success("Cập nhật màu thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-colors"] });
      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Không thể cập nhật màu");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteColor,
    onSuccess: () => {
      message.success("Đã xóa màu");
      queryClient.invalidateQueries({ queryKey: ["admin-colors"] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Không thể xóa màu");
    },
  });

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    prevAutoMatchedNameRef.current = null;
    form.setFieldsValue({
      code: "#000000",
      rgb: hexToRgbString("#000000"),
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingId(record._id);
    prevAutoMatchedNameRef.current = record?.name || null;
    const hex = normalizeHex(record.code);
    const rgbVal =
      (record.rgb && String(record.rgb).trim()) || hexToRgbString(hex) || "";
    form.setFieldsValue({ name: record.name, code: hex, rgb: rgbVal });
    setModalOpen(true);
  };

  const onFinish = (values) => {
    const hex = normalizeHex(values.code);
    const rgbParsed = parseRgbInput(values.rgb);
    const rgbFinal = rgbParsed || hexToRgbString(hex) || "";
    const payload = {
      name: values.name?.trim(),
      code: hex,
      ...(rgbFinal ? { rgb: rgbFinal } : {}),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    {
      title: "Màu",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "1px solid #CBD5E1",
              background: cssColorForPreview(record?.code, record?.rgb),
              boxShadow: "0 4px 10px rgba(15,23,42,0.10)",
            }}
          />
          <Tag
            color="blue"
            style={{
              marginRight: 0,
              borderRadius: 999,
              borderColor: "#BFDBFE",
              color: "#1E40AF",
              fontWeight: 600,
            }}
          >
            COLOR
          </Tag>
          <span style={{ fontWeight: 700, color: T.text, fontSize: 15 }}>{record?.name}</span>
        </div>
      ),
    },
    {
      title: "HEX",
      dataIndex: "code",
      key: "code",
      width: 100,
      render: (value) => (
        <code style={{ fontWeight: 700, color: "#334155" }}>{normalizeHex(value)}</code>
      ),
    },
    {
      title: "RGB",
      dataIndex: "rgb",
      key: "rgb",
      width: 200,
      render: (_, record) => {
        const rgb =
          (record?.rgb && String(record.rgb).trim()) ||
          hexToRgbString(record?.code) ||
          "—";
        return (
          <code style={{ fontWeight: 600, color: "#475569", fontSize: 12 }}>{rgb}</code>
        );
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: 170,
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="Chỉnh sửa màu">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              style={{
                borderRadius: 8,
                borderColor: "#D1D5DB",
                color: "#334155",
              }}
            />
          </Tooltip>
          <Tooltip title="Xóa màu">
            <Popconfirm
              title="Xóa màu này?"
              description={`Màu "${record?.name}" sẽ bị xóa khỏi hệ thống.`}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteMutation.mutate(record._id)}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                style={{ borderRadius: 8 }}
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
            "radial-gradient(circle at 100% -10%, rgba(191, 219, 254, 0.40) 0%, rgba(255, 255, 255, 0) 42%)",
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
              Quản lý Màu
            </h2>
            <p style={{ margin: "8px 0 0", color: T.textMuted, fontSize: 14 }}>
              Quản lý danh sách màu để dùng khi tạo biến thể sản phẩm
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
            Thêm màu
          </Button>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              minWidth: 165,
              borderRadius: 14,
              border: "1px solid #FDE68A",
              background: T.primarySoft,
              color: "#92400E",
              padding: "10px 12px",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.85 }}>Tổng màu</div>
            <div style={{ marginTop: 2, fontSize: 20, fontWeight: 800 }}>{totalColors}</div>
          </div>
          <div
            style={{
              minWidth: 220,
              borderRadius: 14,
              border: `1px solid ${T.border}`,
              background: "#FFFFFF",
              color: T.textMuted,
              padding: "10px 12px",
            }}
          >
            <div style={{ fontSize: 12 }}>Mới nhất</div>
            <div style={{ marginTop: 2, fontSize: 18, fontWeight: 700, color: T.text }}>
              {latestColor}
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
                <BgColorsOutlined style={{ fontSize: 20, marginBottom: 8 }} />
                <div>Chưa có màu nào. Bắt đầu bằng cách thêm màu đầu tiên.</div>
              </div>
            ),
          }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </div>

      <Modal
        title={editingId ? "Chỉnh sửa màu" : "Thêm màu mới"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingId(null);
          prevAutoMatchedNameRef.current = null;
          form.resetFields();
        }}
        footer={null}
        centered
        styles={{
          content: { borderRadius: 18, overflow: "hidden", border: "1px solid rgba(148, 163, 184, 0.25)" },
          header: {
            background: "linear-gradient(180deg, rgba(191,219,254,0.25), rgba(255,255,255,1))",
            paddingBottom: 14,
          },
        }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="name"
            label="Tên màu"
            rules={[{ required: true, message: "Vui lòng nhập tên màu" }]}
          >
            <Input placeholder="VD: Đen, Trắng, Đỏ..." />
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>
              Chọn màu (kéo trong bảng màu)
            </div>
            <div
              style={{
                padding: "16px",
                background: "#F9FBFF",
                borderRadius: 14,
                border: `1px solid ${T.border}`,
              }}
            >
              <ColorPicker
                value={pickerHex}
                disabledAlpha
                showText
                format="hex"
                size="large"
                onChange={(color) => {
                  const hexStr =
                    color && typeof color.toHexString === "function"
                      ? color.toHexString()
                      : "";
                  const hex = normalizeHex(hexStr);
                  if (/^#[0-9A-F]{6}$/.test(hex)) {
                    applyHexToForm(hex);
                  }
                }}
                styles={{
                  popup: {
                    root: { zIndex: 1100 },
                  },
                }}
              />
              <p style={{ margin: "12px 0 0", fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
                Mở bảng màu và kéo để chọn; giá trị HEX và RGB cập nhật tự động. Hoặc dán mã HEX ở ô bên dưới.
              </p>
            </div>
          </div>

          <Form.Item
            name="code"
            label="Mã màu (HEX)"
            rules={[
              { required: true, message: "Vui lòng nhập mã màu" },
              {
                validator: (_, value) => {
                  const normalized = normalizeHex(value);
                  return /^#[0-9A-F]{6}$/.test(normalized)
                    ? Promise.resolve()
                    : Promise.reject(new Error("Mã màu phải có dạng #RRGGBB"));
                },
              },
            ]}
          >
            <Input
              placeholder="VD: #000000"
              onBlur={(e) => applyHexToForm(e.target.value)}
              onChange={(e) => {
                const v = e.target.value;
                const hex = normalizeHex(v);
                if (/^#[0-9A-F]{6}$/.test(hex)) {
                  form.setFieldsValue({ rgb: hexToRgbString(hex) });
                }
              }}
            />
          </Form.Item>

          <Form.Item name="rgb" label="Giá trị RGB (tự động theo màu đã chọn)">
            <Input readOnly placeholder="rgb(…)" style={{ color: "#475569", fontWeight: 600 }} />
          </Form.Item>

          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const hexVal = normalizeHex(getFieldValue("code"));
              const rgbField = getFieldValue("rgb");
              const validHex = /^#[0-9A-F]{6}$/.test(hexVal);
              const preview = cssColorForPreview(hexVal, rgbField);
              const rgbShow =
                parseRgbInput(rgbField) || (validHex ? hexToRgbString(hexVal) : "");
              return (
                <div
                  style={{
                    marginBottom: 12,
                    padding: "12px 14px",
                    background: "#F8FAFC",
                    borderRadius: 12,
                    border: `1px solid ${T.border}`,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, marginBottom: 8 }}>
                    Xem trước
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        border: "1px solid #CBD5E1",
                        background: preview,
                        boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
                      }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <code style={{ color: "#334155", fontWeight: 700, fontSize: 13 }}>
                        HEX: {validHex ? hexVal : "—"}
                      </code>
                      <code style={{ color: "#475569", fontWeight: 600, fontSize: 12 }}>
                        RGB: {rgbShow || "—"}
                      </code>
                    </div>
                  </div>
                </div>
              );
            }}
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}
              style={{ borderRadius: 10, fontWeight: 700 }}
            >
              {editingId ? "Cập nhật" : "Tạo màu"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
