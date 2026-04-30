import { useQuery } from "@tanstack/react-query";
import {
  fetchRecommendProducts,
  fetchRecommendByProduct,
} from "../api";

const STALE_MS = 2 * 60 * 1000;
const GC_MS = 5 * 60 * 1000;

/**
 * @param {Object} opts
 * @param {string|null} opts.userId
 * @param {number} [opts.limit]
 * @param {string} [opts.tab] — all | banchay | moi | danhgia | hot
 * @param {string|null} [opts.productId] — nếu có: gọi by-product
 * @param {string[]} [opts.recentIds]
 * @param {boolean} [opts.enabled]
 */
export function useRecommend({
  userId = null,
  limit = 10,
  tab = "all",
  productId = null,
  recentIds = [],
  enabled = true,
} = {}) {
  const isByProduct = Boolean(productId);

  return useQuery({
    queryKey: [
      "recommend",
      isByProduct ? "byProduct" : "main",
      productId || null,
      userId || null,
      tab,
      limit,
      (recentIds || []).join(","),
    ],
    queryFn: async () => {
      if (isByProduct) {
        const res = await fetchRecommendByProduct(productId, { limit, tab });
        return {
          items: Array.isArray(res?.data) ? res.data : [],
          meta: res?.meta || {},
        };
      }
      const res = await fetchRecommendProducts({
        userId,
        limit,
        offset: 0,
        tab,
        recentIds: Array.isArray(recentIds) ? recentIds : [],
      });
      return {
        items: Array.isArray(res?.data) ? res.data : [],
        meta: res?.meta || {},
      };
    },
    staleTime: STALE_MS,
    gcTime: GC_MS,
    enabled: enabled !== false,
  });
}
