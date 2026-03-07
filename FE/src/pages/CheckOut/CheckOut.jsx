import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearCart, selectCartSubtotal } from "../../redux/cartSlice";

const CheckOut = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const items = useSelector((state) => state.cart.items);
  const subtotal = useSelector(selectCartSubtotal);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    note: "",
  });

  const shipping = useMemo(() => (subtotal > 0 ? 0 : 0), [subtotal]);
  const total = subtotal + shipping;

  const onPlaceOrder = (e) => {
    e.preventDefault();
    if (items.length === 0) return;

    dispatch(clearCart());
    alert("Đặt hàng thành công!");
    navigate("/");
  };

  return (
    <div className="body-content outer-top-xs">
      <div className="container">
        <div className="breadcrumb">
          <div className="breadcrumb-inner">
            <ul className="list-inline list-unstyled">
              <li>
                <Link to="/">Trang chủ</Link>
              </li>
              <li className="active">Thanh toán</li>
            </ul>
          </div>
        </div>

        <div className="row">
          <div className="col-md-8 col-sm-12">
            <div className="checkout-box">
              <h2 className="heading-title">Thông tin giao hàng</h2>
              <form onSubmit={onPlaceOrder}>
                <div className="form-group">
                  <label>Họ và tên</label>
                  <input
                    className="form-control"
                    value={form.fullName}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, fullName: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input
                    className="form-control"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, phone: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Địa chỉ</label>
                  <input
                    className="form-control"
                    value={form.address}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, address: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Ghi chú</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    value={form.note}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, note: e.target.value }))
                    }
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={items.length === 0}
                >
                  Đặt hàng
                </button>{" "}
                <Link className="btn btn-default" to="/cart">
                  Quay lại giỏ hàng
                </Link>
              </form>

              {items.length === 0 && (
                <p className="text-center" style={{ marginTop: 16 }}>
                  Giỏ hàng trống. <Link to="/product">Mua sắm ngay</Link>
                </p>
              )}
            </div>
          </div>

          <div className="col-md-4 col-sm-12">
            <div className="checkout-summary">
              <h2 className="heading-title">Đơn hàng</h2>

              <div className="table-responsive">
                <table className="table">
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.productId}>
                        <td>
                          <strong>{i.name}</strong>
                          <div className="text-muted">
                            x{i.qty} · ${Number(i.price || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="text-right">
                          ${(Number(i.price || 0) * Number(i.qty || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td>Tạm tính</td>
                      <td className="text-right">${subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>Vận chuyển</td>
                      <td className="text-right">${shipping.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Tổng cộng</strong>
                      </td>
                      <td className="text-right">
                        <strong>${total.toFixed(2)}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckOut;
