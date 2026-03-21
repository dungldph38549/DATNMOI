import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, Select, InputNumber } from "antd";
import Swal from "sweetalert2";
import ProductDetail from "./ProductDetail.jsx";
import {
  getAllProducts,
  restoreProductById,
  getAllCategories,
  getAllBrands,
  getInventoryList,
} from "./../api/index";

// ── Design tokens ──────────────────────────────────────────────
const T = {
  primary: "#f49d25",
  primaryBg: "rgba(244,157,37,0.08)",
  primaryHover: "rgba(244,157,37,0.14)",
  border: "#E9EEF4",
  text: "#0F172A",
  textMid: "#475569",
  textMuted: "#94A3B8",
  card: "#ffffff",
  bg: "#F8F7F5",
  red: "#EF4444",
  redBg: "rgba(239,68,68,0.08)",
  green: "#22C55E",
  greenBg: "rgba(34,197,94,0.10)",
  yellow: "#F59E0B",
  yellowBg: "rgba(245,158,11,0.10)",
};

// ── Stock bar ──────────────────────────────────────────────────
const StockBar = ({ count }) => {
  if (count === undefined || count === null)
    return <span style={{ color: T.textMuted, fontSize: 13 }}>—</span>;
  const max = 100;
  const pct = Math.min((count / max) * 100, 100);
  const color = count === 0 ? T.red : count < 20 ? T.yellow : T.green;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 56,
          height: 5,
          background: "#E2E8F0",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 99,
            transition: "width 0.4s",
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{count}</span>
    </div>
  );
};

// ── Status badge ───────────────────────────────────────────────
const StatusBadge = ({ deleted, count }) => {
  if (deleted)
    return (
      <span
        style={{
          padding: "3px 10px",
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 700,
          background: T.redBg,
          color: T.red,
          textTransform: "uppercase",
        }}
      >
        Đã xóa
      </span>
    );
  if (count === 0)
    return (
      <span
        style={{
          padding: "3px 10px",
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 700,
          background: T.redBg,
          color: T.red,
          textTransform: "uppercase",
        }}
      >
        Hết hàng
      </span>
    );
  if (count !== undefined && count < 20)
    return (
      <span
        style={{
          padding: "3px 10px",
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 700,
          background: T.yellowBg,
          color: T.yellow,
          textTransform: "uppercase",
        }}
      >
        Sắp hết
      </span>
    );
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        background: T.greenBg,
        color: T.green,
        textTransform: "uppercase",
      }}
    >
      Còn hàng
    </span>
  );
};

// ── Expandable variant table ───────────────────────────────────
const VariantTable = ({ variants }) => {
  if (!Array.isArray(variants) || variants.length === 0)
    return (
      <p style={{ fontSize: 13, color: T.textMuted, padding: "8px 0" }}>
        Sản phẩm không có biến thể
      </p>
    );

  return (
    <div style={{ overflowX: "auto", margin: "8px 0" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
      >
        <thead>
          <tr style={{ background: T.bg }}>
            {["SKU", "Giá", "Tồn kho", "Thuộc tính"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  fontWeight: 700,
                  color: T.textMuted,
                  textTransform: "uppercase",
                  fontSize: 10,
                  letterSpacing: "0.05em",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.map((v, i) => (
            <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
              <td
                style={{
                  padding: "8px 12px",
                  fontFamily: "monospace",
                  color: T.textMid,
                }}
              >
                {v.sku}
              </td>
              <td
                style={{
                  padding: "8px 12px",
                  fontWeight: 600,
                  color: T.primary,
                }}
              >
                {v.price?.toLocaleString("vi-VN")}₫
              </td>
              <td style={{ padding: "8px 12px" }}>
                <StockBar count={v.stock} />
              </td>
              <td style={{ padding: "8px 12px", color: T.textMid }}>
                {v.attributes
                  ? Object.entries(v.attributes)
                      .map(([k, val]) => `${k}: ${val}`)
                      .join(" · ")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const getAdminDisplayPrice = (record) => {
  const minFromRange = Number(record?.priceRange?.min);
  const maxFromRange = Number(record?.priceRange?.max);

  if (Number.isFinite(minFromRange) && Number.isFinite(maxFromRange)) {
    return minFromRange === maxFromRange
      ? `${minFromRange.toLocaleString("vi-VN")}₫`
      : `${minFromRange.toLocaleString("vi-VN")} - ${maxFromRange.toLocaleString("vi-VN")}₫`;
  }

  if (Array.isArray(record?.variants) && record.variants.length > 0) {
    const prices = record.variants
      .map((v) => Number(v?.price))
      .filter((n) => Number.isFinite(n));
    if (prices.length > 0) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return min === max
        ? `${min.toLocaleString("vi-VN")}₫`
        : `${min.toLocaleString("vi-VN")} - ${max.toLocaleString("vi-VN")}₫`;
    }
  }

  const single = Number(record?.price);
  if (Number.isFinite(single)) return `${single.toLocaleString("vi-VN")}₫`;
  return "—";
};

const getAdminStockCount = (record, inventoryByProductId = {}) => {
  if (Array.isArray(record?.variants) && record.variants.length > 0) {
    const inventoryStock = Number(inventoryByProductId?.[record?._id]);
    if (Number.isFinite(inventoryStock)) return inventoryStock;

    const totalVariantStock = record.variants.reduce((sum, v) => {
      const n = Number(v?.stock);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    return totalVariantStock;
  }

  const singleStock = Number(record?.countInStock ?? record?.stock);
  return Number.isFinite(singleStock) ? singleStock : null;
};

// ── Pagination ─────────────────────────────────────────────────
const Pagination = ({ page, total, limit, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pages = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    )
      pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }
  const btn = (active) => ({
    minWidth: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: active ? "none" : `1px solid ${T.border}`,
    background: active ? T.primary : "#fff",
    color: active ? "#fff" : T.textMid,
    fontWeight: active ? 700 : 500,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Lexend', sans-serif",
    padding: "0 10px",
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 20px",
        borderTop: `1px solid ${T.border}`,
      }}
    >
      <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>
        Hiển thị{" "}
        <b style={{ color: T.text }}>
          {Math.min((page - 1) * limit + 1, total)}–
          {Math.min(page * limit, total)}
        </b>{" "}
        của <b style={{ color: T.text }}>{total}</b> sản phẩm
      </p>
      <div style={{ display: "flex", gap: 4 }}>
        <button
          style={btn(false)}
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          onMouseEnter={(e) => {
            if (page !== 1) e.currentTarget.style.background = "#F1F5F9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fff";
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            chevron_left
          </span>
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`d${i}`}
              style={{
                padding: "0 4px",
                fontSize: 13,
                color: T.textMuted,
                lineHeight: "34px",
              }}
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              style={btn(p === page)}
              onClick={() => onChange(p)}
              onMouseEnter={(e) => {
                if (p !== page) e.currentTarget.style.background = "#F1F5F9";
              }}
              onMouseLeave={(e) => {
                if (p !== page) e.currentTarget.style.background = "#fff";
              }}
            >
              {p}
            </button>
          ),
        )}
        <button
          style={btn(false)}
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          onMouseEnter={(e) => {
            if (page !== totalPages)
              e.currentTarget.style.background = "#F1F5F9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fff";
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            chevron_right
          </span>
        </button>
      </div>
    </div>
  );
};

// ================================================================
// Main Component
// ================================================================
export default function Products() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [productSelected, setProductSelected] = useState(null);
  const [isListProductRemoved, setIsListProductRemoved] = useState(0);
  const [filter, setFilter] = useState({});
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [form] = Form.useForm();
  const [showFilter, setShowFilter] = useState(false);
  const limit = 10;

  // ── Queries ────────────────────────────────────────────────
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
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-products", page, limit, isListProductRemoved, filter],
    queryFn: () =>
      getAllProducts({ page: page - 1, limit, isListProductRemoved, filter }),
    keepPreviousData: true,
  });
  const { data: inventoryList } = useQuery({
    queryKey: ["admin-inventory-list"],
    queryFn: () => getInventoryList({}),
    keepPreviousData: true,
  });

  // ── Handlers ───────────────────────────────────────────────
  const handleList = () => {
    setIsListProductRemoved((prev) => (prev === 1 ? 0 : 1));
    setPage(1);
  };

  const handleRestore = async (id) => {
    const result = await Swal.fire({
      title: "Khôi phục sản phẩm này?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f49d25",
      cancelButtonColor: "#94A3B8",
      confirmButtonText: "Khôi phục",
      cancelButtonText: "Huỷ",
    });
    if (result.isConfirmed) {
      try {
        await restoreProductById({ id });
        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        Swal.fire("Đã khôi phục!", "Sản phẩm đã được khôi phục.", "success");
        setPage(1);
      } catch {
        Swal.fire("Thất bại", "Không thể khôi phục sản phẩm.", "error");
      }
    }
  };

  const handleFilterSubmit = (values) => {
    setFilter({
      name: values.name || undefined,
      categoryId: values.categoryId || undefined,
      brandId: values.brandId || undefined,
      priceFrom: values.priceFrom,
      priceTo: values.priceTo,
    });
    setPage(1);
  };

  const handleFilterReset = () => {
    form.resetFields();
    setFilter({});
    setPage(1);
  };

  // ── Filter products by search (client-side name filter) ───
  const products = (data?.data || []).filter((p) => {
    if (!search.trim()) return true;
    return p.name?.toLowerCase().includes(search.toLowerCase());
  });
  const inventoryByProductId = (inventoryList || []).reduce((acc, inv) => {
    const productId =
      typeof inv?.productId === "object" ? inv?.productId?._id : inv?.productId;
    if (!productId) return acc;
    const available = Number(inv?.available);
    if (!Number.isFinite(available)) return acc;
    acc[productId] = Number(acc[productId] || 0) + available;
    return acc;
  }, {});

  // ── ProductDetail view ─────────────────────────────────────
  if (productSelected) {
    return (
      <ProductDetail
        productId={productSelected}
        onClose={() => setProductSelected(null)}
      />
    );
  }

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        .material-symbols-outlined { font-family:'Material Symbols Outlined'; font-style:normal; line-height:1; text-transform:none; display:inline-block; white-space:nowrap; font-size:24px; }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .sh-prod-row:hover td { background: #FFFBF5 !important; }
        .sh-filter .ant-input, .sh-filter .ant-input-number,
        .sh-filter .ant-select-selector {
          border-radius: 10px !important;
          font-family: 'Lexend', sans-serif !important;
          font-size: 13px !important;
          border: 1.5px solid #E2E8F0 !important;
        }
        .sh-filter .ant-input:focus,
        .sh-filter .ant-input-number:focus,
        .sh-filter .ant-select-focused .ant-select-selector {
          border-color: #f49d25 !important;
          box-shadow: 0 0 0 3px rgba(244,157,37,0.10) !important;
        }
      `}</style>

      <div
        style={{
          padding: 28,
          fontFamily: "'Lexend', sans-serif",
          minHeight: "100vh",
          background: T.bg,
        }}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 800,
                color: T.text,
                letterSpacing: "-0.3px",
              }}
            >
              {isListProductRemoved ? "Sản phẩm đã xóa" : "Quản lý sản phẩm"}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>
              {isListProductRemoved
                ? "Danh sách sản phẩm đã bị xóa mềm"
                : "Quản lý toàn bộ sản phẩm trong cửa hàng"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleList}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 16px",
                borderRadius: 999,
                border: `1.5px solid ${T.border}`,
                background: "#fff",
                color: isListProductRemoved ? T.primary : T.textMid,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'Lexend', sans-serif",
                borderColor: isListProductRemoved ? T.primary : T.border,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16 }}
              >
                {isListProductRemoved ? "inventory_2" : "delete_sweep"}
              </span>
              {isListProductRemoved ? "Danh sách chính" : "Đã xóa"}
            </button>
            <button
              onClick={() => setProductSelected("create")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 20px",
                borderRadius: 999,
                border: "none",
                background: T.primary,
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'Lexend', sans-serif",
                boxShadow: "0 4px 14px rgba(244,157,37,0.30)",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                add
              </span>
              Thêm sản phẩm
            </button>
          </div>
        </div>

        {/* ── Search + Filter bar ───────────────────────────── */}
        <div
          style={{
            background: T.card,
            borderRadius: 14,
            border: `1px solid ${T.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            padding: "14px 16px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span
                className="material-symbols-outlined"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 18,
                  color: T.textMuted,
                }}
              >
                search
              </span>
              <input
                placeholder="Tìm tên sản phẩm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 14px 9px 38px",
                  borderRadius: 10,
                  border: `1.5px solid ${T.border}`,
                  outline: "none",
                  fontSize: 13,
                  color: T.text,
                  fontFamily: "'Lexend', sans-serif",
                  background: "#F8FAFC",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = T.primary)}
                onBlur={(e) => (e.target.style.borderColor = T.border)}
              />
            </div>
            <button
              onClick={() => setShowFilter(!showFilter)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 14px",
                borderRadius: 10,
                border: `1.5px solid ${showFilter ? T.primary : T.border}`,
                background: showFilter ? T.primaryBg : "#fff",
                color: showFilter ? T.primary : T.textMid,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Lexend', sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16 }}
              >
                tune
              </span>
              Bộ lọc
            </button>
          </div>

          {/* Filter panel */}
          {showFilter && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: `1px solid ${T.border}`,
                animation: "fadeIn 0.15s ease",
              }}
            >
              <Form
                form={form}
                layout="inline"
                onFinish={handleFilterSubmit}
                onReset={handleFilterReset}
                className="sh-filter"
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <Form.Item name="name" style={{ margin: 0 }}>
                    <input
                      placeholder="Tên sản phẩm"
                      style={{
                        padding: "7px 12px",
                        borderRadius: 10,
                        border: `1.5px solid ${T.border}`,
                        fontSize: 13,
                        fontFamily: "'Lexend', sans-serif",
                        outline: "none",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = T.primary)}
                      onBlur={(e) => (e.target.style.borderColor = T.border)}
                    />
                  </Form.Item>
                  <Form.Item name="categoryId" style={{ margin: 0 }}>
                    <Select
                      placeholder="Danh mục"
                      style={{ width: 140 }}
                      allowClear
                    >
                      {categories?.data?.map((c) => (
                        <Select.Option key={c._id} value={c._id}>
                          {c.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="brandId" style={{ margin: 0 }}>
                    <Select
                      placeholder="Thương hiệu"
                      style={{ width: 140 }}
                      allowClear
                    >
                      {brands?.data?.map((b) => (
                        <Select.Option key={b._id} value={b._id}>
                          {b.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="priceFrom" style={{ margin: 0 }}>
                    <InputNumber
                      placeholder="Giá từ"
                      min={0}
                      style={{ width: 110 }}
                    />
                  </Form.Item>
                  <Form.Item name="priceTo" style={{ margin: 0 }}>
                    <InputNumber
                      placeholder="Giá đến"
                      min={0}
                      style={{ width: 110 }}
                    />
                  </Form.Item>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="submit"
                      onClick={() => form.submit()}
                      style={{
                        padding: "7px 16px",
                        borderRadius: 8,
                        border: "none",
                        background: T.primary,
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: "'Lexend', sans-serif",
                      }}
                    >
                      Lọc
                    </button>
                    <button
                      type="button"
                      onClick={handleFilterReset}
                      style={{
                        padding: "7px 16px",
                        borderRadius: 8,
                        border: `1.5px solid ${T.border}`,
                        background: "#fff",
                        color: T.textMid,
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: "'Lexend', sans-serif",
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </Form>
            </div>
          )}
        </div>

        {/* ── Table ─────────────────────────────────────────── */}
        <div
          style={{
            background: T.card,
            borderRadius: 14,
            border: `1px solid ${T.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          {isLoading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 280,
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  border: `3px solid ${T.border}`,
                  borderTopColor: T.primary,
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <p style={{ fontSize: 13, color: T.textMuted }}>
                Đang tải sản phẩm...
              </p>
            </div>
          ) : isError ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 240,
                gap: 8,
                color: T.textMuted,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 36, color: T.red }}
              >
                error_outline
              </span>
              <p style={{ fontSize: 13, fontWeight: 500 }}>
                Lỗi khi tải danh sách sản phẩm
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      background: "#F8FAFC",
                      borderBottom: `1.5px solid ${T.border}`,
                    }}
                  >
                    {[
                      "",
                      "Sản phẩm",
                      "Danh mục",
                      "Thương hiệu",
                      "Giá",
                      "Tồn kho",
                      "Trạng thái",
                      "Ngày tạo",
                      "Thao tác",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          fontSize: 10,
                          fontWeight: 700,
                          color: T.textMuted,
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
                  {products.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          padding: 48,
                          textAlign: "center",
                          color: T.textMuted,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 36, opacity: 0.3 }}
                          >
                            inventory_2
                          </span>
                          <p style={{ fontSize: 13, fontWeight: 500 }}>
                            Không tìm thấy sản phẩm
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    products.map((record) => {
                      const isExpanded = expandedRow === record._id;
                      const stockCount = getAdminStockCount(
                        record,
                        inventoryByProductId,
                      );
                      return (
                        <React.Fragment key={record._id}>
                          <tr
                            className="sh-prod-row"
                            style={{
                              borderBottom: `1px solid #F1F5F9`,
                              cursor: "default",
                            }}
                          >
                            {/* Expand toggle */}
                            <td
                              style={{
                                padding: "12px 6px 12px 14px",
                                width: 32,
                              }}
                            >
                              {record.hasVariants && (
                                <button
                                  onClick={() =>
                                    setExpandedRow(
                                      isExpanded ? null : record._id,
                                    )
                                  }
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 6,
                                    border: `1.5px solid ${T.border}`,
                                    background: isExpanded
                                      ? T.primaryBg
                                      : "#fff",
                                    color: isExpanded ? T.primary : T.textMuted,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                  }}
                                >
                                  <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: 14 }}
                                  >
                                    {isExpanded ? "expand_less" : "expand_more"}
                                  </span>
                                </button>
                              )}
                            </td>
                            {/* Product name + ID */}
                            <td style={{ padding: "12px 16px" }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
                                <div
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    background: T.primaryBg,
                                    border: `1px solid rgba(244,157,37,0.15)`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                    flexShrink: 0,
                                  }}
                                >
                                  {record.mainImage ? (
                                    <img
                                      src={record.mainImage}
                                      alt={record.name}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                      }}
                                    />
                                  ) : (
                                    <span
                                      className="material-symbols-outlined"
                                      style={{
                                        fontSize: 18,
                                        color: T.primary,
                                        opacity: 0.5,
                                      }}
                                    >
                                      shoe
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: 13,
                                      fontWeight: 700,
                                      color: T.text,
                                      maxWidth: 180,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {record.name}
                                  </p>
                                  <p
                                    style={{
                                      margin: "2px 0 0",
                                      fontSize: 10,
                                      color: T.textMuted,
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {record._id?.slice(-8).toUpperCase()}
                                  </p>
                                </div>
                              </div>
                            </td>
                            {/* Category */}
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: 13,
                                color: T.textMid,
                              }}
                            >
                              {record.categoryId?.name || "—"}
                            </td>
                            {/* Brand */}
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: 13,
                                color: T.textMid,
                              }}
                            >
                              {record.brandId?.name || "—"}
                            </td>
                            {/* Price */}
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: 13,
                                fontWeight: 700,
                                color: T.primary,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {getAdminDisplayPrice(record)}
                            </td>
                            {/* Stock */}
                            <td style={{ padding: "12px 16px" }}>
                              <StockBar count={stockCount} />
                            </td>
                            {/* Status */}
                            <td style={{ padding: "12px 16px" }}>
                              <StatusBadge
                                deleted={!!record.deletedAt}
                                count={stockCount}
                              />
                            </td>
                            {/* Created date */}
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: 12,
                                color: T.textMuted,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {new Date(record.createdAt).toLocaleDateString(
                                "vi-VN",
                              )}
                            </td>
                            {/* Actions */}
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ display: "flex", gap: 6 }}>
                                {!record.deletedAt && (
                                  <>
                                    <button
                                      onClick={() =>
                                        setProductSelected(record._id)
                                      }
                                      style={{
                                        padding: "6px 12px",
                                        borderRadius: 8,
                                        border: `1.5px solid ${T.border}`,
                                        background: "#fff",
                                        color: T.textMid,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        fontFamily: "'Lexend', sans-serif",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor =
                                          T.primary;
                                        e.currentTarget.style.color = T.primary;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor =
                                          T.border;
                                        e.currentTarget.style.color = T.textMid;
                                      }}
                                    >
                                      <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: 14 }}
                                      >
                                        edit
                                      </span>
                                      Sửa
                                    </button>
                                  </>
                                )}
                                {record.deletedAt && (
                                  <button
                                    onClick={() => handleRestore(record._id)}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: 8,
                                      border: `1.5px solid ${T.primary}`,
                                      background: T.primaryBg,
                                      color: T.primary,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      fontFamily: "'Lexend', sans-serif",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                  >
                                    <span
                                      className="material-symbols-outlined"
                                      style={{ fontSize: 14 }}
                                    >
                                      restore
                                    </span>
                                    Khôi phục
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded variant row */}
                          {isExpanded && (
                            <tr
                              style={{ background: "#FFFBF5" }}
                            >
                              <td
                                colSpan={9}
                                style={{
                                  padding: "0 16px 12px 56px",
                                  borderBottom: `1px solid ${T.border}`,
                                }}
                              >
                                <VariantTable variants={record.variants} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !isError && data && (
            <Pagination
              page={page}
              total={data.total}
              limit={limit}
              onChange={setPage}
            />
          )}
        </div>
      </div>
    </>
  );
}
