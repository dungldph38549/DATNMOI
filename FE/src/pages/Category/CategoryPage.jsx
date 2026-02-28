import React from "react";

const products = [
  {
    id: 1,
    name: "Simple Product",
    price: 600,
    image: "/assets/images/products/p1.jpg",
  },
  {
    id: 2,
    name: "Handbag Premium",
    price: 450,
    image: "/assets/images/products/p2.jpg",
  },
  {
    id: 3,
    name: "Fashion Bag",
    price: 520,
    image: "/assets/images/products/p3.jpg",
  },
];

const CategoryPage = () => {
  return (
    <div className="body-content outer-top-xs">
      <div className="container">
        <div className="row">
          {/* Sidebar giữ nguyên nếu bạn đã có */}

          <div className="col-md-9">
            {/* ===== Toolbar ===== */}
            <div className="clearfix filters-container m-t-10">
              <div className="row">
                <div className="col-md-2 col-sm-2 col-xs-6">
                  <div className="lbl-cnt">
                    <span className="lbl">Sort by</span>
                    <select className="form-control">
                      <option>Default</option>
                      <option>Price (Low to High)</option>
                      <option>Price (High to Low)</option>
                      <option>Newest</option>
                    </select>
                  </div>
                </div>

                <div className="col-md-2 col-sm-2 col-xs-6">
                  <div className="lbl-cnt">
                    <span className="lbl">Show</span>
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
                  {products.map((product) => (
                    <div key={product.id} className="col-sm-6 col-md-4">
                      <div className="product">
                        <div className="product-image">
                          <div className="image">
                            <a href="/detail">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="img-responsive"
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
                              <i className="fa fa-shopping-cart"></i> Add to
                              cart
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
