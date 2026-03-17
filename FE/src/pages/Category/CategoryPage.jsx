import React, { useState } from "react";
import ProductFilterSidebar from "../../components/ProductFilterSidebar/ProductFilterSidebar";

const products = [
  {
    id: 1,
    name: "Simple Product",
    price: 600,
    image:
      "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    name: "Handbag Premium",
    price: 450,
    image:
      "https://images.unsplash.com/photo-1588361861040-ac9b1018f6d5?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 3,
    name: "Fashion Bag",
    price: 520,
    image:
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80",
  },
];

const CategoryPage = () => {
  const [selectedSize, setSelectedSize] = useState(9);

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
                  {products.map((product) => {
                    const imgUrl = (product.image && (product.image.startsWith("http") ? product.image : `http://localhost:3001/uploads/${product.image}`)) || "https://via.placeholder.com/300/f0f0f0/999?text=No+Image"
                    return (
                    <div key={product.id} className="col-sm-6 col-md-4">
                      <div className="product">
                        <div className="product-image">
                          <div className="image">
                            <a href="/detail">
                              <img
                                src={imgUrl}
                                alt={product.name}
                                className="img-responsive"
                                onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300/f0f0f0/999?text=No+Image" }}
                              />
                            </a>
                          </div>
                        </div>

                        <div className="product-info text-left">
                          <h3 className="name">
                            <a href="/detail">{product.name}</a>
                          </h3>

                          <div className="product-price">
                            <span className="price">${product.price}</span>
                          </div>
                        </div>

                        <div className="cart clearfix animate-effect">
                          <div className="action">
                            <button
                              className="btn btn-primary cart-btn"
                              onClick={() =>
                                alert(`Added ${product.name} to cart`)
                              }
                            >
                            <i className="fa fa-shopping-cart"></i> Thêm vào
                            giỏ hàng
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ); })}
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
