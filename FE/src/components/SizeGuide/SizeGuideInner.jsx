import React, { useMemo, useState } from "react";
import { FaRulerCombined } from "react-icons/fa";

export const SIZE_GUIDE_ROWS = [
  { eu: "36", footMin: 22.0, footMax: 22.5 },
  { eu: "37", footMin: 22.6, footMax: 23.0 },
  { eu: "38", footMin: 23.1, footMax: 23.5 },
  { eu: "39", footMin: 23.6, footMax: 24.0 },
  { eu: "40", footMin: 24.1, footMax: 24.5 },
  { eu: "41", footMin: 24.6, footMax: 25.0 },
  { eu: "42", footMin: 25.1, footMax: 25.5 },
  { eu: "43", footMin: 25.6, footMax: 26.0 },
  { eu: "44", footMin: 26.1, footMax: 26.5 },
  { eu: "45", footMin: 26.6, footMax: 27.0 },
];

/**
 * Bảng hướng dẫn chọn size (EU ↔ cm) — dùng chung trang chi tiết SP và trang hướng dẫn.
 */
export default function SizeGuideInner({
  headingLevel: HeadingTag = "h3",
  variant = "modal",
}) {
  const titleClass =
    variant === "page"
      ? "font-display text-2xl font-black text-slate-900 md:text-3xl"
      : "font-display text-xl font-black text-slate-900 md:text-2xl";
  const [footLength, setFootLength] = useState("");

  const recommendedSize = useMemo(() => {
    const len = Number(footLength);
    if (!Number.isFinite(len) || len <= 0) return null;
    const found =
      SIZE_GUIDE_ROWS.find((r) => len >= r.footMin && len <= r.footMax) ||
      SIZE_GUIDE_ROWS.find((r) => len <= r.footMax) ||
      SIZE_GUIDE_ROWS[SIZE_GUIDE_ROWS.length - 1];
    return found?.eu ?? null;
  }, [footLength]);

  return (
    <div className="font-body">
      <div className="mb-5 pr-0 md:pr-14">
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-primary">
          <FaRulerCombined />
          Size Guide
        </span>
        <HeadingTag className={titleClass}>
          Hướng dẫn chọn size
        </HeadingTag>
        <p className="mt-1 text-sm text-slate-500">
          Đo chiều dài bàn chân (cm) từ gót đến ngón dài nhất để chọn size gần đúng.
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4">
        <label className="mb-2 block text-sm font-bold text-slate-700">
          Nhập chiều dài chân của bạn (cm)
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="number"
            step="0.1"
            min="18"
            max="35"
            value={footLength}
            onChange={(e) => setFootLength(e.target.value)}
            placeholder="VD: 25.2"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-48"
          />
          <div className="text-sm font-semibold text-slate-600">
            {recommendedSize ? (
              <span className="inline-flex items-center gap-2">
                Gợi ý size:
                <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-sm font-black text-white shadow-lg shadow-primary/30">
                  EU {recommendedSize}
                </span>
              </span>
            ) : (
              <span>Nhập chiều dài để nhận gợi ý nhanh.</span>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900 text-slate-100">
              <th className="px-4 py-3 text-left font-bold">Size EU</th>
              <th className="px-4 py-3 text-left font-bold">Chiều dài chân (cm)</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_GUIDE_ROWS.map((row) => (
              <tr
                key={row.eu}
                className={`border-t border-slate-100 ${
                  String(recommendedSize) === String(row.eu) ? "bg-primary/5" : "hover:bg-slate-50"
                }`}
              >
                <td className="px-4 py-3 font-bold text-slate-800">EU {row.eu}</td>
                <td className="px-4 py-3 text-slate-600">
                  {row.footMin.toFixed(1)} - {row.footMax.toFixed(1)} cm
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Mẹo: nếu số đo nằm giữa 2 size và bạn thích đi thoải mái, hãy chọn size lớn hơn 0.5 - 1.
      </p>
    </div>
  );
}
