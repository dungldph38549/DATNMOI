import React, { useState } from "react";
import { Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, message } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
} from "../api/index";
import dayjs from "dayjs";

export default function Vouchers() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-vouchers"],
    queryFn: getAllVouchers,
  });

  const list = data?.data ?? (Array.isArray(data) ? data : []);

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
      minOrderValue: values.minOrderValue || 0,
      startDate: values.startDate?.toDate?.() || values.startDate,
      endDate: values.endDate?.toDate?.() || values.endDate,
      usageLimit: values.usageLimit || 0,
      status: values.status || "active",
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
      minOrderValue: record.minOrderValue || 0,
      startDate: record.startDate ? dayjs(record.startDate) : null,
      endDate: record.endDate ? dayjs(record.endDate) : null,
      usageLimit: record.usageLimit || 0,
      status: record.status || "active",
    });
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const columns = [
    { title: "Mã", dataIndex: "code", key: "code", width: 120 },
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
      width: 120,
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
              if (window.confirm("Xóa voucher này?"))
                deleteMutation.mutate(record._id);
            }}
          >
            Xóa
          </Button>
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Quản lý Voucher</h2>
        <Button type="primary" onClick={openCreate}>
          Thêm voucher
        </Button>
      </div>
      <Table
        rowKey="_id"
        loading={isLoading}
        dataSource={list}
        columns={columns}
      />
      <Modal
        title={editingId ? "Sửa voucher" : "Thêm voucher"}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingId(null); form.resetFields(); }}
        footer={null}
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
          <Form.Item name="status" label="Trạng thái" initialValue="active">
            <Select options={[{ value: "active", label: "Hoạt động" }, { value: "inactive", label: "Tạm tắt" }]} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Cập nhật" : "Tạo"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
