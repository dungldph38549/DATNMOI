import React, { useState, useEffect } from "react";
import ProductFilterSidebar from "../../components/ProductFilterSidebar/ProductFilterSidebar";
import Product from "../../components/Product/Product";
import { fetchProducts } from "../../api";

const CategoryPage = () => {
  const [selectedSize, setSelectedSize] = useState(9);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchProducts({ limit: 100, page: 0 });
        setProducts(res?.data ?? []);
      } catch (err) {
        console.error(err);
        setProducts([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="body-content outer-top-xs">
      <div className="container">
        <div className="row">
          {/* Sidebar chung */}
          <div className="col-md-3">
            <div className="hidden lg:block">
              <ProductFilterSidebar
                selectedSize={selectedSize}
                onChangeSize={setSelectedSize}
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
                  ) : (
                    products.map((product) => (
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
