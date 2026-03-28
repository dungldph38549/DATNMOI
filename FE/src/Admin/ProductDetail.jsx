import { useEffect, useState } from "react";
import { Form, InputNumber, Select, Input } from "antd";
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
  getAllSizes,
} from "./../api/index";

// Backend đang chạy tại 3002. Nếu build/ENV bị lệch (vẫn còn 3001), ảnh sẽ request sai port và lỗi ERR_CONNECTION_REFUSED.
// Ép URL base về đúng port để admin luôn load được ảnh.
const BACKEND_BASE_URL = (
  process.env.REACT_APP_API_URL_BACKEND || "http://localhost:3002/api"
)
  .replace(/\/api\/?$/, "")
  .replace(/localhost:\d+/, "localhost:3002")
  .replace(/127\.0\.0\.1:\d+/, "127.0.0.1:3002");

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
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  background: "transparent",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
};

const normalizeAttr = (v) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const toAsciiAlnumUpper = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

/** Tiền tố SKU từ tên SP (tối đa 4 ký tự), ví dụ "Dây giày" → DAYG */
const skuPrefixFromProductName = (name) => {
  const raw = toAsciiAlnumUpper(name);
  if (!raw) return "SKU";
  return raw.length <= 4 ? raw : raw.slice(0, 4);
};

/** SKU dạng PREFIX01, PREFIX02… tránh trùng với các mã PREFIX## đã có */
const generateNextVariantSku = (productName, existingSkus = []) => {
  const prefix = skuPrefixFromProductName(productName);
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}(\\d+)$`, "i");
  let max = 0;
  for (const sku of existingSkus) {
    const m = String(sku || "").trim().match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const next = max + 1;
  return `${prefix}${String(next).padStart(2, "0")}`;
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
  const [saleEnabled, setSaleEnabled] = useState(false);

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
  const { data: sizes } = useQuery({
    queryKey: ["admin-sizes"],
    queryFn: getAllSizes,
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
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.errors?.[0]?.msg ||
        err?.message ||
        "Không thể lưu sản phẩm";

      // Hiển thị thêm body lỗi để bắt đúng field/sai payload
      const raw = err?.response?.data;
      const detail = raw
        ? `\n\nChi tiết:\n${JSON.stringify(raw, null, 2)}`
        : "";

      const status = err?.response?.status;
      const url = err?.config?.url;
      const baseURL = err?.config?.baseURL;
      const where =
        status || url
          ? `\n\nEndpoint: ${baseURL ? baseURL : ""}${url ? url : ""}${
              status ? ` (status ${status})` : ""
            }`
          : "";

      Swal.fire("Thất bại", msg + detail + where, "warning");
      // eslint-disable-next-line no-console
      console.error("[ProductDetail] save product failed:", err);
    },
  });

  useEffect(() => {
    if (productData) {
      // Backend ProductModel dùng `stock` còn FE form đang dùng `countInStock` (alias ở UI).
      // Khi edit sản phẩm, nếu không map lại thì payload gửi lên có thể thiếu `countInStock`
      // và backend sẽ fail validation.
      const isHasVariants = !!productData.hasVariants;
      form.setFieldsValue({
        ...productData,
        categoryId: productData?.categoryId?._id || productData?.categoryId || undefined,
        brandId: productData?.brandId?._id || productData?.brandId || undefined,
        countInStock: productData.stock ?? productData.countInStock,
        attributes: productData.attributes || [],
        variants: productData.variants || [],
        ...(isHasVariants
          ? {}
          : {
              countInStock:
                productData.stock ??
                productData.countInStock ??
                form.getFieldValue("countInStock") ??
                0,
            }),
      });
      setHasVar(!!productData.hasVariants);
      setVisible(productData.isVisible ?? true);
      setFeatured(productData.isFeatured ?? false);
      const activeSale = Array.isArray(productData.saleRules)
        ? productData.saleRules.find((r) => r?.status === "active") || productData.saleRules[0]
        : null;
      setSaleEnabled(!!activeSale);
      form.setFieldsValue({
        saleType: activeSale?.discountType || "percent",
        saleValue: activeSale?.discountValue ?? null,
        saleStartAt: activeSale?.startAt ? String(activeSale.startAt).slice(0, 16) : "",
        saleEndAt: activeSale?.endAt ? String(activeSale.endAt).slice(0, 16) : "",
        salePriority: activeSale?.priority ?? 0,
      });
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
    const payload = {
      ...values,
      hasVariants: hasVar,
      isVisible: visible,
      isFeatured: featured,
      srcImages: form.getFieldValue("srcImages"),
    };
    payload.saleRules = saleEnabled && Number(values.saleValue) > 0
      ? [
          {
            name: "Sale sản phẩm",
            scope: "product",
            discountType: values.saleType || "percent",
            discountValue: Number(values.saleValue || 0),
            startAt: values.saleStartAt ? new Date(values.saleStartAt).toISOString() : null,
            endAt: values.saleEndAt ? new Date(values.saleEndAt).toISOString() : null,
            priority: Number(values.salePriority || 0),
            status: "active",
          },
        ]
      : [];

    // Normalize attributes/variants để tránh lỗi validate khi FE bị trùng tag/whitespace.
    if (hasVar) {
      const normalizedAttrs = (payload.attributes || [])
        .map((a) => `${a}`.trim())
        .filter(Boolean);
      const uniqueAttrs = Array.from(new Set(normalizedAttrs));

      payload.attributes = uniqueAttrs;
      if (Array.isArray(payload.variants)) {
        payload.variants = payload.variants.map((v) => {
          const attrsObj = v?.attributes || {};
          const remapped = {};
          Object.entries(attrsObj).forEach(([k, val]) => {
            const nk = `${k}`.trim();
            if (!nk) return;
            remapped[nk] = val;
          });
          return { ...v, attributes: remapped };
        });
      }
    }

    // createProduct expects `payload` directly
    // updateProduct expects `{ id, payload }`
    if (productId !== "create") {
      mutation.mutate({ id: productId, payload });
    } else {
      mutation.mutate(payload);
    }
  };

  const onFinishFailed = ({ errorFields }) => {
    if (!errorFields?.length) return;
    const missing = errorFields
      .map((f) => (Array.isArray(f.name) ? f.name.join(" > ") : `${f.name}`))
      .slice(0, 6)
      .join("\n- ");
    Swal.fire(
      "Thiếu thông tin",
      `Bạn cần nhập/điền các trường bắt buộc:\n- ${missing}`,
      "warning",
    );
  };

  const isEdit = productId !== "create";

  return (
    <>
      <style>{`
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
          fontFamily: "'Plus Jakarta Sans', sans-serif",
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
                fontFamily: "'Plus Jakarta Sans', sans-serif",
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
                fontFamily: "'Plus Jakarta Sans', sans-serif",
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
          onFinishFailed={onFinishFailed}
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
                  <div>
                    <FieldLabel>Tên sản phẩm</FieldLabel>
                    <Form.Item
                      name="name"
                      rules={[{ required: true, message: "Vui lòng nhập tên" }]}
                    >
                      <Input
                        className="sneaker-input"
                        style={inputStyle}
                        placeholder="VD: Nike Air Jordan 1 Retro High"
                      />
                    </Form.Item>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                    }}
                  >
                    <div>
                      <FieldLabel>Danh mục</FieldLabel>
                      <Form.Item name="categoryId" rules={[{ required: true }]}>
                        <Select
                          placeholder="Chọn danh mục"
                          style={{ width: "100%" }}
                          options={categories?.data?.map((c) => ({
                            label: c.name,
                            value: c._id,
                          }))}
                        />
                      </Form.Item>
                    </div>
                    <div>
                      <FieldLabel>Thương hiệu</FieldLabel>
                      <Form.Item name="brandId" rules={[{ required: true }]}>
                        <Select
                          placeholder="Chọn thương hiệu"
                          style={{ width: "100%" }}
                          options={brands?.data?.map((b) => ({
                            label: b.name,
                            value: b._id,
                          }))}
                        />
                      </Form.Item>
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Mô tả sản phẩm</FieldLabel>
                    <Form.Item name="description" rules={[{ required: true }]}>
                      <Input.TextArea
                        className="sneaker-input"
                        style={{
                          ...inputStyle,
                          resize: "vertical",
                          minHeight: 100,
                        }}
                        placeholder="Nhập mô tả chi tiết về chất liệu, thiết kế..."
                        rows={4}
                      />
                    </Form.Item>
                  </div>

                  {!hasVar && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                      }}
                    >
                      <div>
                        <FieldLabel>Giá (₫)</FieldLabel>
                        <Form.Item
                          name="price"
                          // Backend validate: price phải > 0 (không cho phép 0)
                          rules={[{ required: true, type: "number", min: 1 }]}
                        >
                          <InputNumber
                            formatter={(v) =>
                              `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                            }
                            parser={(v) => {
                              const n = Number(String(v || "").replace(/,/g, ""));
                              return Number.isFinite(n) ? n : undefined;
                            }}
                            placeholder="3,500,000"
                            style={{
                              width: "100%",
                              borderRadius: 12,
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                            }}
                          />
                        </Form.Item>
                      </div>
                      <div>
                        <FieldLabel>Số lượng tồn kho</FieldLabel>
                        <Form.Item
                          name="countInStock"
                          rules={[{ required: true, type: "number", min: 0 }]}
                        >
                          <InputNumber
                            parser={(v) => {
                              const n = Number(String(v || "").replace(/,/g, ""));
                              return Number.isFinite(n) ? n : undefined;
                            }}
                            placeholder="0"
                            style={{
                              width: "100%",
                              borderRadius: 12,
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                            }}
                          />
                        </Form.Item>
                      </div>
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
                          tokenSeparators={[","]}
                          onChange={(vals) => {
                            const normalized = (vals || [])
                              .flatMap((v) => String(v).split(","))
                              .map((v) => v.trim())
                              .filter(Boolean);
                            form.setFieldValue(
                              "attributes",
                              Array.from(new Set(normalized)),
                            );
                          }}
                        />
                      </Form.Item>
                    </div>

                    <Form.Item
                      shouldUpdate={(p, c) => p.attributes !== c.attributes}
                    >
                      {({ getFieldValue }) => {
                        const attributes = getFieldValue("attributes") || [];
                        const sizeOptions = sizes?.data || [];
                        return (
                          <Form.List name="variants">
                            {(fields, { add, remove }) => {
                              const handleAddVariant = () => {
                                const name = form.getFieldValue("name");
                                const current = form.getFieldValue("variants") || [];
                                const existingSkus = current.map((v) => v?.sku);
                                const sku = generateNextVariantSku(name, existingSkus);
                                const attrObj = {};
                                attributes.forEach((a) => {
                                  attrObj[a] = undefined;
                                });
                                const basePrice = form.getFieldValue("price");
                                add({
                                  sku,
                                  price:
                                    typeof basePrice === "number" && basePrice > 0
                                      ? basePrice
                                      : undefined,
                                  stock: 0,
                                  attributes: attrObj,
                                });
                              };
                              return (
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
                                          "SKU (tự sinh)",
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
                                                placeholder="Tự sinh"
                                                title="Mã gợi ý khi thêm biến thể; có thể sửa tay"
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
                                                {[
                                                  "size",
                                                  "kich thuoc",
                                                  "kích thước",
                                                ].some((k) =>
                                                  normalizeAttr(attr).includes(
                                                    normalizeAttr(k),
                                                  ),
                                                ) ? (
                                                  <Select
                                                    placeholder="Chọn size"
                                                    style={{ width: 120 }}
                                                    options={sizeOptions.map(
                                                      (s) => ({
                                                        value: s.name,
                                                        label: s.name,
                                                      }),
                                                    )}
                                                  />
                                                ) : (
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
                                                )}
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
                                  onClick={handleAddVariant}
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
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                  }}
                                >
                                  <PlusOutlined /> Thêm biến thể mới
                                </button>
                              </>
                              );
                            }}
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
                        src={`${BACKEND_BASE_URL}/uploads/${getFieldValue("image")}`}
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
                                src={`${BACKEND_BASE_URL}/uploads/${imgPath}`}
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

              <SectionCard icon="local_offer" title="Cấu hình Sale">
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Toggle
                    checked={saleEnabled}
                    onChange={setSaleEnabled}
                    label="Bật sale cho sản phẩm"
                    sub="Áp dụng trước voucher tại checkout"
                  />
                  {saleEnabled && (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <FieldLabel>Loại giảm</FieldLabel>
                          <Form.Item name="saleType" initialValue="percent">
                            <Select
                              options={[
                                { label: "Phần trăm (%)", value: "percent" },
                                { label: "Giảm cố định (đ)", value: "fixed" },
                              ]}
                            />
                          </Form.Item>
                        </div>
                        <div>
                          <FieldLabel>Giá trị giảm</FieldLabel>
                          <Form.Item name="saleValue" rules={[{ required: saleEnabled, type: "number", min: 0 }]}>
                            <InputNumber style={{ width: "100%", borderRadius: 12 }} placeholder="Nhập giá trị giảm" />
                          </Form.Item>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <FieldLabel>Bắt đầu</FieldLabel>
                          <Form.Item name="saleStartAt">
                            <Input type="datetime-local" className="sneaker-input" style={inputStyle} />
                          </Form.Item>
                        </div>
                        <div>
                          <FieldLabel>Kết thúc</FieldLabel>
                          <Form.Item name="saleEndAt">
                            <Input type="datetime-local" className="sneaker-input" style={inputStyle} />
                          </Form.Item>
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Độ ưu tiên</FieldLabel>
                        <Form.Item name="salePriority" initialValue={0}>
                          <InputNumber style={{ width: "100%", borderRadius: 12 }} min={0} placeholder="0" />
                        </Form.Item>
                      </div>
                    </>
                  )}
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
