import React, { useEffect, useMemo, useState } from "react";
import ProductFilterSidebar from "../../components/ProductFilterSidebar/ProductFilterSidebar";
import Product from "../../components/Product/Product";
import { fetchProducts } from "../../api";

const CategoryPage = () => {
  const [selectedSize, setSelectedSize] = useState(null);
  const [priceMaxLimit, setPriceMaxLimit] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchProducts({ limit: 100, page: 0 });
        const list = res?.data ?? [];
        setProducts(list);
      } catch (err) {
        console.error(err);
        setProducts([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const getVariantAttr = (variant, key) => {
    const attrs = variant?.attributes;
    if (!attrs) return null;
    if (typeof attrs.get === "function") return attrs.get(key) ?? null;
    if (typeof attrs === "object") {
      const foundKey = Object.keys(attrs).find(
        (k) => String(k).toLowerCase() === String(key).toLowerCase(),
      );
      return foundKey ? attrs[foundKey] : null;
    }
    return null;
  };

  const getVariantSizeValue = (variant) => {
    return (
      getVariantAttr(variant, "Size") ??
      getVariantAttr(variant, "size") ??
      getVariantAttr(variant, "SIZE") ??
      null
    );
  };

  const getMinPrice = (p) => {
    const pr = p?.priceRange;
    if (pr && (pr.min != null || pr.max != null)) return Number(pr.min ?? 0) || 0;
    if (typeof p?.price === "number") return p.price;
    if (Array.isArray(p?.variants) && p.variants.length > 0) {
      const prices = p.variants
        .map((v) => Number(v?.price))
        .filter((n) => Number.isFinite(n));
      if (prices.length > 0) return Math.min(...prices);
    }
    return 0;
  };

  useEffect(() => {
    if (!Array.isArray(products) || products.length === 0) return;
    const max = products.reduce((m, p) => Math.max(m, getMinPrice(p)), 0);
    setPriceMaxLimit(max);
    setPriceMax(max);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter((p) => {
      const passPrice =
        !priceMaxLimit || getMinPrice(p) <= Number(priceMax ?? 0);
      if (!passPrice) return false;

      if (selectedSize == null) return true;

      // Lọc theo size nếu có variants
      if (Array.isArray(p?.variants) && p.variants.length > 0) {
        const sizeStr = String(selectedSize);
        return p.variants.some((v) => {
          const s = getVariantSizeValue(v);
          return String(s) === sizeStr && Number(v?.stock ?? 0) > 0;
        });
      }

      // Không có variants: vẫn hiển thị (không thể suy ra size)
      return true;
    });
  }, [products, priceMax, priceMaxLimit, selectedSize]);

  return (
    <div className="body-content outer-top-xs">
      <div className="container">
        <div className="row">
          {/* Sidebar chung */}
          <div className="col-md-3">
            <div className="hidden lg:block">
              <ProductFilterSidebar
                selectedSize={selectedSize}
                onChangeSize={(size) =>
                  setSelectedSize((prev) => (prev === size ? null : size))
                }
                priceMax={priceMax}
                onChangePrice={setPriceMax}
                priceMaxLimit={priceMaxLimit}
              />
            </div>
          </div>

          <div className="col-md-9">
            {/* ===== Toolbar ===== */}
            <div className="clearfix filters-container m-t-10">
              <div className="row">
                <div className="col-md-2 col-sm-2 col-xs-6">
                  <div className="lbl-cnt">
                    <span className="lbl">Sắp xếp theo</span>
                    <select className="form-control">
                      <option>Mặc định</option>
                      <option>Giá (thấp đến cao)</option>
                      <option>Giá (cao đến thấp)</option>
                      <option>Mới nhất</option>
                    </select>
                  </div>
                </div>

                <div className="col-md-2 col-sm-2 col-xs-6">
                  <div className="lbl-cnt">
                    <span className="lbl">Hiển thị</span>
                    <select className="form-control">
                      <option>12</option>
                      <option>24</option>
                      <option>36</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Product Grid ===== */}
            <div className="search-result-container">
              <div className="category-product">
                <div className="row">
                  {loading ? (
                    <div className="col-12 text-center py-5">Đang tải...</div>
                  ) : products.length === 0 ? (
                    <div className="col-12 text-center py-5 text-muted">Chưa có sản phẩm</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="col-12 text-center py-5 text-muted">
                      Không có sản phẩm phù hợp bộ lọc
                    </div>
                  ) : (
                    filteredProducts.map((product) => (
                      <div key={product._id} className="col-sm-6 col-md-4 mb-4">
                        <Product product={product} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            {/* ===== End Product Grid ===== */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;
