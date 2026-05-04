import React, { useState } from "react";
import {
  Table,
  Button,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  message,
  Space,
  Row,
  Col,
  Tag,
  Tooltip,
  Slider,
  Switch,
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GiftOutlined,
  CopyOutlined,
  PoweroffOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import {
  getAdminVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  getAllProducts,
  getAllCategories,
  toggleVoucherActive,
} from "../api/index";
import dayjs from "dayjs";

const T = {
  primary: "#f49d25",
  primarySoft: "rgba(244,157,37,0.12)",
  primaryStrong: "#d97706",
  brown: "#92400e",
  brownSoft: "#b45309",
  brownBg: "linear-gradient(145deg, #78350f 0%, #92400e 55%, #7c2d12 100%)",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  bg: "#F1F5F9",
  card: "#ffffff",
  radius: 12,
};

const normList = (data) => data?.data ?? (Array.isArray(data) ? data : []);

function PercentValueControl({ value = 10, onChange }) {
  const v = value == null || Number.isNaN(Number(value)) ? 10 : Number(value);
  return (
    <Row gutter={[12, 8]} align="middle" wrap={false}>
      <Col flex="1 1 auto" style={{ minWidth: 0 }}>
        <Slider min={1} max={100} value={v} onChange={(n) => onChange?.(n)} tooltip={{ formatter: (n) => `${n}%` }} />
      </Col>
      <Col flex="none" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <InputNumber min={1} max={100} value={v} onChange={(n) => onChange?.(n ?? 1)} style={{ width: 100 }} />
        <span style={{ color: T.textMuted, fontSize: 13, fontWeight: 600 }}>%</span>
      </Col>
    </Row>
  );
}

function SectionCard({ title, children }) {
  return (
    <div
      style={{
        background: T.card,
        borderRadius: 16,
        border: `1px solid ${T.border}`,
        padding: "20px 22px",
        marginBottom: 20,
        boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)",
      }}
    >
      <h3
        style={{
          margin: "0 0 18px",
          fontSize: 15,
          fontWeight: 700,
          color: T.text,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function VoucherManager() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [formPageOpen, setFormPageOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const voucherType = Form.useWatch("type", form);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-vouchers"],
    queryFn: getAdminVouchers,
  });
  const { data: productData } = useQuery({
    queryKey: ["admin-voucher-products"],
    queryFn: () => getAllProducts({ page: 0, limit: 500 }),
  });
  const { data: categoryData } = useQuery({
    queryKey: ["admin-voucher-categories"],
    queryFn: () => getAllCategories("all"),
  });

  const list = normList(data);
  const productList = Array.isArray(productData?.data)
    ? productData.data
    : Array.isArray(productData?.data?.data)
      ? productData.data.data
      : [];
  const categoryList = Array.isArray(categoryData?.data)
    ? categoryData.data
    : Array.isArray(categoryData)
      ? categoryData
      : [];

  const productOptions = productList.map((p) => ({
    value: p?._id,
    label: p?.name || p?._id,
  }));

  const categoryOptions = categoryList.map((c) => ({
    value: c?._id,
    label: c?.name || c?._id,
  }));

  const createMutation = useMutation({
    mutationFn: createVoucher,
    onSuccess: () => {
      message.success("Tạo voucher thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
      setEditingId(null);
      setFormPageOpen(false);
      form.resetFields();
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Lỗi");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateVoucher(id, payload),
    onSuccess: () => {
      message.success("Cập nhật thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
      setFormPageOpen(false);
      setEditingId(null);
      form.resetFields();
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Lỗi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVoucher,
    onSuccess: () => {
      message.success("Đã xóa voucher");
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Lỗi");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleVoucherActive,
    onSuccess: () => {
      message.success("Đã cập nhật trạng thái");
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Lỗi");
    },
  });

  const copyCode = (code) => {
    const c = String(code || "");
    if (!c) return;
    navigator.clipboard.writeText(c).then(
      () => message.success("Đã copy mã"),
      () => message.error("Không copy được"),
    );
  };

  const voucherStatusMeta = (record) => {
    const now = dayjs();
    const end = record.endDate ? dayjs(record.endDate) : null;
    const active =
      record.isActive !== undefined
        ? record.isActive
        : record.status === "active";
    if (!active) {
      return { label: "Tắt", color: "default" };
    }
    if (end && end.isBefore(now)) {
      return { label: "Hết hạn", color: "error" };
    }
    return { label: "Đang chạy", color: "success" };
  };

  const onFinish = (values) => {
    const usageLimit =
      values.usageLimit === undefined || values.usageLimit === null
        ? 1
        : Number(values.usageLimit);
    const payload = {
      code: values.code?.trim().toUpperCase(),
      description: values.description,
      type: values.type || "percent",
      value: values.value,
      maxDiscount: values.maxDiscount ?? 0,
      minOrderValue: values.minOrderValue || 0,
      startDate: values.startDate?.toDate?.() || values.startDate,
      endDate: values.endDate?.toDate?.() || values.endDate,
      usageLimit: Number.isNaN(usageLimit) ? 1 : usageLimit,
      userLimit:
        values.userLimit === undefined || values.userLimit === null
          ? 1
          : Number(values.userLimit),
      isActive: values.isActive !== false,
      applicableProducts: Array.isArray(values.applicableProducts)
        ? values.applicableProducts
        : [],
      applicableCategories: Array.isArray(values.applicableCategories)
        ? values.applicableCategories
        : [],
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (record) => {
    setEditingId(record._id);
    const type = record.type || record.discountType || "percent";
    const value = record.value ?? record.discountValue;
    form.setFieldsValue({
      code: record.code,
      description: record.description,
      type,
      value,
      maxDiscount: record.maxDiscount ?? record.maxDiscountAmount ?? 0,
      minOrderValue: record.minOrderValue || 0,
      startDate: record.startDate ? dayjs(record.startDate) : null,
      endDate: record.endDate ? dayjs(record.endDate) : null,
      usageLimit: record.usageLimit ?? 1,
      userLimit: record.userLimit ?? 1,
      isActive:
        record.isActive !== undefined
          ? record.isActive
          : record.status === "active",
      applicableProducts: Array.isArray(record.applicableProducts)
        ? record.applicableProducts.map((id) => String(id))
        : Array.isArray(record.applicableProductIds)
          ? record.applicableProductIds.map((id) => String(id))
          : [],
      applicableCategories: Array.isArray(record.applicableCategories)
        ? record.applicableCategories.map((id) => String(id))
        : [],
    });
    setFormPageOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({
      type: "percent",
      value: 10,
      maxDiscount: 0,
      minOrderValue: 0,
      usageLimit: 100,
      userLimit: 1,
      isActive: true,
      applicableProducts: [],
      applicableCategories: [],
    });
    setFormPageOpen(true);
  };

  const closeFormPage = () => {
    setFormPageOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const columns = [
    {
      title: "Mã",
      dataIndex: "code",
      key: "code",
      width: 150,
      render: (value) => (
        <Space size={6}>
          <Tag
            style={{
              marginRight: 0,
              borderRadius: 8,
              borderColor: T.primary,
              background: T.primarySoft,
              color: "#92400E",
              fontWeight: 700,
            }}
          >
            {value}
          </Tag>
          <Tooltip title="Copy mã">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyCode(value)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: "Loại",
      key: "type",
      width: 90,
      render: (_, r) => {
        const t = r.type || r.discountType || "percent";
        return t === "percent" ? "%" : "Cố định";
      },
    },
    {
      title: "Giá trị",
      key: "value",
      width: 100,
      render: (_, r) => {
        const t = r.type || r.discountType || "percent";
        const v = r.value ?? r.discountValue;
        return t === "percent" ? `${v}%` : `${Number(v).toLocaleString("vi-VN")}đ`;
      },
    },
    {
      title: "Đã dùng / Tổng",
      key: "usage",
      width: 120,
      render: (_, r) => {
        const lim = Number(r.usageLimit ?? 1);
        const used = Number(r.usedCount ?? 0);
        const label = lim === 0 ? `${used} / ∞` : `${used} / ${lim}`;
        return label;
      },
    },
    {
      title: "Hạn",
      dataIndex: "endDate",
      key: "endDate",
      width: 110,
      render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "—"),
    },
    {
      title: "Trạng thái",
      key: "st",
      width: 120,
      render: (_, r) => {
        const m = voucherStatusMeta(r);
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: 200,
      render: (_, record) => (
        <Space size={4} wrap>
          <Tooltip title="Sửa">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              style={{ borderRadius: T.radius }}
            />
          </Tooltip>
          <Tooltip title={record.isActive === false ? "Bật" : "Tắt"}>
            <Button
              size="small"
              icon={<PoweroffOutlined />}
              onClick={() => {
                if (window.confirm("Đổi trạng thái hoạt động voucher?")) {
                  toggleMutation.mutate(record._id);
                }
              }}
              style={{ borderRadius: T.radius }}
            />
          </Tooltip>
          <Tooltip title="Xóa (soft)">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              style={{ borderRadius: T.radius }}
              onClick={() => {
                if (window.confirm("Xóa voucher này?")) {
                  deleteMutation.mutate(record._id);
                }
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const maxD = Form.useWatch("maxDiscount", form) || 0;
  const pctVal = Form.useWatch("value", form) ?? 10;
  const previewCode = Form.useWatch("code", form);
  const previewDesc = Form.useWatch("description", form);
  const previewMin = Form.useWatch("minOrderValue", form) || 0;
  const previewEnd = Form.useWatch("endDate", form);
  const previewType = Form.useWatch("type", form);
  const previewVal = Form.useWatch("value", form);
  const previewActive = Form.useWatch("isActive", form);

  const previewOfferLine = (() => {
    const minK = Number(previewMin) > 0;
    const minFmt = Number(previewMin).toLocaleString("vi-VN");
    if (previewType === "fixed") {
      const v = Number(previewVal) || 0;
      return `Giảm ${v.toLocaleString("vi-VN")}đ${minK ? ` cho đơn từ ${minFmt}đ` : ""}`;
    }
    const p = Number(previewVal) || 0;
    return `Giảm ${p}%${minK ? ` cho đơn từ ${minFmt}đ` : ""}`;
  })();

  const voucherFormInner = (
    <>
      <Row gutter={[24, 0]}>
        <Col xs={24} lg={15}>
          <SectionCard title="Thông tin cơ bản">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={16}>
                <Form.Item
                  name="code"
                  label="Mã voucher"
                  rules={[{ required: true, message: "Nhập mã voucher" }]}
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="Vd: SNEAKER2024" disabled={!!editingId} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ paddingTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>
                    Trạng thái hoạt động
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, color: T.textMuted }}>Kích hoạt</span>
                    <Form.Item name="isActive" valuePropName="checked" initialValue={true} noStyle>
                      <Switch />
                    </Form.Item>
                  </div>
                </div>
              </Col>
            </Row>
            <Form.Item name="description" label="Mô tả" style={{ marginBottom: 0, marginTop: 16 }}>
              <Input.TextArea rows={3} placeholder="Nhập mô tả chương trình khuyến mãi…" />
            </Form.Item>
          </SectionCard>

          <SectionCard title="Cấu hình giảm giá">
            <Form.Item name="type" label="Loại giảm" initialValue="percent" style={{ marginBottom: 16 }}>
              <Select
                options={[
                  { value: "percent", label: "Phần trăm (%)" },
                  { value: "fixed", label: "Số tiền cố định (VNĐ)" },
                ]}
                onChange={() => form.validateFields(["value"])}
              />
            </Form.Item>
            {voucherType === "percent" ? (
              <>
                <Form.Item
                  name="value"
                  label="Giá trị giảm"
                  rules={[
                    { required: true, message: "Chọn %" },
                    { type: "number", min: 1, max: 100, message: "Từ 1 đến 100" },
                  ]}
                >
                  <PercentValueControl />
                </Form.Item>
                <div
                  style={{
                    marginTop: -8,
                    marginBottom: 16,
                    padding: "10px 14px",
                    borderRadius: T.radius,
                    background: T.primarySoft,
                    color: "#78350f",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  Áp dụng: giảm {pctVal}% — tối đa{" "}
                  {maxD > 0 ? `${Number(maxD).toLocaleString("vi-VN")}đ` : "không trần (theo đơn)"}
                </div>
              </>
            ) : (
              <Form.Item name="value" label="Giá trị giảm" rules={[{ required: true, message: "Nhập số tiền" }]}>
                <InputNumber min={0} style={{ width: "100%" }} addonAfter="VNĐ" />
              </Form.Item>
            )}
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item name="maxDiscount" label="Giảm tối đa" initialValue={0}>
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    placeholder="0 = không trần"
                    addonAfter="VNĐ"
                    disabled={voucherType !== "percent"}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="minOrderValue" label="Đơn tối thiểu">
                  <InputNumber min={0} style={{ width: "100%" }} addonAfter="VNĐ" />
                </Form.Item>
              </Col>
            </Row>
          </SectionCard>

          <SectionCard title="Giới hạn sử dụng">
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item name="usageLimit" label="Tổng lượt dùng">
                  <InputNumber min={0} style={{ width: "100%" }} placeholder="Không giới hạn (0)" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="userLimit" label="Mỗi khách tối đa">
                  <InputNumber min={0} style={{ width: "100%" }} placeholder="1" />
                </Form.Item>
              </Col>
            </Row>
          </SectionCard>

          <SectionCard title="Thời gian áp dụng">
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item name="startDate" label="Từ ngày" rules={[{ required: true }]}>
                  <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="endDate"
                  label="Đến ngày"
                  dependencies={["startDate"]}
                  rules={[
                    { required: true, message: "Chọn ngày kết thúc" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const start = getFieldValue("startDate");
                        if (!value || !start) return Promise.resolve();
                        if (dayjs(value).isBefore(dayjs(start))) {
                          return Promise.reject(new Error("Ngày kết thúc phải ≥ ngày bắt đầu"));
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" />
                </Form.Item>
              </Col>
            </Row>
          </SectionCard>
        </Col>

        <Col xs={24} lg={9}>
          <SectionCard title="Phạm vi áp dụng">
            <Form.Item name="applicableCategories" label="Danh mục áp dụng">
              <Select
                mode="multiple"
                options={categoryOptions}
                allowClear
                placeholder="+ Chọn danh mục"
                optionFilterProp="label"
                maxTagCount="responsive"
              />
            </Form.Item>
            <Form.Item name="applicableProducts" label="Sản phẩm áp dụng">
              <Select
                mode="multiple"
                options={productOptions}
                placeholder="Tìm sản phẩm…"
                allowClear
                optionFilterProp="label"
                showSearch
                maxTagCount="responsive"
              />
            </Form.Item>
            <p style={{ margin: 0, fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
              Tất cả sản phẩm đều được áp dụng nếu để trống phạm vi.
            </p>
          </SectionCard>

          <SectionCard title="Xem trước voucher">
            <div
              style={{
                background: T.brownBg,
                borderRadius: 16,
                padding: "22px 20px",
                color: "#fff",
                boxShadow: "0 12px 28px rgba(120, 53, 15, 0.35)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", opacity: 0.9 }}>
                SNEAKERCONVERSE
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 12, lineHeight: 1.35 }}>
                {previewOfferLine}
              </div>
              {previewDesc?.trim() ? (
                <div style={{ fontSize: 13, opacity: 0.9, marginTop: 8, lineHeight: 1.45 }}>{previewDesc}</div>
              ) : null}
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 14 }}>
                HSD: {previewEnd ? dayjs(previewEnd).format("DD/MM/YYYY") : "—"}
                {previewActive === false ? " · Đang tắt" : ""}
              </div>
              <div
                style={{
                  marginTop: 16,
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "0.04em",
                }}
              >
                #{(previewCode || "MÃVOUCHER").toString().toUpperCase()}
              </div>
              <Button
                type="primary"
                block
                style={{
                  marginTop: 14,
                  borderRadius: 10,
                  fontWeight: 700,
                  background: "#fff",
                  color: T.brown,
                  border: "none",
                }}
                onClick={() => copyCode(previewCode || "DEMO")}
              >
                LƯU MÃ
              </Button>
            </div>
          </SectionCard>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            <Button
              size="large"
              onClick={closeFormPage}
              style={{
                borderRadius: T.radius,
                minWidth: 120,
                borderColor: T.brown,
                color: T.brown,
                fontWeight: 600,
              }}
            >
              Hủy bỏ
            </Button>
            <Button
              type="primary"
              size="large"
              loading={createMutation.isPending || updateMutation.isPending}
              onClick={() => form.submit()}
              style={{
                borderRadius: T.radius,
                minWidth: 160,
                fontWeight: 700,
                background: T.brownSoft,
                borderColor: T.brownSoft,
              }}
            >
              {editingId ? "Cập nhật voucher" : "Lưu voucher"}
            </Button>
          </div>
        </Col>
      </Row>
    </>
  );

  if (formPageOpen) {
    return (
      <div
        style={{
          padding: "20px 24px 32px",
          background: T.bg,
          minHeight: "100%",
          fontFamily: "'Lexend', sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={closeFormPage}
            style={{ color: T.text, fontWeight: 600 }}
          >
            Quay lại
          </Button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.text }}>
            {editingId ? "Sửa voucher" : "Thêm voucher mới"}
          </h1>
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
          {voucherFormInner}
        </Form>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        background: T.bg,
        minHeight: "100%",
        fontFamily: "'Lexend', sans-serif",
      }}
    >
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          padding: 22,
          marginBottom: 18,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
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
            <h2 style={{ margin: 0, color: T.text, fontSize: 24 }}>
              Quản lý Voucher — SneakerHouse
            </h2>
            <p style={{ margin: "8px 0 0", color: T.textMuted, fontSize: 14 }}>
              Giảm theo % hoặc số tiền cố định, phạm vi sản phẩm / danh mục
            </p>
          </div>
          <Button
            type="primary"
            onClick={openCreate}
            icon={<PlusOutlined />}
            style={{
              borderRadius: T.radius,
              fontWeight: 700,
              background: T.primary,
              borderColor: T.primary,
              height: 42,
            }}
          >
            Thêm voucher
          </Button>
        </div>
      </div>

      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          overflow: "hidden",
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
                <GiftOutlined style={{ fontSize: 20, marginBottom: 8 }} />
                <div>Chưa có voucher.</div>
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
}
