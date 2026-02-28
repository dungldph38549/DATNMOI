import React from "react";

const ShoppingCartPage = () => {
  return (
    <div className="cnt-home">
      {/* HEADER */}
      <header className="header-style-1">
        <div className="top-bar">
          <div className="container">
            <div className="header-top-inner d-flex justify-content-between">
              <ul className="list-unstyled d-flex gap-3">
                <li>
                  <a href="#">
                    <i className="fa fa-user"></i> My Account
                  </a>
                </li>
                <li>
                  <a href="#">
                    <i className="fa fa-heart"></i> Wishlist
                  </a>
                </li>
                <li>
                  <a href="#">
                    <i className="fa fa-shopping-cart"></i> My Cart
                  </a>
                </li>
                <li>
                  <a href="#">
                    <i className="fa fa-lock"></i> Login
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </header>

      {/* BREADCRUMB */}
      <div className="breadcrumb">
        <div className="container">
          <ul className="list-inline">
            <li>
              <a href="#">Home</a>
            </li>
            <li className="active">Shopping Cart</li>
          </ul>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="body-content outer-top-xs">
        <div className="container">
          <div className="shopping-cart">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Remove</th>
                    <th>Image</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>
                      <button className="btn btn-danger btn-sm">
                        <i className="fa fa-trash"></i>
                      </button>
                    </td>

                    <td>
                      <img
                        src="/assets/images/products/p1.jpg"
                        alt=""
                        width="80"
                      />
                    </td>

                    <td>Floral Print Buttoned</td>

                    <td>
                      <input
                        type="number"
                        defaultValue={1}
                        className="form-control"
                        style={{ width: "80px" }}
                      />
                    </td>

                    <td>$300.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* TOTAL */}
            <div className="cart-shopping-total mt-4">
              <div className="cart-sub-total">
                Subtotal: <strong>$600.00</strong>
              </div>

              <div className="cart-grand-total">
                Grand Total: <strong>$600.00</strong>
              </div>

              <button className="btn btn-primary mt-3">
                PROCEED TO CHECKOUT
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer color-bg mt-5 p-4 text-center">
        <p>© 2026 Flipmart Template Converted to React</p>
      </footer>
    </div>
  );
};

export default ShoppingCartPage;
