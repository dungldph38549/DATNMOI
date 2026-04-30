import React, { useState, useMemo } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  message,
  Space,
  Row,
  Col,
  Checkbox,
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
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  bg: "#F8F7F5",
  card: "#ffffff",
  radius: 12,
};

const normList = (data) => data?.data ?? (Array.isArray(data) ? data : []);

export default function VoucherManager() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [productSearch, setProductSearch] = useState("");
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

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return productList;
    return productList.filter((p) =>
      String(p?.name || "").toLowerCase().includes(q),
    );
  }, [productList, productSearch]);

  const createMutation = useMutation({
    mutationFn: createVoucher,
    onSuccess: () => {
      message.success("Tạo voucher thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
      setModalOpen(false);
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
      setModalOpen(false);
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
    setProductSearch("");
    setModalOpen(true);
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
    setProductSearch("");
    setModalOpen(true);
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

      <Modal
        title={editingId ? "Sửa voucher" : "Thêm voucher"}
        open={modalOpen}
        width={920}
        onCancel={() => {
          setModalOpen(false);
          setEditingId(null);
          form.resetFields();
          setProductSearch("");
        }}
        footer={null}
        centered
        styles={{
          content: { borderRadius: T.radius },
        }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="code" label="Mã" rules={[{ required: true }]}>
            <Input placeholder="SUMMER20" disabled={!!editingId} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input />
          </Form.Item>

          <Form.Item name="type" label="Loại giảm" initialValue="percent">
            <Select
              options={[
                { value: "percent", label: "Phần trăm (%)" },
                { value: "fixed", label: "Số tiền cố định (đ)" },
              ]}
              onChange={() => form.validateFields(["value"])}
            />
          </Form.Item>

          {voucherType === "percent" ? (
            <>
              <Form.Item
                name="value"
                label="Phần trăm giảm (1–100)"
                rules={[
                  { required: true, message: "Chọn %" },
                  {
                    type: "number",
                    min: 1,
                    max: 100,
                    message: "Giá trị % phải từ 1 đến 100",
                  },
                ]}
              >
                <Slider
                  min={1}
                  max={100}
                  marks={{ 1: "1%", 50: "50%", 100: "100%" }}
                />
              </Form.Item>
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  borderRadius: T.radius,
                  background: T.primarySoft,
                  color: "#78350f",
                  fontWeight: 600,
                }}
              >
                Giảm {pctVal}% tối đa{" "}
                {maxD > 0
                  ? `${Number(maxD).toLocaleString("vi-VN")}đ`
                  : "không giới hạn (theo giá trị đơn)"}
              </div>
            </>
          ) : (
            <Form.Item
              name="value"
              label="Số tiền giảm (đ)"
              rules={[{ required: true, message: "Nhập số tiền" }]}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          )}

          <Form.Item
            name="maxDiscount"
            label="Giảm tối đa (đ) — chỉ áp khi loại %"
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: "100%" }} placeholder="0 = không trần" />
          </Form.Item>

          <Form.Item name="minOrderValue" label="Đơn tối thiểu (đ)">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="usageLimit" label="Tổng lượt dùng (0 = không giới hạn)">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="userLimit" label="Mỗi khách tối đa (0 = không giới hạn)">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="startDate" label="Từ ngày" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>
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
                    return Promise.reject(
                      new Error("Ngày kết thúc phải ≥ ngày bắt đầu"),
                    );
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Hoạt động"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="applicableCategories"
            label="Danh mục áp dụng (để trống = tất cả)"
          >
            <Select
              mode="multiple"
              options={categoryOptions}
              allowClear
              placeholder="Chọn danh mục"
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item label="Sản phẩm áp dụng (để trống = tất cả)">
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Space direction="vertical" style={{ width: "100%" }} size="small">
                  <Form.Item name="applicableProducts" noStyle>
                    <Select
                      mode="multiple"
                      options={productOptions}
                      placeholder="Chọn sản phẩm"
                      allowClear
                      optionFilterProp="label"
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                  <Button
                    type="default"
                    size="small"
                    onClick={() => {
                      form.setFieldsValue({ applicableProducts: [] });
                      message.info("Áp dụng cho tất cả sản phẩm (theo phạm vi trên)");
                    }}
                  >
                    Xóa chọn SP — dùng toàn shop (theo điều kiện)
                  </Button>
                </Space>
              </Col>
              <Col xs={24} lg={12}>
                <Input.Search
                  allowClear
                  placeholder="Tìm sản phẩm..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <div
                  style={{
                    maxHeight: 240,
                    overflowY: "auto",
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radius,
                    padding: "8px 12px",
                  }}
                >
                  <Form.Item noStyle shouldUpdate={() => true}>
                    {() => {
                      const raw = form.getFieldValue("applicableProducts") || [];
                      const ids = Array.isArray(raw) ? raw.map((id) => String(id)) : [];
                      return (
                        <Checkbox.Group
                          style={{ width: "100%" }}
                          value={ids}
                          onChange={(vals) => {
                            form.setFieldsValue({
                              applicableProducts: vals.map((v) => String(v)),
                            });
                          }}
                        >
                          <Space direction="vertical" style={{ width: "100%" }} size={4}>
                            {filteredProducts.map((p) => (
                              <Checkbox key={String(p._id)} value={String(p._id)}>
                                {p?.name || p?._id}
                              </Checkbox>
                            ))}
                          </Space>
                        </Checkbox.Group>
                      );
                    }}
                  </Form.Item>
                </div>
              </Col>
            </Row>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}
              style={{
                borderRadius: T.radius,
                fontWeight: 700,
                background: T.primary,
                borderColor: T.primary,
              }}
            >
              {editingId ? "Cập nhật" : "Tạo"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
