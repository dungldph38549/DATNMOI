import React from "react";
import { FaStar } from "react-icons/fa";

/**
 * Sao + điểm từ API (rating, reviewCount). Khớp dữ liệu getProducts đã gắn review stats.
 * ratingOverride: ép điểm hiển thị (dùng khi parent tính sẵn, ví dụ component Product).
 */
export default function ProductCardRating({ product, ratingOverride, tone = "default", className = "" }) {
  const count = Number(product?.reviewCount ?? 0);
  const hasOverride =
    ratingOverride !== undefined &&
    ratingOverride !== null &&
    Number.isFinite(Number(ratingOverride));
  const raw = hasOverride ? Number(ratingOverride) : Number(product?.rating);
  const hasReviews = hasOverride || (count > 0 && Number.isFinite(raw));

  const labelCls = tone === "warm" ? "text-[#6c5a3d]" : "text-neutral-500";
  const starEmptyCls = tone === "warm" ? "text-[#e8dcc8]" : "text-neutral-300";

  if (!hasReviews) {
    return (
      <div
        className={`flex flex-wrap items-center gap-1 ${className}`.trim()}
        role="img"
        aria-label="Chưa có đánh giá"
      >
        <span className="flex items-center gap-0.5" aria-hidden>
          {[1, 2, 3, 4, 5].map((star) => (
            <FaStar key={star} size={11} className={starEmptyCls} />
          ))}
        </span>
      </div>
    );
  }

  const value = Math.min(5, Math.max(0, raw));
  const label = value % 1 === 0 ? `${Math.round(value)}/5` : `${value.toFixed(1)}/5`;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`.trim()}>
      <span className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            size={11}
            className={star <= Math.round(value) ? "text-yellow-400" : starEmptyCls}
          />
        ))}
      </span>
      <span className={`text-[11px] tabular-nums ${labelCls}`}>({label})</span>
    </div>
  );
}
