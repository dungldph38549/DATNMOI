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
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import {
  getAllVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  getAllProducts,
} from "../api/index";
import dayjs from "dayjs";

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

export default function Vouchers() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [productSearch, setProductSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-vouchers"],
    queryFn: getAllVouchers,
  });
  const { data: productData } = useQuery({
    queryKey: ["admin-voucher-products"],
    queryFn: () => getAllProducts({ page: 0, limit: 500 }),
  });

  const list = data?.data ?? (Array.isArray(data) ? data : []);
  const totalVouchers = list.length;
  const latestVoucher = useMemo(() => list?.[0]?.code || "Chưa có", [list]);
  const productList = Array.isArray(productData?.data)
    ? productData.data
    : Array.isArray(productData?.data?.data)
      ? productData.data.data
      : [];
  const productOptions = productList.map((p) => ({
    value: p?._id,
    label: p?.name || p?._id,
  }));

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return productList;
    return productList.filter((p) => String(p?.name || "").toLowerCase().includes(q));
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

  const onFinish = (values) => {
    const payload = {
      code: values.code?.trim().toUpperCase(),
      description: values.description,
      discountType: values.discountType || "percent",
      discountValue: values.discountValue,
      maxDiscountAmount: values.maxDiscountAmount ?? 0,
      minOrderValue: values.minOrderValue || 0,
      startDate: values.startDate?.toDate?.() || values.startDate,
      endDate: values.endDate?.toDate?.() || values.endDate,
      usageLimit: values.usageLimit || 0,
      status: values.status || "active",
      applicableProductIds: Array.isArray(values.applicableProductIds)
        ? values.applicableProductIds
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
    form.setFieldsValue({
      code: record.code,
      description: record.description,
      discountType: record.discountType || "percent",
      discountValue: record.discountValue,
      maxDiscountAmount: record.maxDiscountAmount ?? 0,
      minOrderValue: record.minOrderValue || 0,
      startDate: record.startDate ? dayjs(record.startDate) : null,
      endDate: record.endDate ? dayjs(record.endDate) : null,
      usageLimit: record.usageLimit || 0,
      status: record.status || "active",
      applicableProductIds: Array.isArray(record.applicableProductIds)
        ? record.applicableProductIds.map((id) => String(id))
        : [],
    });
    setProductSearch("");
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    setProductSearch("");
    setModalOpen(true);
  };

  const columns = [
    {
      title: "Mã",
      dataIndex: "code",
      key: "code",
      width: 130,
      render: (value) => (
        <Tag
          style={{
            marginRight: 0,
            borderRadius: 999,
            borderColor: "#FDE68A",
            background: T.primarySoft,
            color: "#92400E",
            fontWeight: 700,
          }}
        >
          {value}
        </Tag>
      ),
    },
    { title: "Mô tả", dataIndex: "description", key: "description", ellipsis: true },
    {
      title: "Giảm giá",
      key: "discount",
      width: 120,
      render: (_, r) =>
        r.discountType === "percent"
          ? `${r.discountValue}%`
          : `${Number(r.discountValue).toLocaleString()}đ`,
    },
    {
      title: "Phạm vi",
      key: "scope",
      width: 140,
      render: (_, r) =>
        Array.isArray(r.applicableProductIds) && r.applicableProductIds.length > 0
          ? `${r.applicableProductIds.length} sản phẩm`
          : "Toàn bộ sản phẩm",
    },
    {
      title: "Giảm tối đa",
      dataIndex: "maxDiscountAmount",
      key: "maxDiscountAmount",
      width: 110,
      render: (v) => (v > 0 ? `${Number(v).toLocaleString()}đ` : "—"),
    },
    {
      title: "Đơn tối thiểu",
      dataIndex: "minOrderValue",
      key: "minOrderValue",
      width: 120,
      render: (v) => (v ? `${Number(v).toLocaleString()}đ` : "-"),
    },
    {
      title: "Hạn dùng",
      dataIndex: "endDate",
      key: "endDate",
      width: 110,
      render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Đã dùng",
      dataIndex: "usedCount",
      key: "usedCount",
      width: 80,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 140,
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="Chỉnh sửa voucher">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              style={{ borderRadius: 8, borderColor: "#D1D5DB", color: "#334155" }}
            />
          </Tooltip>
          <Tooltip title="Xóa voucher">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              style={{ borderRadius: 8 }}
              onClick={() => {
                if (window.confirm("Xóa voucher này?")) deleteMutation.mutate(record._id);
              }}
            />
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
              Quản lý Voucher
            </h2>
            <p style={{ margin: "8px 0 0", color: T.textMuted, fontSize: 14 }}>
              Quản lý mã ưu đãi và phạm vi áp dụng cho đơn hàng
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
            Thêm voucher
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
            <div style={{ fontSize: 12, opacity: 0.85 }}>Tổng voucher</div>
            <div style={{ marginTop: 2, fontSize: 20, fontWeight: 800 }}>{totalVouchers}</div>
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
              {latestVoucher}
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
                <GiftOutlined style={{ fontSize: 20, marginBottom: 8 }} />
                <div>Chưa có voucher nào. Bắt đầu bằng cách thêm voucher đầu tiên.</div>
              </div>
            ),
          }}
          style={{ background: "#fff" }}
        />
      </div>
      <Modal
        title={editingId ? "Sửa voucher" : "Thêm voucher"}
        open={modalOpen}
        width={900}
        onCancel={() => {
          setModalOpen(false);
          setEditingId(null);
          form.resetFields();
          setProductSearch("");
        }}
        footer={null}
        centered
        styles={{
          content: { borderRadius: 18, overflow: "hidden", border: "1px solid rgba(148, 163, 184, 0.25)" },
          header: {
            background: "linear-gradient(180deg, rgba(251,191,36,0.12), rgba(255,255,255,1))",
            paddingBottom: 14,
          },
        }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="code" label="Mã" rules={[{ required: true }]}>
            <Input placeholder="VÍ DỤ20" disabled={!!editingId} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input />
          </Form.Item>
          <Form.Item name="discountType" label="Loại giảm" initialValue="percent">
            <Select options={[{ value: "percent", label: "Phần trăm" }, { value: "fixed", label: "Số tiền cố định" }]} />
          </Form.Item>
          <Form.Item
            name="discountValue"
            label="Giá trị giảm"
            rules={[
              { required: true, message: "Nhập giá trị giảm" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (value == null) return Promise.resolve();
                  if (Number(value) < 0) return Promise.reject(new Error("Giá trị giảm phải >= 0"));
                  if (getFieldValue("discountType") === "percent" && Number(value) > 100) {
                    return Promise.reject(new Error("Giảm theo % không được > 100"));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="maxDiscountAmount"
            label="Giảm tối đa (đ)"
            extra="Trần số tiền được giảm (vd: giảm 20% nhưng tối đa 50.000đ). Để 0 = không giới hạn. Chỉ hiển thị trong admin."
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: "100%" }} placeholder="0 = không giới hạn" />
          </Form.Item>
          <Form.Item name="minOrderValue" label="Đơn tối thiểu (đ)">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="startDate" label="Từ ngày" rules={[{ required: true, message: "Chọn ngày bắt đầu" }]}>
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
                    return Promise.reject(new Error("Ngày kết thúc phải >= ngày bắt đầu"));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <Form.Item name="usageLimit" label="Số lần dùng (0 = không giới hạn)">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="Áp dụng cho sản phẩm"
            extra="Để trống hoặc bấm «Sử dụng tất cả các SP»: áp dụng cho toàn bộ sản phẩm. Cột bên phải: chọn nhanh nhiều SP bằng ô tick."
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Space direction="vertical" style={{ width: "100%" }} size="small">
                  <Form.Item name="applicableProductIds" noStyle>
                    <Select
                      mode="multiple"
                      options={productOptions}
                      placeholder="Chọn sản phẩm áp dụng voucher"
                      allowClear
                      optionFilterProp="label"
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                  <Button
                    type="default"
                    size="small"
                    onClick={() => {
                      form.setFieldsValue({ applicableProductIds: [] });
                      message.success("Đã chọn áp dụng cho tất cả sản phẩm");
                    }}
                  >
                    Sử dụng tất cả các SP
                  </Button>
                </Space>
              </Col>
              <Col xs={24} lg={12}>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Chọn nhanh (nhiều sản phẩm)</div>
                <Input.Search
                  allowClear
                  placeholder="Tìm theo tên sản phẩm..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <div
                  style={{
                    maxHeight: 280,
                    overflowY: "auto",
                    border: "1px solid #f0f0f0",
                    borderRadius: 8,
                    padding: "8px 12px",
                    background: "#fafafa",
                  }}
                >
                  <Form.Item noStyle shouldUpdate={() => true}>
                    {() => {
                      const raw = form.getFieldValue("applicableProductIds") || [];
                      const ids = Array.isArray(raw) ? raw.map((id) => String(id)) : [];
                      return (
                        <Checkbox.Group
                          style={{ width: "100%" }}
                          value={ids}
                          onChange={(vals) => {
                            form.setFieldsValue({
                              applicableProductIds: vals.map((v) => String(v)),
                            });
                          }}
                        >
                          <Space direction="vertical" style={{ width: "100%" }} size={4}>
                            {filteredProducts.map((p) => (
                              <Checkbox key={String(p._id)} value={String(p._id)}>
                                <span style={{ whiteSpace: "normal" }}>{p?.name || p?._id}</span>
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
          <Form.Item name="status" label="Trạng thái" initialValue="active">
            <Select options={[{ value: "active", label: "Hoạt động" }, { value: "inactive", label: "Tạm tắt" }]} />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}
              style={{ borderRadius: 10, fontWeight: 700, background: T.primary, borderColor: T.primaryStrong }}
            >
              {editingId ? "Cập nhật" : "Tạo"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
