import { useEffect, useState } from "react";
import { Form, InputNumber, Select } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import Swal from "sweetalert2";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProductById,
  createProduct,
  updateProduct,
  uploadImage,
  uploadImages,
  getAllBrands,
  getAllCategories,
} from "./../api/index";

// ── Toggle Switch ───────────────────────────────────────────────
const Toggle = ({ checked, onChange, label, sub }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 14px",
      border: "1px solid #F1F5F9",
      borderRadius: 12,
    }}
  >
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{sub}</div>
    </div>
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        background: checked ? "#f49d25" : "#E2E8F0",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      />
    </div>
  </div>
);

// ── Section Card ────────────────────────────────────────────────
const SectionCard = ({ icon, title, children }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 20,
      border: "1px solid #E2E8F0",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      padding: "28px 32px",
    }}
  >
    <h2
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 17,
        fontWeight: 700,
        color: "#0F172A",
        marginBottom: 22,
        marginTop: 0,
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ color: "#f49d25", fontSize: 22 }}
      >
        {icon}
      </span>
      {title}
    </h2>
    {children}
  </div>
);

// ── Field Label ─────────────────────────────────────────────────
const FieldLabel = ({ children }) => (
  <label
    style={{
      display: "block",
      fontSize: 13,
      fontWeight: 600,
      color: "#475569",
      marginBottom: 6,
    }}
  >
    {children}
  </label>
);

const inputStyle = {
  width: "100%",
  padding: "11px 16px",
  borderRadius: 12,
  border: "1.5px solid #E2E8F0",
  outline: "none",
  fontSize: 14,
  fontFamily: "'Lexend', sans-serif",
  background: "transparent",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
};

// ================================================================
// ProductDetail — Card only (no Sidebar / header / layout wrapper)
// ================================================================
const ProductDetail = ({ productId = null, onClose }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [hasVar, setHasVar] = useState(false);

  const { data: productData } = useQuery({
    queryKey: ["admin-product-detail", productId],
    queryFn: () => getProductById(productId),
    enabled: productId !== null && productId !== "create",
  });

  const { data: brands } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => getAllBrands("all"),
    keepPreviousData: true,
  });
  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => getAllCategories("all"),
    keepPreviousData: true,
  });

  const mutation = useMutation({
    mutationFn: productId !== "create" ? updateProduct : createProduct,
    onSuccess: () => {
      Swal.fire(
        "Thành công",
        `${productId !== "create" ? "Cập nhật" : "Tạo"} sản phẩm thành công!`,
        "success",
      );
      queryClient.invalidateQueries(["admin-products"]);
      onClose();
    },
    onError: (err) => {
      if (err.response?.data?.message)
        Swal.fire("Thất bại", err.response.data.message, "warning");
    },
  });

  useEffect(() => {
    if (productData) {
      form.setFieldsValue({
        ...productData,
        attributes: productData.attributes || [],
        variants: productData.variants || [],
      });
      setHasVar(!!productData.hasVariants);
      setVisible(productData.isVisible ?? true);
      setFeatured(productData.isFeatured ?? false);
    }
  }, [productData, form]);

  const handleMainUpload = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadImage(fd);
    form.setFieldsValue({ image: res.path });
  };

  const handleChangeSubImages = async (e) => {
    const files = Array.from(e.target.files);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const result = await uploadImages(fd);
      form.setFieldsValue({ srcImages: result.paths });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveSubImage = (idx) => {
    const curr = form.getFieldValue("srcImages") || [];
    form.setFieldsValue({ srcImages: curr.filter((_, i) => i !== idx) });
  };

  const onFinish = (values) => {
    mutation.mutate({
      id: productId !== "create" ? productId : undefined,
      payload: {
        ...values,
        hasVariants: hasVar,
        isVisible: visible,
        isFeatured: featured,
        srcImages: form.getFieldValue("srcImages"),
      },
    });
  };

  const isEdit = productId !== "create";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        .material-symbols-outlined { font-family:'Material Symbols Outlined'; font-style:normal; line-height:1; text-transform:none; display:inline-block; white-space:nowrap; }
        .sneaker-input:focus { border-color:#f49d25 !important; box-shadow:0 0 0 3px rgba(244,157,37,0.12); }
        .sneaker-input:hover { border-color:#CBD5E1; }
        .variant-row:hover  { background:#FFFBF5 !important; }
        .ant-form-item      { margin-bottom:0 !important; }
        .ant-form-item-explain { display:none; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      <div
        style={{
          fontFamily: "'Lexend', sans-serif",
          background: "#F8F7F5",
          padding: 28,
        }}
      >
        {/* ── Action bar ──────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 28,
            padding: "16px 24px",
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 800,
                color: "#0F172A",
                letterSpacing: "-0.3px",
              }}
            >
              {isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
            </h1>
            <p style={{ margin: "3px 0 0", color: "#94A3B8", fontSize: 13 }}>
              Điền thông tin chi tiết cho mẫu giày
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 20px",
                borderRadius: 999,
                border: "1.5px solid #E2E8F0",
                background: "#fff",
                color: "#64748B",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'Lexend', sans-serif",
              }}
            >
              Hủy bỏ
            </button>
            <button
              onClick={() => form.submit()}
              disabled={mutation.isLoading}
              style={{
                padding: "9px 22px",
                borderRadius: 999,
                border: "none",
                background: "#f49d25",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'Lexend', sans-serif",
                boxShadow: "0 4px 14px rgba(244,157,37,0.30)",
                opacity: mutation.isLoading ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {mutation.isLoading ? (
                <>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(255,255,255,0.4)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Đang lưu...
                </>
              ) : (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16 }}
                  >
                    save
                  </span>
                  Lưu sản phẩm
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Form ───────────────────────────────────────────── */}
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ hasVariants: false, variants: [], attributes: [] }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 24,
            }}
          >
            {/* Left 2 cols */}
            <div
              style={{
                gridColumn: "span 2",
                display: "flex",
                flexDirection: "column",
                gap: 24,
              }}
            >
              {/* Thông tin chung */}
              <SectionCard icon="info" title="Thông tin chung">
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 18 }}
                >
                  <Form.Item
                    name="name"
                    rules={[{ required: true, message: "Vui lòng nhập tên" }]}
                  >
                    <div>
                      <FieldLabel>Tên sản phẩm</FieldLabel>
                      <input
                        className="sneaker-input"
                        style={inputStyle}
                        placeholder="VD: Nike Air Jordan 1 Retro High"
                        onChange={(e) =>
                          form.setFieldValue("name", e.target.value)
                        }
                        defaultValue={form.getFieldValue("name") || ""}
                      />
                    </div>
                  </Form.Item>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                    }}
                  >
                    <Form.Item name="categoryId" rules={[{ required: true }]}>
                      <div>
                        <FieldLabel>Danh mục</FieldLabel>
                        <Select
                          placeholder="Chọn danh mục"
                          style={{ width: "100%" }}
                          options={categories?.data?.map((c) => ({
                            label: c.name,
                            value: c._id,
                          }))}
                          onChange={(v) => form.setFieldValue("categoryId", v)}
                        />
                      </div>
                    </Form.Item>
                    <Form.Item name="brandId" rules={[{ required: true }]}>
                      <div>
                        <FieldLabel>Thương hiệu</FieldLabel>
                        <Select
                          placeholder="Chọn thương hiệu"
                          style={{ width: "100%" }}
                          options={brands?.data?.map((b) => ({
                            label: b.name,
                            value: b._id,
                          }))}
                          onChange={(v) => form.setFieldValue("brandId", v)}
                        />
                      </div>
                    </Form.Item>
                  </div>

                  <Form.Item name="description" rules={[{ required: true }]}>
                    <div>
                      <FieldLabel>Mô tả sản phẩm</FieldLabel>
                      <textarea
                        className="sneaker-input"
                        style={{
                          ...inputStyle,
                          resize: "vertical",
                          minHeight: 100,
                        }}
                        placeholder="Nhập mô tả chi tiết về chất liệu, thiết kế..."
                        rows={4}
                        onChange={(e) =>
                          form.setFieldValue("description", e.target.value)
                        }
                      />
                    </div>
                  </Form.Item>

                  {!hasVar && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                      }}
                    >
                      <Form.Item
                        name="price"
                        rules={[{ required: true, type: "number", min: 0 }]}
                      >
                        <div>
                          <FieldLabel>Giá (₫)</FieldLabel>
                          <InputNumber
                            formatter={(v) =>
                              `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                            }
                            placeholder="3,500,000"
                            style={{
                              width: "100%",
                              borderRadius: 12,
                              fontFamily: "'Lexend', sans-serif",
                            }}
                          />
                        </div>
                      </Form.Item>
                      <Form.Item
                        name="countInStock"
                        rules={[{ required: true, type: "number", min: 0 }]}
                      >
                        <div>
                          <FieldLabel>Số lượng tồn kho</FieldLabel>
                          <InputNumber
                            placeholder="0"
                            style={{
                              width: "100%",
                              borderRadius: 12,
                              fontFamily: "'Lexend', sans-serif",
                            }}
                          />
                        </div>
                      </Form.Item>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Biến thể */}
              <SectionCard icon="layers" title="Biến thể sản phẩm">
                <div style={{ marginBottom: 20 }}>
                  <Toggle
                    checked={hasVar}
                    onChange={(v) => {
                      setHasVar(v);
                      form.setFieldValue("hasVariants", v);
                    }}
                    label="Sản phẩm có biến thể"
                    sub="Kích thước, màu sắc khác nhau"
                  />
                </div>

                {hasVar && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <FieldLabel>Thuộc tính biến thể</FieldLabel>
                      <Form.Item name="attributes">
                        <Select
                          mode="tags"
                          placeholder="VD: Color, Size"
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </div>

                    <Form.Item
                      shouldUpdate={(p, c) => p.attributes !== c.attributes}
                    >
                      {({ getFieldValue }) => {
                        const attributes = getFieldValue("attributes") || [];
                        return (
                          <Form.List name="variants">
                            {(fields, { add, remove }) => (
                              <>
                                <div
                                  style={{
                                    border: "1.5px solid #E2E8F0",
                                    borderRadius: 14,
                                    overflow: "hidden",
                                  }}
                                >
                                  <table
                                    style={{
                                      width: "100%",
                                      borderCollapse: "collapse",
                                      fontSize: 13,
                                    }}
                                  >
                                    <thead>
                                      <tr
                                        style={{
                                          background: "#F8FAFC",
                                          borderBottom: "1.5px solid #E2E8F0",
                                        }}
                                      >
                                        {[
                                          "SKU",
                                          "Giá (₫)",
                                          "Tồn kho",
                                          ...attributes,
                                          "",
                                        ].map((h) => (
                                          <th
                                            key={h}
                                            style={{
                                              padding: "10px 16px",
                                              textAlign: "left",
                                              fontSize: 11,
                                              fontWeight: 700,
                                              color: "#94A3B8",
                                              textTransform: "uppercase",
                                              letterSpacing: "0.05em",
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {fields.length === 0 && (
                                        <tr>
                                          <td
                                            colSpan={3 + attributes.length + 1}
                                            style={{
                                              padding: 28,
                                              textAlign: "center",
                                              color: "#CBD5E1",
                                              fontSize: 13,
                                            }}
                                          >
                                            Chưa có biến thể — nhấn "Thêm biến
                                            thể" bên dưới
                                          </td>
                                        </tr>
                                      )}
                                      {fields.map((field, index) => (
                                        <tr
                                          key={field.key}
                                          className="variant-row"
                                          style={{
                                            borderBottom: "1px solid #F1F5F9",
                                          }}
                                        >
                                          <td style={{ padding: "8px 16px" }}>
                                            <Form.Item
                                              name={[index, "sku"]}
                                              rules={[{ required: true }]}
                                            >
                                              <input
                                                className="sneaker-input"
                                                style={{
                                                  ...inputStyle,
                                                  padding: "6px 10px",
                                                  fontSize: 12,
                                                  fontFamily: "monospace",
                                                  width: 110,
                                                }}
                                                placeholder="AJ1-RED-40"
                                              />
                                            </Form.Item>
                                          </td>
                                          <td style={{ padding: "8px 16px" }}>
                                            <Form.Item
                                              name={[index, "price"]}
                                              rules={[
                                                {
                                                  required: true,
                                                  type: "number",
                                                  min: 1,
                                                },
                                              ]}
                                            >
                                              <InputNumber
                                                formatter={(v) =>
                                                  `${v}`.replace(
                                                    /\B(?=(\d{3})+(?!\d))/g,
                                                    ",",
                                                  )
                                                }
                                                style={{
                                                  width: 120,
                                                  borderRadius: 10,
                                                }}
                                              />
                                            </Form.Item>
                                          </td>
                                          <td style={{ padding: "8px 16px" }}>
                                            <Form.Item
                                              name={[index, "stock"]}
                                              rules={[
                                                {
                                                  required: true,
                                                  type: "number",
                                                  min: 0,
                                                },
                                              ]}
                                            >
                                              <InputNumber
                                                style={{
                                                  width: 80,
                                                  borderRadius: 10,
                                                }}
                                              />
                                            </Form.Item>
                                          </td>
                                          {attributes.map((attr) => (
                                            <td
                                              key={attr}
                                              style={{ padding: "8px 16px" }}
                                            >
                                              <Form.Item
                                                name={[
                                                  index,
                                                  "attributes",
                                                  attr,
                                                ]}
                                                rules={[{ required: true }]}
                                              >
                                                <input
                                                  className="sneaker-input"
                                                  style={{
                                                    ...inputStyle,
                                                    padding: "6px 10px",
                                                    fontSize: 12,
                                                    width: 90,
                                                  }}
                                                  placeholder={attr}
                                                />
                                              </Form.Item>
                                            </td>
                                          ))}
                                          <td
                                            style={{
                                              padding: "8px 16px",
                                              textAlign: "center",
                                            }}
                                          >
                                            <button
                                              type="button"
                                              onClick={() => remove(index)}
                                              style={{
                                                background: "none",
                                                border: "none",
                                                cursor: "pointer",
                                                color: "#CBD5E1",
                                                padding: 4,
                                                borderRadius: 6,
                                                transition: "color 0.15s",
                                              }}
                                              onMouseEnter={(e) =>
                                                (e.currentTarget.style.color =
                                                  "#EF4444")
                                              }
                                              onMouseLeave={(e) =>
                                                (e.currentTarget.style.color =
                                                  "#CBD5E1")
                                              }
                                            >
                                              <DeleteOutlined
                                                style={{ fontSize: 16 }}
                                              />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => add()}
                                  style={{
                                    marginTop: 12,
                                    width: "100%",
                                    padding: "10px",
                                    border: "1.5px dashed #f49d25",
                                    borderRadius: 12,
                                    background: "rgba(244,157,37,0.04)",
                                    color: "#f49d25",
                                    fontWeight: 700,
                                    fontSize: 13,
                                    cursor: "pointer",
                                    fontFamily: "'Lexend', sans-serif",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                  }}
                                >
                                  <PlusOutlined /> Thêm biến thể mới
                                </button>
                              </>
                            )}
                          </Form.List>
                        );
                      }}
                    </Form.Item>
                  </>
                )}
              </SectionCard>
            </div>

            {/* Right 1 col */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Upload ảnh */}
              <SectionCard icon="image" title="Tải ảnh sản phẩm">
                <Form.Item
                  name="image"
                  rules={[{ required: true, message: "Ảnh chính là bắt buộc" }]}
                >
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      aspectRatio: "1/1",
                      width: "100%",
                      border: "2px dashed #E2E8F0",
                      borderRadius: 16,
                      background: "#F8FAFC",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      gap: 6,
                      padding: 20,
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#f49d25";
                      e.currentTarget.style.background = "#FFFBF5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#E2E8F0";
                      e.currentTarget.style.background = "#F8FAFC";
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 40, color: "#CBD5E1" }}
                    >
                      cloud_upload
                    </span>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#94A3B8",
                      }}
                    >
                      Chọn ảnh hoặc kéo thả
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "#CBD5E1" }}>
                      PNG, JPG tối đa 5MB
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={async (e) => {
                        if (e.target.files[0])
                          await handleMainUpload(e.target.files[0]);
                      }}
                    />
                  </label>
                </Form.Item>

                <Form.Item noStyle shouldUpdate={(p, c) => p.image !== c.image}>
                  {({ getFieldValue }) =>
                    getFieldValue("image") ? (
                      <img
                        src={`${process.env.REACT_APP_API_URL_BACKEND}/image/${getFieldValue("image")}`}
                        alt="Preview"
                        style={{
                          width: "100%",
                          borderRadius: 12,
                          marginTop: 10,
                          objectFit: "cover",
                        }}
                      />
                    ) : null
                  }
                </Form.Item>

                <div style={{ marginTop: 14 }}>
                  <FieldLabel>Ảnh phụ</FieldLabel>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.gif"
                    multiple
                    onChange={handleChangeSubImages}
                    style={{ fontSize: 12, color: "#64748B", width: "100%" }}
                  />
                  <Form.Item noStyle shouldUpdate>
                    {({ getFieldValue }) => {
                      const imgs = getFieldValue("srcImages") || [];
                      return imgs.length > 0 ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: 8,
                            marginTop: 10,
                          }}
                        >
                          {imgs.map((imgPath, idx) => (
                            <div
                              key={idx}
                              style={{
                                position: "relative",
                                borderRadius: 10,
                                overflow: "hidden",
                                border: "1.5px solid #E2E8F0",
                                aspectRatio: "1/1",
                                background: "#F8FAFC",
                              }}
                            >
                              <img
                                src={`${process.env.REACT_APP_API_URL_BACKEND}/image/${imgPath}`}
                                alt={`Ảnh phụ ${idx + 1}`}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveSubImage(idx)}
                                style={{
                                  position: "absolute",
                                  top: 4,
                                  right: 4,
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  background: "#EF4444",
                                  border: "none",
                                  color: "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  fontSize: 10,
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <label
                            style={{
                              aspectRatio: "1/1",
                              border: "2px dashed #E2E8F0",
                              borderRadius: 10,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "border-color 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.borderColor = "#f49d25")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.borderColor = "#E2E8F0")
                            }
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ color: "#CBD5E1", fontSize: 20 }}
                            >
                              add
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleChangeSubImages}
                              style={{ display: "none" }}
                            />
                          </label>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: 8,
                            marginTop: 10,
                          }}
                        >
                          {[0, 1].map((i) => (
                            <div
                              key={i}
                              style={{
                                aspectRatio: "1/1",
                                borderRadius: 10,
                                background: "#F1F5F9",
                                border: "1.5px solid #E2E8F0",
                              }}
                            />
                          ))}
                          <div
                            style={{
                              aspectRatio: "1/1",
                              border: "2px dashed #E2E8F0",
                              borderRadius: 10,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ color: "#CBD5E1", fontSize: 20 }}
                            >
                              add
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  </Form.Item>
                </div>
              </SectionCard>

              {/* Trạng thái hiển thị */}
              <SectionCard icon="visibility" title="Trạng thái hiển thị">
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <Toggle
                    checked={visible}
                    onChange={setVisible}
                    label="Hiển thị trên cửa hàng"
                    sub="Khách hàng có thể tìm thấy"
                  />
                  <Toggle
                    checked={featured}
                    onChange={setFeatured}
                    label="Sản phẩm nổi bật"
                    sub="Đưa vào danh sách đầu trang"
                  />
                </div>
              </SectionCard>
            </div>
          </div>
        </Form>
      </div>
    </>
  );
};

export default ProductDetail;
