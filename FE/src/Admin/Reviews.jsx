import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Button, Input, Select, Switch, message, Modal } from "antd";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllProducts,
  getAdminReviews,
  getAdminReviewTotalCount,
  getAdminReviewAutoReplySettings,
  patchAdminReviewAutoReplySettings,
  addReviewReply,
  approveAdminReview,
  rejectAdminReview,
  getReviewStatsByProduct,
} from "../api/index";
import {
  getOrderStatusLabelForReview,
  shouldShowOrderStatusOnReview,
} from "../utils/orderStatusForReview";

const T = {
  primary: "#f49d25",
  primaryBg: "rgba(244,157,37,0.12)",
  primarySoft: "rgba(244,157,37,0.08)",
  brown: "#7c4a2d",
  brownHover: "#6a3f26",
  border: "#E2E8F0",
  text: "#0F172A",
  textMid: "#475569",
  textMuted: "#94A3B8",
  card: "#ffffff",
  bg: "#F8F7F5",
  green: "#22C55E",
  greenBg: "rgba(34,197,94,0.12)",
  red: "#EF4444",
  redBg: "rgba(239,68,68,0.1)",
  yellow: "#F59E0B",
  yellowBg: "rgba(245,158,11,0.12)",
  orangeWarn: "#ea580c",
  orangeWarnBg: "rgba(234,88,12,0.12)",
  pillBg: "#F1F5F9",
};

const BACKEND_BASE_URL = (
  process.env.REACT_APP_API_URL_BACKEND || "http://localhost:3002/api"
)
  .replace(/\/api\/?$/, "")
  .replace(/localhost:\d+/, "localhost:3002")
  .replace(/127\.0\.0\.1:\d+/, "127.0.0.1:3002");

function getReviewImageSrc(img) {
  const v = img?.url ?? img;
  if (!v) return "";
  if (typeof v !== "string") return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("/uploads/")) return `${BACKEND_BASE_URL}${v}`;
  if (v.startsWith("uploads/")) return `${BACKEND_BASE_URL}/${v}`;
  return `${BACKEND_BASE_URL}/uploads/${v}`;
}

function getAdminProductListImageUrl(record) {
  const candidate =
    (typeof record?.image === "string" && record.image.trim()) ||
    (Array.isArray(record?.srcImages) &&
      typeof record.srcImages[0] === "string" &&
      record.srcImages[0].trim()) ||
    "";
  if (!candidate) return "";
  if (candidate.startsWith("http")) return candidate;
  const path = candidate.startsWith("/") ? candidate.slice(1) : candidate;
  return `${BACKEND_BASE_URL}/uploads/${path}`;
}

function getAdminDisplayPrice(record) {
  const effectiveMin = Number(record?.priceRange?.min);
  const effectiveMax = Number(record?.priceRange?.max);
  const originalMin = Number(record?.originalPriceRange?.min ?? record?.originalPrice);
  const originalMax = Number(record?.originalPriceRange?.max ?? record?.originalPrice);

  if (
    Number.isFinite(effectiveMin) &&
    Number.isFinite(effectiveMax) &&
    Number.isFinite(originalMin) &&
    Number.isFinite(originalMax) &&
    (effectiveMin < originalMin || effectiveMax < originalMax)
  ) {
    const saleText =
      effectiveMin === effectiveMax
        ? `${effectiveMin.toLocaleString("vi-VN")}₫`
        : `${effectiveMin.toLocaleString("vi-VN")} - ${effectiveMax.toLocaleString("vi-VN")}₫`;
    return saleText;
  }

  const minFromRange = Number(record?.priceRange?.min);
  const maxFromRange = Number(record?.priceRange?.max);

  if (Number.isFinite(minFromRange) && Number.isFinite(maxFromRange)) {
    return minFromRange === maxFromRange
      ? `${minFromRange.toLocaleString("vi-VN")}₫`
      : `${minFromRange.toLocaleString("vi-VN")} - ${maxFromRange.toLocaleString("vi-VN")}₫`;
  }

  if (Array.isArray(record?.variants) && record.variants.length > 0) {
    const prices = record.variants.map((v) => Number(v?.price)).filter((n) => Number.isFinite(n));
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
}

function getAdminStockCount(record) {
  if (Array.isArray(record?.variants) && record.variants.length > 0) {
    return record.variants.reduce((sum, v) => {
      const n = Number(v?.stock);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }
  const singleStock = Number(record?.countInStock ?? record?.stock);
  return Number.isFinite(singleStock) ? singleStock : null;
}

function productSku(record) {
  if (record?.sku && String(record.sku).trim()) return String(record.sku).trim();
  const v0 = record?.variants?.[0];
  if (v0?.sku && String(v0.sku).trim()) return String(v0.sku).trim();
  return "—";
}

function parseSizeFromVariantLabel(label) {
  if (!label || typeof label !== "string") return null;
  for (const part of label.split("·")) {
    const t = part.trim();
    const m = t.match(/^(?:Size|EU|Kích\s*cỡ)\s*:\s*(.+)$/i);
    if (m) return m[1].trim();
  }
  return null;
}

function reviewDateAndSizeLine(r) {
  const snap = r.productSnapshot;
  const purchaseSizeLine =
    snap?.purchaseSize ||
    parseSizeFromVariantLabel(snap?.orderedVariantText) ||
    parseSizeFromVariantLabel(r.variantLabel) ||
    null;
  const raw = r.createdAt ?? r.updatedAt;
  const dateStr = raw
    ? new Date(raw).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const sizeLine = `Phân loại: ${purchaseSizeLine || "—"}`;
  return { dateStr, sizeLine };
}

function userAvatarSrc(u) {
  const a = u?.avatar;
  if (!a) return "";
  if (typeof a !== "string") return "";
  if (a.startsWith("http://") || a.startsWith("https://")) return a;
  if (a.startsWith("/uploads/")) return `${BACKEND_BASE_URL}${a}`;
  return `${BACKEND_BASE_URL}/uploads/${a.replace(/^\//, "")}`;
}

function initialsFromName(name) {
  if (!name || typeof name !== "string") return "?";
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function activeRepliesList(r) {
  return Array.isArray(r?.replies) ? r.replies.filter((x) => !x?.isDeleted) : [];
}

function hasAdminReply(r) {
  return activeRepliesList(r).some((x) => x.role === "admin");
}

function adminRepliesOnly(r) {
  return activeRepliesList(r).filter((x) => x.role === "admin");
}

const StarRow = ({ value, size = 14 }) => {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const full = Math.floor(v);
  const half = v - full >= 0.5 ? 1 : 0;
  return (
    <span style={{ display: "inline-flex", gap: 1, lineHeight: 1 }} aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => {
        const on = i < full || (i === full && half);
        return (
          <span
            key={i}
            style={{
              fontSize: size,
              color: on ? T.primary : "#E5E7EB",
              opacity: on ? 1 : 0.45,
            }}
          >
            ★
          </span>
        );
      })}
    </span>
  );
};

const StockBadge = ({ count }) => {
  if (count === undefined || count === null)
    return (
      <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: T.pillBg, color: T.textMuted }}>
        —
      </span>
    );
  if (count === 0)
    return (
      <span
        style={{
          padding: "4px 10px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          background: T.redBg,
          color: T.red,
        }}
      >
        Hết hàng
      </span>
    );
  if (count < 20)
    return (
      <span
        style={{
          padding: "4px 10px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          background: T.yellowBg,
          color: T.yellow,
        }}
      >
        {count} · Sắp hết
      </span>
    );
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: T.greenBg,
        color: T.green,
      }}
    >
      {count} · Còn hàng
    </span>
  );
};

const statusBadge = (status) => {
  const s = status || "approved";
  if (s === "pending") {
    return { label: "CHỜ DUYỆT", bg: T.orangeWarnBg, color: T.orangeWarn };
  }
  if (s === "rejected") {
    return { label: "TỪ CHỐI", bg: T.redBg, color: T.red };
  }
  return { label: "ĐÃ DUYỆT", bg: T.greenBg, color: T.green };
};

const { TextArea } = Input;

function AdminReviewAutoReplyCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-review-auto-reply-settings"],
    queryFn: getAdminReviewAutoReplySettings,
    staleTime: 30_000,
  });
  const saveMutation = useMutation({
    mutationFn: patchAdminReviewAutoReplySettings,
    onSuccess: () => {
      message.success("Đã lưu cài đặt phản hồi tự động.");
      queryClient.invalidateQueries({ queryKey: ["admin-review-auto-reply-settings"] });
    },
    onError: (e) => {
      message.error(e?.response?.data?.message || "Không lưu được cài đặt.");
    },
  });

  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!data || typeof data !== "object") return;
    setEnabled(!!data.autoReplyEnabled);
    setText(String(data.autoReplyMessage ?? ""));
  }, [data]);

  const canSave =
    data &&
    typeof data === "object" &&
    (enabled !== !!data.autoReplyEnabled || text !== String(data.autoReplyMessage ?? ""));

  const cardBase = {
    background: T.card,
    borderRadius: 16,
    border: `1px solid ${T.border}`,
    boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
  };

  return (
    <div style={{ ...cardBase, padding: "18px 20px", marginBottom: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Phản hồi tự động đánh giá</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4, maxWidth: 560, lineHeight: 1.45 }}>
            Khi khách gửi đánh giá mới (đơn đã giao), hệ thống sẽ đăng một phản hồi shop nếu chưa có phản hồi admin.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.textMid }}>Bật</span>
          <Switch checked={enabled} onChange={setEnabled} disabled={isLoading} />
        </div>
      </div>
      <TextArea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ví dụ: Cảm ơn bạn đã mua hàng và chia sẻ trải nghiệm!"
        maxLength={500}
        showCount
        rows={3}
        disabled={isLoading}
        style={{ marginTop: 14, borderRadius: 12 }}
      />
      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
        <Button
          type="primary"
          loading={saveMutation.isPending}
          disabled={!canSave || isLoading}
          onClick={() => saveMutation.mutate({ autoReplyEnabled: enabled, autoReplyMessage: text })}
          style={{ background: T.primary, borderColor: T.primary }}
        >
          Lưu cài đặt
        </Button>
      </div>
    </div>
  );
}

// ── Danh sách sản phẩm (mockup inventory + đánh giá) ──────────
function ProductReviewHub({ onManageProduct }) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [starFilter, setStarFilter] = useState(undefined);
  const limit = 10;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 320);
    return () => clearTimeout(t);
  }, [searchInput]);

  const mergedFilter = useMemo(() => {
    const f = {};
    const n = debouncedSearch.trim();
    if (n) f.name = n;
    if (starFilter != null && starFilter !== "")
      f.reviewRating = Number(starFilter);
    return f;
  }, [debouncedSearch, starFilter]);

  useEffect(() => {
    setPage(1);
  }, [mergedFilter]);

  const { data: reviewTotals } = useQuery({
    queryKey: ["admin-review-total-count"],
    queryFn: getAdminReviewTotalCount,
    staleTime: 60_000,
  });
  const totalReviewsAll = Number(reviewTotals?.totalReviews ?? 0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-review-product-list", page, limit, mergedFilter],
    queryFn: () =>
      getAllProducts({
        page: page - 1,
        limit,
        isListProductRemoved: false,
        filter: mergedFilter,
        reviewsFirst: true,
      }),
    keepPreviousData: true,
  });

  const products = data?.data ?? [];
  const productTotal = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(productTotal / limit));

  const statsQueries = useQueries({
    queries: products.map((p) => ({
      queryKey: ["review-stats", p._id],
      queryFn: async () => {
        const res = await getReviewStatsByProduct(p._id);
        return res?.data ?? {};
      },
      enabled: !!p._id,
      staleTime: 45_000,
    })),
  });

  const statsById = useMemo(() => {
    const m = {};
    products.forEach((p, i) => {
      if (!p?._id) return;
      const d = statsQueries[i]?.data;
      m[String(p._id)] = {
        average: Number(d?.average ?? 0),
        total: Number(d?.total ?? 0),
        verified: Number(d?.verified ?? 0),
        loading: statsQueries[i]?.isLoading,
      };
    });
    return m;
  }, [products, statsQueries]);

  const pageButtonNums = useMemo(() => {
    const windowSize = 5;
    if (totalPages <= windowSize) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const half = Math.floor(windowSize / 2);
    let start = page - half;
    let end = page + half;
    if (start < 1) {
      start = 1;
      end = windowSize;
    }
    if (end > totalPages) {
      end = totalPages;
      start = totalPages - windowSize + 1;
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const exportCsv = () => {
    const rows = products.map((p) => {
      const st = statsById[String(p._id)];
      return {
        name: p.name || "",
        sku: productSku(p),
        category: p.categoryId?.name || "",
        price: getAdminDisplayPrice(p),
        stock: getAdminStockCount(p) ?? "",
        avg: st?.average ?? "",
        reviews: st?.total ?? "",
      };
    });
    const headers = ["Sản phẩm", "SKU", "Danh mục", "Giá", "Tồn", "Điểm TB", "Số đánh giá"];
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      headers.join(","),
      ...rows.map((x) =>
        [x.name, x.sku, x.category, x.price, x.stock, x.avg, x.reviews].map(esc).join(","),
      ),
    ];
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `san-pham-danh-gia-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cardBase = {
    background: T.card,
    borderRadius: 16,
    border: `1px solid ${T.border}`,
    boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
  };

  const metricCardShell = {
    ...cardBase,
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    minHeight: 132,
    minWidth: 0,
  };

  return (
    <div
      className="admin-allow-wrap rev-layout-hub"
      style={{ width: "100%", maxWidth: 1240, margin: "0 auto", padding: "0 8px" }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              color: T.text,
              letterSpacing: "-0.03em",
            }}
          >
            Sản phẩm &amp; đánh giá
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: T.textMid, maxWidth: 640, lineHeight: 1.5 }}>
            Quản lý kho, giá và mở đánh giá theo từng sản phẩm.{" "}
            <span style={{ color: T.textMuted, fontSize: 13 }}>
              Ưu tiên hiển thị sản phẩm có nhiều đánh giá trước.
            </span>
          </p>
        </div>
      </div>

      <div className="rev-hub-metrics" style={{ marginBottom: 18 }}>
        {[
          {
            label: "Tổng sản phẩm",
            value: productTotal.toLocaleString("vi-VN"),
            sub: "Theo tìm kiếm & lọc sao hiện tại",
          },
          {
            label: "Tổng lượt đánh giá",
            value: totalReviewsAll.toLocaleString("vi-VN"),
            sub: "Toàn hệ thống (chưa xóa)",
          },
        ].map((c) => (
          <div key={c.label} style={metricCardShell}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textMuted }}>{c.label}</div>
            <div
              style={{
                marginTop: 10,
                fontSize: 28,
                fontWeight: 800,
                color: T.text,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {c.value}
            </div>
            <div
              style={{
                marginTop: "auto",
                paddingTop: 10,
                fontSize: 12,
                color: T.textMuted,
                lineHeight: 1.45,
              }}
            >
              {c.sub}
            </div>
          </div>
        ))}
      </div>

      <AdminReviewAutoReplyCard />

      <div style={{ ...cardBase, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "stretch",
            gap: 12,
            padding: "14px 18px",
            borderBottom: `1px solid ${T.border}`,
            background: "#FAFAF9",
          }}
        >
          <div style={{ position: "relative", flex: "1 1 280px", minWidth: 0, display: "flex", alignItems: "center" }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 20,
                color: T.textMuted,
                pointerEvents: "none",
              }}
            >
              search
            </span>
            <input
              placeholder="Tìm sản phẩm trong kho..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px 12px 44px",
                borderRadius: 12,
                border: `1.5px solid ${T.border}`,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                background: "#fff",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = T.primary;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = T.border;
              }}
            />
          </div>
          <Select
            allowClear
            placeholder="Lọc theo số sao"
            value={starFilter}
            onChange={(v) => {
              setStarFilter(v);
              setPage(1);
            }}
            style={{ width: 200, minHeight: 46 }}
            options={[5, 4, 3, 2, 1].map((n) => ({
              value: n,
              label: `${n} sao`,
            }))}
          />
          <button
            type="button"
            onClick={exportCsv}
            disabled={products.length === 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "0 18px",
              minHeight: 46,
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: "#fff",
              fontSize: 13,
              fontWeight: 600,
              color: T.textMid,
              cursor: products.length === 0 ? "not-allowed" : "pointer",
              opacity: products.length === 0 ? 0.5 : 1,
              flexShrink: 0,
              alignSelf: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              download
            </span>
            Xuất CSV
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table
            className="rev-product-table"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 920,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: "36%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr style={{ background: "#fff", borderBottom: `1px solid ${T.border}` }}>
                {[
                  { h: "Sản phẩm", align: "left" },
                  { h: "Danh mục", align: "center" },
                  { h: "Giá", align: "center" },
                  { h: "Tồn kho", align: "center" },
                  { h: "Đánh giá", align: "center" },
                  { h: "Thao tác", align: "right" },
                ].map(({ h, align }) => (
                  <th
                    key={h}
                    style={{
                      textAlign: align,
                      verticalAlign: "middle",
                      padding: "14px 12px",
                      fontSize: 11,
                      fontWeight: 800,
                      color: T.textMuted,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: "center", color: T.textMuted }}>
                    Đang tải…
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: "center", color: T.textMuted }}>
                    Không có sản phẩm.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const st = statsById[String(p._id)];
                  const img = getAdminProductListImageUrl(p);
                  const stock = getAdminStockCount(p);
                  const avg = st?.average ?? 0;
                  const nRev = st?.total ?? 0;
                  const loading = st?.loading;

                  return (
                    <tr
                      key={p._id}
                      style={{ borderBottom: `1px solid ${T.border}` }}
                      className="sh-rev-prod-row"
                    >
                      <td style={{ padding: "14px 14px 14px 16px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <div
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: 12,
                              overflow: "hidden",
                              border: `1px solid ${T.border}`,
                              flexShrink: 0,
                              background: "#f1f5f9",
                            }}
                          >
                            {img ? (
                              <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : null}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: T.text }}>{p.name || "—"}</div>
                            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>
                              SKU {productSku(p)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 12px", verticalAlign: "middle", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            maxWidth: "100%",
                            padding: "4px 12px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            background: T.pillBg,
                            color: T.textMid,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            verticalAlign: "middle",
                          }}
                          title={p.categoryId?.name || ""}
                        >
                          {p.categoryId?.name || "—"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "14px 10px",
                          verticalAlign: "middle",
                          fontWeight: 700,
                          fontSize: 14,
                          color: T.text,
                          textAlign: "center",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          lineHeight: 1.35,
                        }}
                      >
                        {getAdminDisplayPrice(p)}
                      </td>
                      <td style={{ padding: "14px 12px", verticalAlign: "middle", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <StockBadge count={stock} />
                        </div>
                      </td>
                      <td style={{ padding: "14px 10px", verticalAlign: "middle" }}>
                        {loading ? (
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <span style={{ color: T.textMuted, fontSize: 13 }}>…</span>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              width: "100%",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                flexWrap: "nowrap",
                                maxWidth: "100%",
                              }}
                            >
                              <StarRow value={avg} size={14} />
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: T.textMid,
                                  lineHeight: 1,
                                  whiteSpace: "nowrap",
                                  flexShrink: 0,
                                }}
                              >
                                {avg > 0 ? avg.toFixed(1) : "—"} | {nRev.toLocaleString("vi-VN")}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px 12px 10px", verticalAlign: "middle" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            width: "100%",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => onManageProduct(p)}
                            style={{
                              width: "100%",
                              maxWidth: 160,
                              padding: "10px 12px",
                              borderRadius: 12,
                              border: "none",
                              background: T.brown,
                              color: "#fff",
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: "pointer",
                              lineHeight: 1.25,
                              boxShadow: "0 2px 8px rgba(92,64,51,0.2)",
                              boxSizing: "border-box",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = T.brownHover;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = T.brown;
                            }}
                          >
                            Quản lý đánh giá
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && products.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              rowGap: 12,
              padding: "14px 18px",
              borderTop: `1px solid ${T.border}`,
              background: "#FAFAF9",
            }}
          >
            <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.45, flex: "1 1 200px", minWidth: 0 }}>
              Hiển thị <strong style={{ color: T.text }}>{(page - 1) * limit + 1}–{Math.min(page * limit, productTotal)}</strong> trong tổng{" "}
              <strong style={{ color: T.text }}>{productTotal.toLocaleString("vi-VN")}</strong> sản phẩm
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((x) => Math.max(1, x - 1))}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  background: "#fff",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                  opacity: page <= 1 ? 0.45 : 1,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: "middle" }}>
                  chevron_left
                </span>
              </button>
              {pageButtonNums.map((num) => {
                const active = num === page;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPage(num)}
                    style={{
                      minWidth: 40,
                      height: 40,
                      borderRadius: 10,
                      border: `1px solid ${active ? T.primary : T.border}`,
                      background: active ? T.primaryBg : "#fff",
                      color: active ? T.primary : T.textMid,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {num}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((x) => Math.min(totalPages, x + 1))}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  background: "#fff",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                  opacity: page >= totalPages ? 0.45 : 1,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: "middle" }}>
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <style>{`
        .rev-hub-metrics {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        @media (max-width: 520px) {
          .rev-hub-metrics { grid-template-columns: minmax(0, 1fr); }
        }
        .rev-hub-filter .ant-select-selector,
        .rev-hub-filter .ant-input-number {
          border-radius: 10px !important;
        }
        .rev-product-table th,
        .rev-product-table td { vertical-align: middle !important; }
        .sh-rev-prod-row:hover td { background: #FFFBF5 !important; }
      `}</style>
    </div>
  );
}

// ── Chi tiết đánh giá theo một sản phẩm ────────────────────────
function ProductReviewDetail({ product, onBack }) {
  const queryClient = useQueryClient();
  const pid = product?._id;
  const [searchKeyword, setSearchKeyword] = useState("");
  const [starFilter, setStarFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [reviewPage, setReviewPage] = useState(1);
  const reviewPageSize = 10;

  const [replyOpen, setReplyOpen] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: statsRes } = useQuery({
    queryKey: ["review-stats", pid, "header"],
    queryFn: async () => {
      const res = await getReviewStatsByProduct(pid);
      return res?.data ?? {};
    },
    enabled: !!pid,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", "product", pid, reviewPage, reviewPageSize],
    queryFn: () => getAdminReviews({ productId: pid, page: reviewPage, limit: reviewPageSize }),
    enabled: !!pid,
  });

  const reviews = useMemo(() => data?.reviews ?? [], [data]);
  const totalReviews = data?.meta?.total ?? reviews.length;
  const totalReviewPages = Math.max(1, Math.ceil(totalReviews / reviewPageSize));

  useEffect(() => {
    setReviewPage(1);
  }, [pid]);

  useEffect(() => {
    setReviewPage(1);
  }, [searchKeyword, starFilter]);

  const filteredRows = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    return reviews.filter((r) => {
      const rating = Number(r?.rating || 0);
      if (starFilter === "low") {
        if (![1, 2].includes(rating)) return false;
      } else if (starFilter !== "all") {
        if (rating !== Number(starFilter)) return false;
      }
      if (!kw) return true;
      const user = String(r.userId?.name || "").toLowerCase();
      const content = String(r.content || "").toLowerCase();
      const title = String(r.title || "").toLowerCase();
      return user.includes(kw) || content.includes(kw) || title.includes(kw);
    });
  }, [reviews, searchKeyword, starFilter]);

  const sortedRows = useMemo(() => {
    const arr = [...filteredRows];
    arr.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return sortOrder === "newest" ? tb - ta : ta - tb;
    });
    return arr;
  }, [filteredRows, sortOrder]);

  const listStats = useMemo(() => {
    if (!reviews.length) {
      return { avg: 0, positivePct: 0, pendingReply: 0 };
    }
    const sum = reviews.reduce((a, r) => a + Number(r?.rating || 0), 0);
    const pos = reviews.filter((r) => [4, 5].includes(Number(r?.rating))).length;
    const pendingReply = reviews.filter((r) => !hasAdminReply(r)).length;
    return {
      avg: Math.round((sum / reviews.length) * 10) / 10,
      positivePct: Math.round((pos / reviews.length) * 1000) / 10,
      pendingReply,
    };
  }, [reviews]);

  const hasClientFilter = searchKeyword.trim() !== "" || starFilter !== "all";

  const refetchReviews = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: ["admin-reviews", "product", pid] });
    await queryClient.invalidateQueries({ queryKey: ["review-stats", pid] });
  }, [queryClient, pid]);

  const replyMutation = useMutation({
    mutationFn: ({ id, content }) => addReviewReply(id, content),
    onSuccess: async (_, vars) => {
      message.success("Đã gửi phản hồi");
      setReplyDrafts((d) => ({ ...d, [vars.id]: "" }));
      setReplyOpen((o) => ({ ...o, [vars.id]: false }));
      await refetchReviews();
      queryClient.invalidateQueries({ queryKey: ["admin-product-review-metrics"] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Không gửi được phản hồi");
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => approveAdminReview(id),
    onSuccess: async () => {
      message.success("Đã duyệt đánh giá");
      await refetchReviews();
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Không duyệt được");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectAdminReview(id, reason),
    onSuccess: async () => {
      message.success("Đã từ chối đánh giá");
      setRejectTarget(null);
      setRejectReason("");
      await refetchReviews();
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Không từ chối được");
    },
  });

  const img = getAdminProductListImageUrl(product);
  const stock = getAdminStockCount(product);
  const avgAll = Number(statsRes?.average ?? 0);
  const totalAll = Number(statsRes?.total ?? 0);
  const verifiedAll = Number(statsRes?.verified ?? 0);

  const cardBase = {
    background: T.card,
    borderRadius: 16,
    border: `1px solid ${T.border}`,
    boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
  };

  const reviewPageNums = useMemo(() => {
    const windowSize = 5;
    if (totalReviewPages <= windowSize) {
      return Array.from({ length: totalReviewPages }, (_, i) => i + 1);
    }
    const half = Math.floor(windowSize / 2);
    let start = reviewPage - half;
    let end = reviewPage + half;
    if (start < 1) {
      start = 1;
      end = windowSize;
    }
    if (end > totalReviewPages) {
      end = totalReviewPages;
      start = totalReviewPages - windowSize + 1;
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [reviewPage, totalReviewPages]);

  const setDraft = (id, text) => {
    setReplyDrafts((d) => ({ ...d, [id]: text }));
  };

  const toggleReply = (id) => {
    setReplyOpen((o) => ({ ...o, [id]: !o[id] }));
  };

  const detailMetricCard = {
    ...cardBase,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    minHeight: 128,
    minWidth: 0,
  };

  return (
    <div className="admin-allow-wrap rev-layout-detail" style={{ width: "100%", maxWidth: 960, margin: "0 auto", padding: "0 8px" }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 18,
          padding: "8px 0",
          border: "none",
          background: "none",
          color: T.primary,
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
          arrow_back
        </span>
        Quay lại danh sách sản phẩm
      </button>

      <div style={{ ...cardBase, padding: "20px 22px", marginBottom: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 14,
              overflow: "hidden",
              border: `1px solid ${T.border}`,
              background: "#f1f5f9",
              flexShrink: 0,
            }}
          >
            {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <StockBadge count={stock} />
              <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>SKU {productSku(product)}</span>
            </div>
            <h2
              style={{
                margin: "10px 0 0",
                fontSize: 22,
                fontWeight: 800,
                color: T.text,
                lineHeight: 1.25,
                wordBreak: "break-word",
              }}
            >
              {product.name}
            </h2>
            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "nowrap",
                overflowX: "auto",
              }}
            >
              <StarRow value={avgAll} size={18} />
              <span style={{ fontWeight: 800, color: T.primary, whiteSpace: "nowrap" }}>
                {avgAll > 0 ? avgAll.toFixed(1) : "—"} / 5
              </span>
              <span style={{ color: T.textMuted, fontSize: 14, whiteSpace: "nowrap" }}>
                ({totalAll.toLocaleString("vi-VN")} đánh giá
                {verifiedAll > 0 ? ` · ${verifiedAll.toLocaleString("vi-VN")} đã mua` : ""})
              </span>
            </div>
            <div style={{ marginTop: 8, fontSize: 15, fontWeight: 700, color: T.text }}>
              {getAdminDisplayPrice(product)}
            </div>
          </div>
        </div>
      </div>

      <div className="rev-metrics-grid" style={{ marginBottom: 18 }}>
        {[
          {
            label: "Đánh giá (trang)",
            value: totalReviews.toLocaleString("vi-VN"),
            sub: `Trang ${reviewPage} / ${totalReviewPages}`,
          },
          {
            label: "Điểm TB (trang)",
            value: reviews.length ? `${listStats.avg} / 5` : "—",
            sub: `${reviews.length} mục đang xem`,
          },
          {
            label: "Tích cực 4–5★ (trang)",
            value: reviews.length ? `${listStats.positivePct}%` : "—",
            sub: "Trên các đánh giá đang tải",
            bar: listStats.positivePct,
          },
          {
            label: "Chưa phản hồi (trang)",
            value: String(listStats.pendingReply),
            sub: listStats.pendingReply ? "Ưu tiên trả lời" : "Đã xử lý hết trang này",
            accent: listStats.pendingReply ? T.orangeWarn : T.green,
          },
        ].map((c) => (
          <div key={c.label} style={detailMetricCard}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textMuted }}>{c.label}</div>
            <div
              style={{
                marginTop: 8,
                fontSize: 24,
                fontWeight: 800,
                color: c.accent || T.text,
                lineHeight: 1.1,
              }}
            >
              {c.value}
            </div>
            <div style={{ marginTop: "auto", paddingTop: 8, fontSize: 12, color: T.textMuted, lineHeight: 1.45 }}>
              {c.sub}
            </div>
            {c.bar != null && reviews.length > 0 ? (
              <div
                style={{
                  marginTop: 10,
                  height: 6,
                  borderRadius: 99,
                  background: "#F1F5F9",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, c.bar)}%`,
                    borderRadius: 99,
                    background: `linear-gradient(90deg, ${T.primary}, #ffb347)`,
                  }}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div style={{ ...cardBase, padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span
            className="material-symbols-outlined"
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 20,
              color: T.textMuted,
              pointerEvents: "none",
            }}
          >
            search
          </span>
          <input
            placeholder="Tìm trong đánh giá sản phẩm này…"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px 12px 44px",
              borderRadius: 12,
              border: `1.5px solid ${T.border}`,
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = T.primary;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = T.border;
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            rowGap: 12,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", flex: "1 1 200px" }}>
            {[
              { value: "all", label: "Tất cả" },
              { value: 5, label: "5★" },
              { value: 4, label: "4★" },
              { value: 3, label: "3★" },
              { value: 2, label: "2★" },
              { value: 1, label: "1★" },
              { value: "low", label: "1–2★" },
            ].map((opt) => {
              const on = starFilter === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setStarFilter(opt.value)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: `1px solid ${on ? T.primary : T.border}`,
                    background: on ? T.primaryBg : "#fff",
                    color: on ? T.primary : T.textMid,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: `1px solid ${T.border}`,
              fontSize: 13,
              fontWeight: 600,
              background: "#fff",
              minHeight: 40,
              flexShrink: 0,
            }}
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>
        {hasClientFilter ? (
          <p style={{ margin: "12px 0 0", fontSize: 12, color: T.textMuted }}>
            Đang lọc trong {reviews.length} đánh giá của trang {reviewPage}.
          </p>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {isLoading ? (
          <div style={{ ...cardBase, padding: 40, textAlign: "center", color: T.textMuted }}>Đang tải…</div>
        ) : sortedRows.length === 0 ? (
          <div style={{ ...cardBase, padding: 40, textAlign: "center", color: T.textMuted }}>
            Chưa có đánh giá phù hợp.
          </div>
        ) : (
          sortedRows.map((r) => {
            const u = r.userId || {};
            const uName = u?.name ?? u?._id ?? "Khách";
            const av = userAvatarSrc(u);
            const { dateStr, sizeLine } = reviewDateAndSizeLine(r);
            const st = statusBadge(r.status);
            const ost = r.orderId?.status;
            const orderLbl =
              shouldShowOrderStatusOnReview(ost) && getOrderStatusLabelForReview(ost);
            const admins = adminRepliesOnly(r);
            const open = !!replyOpen[r._id];
            const draft = replyDrafts[r._id] ?? "";

            return (
              <div key={r._id} style={{ ...cardBase, padding: 0, overflow: "hidden" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(200px, 240px) 1fr",
                    gap: 0,
                  }}
                  className="review-card-grid"
                >
                  <style>{`
                    @media (max-width: 768px) {
                      .review-card-grid { grid-template-columns: 1fr !important; }
                    }
                  `}</style>
                  <div
                    style={{
                      padding: "20px 18px",
                      background: "#FAFAF9",
                      borderRight: `1px solid ${T.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {av ? (
                        <img
                          src={av}
                          alt=""
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: `2px solid #fff`,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            background: T.primary,
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 15,
                          }}
                        >
                          {initialsFromName(uName)}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>{uName}</div>
                        {r.verifiedPurchase ? (
                          <div
                            style={{
                              marginTop: 6,
                              display: "inline-block",
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                              color: T.green,
                              background: T.greenBg,
                              padding: "3px 8px",
                              borderRadius: 6,
                            }}
                          >
                            ĐÃ MUA HÀNG
                          </div>
                        ) : null}
                        <div
                          style={{
                            marginTop: 8,
                            display: "inline-block",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            color: st.color,
                            background: st.bg,
                            padding: "4px 10px",
                            borderRadius: 6,
                          }}
                        >
                          {st.label}
                        </div>
                        {dateStr ? (
                          <div style={{ marginTop: 10, fontSize: 12, color: T.textMuted }}>{dateStr}</div>
                        ) : null}
                      </div>
                    </div>
                    {r.status === "pending" ? (
                      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                        <button
                          type="button"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(r._id)}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "none",
                            background: T.green,
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectTarget(r);
                            setRejectReason("");
                          }}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: `1px solid ${T.red}`,
                            background: "#fff",
                            color: T.red,
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Từ chối
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div style={{ padding: "20px 22px" }}>
                    <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}>{sizeLine}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap" }}>
                      <StarRow value={r.rating} />
                      <span style={{ fontWeight: 800, fontSize: 15, color: T.primary, whiteSpace: "nowrap" }}>
                        {r.rating ?? 0} / 5
                      </span>
                    </div>
                    {r.title ? (
                      <div style={{ marginTop: 12, fontWeight: 800, fontSize: 16, color: T.text }}>{r.title}</div>
                    ) : null}
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 14,
                        color: T.textMid,
                        lineHeight: 1.65,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {r.content?.trim() ? r.content : "—"}
                    </div>
                    {Array.isArray(r.images) && r.images.length > 0 ? (
                      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {r.images.map((img, i) => (
                          <img
                            key={i}
                            src={getReviewImageSrc(img)}
                            alt=""
                            style={{
                              width: 72,
                              height: 72,
                              objectFit: "cover",
                              borderRadius: 10,
                              border: `1px solid ${T.border}`,
                            }}
                          />
                        ))}
                      </div>
                    ) : null}
                    {orderLbl ? (
                      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: T.orangeWarn }}>
                        Đơn: {orderLbl}
                      </div>
                    ) : null}
                    {admins.length > 0 ? (
                      <div style={{ marginTop: 18 }}>
                        {admins.map((reply, idx) => (
                          <div
                            key={reply?._id || `ar-${idx}`}
                            style={{
                              background: T.primarySoft,
                              borderRadius: 12,
                              border: `1px solid rgba(244,157,37,0.25)`,
                              padding: "14px 16px",
                              marginTop: idx ? 10 : 0,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                letterSpacing: "0.08em",
                                color: T.primary,
                                marginBottom: 8,
                              }}
                            >
                              PHẢN HỒI SHOP
                            </div>
                            <div style={{ fontSize: 14, color: T.textMid, lineHeight: 1.55 }}>
                              {reply?.content || "—"}
                            </div>
                            <div style={{ marginTop: 8, fontSize: 11, color: T.textMuted }}>
                              {reply?.createdAt
                                ? new Date(reply.createdAt).toLocaleString("vi-VN")
                                : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px dashed ${T.border}` }}>
                      <button
                        type="button"
                        onClick={() => toggleReply(r._id)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: 0,
                          border: "none",
                          background: "none",
                          color: T.brown,
                          fontWeight: 800,
                          fontSize: 12,
                          letterSpacing: "0.06em",
                          cursor: "pointer",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          {open ? "expand_less" : "reply"}
                        </span>
                        {open ? "Thu gọn" : "PHẢN HỒI"}
                      </button>
                      {open ? (
                        <div style={{ marginTop: 14 }}>
                          <Input.TextArea
                            rows={3}
                            maxLength={500}
                            showCount
                            value={draft}
                            onChange={(e) => setDraft(r._id, e.target.value)}
                            placeholder={`Viết phản hồi cho ${uName}…`}
                            style={{ borderRadius: 12 }}
                          />
                          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setDraft(r._id, "");
                                toggleReply(r._id);
                              }}
                              style={{
                                padding: "10px 18px",
                                borderRadius: 12,
                                border: `1px solid ${T.border}`,
                                background: "#fff",
                                fontWeight: 700,
                                fontSize: 13,
                                color: T.textMid,
                                cursor: "pointer",
                              }}
                            >
                              Hủy
                            </button>
                            <Button
                              type="primary"
                              loading={replyMutation.isPending}
                              onClick={() => {
                                const t = draft.trim();
                                if (t.length < 2) {
                                  message.warning("Nhập tối thiểu 2 ký tự.");
                                  return;
                                }
                                replyMutation.mutate({ id: r._id, content: t });
                              }}
                              style={{
                                background: T.primary,
                                borderColor: T.primary,
                                fontWeight: 700,
                                borderRadius: 12,
                                height: "auto",
                                padding: "10px 22px",
                              }}
                            >
                              Gửi phản hồi
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!isLoading && sortedRows.length > 0 ? (
        <div
          style={{
            marginTop: 22,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 13, color: T.textMuted }}>
            Hiển thị {(reviewPage - 1) * reviewPageSize + 1}–
            {Math.min(reviewPage * reviewPageSize, totalReviews)} / {totalReviews.toLocaleString("vi-VN")} đánh giá
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              disabled={reviewPage <= 1}
              onClick={() => setReviewPage((x) => Math.max(1, x - 1))}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: "#fff",
                cursor: reviewPage <= 1 ? "not-allowed" : "pointer",
                opacity: reviewPage <= 1 ? 0.45 : 1,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: "middle" }}>
                chevron_left
              </span>
            </button>
            {reviewPageNums.map((num) => {
              const active = num === reviewPage;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setReviewPage(num)}
                  style={{
                    minWidth: 40,
                    height: 40,
                    borderRadius: 10,
                    border: `1px solid ${active ? T.primary : T.border}`,
                    background: active ? T.primaryBg : "#fff",
                    color: active ? T.primary : T.textMid,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {num}
                </button>
              );
            })}
            <button
              type="button"
              disabled={reviewPage >= totalReviewPages}
              onClick={() => setReviewPage((x) => Math.min(totalReviewPages, x + 1))}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: "#fff",
                cursor: reviewPage >= totalReviewPages ? "not-allowed" : "pointer",
                opacity: reviewPage >= totalReviewPages ? 0.45 : 1,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: "middle" }}>
                chevron_right
              </span>
            </button>
          </div>
        </div>
      ) : null}

      <Modal
        title="Từ chối đánh giá"
        open={!!rejectTarget}
        onCancel={() => {
          setRejectTarget(null);
          setRejectReason("");
        }}
        onOk={() => {
          const reason = rejectReason.trim() || "Vi phạm nội dung";
          rejectMutation.mutate({ id: rejectTarget._id, reason });
        }}
        confirmLoading={rejectMutation.isPending}
        okText="Xác nhận"
        cancelText="Đóng"
      >
        <p style={{ marginBottom: 8, color: T.textMuted, fontSize: 13 }}>Lý do (tùy chọn).</p>
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Lý do từ chối…"
        />
      </Modal>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────
export default function Reviews() {
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <div
      style={{
        padding: "12px 0 32px",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        background: T.bg,
        minHeight: "100%",
      }}
    >
      <style>{`
        .rev-metrics-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        @media (max-width: 1100px) {
          .rev-metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 520px) {
          .rev-metrics-grid { grid-template-columns: minmax(0, 1fr); }
        }
      `}</style>
      {selectedProduct ? (
        <ProductReviewDetail product={selectedProduct} onBack={() => setSelectedProduct(null)} />
      ) : (
        <ProductReviewHub onManageProduct={setSelectedProduct} />
      )}
    </div>
  );
}
