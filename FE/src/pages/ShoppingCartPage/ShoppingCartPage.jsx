import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  removeFromCart,
  selectCartSubtotal,
  setQty,
} from "../../redux/cartSlice";


const ShoppingCartPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const items = useSelector((state) => state.cart.items);
  const subtotal = useSelector(selectCartSubtotal);

  return (
    <>
      <div className="breadcrumb">
        <div className="container">
          <div className="breadcrumb-inner">
            <ul className="list-inline list-unstyled">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li className="active">Shopping Cart</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="body-content outer-top-xs">
        <div className="container">
          <div className="row ">
            <div className="shopping-cart">
              <div className="shopping-cart-table ">
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="cart-romove item">Remove</th>
                        <th className="cart-description item">Image</th>
                        <th className="cart-product-name item">Product Name</th>
                        <th className="cart-edit item">Edit</th>
                        <th className="cart-qty item">Quantity</th>
                        <th className="cart-sub-total item">Subtotal</th>
                        <th className="cart-total last-item">Grandtotal</th>
                      </tr>
                    </thead>
                    <tfoot>
                      <tr>
                        <td colSpan={7}>
                          <div className="shopping-cart-btn">
                            <span>
                              <Link
                                to="/product"
                                className="btn btn-upper btn-primary outer-left-xs"
                              >
                                Continue Shopping
                              </Link>
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                    <tbody>
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={7}>
                            <div className="py-4 text-center">
                              Giỏ hàng đang trống.{" "}
                              <Link to="/product">Mua sắm ngay</Link>
                            </div>
                          </td>
                        </tr>
                      )}

                      {items.map((item) => {
                        const itemSubtotal =
                          (item.price || 0) * (item.qty || 0);

                        return (
                          <tr key={item.productId}>
                            <td className="romove-item">
                              <button
                                type="button"
                                title="remove"
                                className="icon"
                                onClick={() =>
                                  dispatch(removeFromCart(item.productId))
                                }
                                style={{ background: "transparent", border: 0 }}
                              >
                                <i className="fa fa-trash-o" />
                              </button>
                            </td>

                            <td className="cart-image">
                              <Link
                                className="entry-thumbnail"
                                to={`/product/${item.productId}`}
                              >
                                <img src={item.image} alt={item.name} />
                              </Link>
                            </td>

                            <td className="cart-product-name-info">
                              <h4 className="cart-product-description">
                                <Link to={`/product/${item.productId}`}>
                                  {item.name}
                                </Link>
                              </h4>
                            </td>

                            <td className="cart-product-edit">
                              <Link
                                to={`/product/${item.productId}`}
                                className="product-edit"
                              >
                                View
                              </Link>
                            </td>

                            <td className="cart-product-quantity">
                              <input
                                type="number"
                                min={1}
                                value={item.qty}
                                onChange={(e) =>
                                  dispatch(
                                    setQty({
                                      productId: item.productId,
                                      qty: e.target.value,
                                    }),
                                  )
                                }
                                className="form-control"
                                style={{ width: 90 }}
                              />
                            </td>

                            <td className="cart-product-sub-total">
                              <span className="cart-sub-total-price">
                                ${itemSubtotal.toFixed(2)}
                              </span>
                            </td>
                            <td className="cart-product-grand-total">
                              <span className="cart-grand-total-price">
                                ${itemSubtotal.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="col-md-4 col-sm-12 estimate-ship-tax">
                <table className="table">
                  <thead>
                    <tr>
                      <th>
                        <span className="estimate-title">
                          Estimate shipping and tax
                        </span>
                        <p>Enter your destination to get shipping and tax.</p>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="form-group">
                          <label className="info-title control-label">
                            Country <span>*</span>
                          </label>
                          <select className="form-control unicase-form-control selectpicker">
                            <option>--Select options--</option>
                            <option>India</option>
                            <option>SriLanka</option>
                            <option>united kingdom</option>
                            <option>saudi arabia</option>
                            <option>united arab emirates</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="info-title control-label">
                            State/Province <span>*</span>
                          </label>
                          <select className="form-control unicase-form-control selectpicker">
                            <option>--Select options--</option>
                            <option>TamilNadu</option>
                            <option>Kerala</option>
                            <option>Andhra Pradesh</option>
                            <option>Karnataka</option>
                            <option>Madhya Pradesh</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="info-title control-label">
                            Zip/Postal Code
                          </label>
                          <input
                            type="text"
                            className="form-control unicase-form-control text-input"
                            placeholder=""
                          />
                        </div>
                        <div className="pull-right">
                          <button
                            type="submit"
                            className="btn-upper btn btn-primary"
                          >
                            GET A QOUTE
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="col-md-4 col-sm-12 estimate-ship-tax">
                <table className="table">
                  <thead>
                    <tr>
                      <th>
                        <span className="estimate-title">Discount Code</span>
                        <p>Enter your coupon code if you have one..</p>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="form-group">
                          <input
                            type="text"
                            className="form-control unicase-form-control text-input"
                            placeholder="You Coupon.."
                          />
                        </div>
                        <div className="clearfix pull-right">
                          <button
                            type="submit"
                            className="btn-upper btn btn-primary"
                          >
                            APPLY COUPON
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="col-md-4 col-sm-12 cart-shopping-total">
                <table className="table">
                  <thead>
                    <tr>
                      <th>
                        <div className="cart-sub-total">
                          Subtotal
                          <span className="inner-left-md">
                            ${subtotal.toFixed(2)}
                          </span>
                        </div>
                        <div className="cart-grand-total">
                          Grand Total
                          <span className="inner-left-md">
                            ${subtotal.toFixed(2)}
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="cart-checkout-btn pull-right">
                          <button
                            type="submit"
                            className="btn btn-primary checkout-btn"
                            disabled={items.length === 0}
                            onClick={() => navigate("/checkout")}
                          >
                            PROCCED TO CHEKOUT
                          </button>
                          <span>Checkout with multiples address!</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div id="brands-carousel" className="logo-slider wow fadeInUp">
            <div className="logo-slider-inner">
              <div
                id="brand-slider"
                className="owl-carousel brand-slider custom-carousel owl-theme"
              >
                <div className="item m-t-15">
                  <a href="#" className="image">
                    <img
                      data-echo="assets/images/brands/brand1.png"
                      src="assets/images/blank.gif"
                      alt=""
                    />
                  </a>
                </div>

                <div className="item m-t-10">
                  <a href="#" className="image">
                    <img
                      data-echo="assets/images/brands/brand2.png"
                      src="assets/images/blank.gif"
                      alt=""
                    />
                  </a>
                </div>

                <div className="item">
                  <a href="#" className="image">
                    <img
                      data-echo="assets/images/brands/brand3.png"
                      src="assets/images/blank.gif"
                      alt=""
                    />
                  </a>
                </div>

                <div className="item">
                  <a href="#" className="image">
                    <img
                      data-echo="assets/images/brands/brand4.png"
                      src="assets/images/blank.gif"
                      alt=""
                    />
                  </a>
                </div>

                <div className="item">
                  <a href="#" className="image">
                    <img
                      data-echo="assets/images/brands/brand5.png"
                      src="assets/images/blank.gif"
                      alt=""
                    />
                  </a>
                </div>

                <div className="item">
                  <a href="#" className="image">
                    <img
                      data-echo="assets/images/brands/brand6.png"
                      src="assets/images/blank.gif"
                      alt=""
                    />
                  </a>
                </div>

                <div className="item">
                  <a href="#" className="image">
                    <img
                      data-echo="assets/images/brands/brand2.png"
                      src="assets/images/blank.gif"
                      alt=""
                    />
                  </a>
                </div>

                <div className="item">
                  <a href="#" className="image">
                    <img
                      data-echo="assets/images/brands/brand4.png"
                      src="assets/images/blank.gif"
                      alt=""
                    />
                  </a>
                </div>

                <div className="item">
                  <a href="#" className="image">
                    <img
                      data-echo="assets/images/brands/brand1.png"
                      src="assets/images/blank.gif"
                      alt=""
                    />
                  </a>
                </div>

                <div className="item">
                  <a href="#" className="image">
                    <img
                      data-echo="assets/images/brands/brand5.png"
                      src="assets/images/blank.gif"
                      alt=""
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShoppingCartPage;


