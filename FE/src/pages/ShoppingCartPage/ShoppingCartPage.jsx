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
                <Link to="/">Trang chủ</Link>
              </li>
              <li className="active">Giỏ hàng</li>
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
                      <th className="cart-romove item">Xóa</th>
                      <th className="cart-description item">Hình ảnh</th>
                      <th className="cart-product-name item">Tên sản phẩm</th>
                      <th className="cart-edit item">Chi tiết</th>
                      <th className="cart-qty item">Số lượng</th>
                      <th className="cart-sub-total item">Tạm tính</th>
                      <th className="cart-total last-item">Thành tiền</th>
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
                            Tiếp tục mua sắm
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
                                <img
                                  src={`http://localhost:3001/uploads/${item.image}`}
                                  alt={item.name}
                                />
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
                            Xem
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
                          Ước tính phí vận chuyển và thuế
                        </span>
                        <p>Nhập địa chỉ của bạn để tính phí vận chuyển và thuế.</p>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="form-group">
                          <label className="info-title control-label">
                            Quốc gia <span>*</span>
                          </label>
                          <select className="form-control unicase-form-control selectpicker">
                            <option>--Chọn quốc gia--</option>
                            <option>India</option>
                            <option>SriLanka</option>
                            <option>united kingdom</option>
                            <option>saudi arabia</option>
                            <option>united arab emirates</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="info-title control-label">
                            Tỉnh / Thành phố <span>*</span>
                          </label>
                          <select className="form-control unicase-form-control selectpicker">
                            <option>--Chọn khu vực--</option>
                            <option>TamilNadu</option>
                            <option>Kerala</option>
                            <option>Andhra Pradesh</option>
                            <option>Karnataka</option>
                            <option>Madhya Pradesh</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="info-title control-label">
                            Mã bưu điện
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
                            TÍNH PHÍ
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
                        <span className="estimate-title">Mã giảm giá</span>
                        <p>Nhập mã khuyến mãi nếu bạn có.</p>
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
                            placeholder="Mã giảm giá..."
                          />
                        </div>
                        <div className="clearfix pull-right">
                          <button
                            type="submit"
                            className="btn-upper btn btn-primary"
                          >
                            ÁP DỤNG MÃ
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
                          Tạm tính
                          <span className="inner-left-md">
                            ${subtotal.toFixed(2)}
                          </span>
                        </div>
                        <div className="cart-grand-total">
                          Tổng cộng
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
                            TIẾN HÀNH THANH TOÁN
                          </button>
                          <span>Thanh toán với nhiều địa chỉ!</span>
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


