import React, { useMemo } from "react";

const formatVnd = (n) => `${Number(n || 0).toLocaleString()}đ`;

const ProductFilterSidebar = ({
  selectedSize,
  onChangeSize,
  priceMax,
  onChangePrice,
  priceMaxLimit,
} = {}) => {
  const sliderMax = useMemo(() => Number(priceMaxLimit ?? 0) || 0, [priceMaxLimit]);

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="sticky top-28 space-y-8">
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              filter_list
            </span>
            Bộ lọc
          </h3>
          <div className="space-y-6">
            {/* Brand */}
            <div>
              <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-slate-400">
                Thương hiệu
              </h4>
              <div className="space-y-2">
                {["Nike", "Adidas", "New Balance", "Puma"].map((brand) => (
                  <label
                    key={brand}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      defaultChecked={brand === "Nike"}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm group-hover:text-primary">
                      {brand}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-slate-400">
                Khoảng giá
              </h4>
              <input
                type="range"
                min={0}
                max={sliderMax}
                step={10000}
                value={Number(priceMax ?? 0)}
                disabled={sliderMax <= 0}
                onChange={(e) => onChangePrice?.(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between mt-2 text-xs font-medium">
                <span>{formatVnd(0)}</span>
                <span>{sliderMax > 0 ? formatVnd(sliderMax) : "-"}</span>
              </div>
            </div>

            {/* Size */}
            <div>
              <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-slate-400">
                Size (US)
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {[7, 8, 9, 10, 11, 12].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onChangeSize?.(size)}
                    className={`py-2 text-sm border rounded transition-colors ${
                      selectedSize === size
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-slate-200 hover:border-primary hover:text-primary"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-slate-400">
                Colors
              </h4>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="size-8 rounded-full bg-black ring-2 ring-offset-2 ring-transparent hover:ring-primary"
                />
                <button
                  type="button"
                  className="size-8 rounded-full bg-white border border-slate-200 ring-2 ring-offset-2 ring-transparent hover:ring-primary"
                />
                <button
                  type="button"
                  className="size-8 rounded-full bg-primary ring-2 ring-offset-2 ring-primary"
                />
                <button
                  type="button"
                  className="size-8 rounded-full bg-blue-500 ring-2 ring-offset-2 ring-transparent hover:ring-primary"
                />
                <button
                  type="button"
                  className="size-8 rounded-full bg-red-500 ring-2 ring-offset-2 ring-transparent hover:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ProductFilterSidebar;

