import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  removeFromCart,
  selectCartSubtotal,
  setQty,
} from "../../redux/cart/cartSlice";

export default function ShoppingCartPage() {
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
          <div className="row">
            <div className="shopping-cart">
              <div className="shopping-cart-table">
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
                                      qty: Number(e.target.value),
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

              {/* Các block tính phí, mã giảm giá và tổng tiền giữ nguyên */}
              <div className="col-md-4 col-sm-12 estimate-ship-tax">
                {/* ... (Code bảng tính phí ship của bạn) ... */}
              </div>

              <div className="col-md-4 col-sm-12 cart-shopping-total pull-right">
                <table className="table">
                  <thead>
                    <tr>
                      <th>
                        <div className="cart-sub-total">
                          Tạm tính
                          <span className="inner-left-md">
                            ${subtotal?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                        <div className="cart-grand-total">
                          Tổng cộng
                          <span className="inner-left-md">
                            ${subtotal?.toFixed(2) || "0.00"}
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
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
