import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ProductDetail from "./ProductDetail.jsx";
import { getAllProducts } from "../api/index";

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Đồng bộ logic HomePage — nhận diện phụ kiện theo tên/slug danh mục */
const isAccessoryProduct = (product) => {
  const categoryName = normalizeText(product?.categoryId?.name || product?.category || "");
  const slug = normalizeText(product?.categoryId?.slug || "");
  return (
    categoryName.includes("phu kien") ||
    categoryName.includes("phukien") ||
    categoryName.includes("accessor") ||
    slug.includes("phu-kien") ||
    slug.includes("accessories")
  );
};

const T = {
  primary: "#f49d25",
  primaryBg: "rgba(244,157,37,0.08)",
  primaryHover: "rgba(244,157,37,0.14)",
  border: "#E2E8F0",
  text: "#0F172A",
  textMid: "#475569",
  textMuted: "#94A3B8",
  card: "#ffffff",
  bg: "#F8F7F5",
  green: "#16A34A",
  greenBg: "rgba(22,163,74,0.10)",
  blue: "#2563EB",
  blueBg: "rgba(37,99,235,0.08)",
  violet: "#7C3AED",
  violetBg: "rgba(124,58,237,0.08)",
};

const ruleActiveNow = (r, now = new Date()) => {
  if (!r || String(r.status || "").toLowerCase() !== "active") return false;
  const start = r.startAt ? new Date(r.startAt) : null;
  const end = r.endAt ? new Date(r.endAt) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
};

export const hasActiveSaleRules = (p, now = new Date()) => {
  const rules = p?.saleRules;
  if (!Array.isArray(rules) || !rules.length) return false;
  return rules.some((r) => ruleActiveNow(r, now));
};

/** SP trong hub sale: nổi bật hoặc rule giảm giá đang hiệu lực. */
export const productQualifiesForSaleHub = (p) => {
  if (!p || p.isDeleted) return false;
  if (p.isFeatured) return true;
  if (hasActiveSaleRules(p)) return true;
  return false;
};

const pickPrimaryActiveRule = (p) => {
  const rules = (p?.saleRules || []).filter((r) => ruleActiveNow(r));
  if (!rules.length) return null;
  return [...rules].sort((a, b) => Number(b?.priority || 0) - Number(a?.priority || 0))[0];
};

const formatRuleLine = (p) => {
  const r = pickPrimaryActiveRule(p);
  if (!r) return { short: "—", detail: "Không có rule đang chạy" };
  const val = Number(r.discountValue) || 0;
  const short =
    r.discountType === "fixed"
      ? `-${val.toLocaleString("vi-VN")}₫`
      : `-${val}%`;
  const end = r.endAt
    ? new Date(r.endAt).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Không giới hạn";
  return { short, detail: `${r.name || "Giảm giá"} · Kết thúc: ${end}` };
};

async function fetchAllActiveProducts() {
  const limit = 200;
  let page = 0;
  const all = [];
  for (;;) {
    const res = await getAllProducts({
      page,
      limit,
      isListProductRemoved: false,
      filter: {},
    });
    const chunk = Array.isArray(res?.data) ? res.data : [];
    all.push(...chunk);
    if (chunk.length < limit) break;
    page += 1;
    if (page > 40) break;
  }
  return all;
}

const getListImage = (p) => {
  const raw = p?.image || (Array.isArray(p?.srcImages) ? p.srcImages[0] : "");
  if (!raw || typeof raw !== "string") return "";
  if (raw.startsWith("http")) return raw;
  return `http://localhost:3002/uploads/${raw.startsWith("/") ? raw.slice(1) : raw}`;
};

const getDisplayPrice = (p) => {
  const min = Number(p?.priceRange?.min);
  const max = Number(p?.priceRange?.max);
  if (Number.isFinite(min) && Number.isFinite(max)) {
    return min === max
      ? `${min.toLocaleString("vi-VN")}₫`
      : `${min.toLocaleString("vi-VN")} – ${max.toLocaleString("vi-VN")}₫`;
  }
  const single = Number(p?.price);
  if (Number.isFinite(single)) return `${single.toLocaleString("vi-VN")}₫`;
  return "—";
};

const getSortKey = (p, mode) => {
  if (mode === "name") return String(p?.name || "").toLowerCase();
  if (mode === "price") {
    const n = Number(p?.priceRange?.min ?? p?.price ?? 0);
    return Number.isFinite(n) ? n : 0;
  }
  const r = pickPrimaryActiveRule(p);
  if (mode === "ruleEnd" && r?.endAt) return new Date(r.endAt).getTime();
  if (mode === "ruleEnd") return Number.MAX_SAFE_INTEGER;
  return String(p?.name || "");
};

function StatCard({ icon, label, value, hint, accent = T.primary, accentBg = T.primaryBg }) {
  return (
    <div
      style={{
        background: T.card,
        borderRadius: 16,
        border: `1px solid ${T.border}`,
        padding: "18px 20px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 28,
          color: accent,
          background: accentBg,
          padding: 10,
          borderRadius: 12,
          fontVariationSettings: "'FILL' 1",
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 800, color: T.text, letterSpacing: "-0.5px", lineHeight: 1.1 }}>
          {value}
        </p>
        {hint ? (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: T.textMid, lineHeight: 1.45 }}>{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: 108,
              borderRadius: 16,
              background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.2s ease-in-out infinite",
            }}
          />
        ))}
      </div>
      <div style={{ height: 420, borderRadius: 16, background: "#f1f5f9" }} />
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

export default function SaleManager() {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState(null);
  /** program: chỉ SP đang trong chương trình; full: đổ toàn bộ catalog (giày + phụ kiện) */
  const [listScope, setListScope] = useState("full");
  const [typeFilter, setTypeFilter] = useState("all");
  const [filterTab, setFilterTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("ruleEnd");
  const [viewMode, setViewMode] = useState("table");

  useEffect(() => {
    if (listScope === "program") setTypeFilter("all");
  }, [listScope]);

  const {
    data: allProducts = [],
    isLoading,
    isError,
    isFetching,
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: ["admin-sale-hub-products"],
    queryFn: fetchAllActiveProducts,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const saleItems = useMemo(
    () => allProducts.filter(productQualifiesForSaleHub),
    [allProducts],
  );

  const stats = useMemo(() => {
    const featured = saleItems.filter((p) => p.isFeatured).length;
    const withRules = saleItems.filter((p) => hasActiveSaleRules(p)).length;
    const both = saleItems.filter((p) => p.isFeatured && hasActiveSaleRules(p)).length;
    const accessories = allProducts.filter(isAccessoryProduct).length;
    const shoes = allProducts.length - accessories;
    return {
      featured,
      withRules,
      both,
      total: saleItems.length,
      catalog: allProducts.length,
      accessories,
      shoes,
    };
  }, [saleItems, allProducts]);

  const filtered = useMemo(() => {
    let list =
      listScope === "program"
        ? filterTab === "featured"
          ? saleItems.filter((p) => p.isFeatured)
          : filterTab === "rules"
            ? saleItems.filter((p) => hasActiveSaleRules(p))
            : [...saleItems]
        : [...allProducts];

    if (listScope === "full") {
      if (typeFilter === "accessory") list = list.filter(isAccessoryProduct);
      if (typeFilter === "shoe") list = list.filter((p) => !isAccessoryProduct(p));
      if (filterTab === "featured") list = list.filter((p) => p.isFeatured);
      if (filterTab === "rules") list = list.filter((p) => hasActiveSaleRules(p));
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const name = String(p?.name || "").toLowerCase();
        const skuMatch =
          Array.isArray(p?.variants) &&
          p.variants.some((v) => String(v?.sku || "").toLowerCase().includes(q));
        return name.includes(q) || skuMatch;
      });
    }

    const mult = sortBy === "name" ? 1 : sortBy === "price" ? 1 : 1;
    list.sort((a, b) => {
      const va = getSortKey(a, sortBy);
      const vb = getSortKey(b, sortBy);
      if (typeof va === "string" && typeof vb === "string") {
        return mult * va.localeCompare(vb, "vi");
      }
      if (sortBy === "ruleEnd") return va - vb;
      return mult * (va - vb);
    });
    return list;
  }, [allProducts, saleItems, listScope, typeFilter, filterTab, search, sortBy]);

  const filterTabCounts = useMemo(() => {
    const slice =
      listScope === "program"
        ? saleItems
        : typeFilter === "accessory"
          ? allProducts.filter(isAccessoryProduct)
          : typeFilter === "shoe"
            ? allProducts.filter((p) => !isAccessoryProduct(p))
            : [...allProducts];
    return {
      all: slice.length,
      featured: slice.filter((p) => p.isFeatured).length,
      rules: slice.filter((p) => hasActiveSaleRules(p)).length,
    };
  }, [listScope, typeFilter, saleItems, allProducts]);

  if (productId) {
    return (
      <ProductDetail
        productId={productId}
        saleOnly
        onClose={() => {
          setProductId(null);
          queryClient.invalidateQueries({ queryKey: ["admin-sale-hub-products"] });
          queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        }}
      />
    );
  }

  const btnBase = {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer",
    borderRadius: 10,
    border: `1.5px solid ${T.border}`,
    background: "#fff",
    color: T.textMid,
    padding: "8px 12px",
  };

  const lastSync =
    dataUpdatedAt > 0
      ? new Date(dataUpdatedAt).toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          day: "2-digit",
          month: "2-digit",
        })
      : "—";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        .material-symbols-outlined { font-family:'Material Symbols Outlined'; font-style:normal; line-height:1; font-size:22px; }
        .sale-table-wrap { overflow-x: auto; border-radius: 16px; border: 1px solid ${T.border}; background: ${T.card}; max-width: 100%; -webkit-overflow-scrolling: touch; }
        .sale-table { width: 100%; min-width: 920px; border-collapse: collapse; font-size: 13px; }
        .sale-table th { text-align: left; padding: 12px 14px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: ${T.textMuted}; background: #f8fafc; border-bottom: 1px solid ${T.border}; white-space: nowrap; }
        .sale-table td { padding: 12px 14px; border-bottom: 1px solid ${T.border}; vertical-align: middle; color: ${T.textMid}; }
        .sale-table th:nth-last-child(2), .sale-table td:nth-last-child(2),
        .sale-table th:last-child, .sale-table td:last-child { text-align: right; }
        .sale-table tbody tr:hover td { background: #fffbf5; }
        @media (max-width: 900px) {
          .sale-hub-search { grid-template-columns: 1fr !important; }
          .sale-hub-search-view { justify-self: start; }
        }
      `}</style>
      <div
        style={{
          padding: "24px 16px 40px",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          minHeight: "100vh",
          background: T.bg,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ minWidth: 0, flex: "1 1 280px", maxWidth: 720 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: "-0.4px" }}>
                Trung tâm Sale
              </h1>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: T.textMuted, lineHeight: 1.55 }}>
                {listScope === "program" ? (
                  <>
                    Theo dõi SKU đang trong chương trình: <strong>Nổi bật</strong> hoặc <strong>rule giảm giá còn hiệu lực</strong>
                    (gồm cả phụ kiện nếu đủ điều kiện). Bấm <strong>Toàn bộ SP &amp; phụ kiện</strong> để xem và gán sale cho mọi mặt hàng.
                  </>
                ) : (
                  <>
                    Đang hiển thị <strong>toàn bộ</strong> sản phẩm và phụ kiện trong catalog. Dùng lọc loại / trạng thái sale để thu hẹp, rồi bấm{" "}
                    <strong>Sale</strong> để cấu hình nổi bật hoặc giảm giá.
                  </>
                )}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
                justifyContent: "flex-end",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 12, color: T.textMuted, textAlign: "right", lineHeight: 1.4 }}>
                Đồng bộ: <strong style={{ color: T.textMid }}>{lastSync}</strong>
                {isFetching && !isLoading ? " · Đang cập nhật…" : ""}
              </span>
              <button
                type="button"
                onClick={() => refetch()}
                style={{
                  ...btnBase,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  borderColor: T.primary,
                  color: T.primary,
                  background: T.primaryBg,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  refresh
                </span>
                Làm mới
              </button>
            </div>
          </div>

          {isLoading ? (
            <SkeletonBlock />
          ) : (
            <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <StatCard
                icon="sell"
                label="Trong chương trình"
                value={stats.total}
                hint={`${stats.both} SP vừa nổi bật vừa có rule đang chạy`}
                accent={T.primary}
                accentBg={T.primaryBg}
              />
              <StatCard
                icon="star"
                label="Nổi bật (Featured)"
                value={stats.featured}
                hint="Hiển thị ưu tiên trên shop / gợi ý hot"
                accent={T.violet}
                accentBg={T.violetBg}
              />
              <StatCard
                icon="percent"
                label="Có giảm giá (rule)"
                value={stats.withRules}
                hint="Rule active và trong khung thời gian"
                accent={T.green}
                accentBg={T.greenBg}
              />
              <StatCard
                icon="inventory_2"
                label="Tổng catalog"
                value={stats.catalog}
                hint={`${stats.shoes} sản phẩm · ${stats.accessories} phụ kiện (đã tải)`}
                accent={T.blue}
                accentBg={T.blueBg}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, flexShrink: 0 }}>Phạm vi:</span>
              {[
                { id: "program", label: "Chương trình đang chạy" },
                { id: "full", label: "Toàn bộ SP & phụ kiện" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setListScope(s.id)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 12,
                    border: `1.5px solid ${listScope === s.id ? T.primary : T.border}`,
                    background: listScope === s.id ? T.primaryBg : "#fff",
                    color: listScope === s.id ? T.primary : T.textMid,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {listScope === "full" && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, flexShrink: 0 }}>Loại hàng:</span>
                {[
                  { id: "all", label: "Tất cả", count: stats.catalog },
                  { id: "shoe", label: "Sản phẩm (không phụ kiện)", count: stats.shoes },
                  { id: "accessory", label: "Phụ kiện", count: stats.accessories },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTypeFilter(t.id)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 999,
                      border: `1.5px solid ${typeFilter === t.id ? T.blue : T.border}`,
                      background: typeFilter === t.id ? T.blueBg : "#fff",
                      color: typeFilter === t.id ? T.blue : T.textMid,
                      fontWeight: 700,
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    {t.label} ({t.count})
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, flexShrink: 0, maxWidth: 280, lineHeight: 1.35 }}>
                {listScope === "program" ? "Lọc CT:" : "Lọc sale:"}
              </span>
              {[
                { id: "all", label: "Tất cả", count: filterTabCounts.all },
                { id: "featured", label: "Nổi bật", count: filterTabCounts.featured },
                { id: "rules", label: "Đang giảm giá", count: filterTabCounts.rules },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    border: `1.5px solid ${filterTab === tab.id ? T.primary : T.border}`,
                    background: filterTab === tab.id ? T.primaryBg : "#fff",
                    color: filterTab === tab.id ? T.primary : T.textMid,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {tab.label}{" "}
                  <span style={{ opacity: 0.85, fontWeight: 800 }}>({tab.count})</span>
                </button>
              ))}
            </div>

            <div
              style={{
                background: T.card,
                borderRadius: 16,
                border: `1px solid ${T.border}`,
                padding: "14px 16px",
                marginBottom: 18,
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(168px, 240px) auto",
                gap: 12,
                alignItems: "center",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
              }}
              className="sale-hub-search"
            >
              <input
                type="search"
                placeholder="Tìm theo tên hoặc SKU biến thể…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  minWidth: 0,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: `1.5px solid ${T.border}`,
                  fontSize: 13,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  ...btnBase,
                  padding: "10px 12px",
                  width: "100%",
                  maxWidth: "100%",
                  minHeight: 42,
                  boxSizing: "border-box",
                }}
              >
                <option value="ruleEnd">Sắp xếp: Rule kết thúc sớm nhất</option>
                <option value="name">Sắp xếp: Tên A–Z</option>
                <option value="price">Sắp xếp: Giá tăng dần</option>
              </select>
              <div
                className="sale-hub-search-view"
                style={{ display: "inline-flex", flexWrap: "nowrap", gap: 6, alignItems: "center", justifySelf: "end" }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  style={{
                    ...btnBase,
                    flexShrink: 0,
                    minHeight: 42,
                    padding: "10px 12px",
                    boxSizing: "border-box",
                    background: viewMode === "table" ? T.primaryBg : "#fff",
                    borderColor: viewMode === "table" ? T.primary : T.border,
                    color: viewMode === "table" ? T.primary : T.textMid,
                  }}
                >
                  Bảng
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  style={{
                    ...btnBase,
                    flexShrink: 0,
                    minHeight: 42,
                    padding: "10px 12px",
                    boxSizing: "border-box",
                    background: viewMode === "grid" ? T.primaryBg : "#fff",
                    borderColor: viewMode === "grid" ? T.primary : T.border,
                    color: viewMode === "grid" ? T.primary : T.textMid,
                  }}
                >
                  Lưới ảnh
                </button>
              </div>
            </div>

            {isError && (
              <p style={{ color: "#DC2626", fontSize: 14, fontWeight: 600 }}>
                Không tải được dữ liệu. Kiểm tra mạng hoặc đăng nhập admin rồi bấm Làm mới.
              </p>
            )}

            {!isError && filtered.length === 0 && (
              <div
                style={{
                  padding: 48,
                  textAlign: "center",
                  background: T.card,
                  borderRadius: 16,
                  border: `1px dashed ${T.border}`,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: T.textMuted, opacity: 0.5 }}>
                  shoppingmode
                </span>
                <p style={{ margin: "16px 0 0", color: T.textMid, fontSize: 14, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
                  {search.trim()
                    ? "Không có mặt hàng khớp tìm kiếm. Thử từ khóa khác."
                    : listScope === "full"
                      ? "Không có SKU trong phạm vi lọc hiện tại. Đổi loại hàng hoặc bỏ lọc trạng thái sale."
                      : "Chưa có SKU trong chương trình. Chuyển sang Toàn bộ SP & phụ kiện để gán sale, hoặc bật Nổi bật / rule tại Sale."}
                </p>
              </div>
            )}

            {!isError && filtered.length > 0 && viewMode === "table" && (
              <div className="sale-table-wrap">
                <table className="sale-table">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Loại</th>
                      <th>Danh mục</th>
                      <th>Trạng thái sale</th>
                      <th>Rule chính</th>
                      <th>Giá hiển thị</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const ruleFmt = formatRuleLine(p);
                      return (
                        <tr key={p._id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <img
                                src={getListImage(p)}
                                alt=""
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 10,
                                  objectFit: "cover",
                                  background: "#f1f5f9",
                                }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: T.text, lineHeight: 1.35 }}>{p.name}</div>
                                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                                  ID: {String(p._id).slice(-8)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: 10,
                                fontWeight: 800,
                                textTransform: "uppercase",
                                padding: "4px 8px",
                                borderRadius: 8,
                                background: isAccessoryProduct(p) ? T.blueBg : "#f1f5f9",
                                color: isAccessoryProduct(p) ? T.blue : T.textMid,
                              }}
                            >
                              {isAccessoryProduct(p) ? "Phụ kiện" : "Sản phẩm"}
                            </span>
                          </td>
                          <td>{p.categoryId?.name || p.category || "—"}</td>
                          <td>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {p.isFeatured && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    textTransform: "uppercase",
                                    padding: "4px 8px",
                                    borderRadius: 8,
                                    background: T.violetBg,
                                    color: T.violet,
                                  }}
                                >
                                  Nổi bật
                                </span>
                              )}
                              {hasActiveSaleRules(p) && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    textTransform: "uppercase",
                                    padding: "4px 8px",
                                    borderRadius: 8,
                                    background: T.greenBg,
                                    color: T.green,
                                  }}
                                >
                                  Giảm giá
                                </span>
                              )}
                              {!p.isFeatured && !hasActiveSaleRules(p) && (
                                <span style={{ color: T.textMuted }}>—</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: T.text }}>{ruleFmt.short}</div>
                            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{ruleFmt.detail}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: T.primary }}>{getDisplayPrice(p)}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => setProductId(p._id)}
                              style={{
                                padding: "8px 14px",
                                borderRadius: 10,
                                border: "none",
                                background: T.primary,
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: "pointer",
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                              }}
                            >
                              Sale
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!isError && filtered.length > 0 && viewMode === "grid" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                {filtered.map((p) => {
                  const ruleFmt = formatRuleLine(p);
                  return (
                    <div
                      key={p._id}
                      style={{
                        background: T.card,
                        borderRadius: 16,
                        border: `1px solid ${T.border}`,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                      }}
                    >
                      <div style={{ aspectRatio: "4/3", background: "#f1f5f9" }}>
                        <img src={getListImage(p)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              textTransform: "uppercase",
                              padding: "3px 8px",
                              borderRadius: 8,
                              background: isAccessoryProduct(p) ? T.blueBg : "#f1f5f9",
                              color: isAccessoryProduct(p) ? T.blue : T.textMid,
                            }}
                          >
                            {isAccessoryProduct(p) ? "Phụ kiện" : "SP"}
                          </span>
                          {p.isFeatured && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                textTransform: "uppercase",
                                padding: "3px 8px",
                                borderRadius: 8,
                                background: T.violetBg,
                                color: T.violet,
                              }}
                            >
                              Nổi bật
                            </span>
                          )}
                          {hasActiveSaleRules(p) && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                textTransform: "uppercase",
                                padding: "3px 8px",
                                borderRadius: 8,
                                background: T.greenBg,
                                color: T.green,
                              }}
                            >
                              {ruleFmt.short}
                            </span>
                          )}
                        </div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 15,
                            fontWeight: 700,
                            color: T.text,
                            lineHeight: 1.35,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {p.name}
                        </h3>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.primary }}>{getDisplayPrice(p)}</p>
                        <p style={{ margin: 0, fontSize: 11, color: T.textMuted }}>{ruleFmt.detail}</p>
                        <button
                          type="button"
                          onClick={() => setProductId(p._id)}
                          style={{
                            marginTop: "auto",
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: `1.5px solid ${T.primary}`,
                            background: "#fff",
                            color: T.primary,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                          }}
                        >
                          Sale
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p style={{ marginTop: 24, fontSize: 12, color: T.textMuted, lineHeight: 1.55, maxWidth: 900 }}>
              Gợi ý chuyên nghiệp: phân tách <strong>Voucher</strong> (toàn đơn / danh mục) với <strong>Sale theo sản phẩm</strong> (rule trên SKU);
              màn này chỉ phản ánh <strong>trạng thái hiện tại</strong> trên catalog — không tạo chiến dịch mới.
            </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
