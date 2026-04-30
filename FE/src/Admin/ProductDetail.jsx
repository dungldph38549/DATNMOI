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
  getAllCategories,
  getAllSizes,
  getAllColors,
} from "./../api/index";

// Backend đang chạy tại 3002. Nếu build/ENV bị lệch (vẫn còn 3001), ảnh sẽ request sai port và lỗi ERR_CONNECTION_REFUSED.
// Ép URL base về đúng port để admin luôn load được ảnh.
const BACKEND_BASE_URL = (
  process.env.REACT_APP_API_URL_BACKEND || "http://localhost:3002/api"
)
  .replace(/\/api\/?$/, "")
  .replace(/localhost:\d+/, "localhost:3002")
  .replace(/127\.0\.0\.1:\d+/, "127.0.0.1:3002");

const toUploadUrl = (path) => {
  if (!path || typeof path !== "string") return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${BACKEND_BASE_URL}/uploads/${normalized}`;
};

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

const slugifyColorKey = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 48);

const legacyVariantAttr = (v, kind) => {
  const a = v?.attributes;
  if (!a) return "";
  const o = typeof a.get === "function" ? Object.fromEntries(a) : { ...a };
  if (kind === "size") return String(o.Size || o.size || "").trim();
  return String(o.Color || o.color || o["Màu"] || o.Mau || "").trim();
};

const matrixFromProductVariants = (variants) => {
  const sizes = [];
  const colorMap = new Map();
  const cells = {};
  for (const v of variants || []) {
    const sz = String(v.size ?? "").trim() || legacyVariantAttr(v, "size");
    if (!sz) continue;
    if (!sizes.includes(sz)) sizes.push(sz);
    const cidRaw = v.colorId?._id ?? v.colorId;
    const cid = cidRaw ? String(cidRaw) : "";
    const cname =
      String(v.colorName ?? "").trim() || legacyVariantAttr(v, "color") || "Màu";
    const chex =
      String(v.colorHex ?? "").trim() ||
      (v.colorId && typeof v.colorId === "object"
        ? String(v.colorId.code || "").trim()
        : "");
    const rowKey =
      cid && /^[a-f\d]{24}$/i.test(cid) ? cid : `legacy-${slugifyColorKey(cname)}`;
    if (!colorMap.has(rowKey)) {
      colorMap.set(rowKey, {
        key: rowKey,
        colorId: cid,
        colorName: cname,
        colorHex: chex,
      });
    }
    const ck = `${rowKey}::${sz}`;
    cells[ck] = {
      sku: v.sku,
      price: v.price ?? 0,
      stock: v.stock ?? 0,
      images: Array.isArray(v.images) ? v.images : [],
      isActive: v.isActive !== false,
    };
  }
  return { sizes, colorRows: Array.from(colorMap.values()), cells };
};

const collectMatrixSkus = (matrix) => {
  const out = [];
  for (const row of matrix.colorRows || []) {
    for (const size of matrix.sizes || []) {
      const c = matrix.cells?.[`${row.key}::${size}`];
      if (c?.sku) out.push(String(c.sku));
    }
  }
  return out;
};

const buildVariantsPayloadFromMatrix = (matrix) => {
  const variants = [];
  for (const row of matrix.colorRows || []) {
    if (!row.colorId || !/^[a-f\d]{24}$/i.test(String(row.colorId))) {
      throw new Error(
        `Màu "${row.colorName}" chưa gắn colorId hợp lệ. Vui lòng xóa dòng legacy và thêm lại từ danh sách màu.`,
      );
    }
    for (const size of matrix.sizes || []) {
      const cell = matrix.cells?.[`${row.key}::${size}`];
      if (!cell || !String(cell.sku || "").trim()) continue;
      const price = Number(cell.price);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(
          `Ô ${row.colorName} / size ${size}: giá phải lớn hơn 0.`,
        );
      }
      variants.push({
        size: String(size).trim(),
        colorId: row.colorId,
        colorName: row.colorName,
        colorHex: row.colorHex || "",
        sku: String(cell.sku).trim().toUpperCase(),
        price,
        stock: Math.max(0, Number(cell.stock) || 0),
        images: Array.isArray(cell.images) ? cell.images.filter(Boolean) : [],
        isActive: cell.isActive !== false,
      });
    }
  }
  return variants;
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
  /** Lưới biến thể: cột = size, hàng = màu */
  const [varMatrix, setVarMatrix] = useState({
    sizes: [],
    colorRows: [],
    cells: {},
  });
  const [newSizeDraft, setNewSizeDraft] = useState("");
  const [newColorIdDraft, setNewColorIdDraft] = useState(undefined);

  const { data: productData } = useQuery({
    queryKey: ["admin-product-detail", productId],
    queryFn: () => getProductById(productId),
    enabled: productId !== null && productId !== "create",
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
  const { data: colorsRes } = useQuery({
    queryKey: ["admin-colors"],
    queryFn: getAllColors,
    keepPreviousData: true,
  });
  const colorOptions = Array.isArray(colorsRes?.data)
    ? colorsRes.data
    : Array.isArray(colorsRes)
      ? colorsRes
      : [];

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
      const { brandId: _ignoreBrand, categoryId: _ignoreCat, ...productFormRest } =
        productData;
      form.setFieldsValue({
        ...productFormRest,
        categoryId: productData?.categoryId?._id || productData?.categoryId || undefined,
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
      if (isHasVariants && Array.isArray(productData.variants)) {
        setVarMatrix(matrixFromProductVariants(productData.variants));
      }
    }
  }, [productData, form]);

  useEffect(() => {
    if (productId === "create") {
      setVarMatrix({ sizes: [], colorRows: [], cells: {} });
    }
  }, [productId]);

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

  const handleMatrixCellImagesUpload = async (rowKey, size, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const result = await uploadImages(fd);
      const uploaded = Array.isArray(result?.paths) ? result.paths : [];
      if (!uploaded.length) return;
      const ck = `${rowKey}::${size}`;
      setVarMatrix((m) => {
        const prev = m.cells[ck] || {};
        const existing = Array.isArray(prev.images) ? prev.images : [];
        return {
          ...m,
          cells: {
            ...m.cells,
            [ck]: {
              ...prev,
              images: Array.from(
                new Set([...existing.filter(Boolean), ...uploaded.filter(Boolean)]),
              ),
            },
          },
        };
      });
    } catch {
      Swal.fire("Upload thất bại", "Không thể tải ảnh biến thể.", "error");
    }
  };

  const handleRemoveMatrixCellImage = (rowKey, size, imageIndex) => {
    const ck = `${rowKey}::${size}`;
    setVarMatrix((m) => {
      const prev = m.cells[ck] || {};
      const existing = Array.isArray(prev.images) ? prev.images : [];
      return {
        ...m,
        cells: {
          ...m.cells,
          [ck]: { ...prev, images: existing.filter((_, i) => i !== imageIndex) },
        },
      };
    });
  };

  const addMatrixSize = (sizeRaw) => {
    const size = String(sizeRaw || "").trim();
    if (!size) {
      Swal.fire("Thiếu size", "Vui lòng chọn hoặc nhập size.", "warning");
      return;
    }
    if (varMatrix.sizes.includes(size)) return;
    const name = form.getFieldValue("name") || "SP";
    setVarMatrix((m) => {
      const nextSizes = [...m.sizes, size];
      const nextCells = { ...m.cells };
      let skus = collectMatrixSkus({ ...m, cells: nextCells });
      for (const row of m.colorRows) {
        const ck = `${row.key}::${size}`;
        if (!nextCells[ck]) {
          const sku = generateNextVariantSku(name, skus);
          skus = [...skus, sku];
          nextCells[ck] = {
            sku,
            price: Math.max(0, Number(form.getFieldValue("price")) || 0),
            stock: 0,
            images: [],
          };
        }
      }
      return { ...m, sizes: nextSizes, cells: nextCells };
    });
    setNewSizeDraft("");
  };

  const removeMatrixSize = (size) => {
    setVarMatrix((m) => {
      const cells = { ...m.cells };
      for (const row of m.colorRows) {
        delete cells[`${row.key}::${size}`];
      }
      return { ...m, sizes: m.sizes.filter((s) => s !== size), cells };
    });
  };

  const addMatrixColorRow = (colorDoc) => {
    if (!colorDoc?._id) return;
    if (varMatrix.sizes.length === 0) {
      Swal.fire(
        "Thêm size trước",
        "Vui lòng thêm ít nhất một cột size trước khi thêm màu.",
        "info",
      );
      return;
    }
    const key = String(colorDoc._id);
    if (varMatrix.colorRows.some((r) => r.key === key)) {
      Swal.fire("Trùng màu", "Màu này đã có trong lưới.", "warning");
      return;
    }
    const row = {
      key,
      colorId: key,
      colorName: colorDoc.name,
      colorHex: colorDoc.code || "",
    };
    const name = form.getFieldValue("name") || "SP";
    setVarMatrix((m) => {
      const nextRows = [...m.colorRows, row];
      const nextCells = { ...m.cells };
      let skus = collectMatrixSkus({ ...m, cells: nextCells });
      for (const size of m.sizes) {
        const ck = `${row.key}::${size}`;
        if (!nextCells[ck]) {
          const sku = generateNextVariantSku(name, skus);
          skus = [...skus, sku];
          nextCells[ck] = {
            sku,
            price: Math.max(0, Number(form.getFieldValue("price")) || 0),
            stock: 0,
            images: [],
          };
        }
      }
      return { ...m, colorRows: nextRows, cells: nextCells };
    });
    setNewColorIdDraft(undefined);
  };

  const removeMatrixColorRow = (rowKey) => {
    setVarMatrix((m) => {
      const cells = { ...m.cells };
      for (const size of m.sizes) {
        delete cells[`${rowKey}::${size}`];
      }
      return {
        ...m,
        colorRows: m.colorRows.filter((r) => r.key !== rowKey),
        cells,
      };
    });
  };

  const updateMatrixCellField = (rowKey, size, field, value) => {
    const ck = `${rowKey}::${size}`;
    setVarMatrix((m) => {
      const prev = m.cells[ck] || {};
      return {
        ...m,
        cells: {
          ...m.cells,
          [ck]: { ...prev, [field]: value },
        },
      };
    });
  };

  const onFinish = (values) => {
    const { brandId: _omitBrand, ...restValues } = values;
    const payload = {
      ...restValues,
      hasVariants: hasVar,
      isVisible: visible,
      isFeatured: featured,
      srcImages: form.getFieldValue("srcImages"),
    };
    // Luôn lấy variants từ form state để giữ được các field bổ sung như `images`
    // (Form.List có thể làm rơi field không được render bằng Form.Item trong `values`).
    if (hasVar) {
      try {
        payload.variants = buildVariantsPayloadFromMatrix(varMatrix);
      } catch (e) {
        Swal.fire(
          "Biến thể không hợp lệ",
          e?.message || "Vui lòng kiểm tra lưới size × màu.",
          "error",
        );
        return;
      }
      if (!payload.variants.length) {
        Swal.fire(
          "Thiếu biến thể",
          "Vui lòng thêm size, màu và điền SKU + giá cho từng ô trong lưới.",
          "error",
        );
        return;
      }
      payload.attributes = [];
    }
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
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap');
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
          fontFamily: "'Lexend', 'Plus Jakarta Sans', sans-serif",
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
                    <p
                      style={{
                        fontFamily: "'Lexend', sans-serif",
                        fontSize: 13,
                        color: "#64748B",
                        marginBottom: 12,
                      }}
                    >
                      Lưới biến thể: <b>cột = Size</b>, <b>hàng = Màu</b>. Mỗi ô có SKU, giá, tồn và ảnh riêng.
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        marginBottom: 16,
                        alignItems: "flex-end",
                      }}
                    >
                      <div style={{ flex: "1 1 200px" }}>
                        <FieldLabel>Thêm size</FieldLabel>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Select
                            showSearch
                            allowClear
                            placeholder="Chọn size"
                            style={{ flex: 1, borderRadius: 12 }}
                            value={newSizeDraft || undefined}
                            onChange={(v) => setNewSizeDraft(v || "")}
                            options={(sizes?.data || []).map((s) => ({
                              label: s.name,
                              value: s.name,
                            }))}
                          />
                          <button
                            type="button"
                            onClick={() => addMatrixSize(newSizeDraft)}
                            style={{
                              padding: "8px 14px",
                              borderRadius: 12,
                              border: "none",
                              background: "#f49d25",
                              color: "#fff",
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "'Lexend', sans-serif",
                            }}
                          >
                            Thêm size
                          </button>
                        </div>
                      </div>
                      <div style={{ flex: "1 1 240px" }}>
                        <FieldLabel>Thêm màu</FieldLabel>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Select
                            showSearch
                            allowClear
                            placeholder="Chọn màu danh mục"
                            style={{ flex: 1, borderRadius: 12 }}
                            value={newColorIdDraft}
                            onChange={(id) => setNewColorIdDraft(id)}
                            options={colorOptions.map((c) => ({
                              label: `${c.name} (${c.code})`,
                              value: c._id,
                            }))}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const c = colorOptions.find(
                                (x) => String(x._id) === String(newColorIdDraft),
                              );
                              if (c) addMatrixColorRow(c);
                            }}
                            style={{
                              padding: "8px 14px",
                              borderRadius: 12,
                              border: "none",
                              background: "#f49d25",
                              color: "#fff",
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "'Lexend', sans-serif",
                            }}
                          >
                            Thêm màu
                          </button>
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        marginBottom: 14,
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1px solid #E2E8F0",
                        background: "#FFFBF5",
                        fontFamily: "'Lexend', sans-serif",
                        fontWeight: 700,
                        color: "#0F172A",
                      }}
                    >
                      Tổng tồn kho:{" "}
                      {Object.values(varMatrix.cells).reduce(
                        (acc, c) => acc + (Number(c?.stock) || 0),
                        0,
                      ).toLocaleString("vi-VN")}
                    </div>
                    <div
                      style={{
                        overflowX: "auto",
                        borderRadius: 12,
                        border: "1px solid #E2E8F0",
                        background: "#fff",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: 12,
                          fontFamily: "'Lexend', sans-serif",
                        }}
                      >
                        <thead>
                          <tr style={{ background: "#F8FAFC" }}>
                            <th
                              style={{
                                padding: 10,
                                textAlign: "left",
                                minWidth: 140,
                                borderBottom: "1px solid #E2E8F0",
                              }}
                            >
                              Màu
                            </th>
                            {varMatrix.sizes.map((sz) => (
                              <th
                                key={sz}
                                style={{
                                  padding: 10,
                                  borderBottom: "1px solid #E2E8F0",
                                  verticalAlign: "top",
                                  minWidth: 168,
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: 800,
                                    color: "#f49d25",
                                    marginBottom: 4,
                                  }}
                                >
                                  {sz}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeMatrixSize(sz)}
                                  style={{
                                    fontSize: 11,
                                    border: "none",
                                    background: "transparent",
                                    color: "#EF4444",
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                  }}
                                >
                                  Xóa cột
                                </button>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {varMatrix.colorRows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={Math.max(1, 1 + varMatrix.sizes.length)}
                                style={{
                                  padding: 24,
                                  textAlign: "center",
                                  color: "#94A3B8",
                                }}
                              >
                                Thêm size và màu để tạo ô trong lưới.
                              </td>
                            </tr>
                          ) : (
                            varMatrix.colorRows.map((row) => (
                              <tr
                                key={row.key}
                                style={{ borderTop: "1px solid #F1F5F9" }}
                              >
                                <td
                                  style={{
                                    padding: 10,
                                    verticalAlign: "top",
                                    background: "#FAFAFA",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      gap: 10,
                                    }}
                                  >
                                    <span
                                      title={row.colorHex || ""}
                                      style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: 8,
                                        background: row.colorHex || "#CBD5E1",
                                        border: "1px solid #E2E8F0",
                                        flexShrink: 0,
                                      }}
                                    />
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontWeight: 700, color: "#0F172A" }}>
                                        {row.colorName}
                                      </div>
                                      {!/^[a-f\d]{24}$/i.test(String(row.colorId)) ? (
                                        <div style={{ color: "#dc2626", fontSize: 11, marginTop: 4 }}>
                                          Dòng cũ — xóa và thêm lại màu từ danh mục.
                                        </div>
                                      ) : null}
                                      <button
                                        type="button"
                                        onClick={() => removeMatrixColorRow(row.key)}
                                        style={{
                                          marginTop: 6,
                                          fontSize: 11,
                                          border: "none",
                                          background: "transparent",
                                          color: "#EF4444",
                                          cursor: "pointer",
                                          textDecoration: "underline",
                                        }}
                                      >
                                        Xóa hàng màu
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                {varMatrix.sizes.map((sz) => {
                                  const ck = `${row.key}::${sz}`;
                                  const cell = varMatrix.cells[ck] || {};
                                  const imgs = Array.isArray(cell.images) ? cell.images : [];
                                  return (
                                    <td
                                      key={ck}
                                      style={{
                                        padding: 8,
                                        verticalAlign: "top",
                                        borderLeft: "1px solid #F1F5F9",
                                      }}
                                    >
                                      <input
                                        className="sneaker-input"
                                        value={cell.sku || ""}
                                        onChange={(e) =>
                                          updateMatrixCellField(row.key, sz, "sku", e.target.value)
                                        }
                                        placeholder="SKU"
                                        style={{
                                          ...inputStyle,
                                          fontSize: 11,
                                          padding: "6px 8px",
                                          marginBottom: 6,
                                          width: "100%",
                                          boxSizing: "border-box",
                                        }}
                                      />
                                      <InputNumber
                                        value={cell.price}
                                        min={1}
                                        onChange={(v) =>
                                          updateMatrixCellField(row.key, sz, "price", v)
                                        }
                                        formatter={(v) =>
                                          `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                        }
                                        style={{
                                          width: "100%",
                                          borderRadius: 12,
                                          marginBottom: 6,
                                        }}
                                      />
                                      <InputNumber
                                        value={cell.stock}
                                        min={0}
                                        onChange={(v) =>
                                          updateMatrixCellField(row.key, sz, "stock", v)
                                        }
                                        style={{ width: "100%", borderRadius: 12, marginBottom: 6 }}
                                      />
                                      <label
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 4,
                                          padding: "4px 8px",
                                          borderRadius: 8,
                                          border: "1px dashed #f49d25",
                                          background: "rgba(244,157,37,0.06)",
                                          color: "#f49d25",
                                          fontSize: 11,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          marginBottom: 6,
                                        }}
                                      >
                                        <PlusOutlined style={{ fontSize: 11 }} />
                                        Ảnh
                                        <input
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          style={{ display: "none" }}
                                          onChange={async (e) => {
                                            await handleMatrixCellImagesUpload(
                                              row.key,
                                              sz,
                                              e.target.files,
                                            );
                                            e.target.value = "";
                                          }}
                                        />
                                      </label>
                                      {imgs.length ? (
                                        <div
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(3, 1fr)",
                                            gap: 4,
                                          }}
                                        >
                                          {imgs.map((imgPath, imgIdx) => (
                                            <div
                                              key={`${ck}-img-${imgIdx}`}
                                              style={{
                                                position: "relative",
                                                aspectRatio: "1/1",
                                                borderRadius: 8,
                                                overflow: "hidden",
                                                border: "1px solid #E2E8F0",
                                              }}
                                            >
                                              <img
                                                src={toUploadUrl(imgPath)}
                                                alt=""
                                                style={{
                                                  width: "100%",
                                                  height: "100%",
                                                  objectFit: "cover",
                                                }}
                                              />
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleRemoveMatrixCellImage(row.key, sz, imgIdx)
                                                }
                                                style={{
                                                  position: "absolute",
                                                  top: 2,
                                                  right: 2,
                                                  width: 16,
                                                  height: 16,
                                                  borderRadius: "50%",
                                                  border: "none",
                                                  background: "#EF4444",
                                                  color: "#fff",
                                                  fontSize: 10,
                                                  cursor: "pointer",
                                                  lineHeight: "14px",
                                                  padding: 0,
                                                }}
                                              >
                                                ×
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span style={{ fontSize: 10, color: "#94A3B8" }}>
                                          Chưa có ảnh
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
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
