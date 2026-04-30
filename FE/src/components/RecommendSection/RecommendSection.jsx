import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "../ProductCard/ProductCard";
import { fetchRecommendProducts, fetchRecommendByProduct } from "../../api";

const TABS = [
  { id: "all", label: "Tất cả", api: "all" },
  { id: "bestseller", label: "Bán chạy", api: "banchay" },
  { id: "new", label: "Mới về", api: "moi" },
  { id: "rating", label: "Đánh giá cao", api: "danhgia" },
  { id: "hotsale", label: "Hot sale", api: "hot" },
];

const STALE_MS = 2 * 60 * 1000;
const GC_MS = 5 * 60 * 1000;

const PAGE_SIZE = 8;

function readRecentProductIds() {
  try {
    const raw = localStorage.getItem("sh_recent_products_v1");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-[12px] border border-neutral-200 bg-neutral-100"
        >
          <div className="aspect-[4/4.5] bg-neutral-200" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-[85%] rounded bg-neutral-200" />
            <div className="h-4 w-[45%] rounded bg-neutral-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * @param {string|null} userId
 * @param {string|null} productId — trang chi tiết
 */
export default function RecommendSection({ userId = null, productId = null }) {
  const [tab, setTab] = useState("all");
  const [offset, setOffset] = useState(0);
  const [accumulated, setAccumulated] = useState([]);

  const tabApi = useMemo(
    () => TABS.find((t) => t.id === tab)?.api || "all",
    [tab],
  );

  const recentIds = useMemo(
    () => readRecentProductIds(),
    [tab, userId, productId],
  );

  const isByProduct = Boolean(productId);

  const query = useQuery({
    queryKey: [
      "recommend-section",
      isByProduct ? "byProduct" : "home",
      productId,
      userId,
      tabApi,
      isByProduct ? 0 : offset,
      recentIds.join(","),
    ],
    queryFn: async () => {
      if (isByProduct) {
        const res = await fetchRecommendByProduct(productId, {
          limit: 8,
          tab: tabApi,
        });
        return {
          items: Array.isArray(res?.data) ? res.data : [],
          meta: res?.meta || {},
        };
      }
      const res = await fetchRecommendProducts({
        userId,
        limit: PAGE_SIZE,
        offset,
        tab: tabApi,
        recentIds,
      });
      return {
        items: Array.isArray(res?.data) ? res.data : [],
        meta: res?.meta || {},
      };
    },
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });

  const { data, isLoading, isFetching, error } = query;

  useEffect(() => {
    if (isByProduct) return;
    if (!data?.items) return;
    if (offset === 0) {
      setAccumulated(data.items);
    } else {
      setAccumulated((prev) => {
        const seen = new Set(prev.map((p) => String(p._id)));
        const next = [...prev];
        for (const p of data.items) {
          const id = String(p._id);
          if (!seen.has(id)) {
            seen.add(id);
            next.push(p);
          }
        }
        return next;
      });
    }
  }, [data, offset, isByProduct]);

  useEffect(() => {
    setTab("all");
  }, [productId]);

  useEffect(() => {
    setOffset(0);
    setAccumulated([]);
  }, [tabApi, userId, productId, isByProduct]);

  const hasMore = Boolean(data?.meta?.hasMore) && !isByProduct;

  const onLoadMore = useCallback(() => {
    if (isByProduct || !hasMore || isFetching) return;
    setOffset((o) => o + PAGE_SIZE);
  }, [hasMore, isFetching, isByProduct]);

  const displayItems = isByProduct ? data?.items || [] : accumulated;
  const showSkeleton = isLoading && displayItems.length === 0;

  return (
    <section
      className="w-full border-b border-neutral-200/80 bg-gradient-to-b from-white to-[#faf8f5] py-10 md:py-14"
      style={{ fontFamily: "'Lexend', system-ui, sans-serif" }}
    >
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 md:text-2xl">
              Dành riêng cho bạn <span aria-hidden>👟</span>
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Gợi ý theo sở thích, bán chạy và ưu đãi — cập nhật liên tục.
            </p>
          </div>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-[12px] px-4 py-2 text-sm font-semibold transition ${
                tab === t.id
                  ? "bg-[#f49d25] text-white shadow-md"
                  : "bg-white text-neutral-700 ring-1 ring-neutral-200 hover:ring-[#f49d25]/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600">
            {error?.message || "Không tải được gợi ý. Vui lòng thử lại."}
          </p>
        )}

        {showSkeleton ? (
          <SkeletonGrid count={8} />
        ) : displayItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">
            Chưa có sản phẩm phù hợp. Khám phá thêm danh mục nhé!
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
              {displayItems.map((p) => (
                <ProductCard
                  key={p._id}
                  product={p}
                  badges={p.recommendBadges || []}
                />
              ))}
            </div>
            {hasMore && !isByProduct && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={isFetching}
                  className="rounded-[12px] bg-white px-6 py-2.5 text-sm font-bold text-[#f49d25] ring-2 ring-[#f49d25] transition hover:bg-[#f49d25]/10 disabled:opacity-50"
                >
                  {isFetching ? "Đang tải…" : "Xem thêm"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
