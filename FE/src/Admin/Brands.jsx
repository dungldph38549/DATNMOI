import React, { useState } from "react";
import { Table, Modal, Button, Form, Input, message } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllBrands,
  updateBrand,
  createBrand,
  uploadImage,
} from "../api/index";

// Backend đang chạy tại 3002. Ép base URL đúng port để ảnh luôn load được (tránh dính 3001 -> ERR_CONNECTION_REFUSED).
const BACKEND_BASE_URL = (
  process.env.REACT_APP_API_URL_BACKEND || "http://localhost:3002/api"
)
  .replace(/\/api\/?$/, "")
  .replace(/localhost:\d+/, "localhost:3002")
  .replace(/127\.0\.0\.1:\d+/, "127.0.0.1:3002");

export default function Brands() {
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [createImagePreview, setCreateImagePreview] = useState("");

  const [form] = Form.useForm(); // Edit form
  const [createForm] = Form.useForm(); // Create form

  const { data } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => getAllBrands("all"),
    keepPreviousData: true,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateBrand({ id, ...data }),
    onSuccess: () => {
      message.success("Cập nhật thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      setIsEditModalVisible(false);
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Lỗi khi cập nhật");
    },
  });

  const createMutation = useMutation({
    mutationFn: createBrand,
    onSuccess: () => {
      message.success("Tạo thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      setIsCreateModalVisible(false);
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Lỗi khi tạo mới");
    },
  });

  const transformFormValues = (values) => ({
    ...values,
    // Backend BrandModel lưu ảnh ở field `logo`, còn FE form đang dùng `image`
    logo: values.logo || values.image,
    image: undefined,
    status:
      values.status === undefined
        ? "active"
        : values.status
          ? "active"
          : "inactive",
  });

  const handleUpdateSubmit = (values) => {
    updateMutation.mutate({
      id: selected._id,
      data: transformFormValues(values),
    });
  };

  const handleCreateSubmit = (values) => {
    createMutation.mutate(transformFormValues(values));
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: "Xác nhận xoá",
      content: `Bạn có chắc chắn muốn xoá thương hiệu "${record.name}" không?`,
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => {
        updateMutation.mutate({
          id: record._id,
          data: { status: "inactive" },
        });
      },
    });
  };

  const handleEdit = (record) => {
    setSelected(record);
    setImagePreview(record.logo);
    form.setFieldsValue({
      name: record.name,
      image: record.logo,
      status: record.status === "active",
    });
    setIsEditModalVisible(true);
  };

  const columns = [
    { title: "Tên", dataIndex: "name", key: "name" },
    {
      title: "Hình ảnh",
      dataIndex: "logo",
      key: "logo",
      render: (img) =>
        img && (
          <img
            src={`${BACKEND_BASE_URL}/uploads/${img}`}
            alt="Ảnh"
            className="w-12 h-12 object-cover rounded"
          />
        ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) =>
        new Date(date).toLocaleDateString("vi-VN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
    },
    {
      title: "Hành động",
      key: "action",
      width: 200,
      render: (_, record) => (
        <div className="flex space-x-2">
          <Button type="link" onClick={() => handleEdit(record)}>
            Sửa
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record)}>
            Xoá
          </Button>
        </div>
      ),
    },
  ];

  // ========================== Edit Form ==========================
  const renderEditForm = () => {
    const handleChangeImg = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const result = await uploadImage(formData);
        form.setFieldsValue({ image: result.path });
        setImagePreview(result.path);
        message.success("Tải ảnh thành công");
      } catch (err) {
        message.error("Upload ảnh thất bại");
      }
    };

    return (
      <Form form={form} layout="vertical" onFinish={handleUpdateSubmit}>
        <Form.Item label="Tên" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item name="image" noStyle>
          <input type="hidden" />
        </Form.Item>

        <div className="flex items-center gap-4 mb-4">
          <label className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            Chọn ảnh
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif"
              onChange={handleChangeImg}
              className="hidden"
            />
          </label>

          {imagePreview && (
            <img
              src={`${BACKEND_BASE_URL}/uploads/${imagePreview}`}
              alt="Preview"
              className="w-20 h-20 object-cover rounded border border-gray-300 shadow"
            />
          )}
        </div>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={updateMutation.isPending}
          >
            Lưu
          </Button>
        </Form.Item>
      </Form>
    );
  };

  // ========================== Create Form ==========================
  const renderCreateForm = () => {
    const handleChangeImg = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const result = await uploadImage(formData);
        createForm.setFieldsValue({ image: result.path });
        setCreateImagePreview(result.path);
        message.success("Tải ảnh thành công");
      } catch (err) {
        message.error("Upload ảnh thất bại");
      }
    };

    return (
      <Form
        form={createForm}
        layout="vertical"
        initialValues={{ name: "", image: "", status: true }}
        onFinish={handleCreateSubmit}
      >
        <Form.Item label="Tên" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item name="image" noStyle>
          <input type="hidden" />
        </Form.Item>

        <div className="flex items-center gap-4 mb-4">
          <label className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            Chọn ảnh
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif"
              onChange={handleChangeImg}
              className="hidden"
            />
          </label>

          {createImagePreview && (
            <img
              src={`${BACKEND_BASE_URL}/uploads/${createImagePreview}`}
              alt="Preview"
              className="w-20 h-20 object-cover rounded border border-gray-300 shadow"
            />
          )}
        </div>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending}
          >
            Lưu
          </Button>
        </Form.Item>
      </Form>
    );
  };

  const brands = data?.data ?? [];

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Danh sách thương hiệu</h2>
        <Button
          type="primary"
          onClick={() => {
            setCreateImagePreview("");
            createForm.resetFields();
            setIsCreateModalVisible(true);
          }}
        >
          + Thêm mới
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={brands.map((v) => ({ ...v, key: v._id }))}
        bordered
        pagination={false}
      />

      <Modal
        title="Chỉnh sửa thương hiệu"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        destroyOnHidden
      >
        {selected && renderEditForm()}
      </Modal>

      <Modal
        title="Tạo mới thương hiệu"
        open={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        footer={null}
        destroyOnHidden
      >
        {renderCreateForm()}
      </Modal>
    </div>
  );
}
