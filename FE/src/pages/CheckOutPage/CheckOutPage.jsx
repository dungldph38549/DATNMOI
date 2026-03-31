import { useMemo, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createOrder, createVnpayUrl, updateCustomerById, getWalletBalance } from "../../api";
import { clearCart } from "../../redux/cart/cartSlice";
import notify from "../../utils/notify";

function CheckOutPage() {

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const cartItems = useSelector((state) => state.cart.items || []);
  const user = useSelector((state) => state.user);

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [shippingMethod] = useState("fast"); // map về backend: fast/standard
  const [walletBalance, setWalletBalance] = useState(null);
  const isLoggedIn = !!user?.login;

  useEffect(() => {
    if (!isLoggedIn) {
      setWalletBalance(null);
      return;
    }
    let cancelled = false;
    getWalletBalance()
      .then((d) => {
        if (!cancelled)
          setWalletBalance(
            typeof d?.balance === "number"
              ? d.balance
              : Number(d?.balance) || 0,
          );
      })
      .catch(() => {
        if (!cancelled) setWalletBalance(0);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const shippingFee = 30000;

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = Number(item.price || 0);
      const qty = Number(item.qty || 0);
      return sum + price * qty;
    }, 0);
  }, [cartItems]);

  const totalPrice = subtotal + shippingFee;

  const handleOrder = async () => {
    try {
      if (!cartItems.length) {
        notify.warning("Gio hang trong.");
        return;
      }

      if (!name.trim()) {
        notify.warning("Vui long nhap ho ten.");
        return;
      }
      if (!email.trim()) {
        notify.warning("Vui long nhap email.");
        return;
      }
      if (!phone.trim()) {
        notify.warning("Vui long nhap so dien thoai.");
        return;
      }
      if (!address.trim()) {
        notify.warning("Vui long nhap dia chi.");
        return;
      }

      const isLoggedIn = !!user?.login;
      const userIdCandidate = user?._id || user?.id;
      const userId = isLoggedIn && userIdCandidate ? userIdCandidate : null;
      const guestId = !isLoggedIn ? String(user?.id || "") : null;

      const products = cartItems.map((item) => ({
        productId: item.productId || item._id,
        quantity: item.qty || 1,
        sku: item.sku == null ? null : String(item.sku).trim().toUpperCase(),
      }));

      const baseUrl = window.location.origin;
      if (paymentMethod === "WALLET") {
        if (!userId) {
          notify.warning("Dang nhap de thanh toan bang vi.");
          return;
        }
        if (totalPrice > 0 && (walletBalance ?? 0) < totalPrice) {
          notify.warning("So du vi khong du.");
          return;
        }
      }

      const orderPayload = {
        ...(userId ? { userId } : {}),
        ...(guestId ? { guestId } : {}),
        fullName: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: note || undefined,
        paymentMethod:
          paymentMethod === "ONLINE"
            ? "vnpay"
            : paymentMethod === "WALLET"
              ? "wallet"
              : "cod",
        shippingMethod: shippingMethod === "fast" ? "fast" : "standard",
        products,
        voucherCode: null,
        discount: 0,
        shippingFee,
        totalAmount: totalPrice,
        ...(paymentMethod === "ONLINE"
          ? {
              vnpReturnUrl: `${baseUrl}/payment/return`,
              vnpCancelUrl: `${baseUrl}/checkoutpage`,
            }
          : {}),
      };

      const order = await createOrder(orderPayload);

      if (order?.paymentMethod === "vnpay" && order?._id) {
        let payUrl = order.vnpayPaymentUrl;
        if (!payUrl) {
          const { url } = await createVnpayUrl(
            order._id,
            `${baseUrl}/payment/return`,
            `${baseUrl}/checkoutpage`,
          );
          payUrl = url;
        }
        if (payUrl) {
          dispatch(clearCart());
          window.location.href = payUrl;
          return;
        }
        if (order.vnpayBuildError) {
          notify.error(order.vnpayBuildError);
          return;
        }
        notify.error(
          "Không nhận được link thanh toán VNPay. Kiểm tra backend và .env (BE_URL, VNP_TMN_CODE).",
        );
        return;
      }

      // Best-effort update profile
      if (isLoggedIn && user?.id) {
        try {
          await updateCustomerById({
            id: user.id,
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            address: address.trim(),
          });
        } catch {
          // ignore
        }
      }

      dispatch(clearCart());
      notify.success("Dat hang thanh cong!");
      navigate("/orders");
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Có lỗi xảy ra khi đặt hàng";
      notify.error(msg);
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>

      <h2>Thông tin giao hàng</h2>

      <input
        placeholder="Họ tên"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Địa chỉ"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Số điện thoại"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <br /><br />

      <textarea
        placeholder="Ghi chú (tuỳ chọn)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        style={{ width: "100%", maxWidth: 520 }}
      />

      <br /><br />

      <h3>Phương thức thanh toán</h3>

      <label>
        <input
          type="radio"
          value="COD"
          checked={paymentMethod === "COD"}
          onChange={(e) => setPaymentMethod(e.target.value)}
        />
        Thanh toán khi nhận hàng (COD)
      </label>

      <br />

      <label>
        <input
          type="radio"
          value="ONLINE"
          checked={paymentMethod === "ONLINE"}
          onChange={(e) => setPaymentMethod(e.target.value)}
        />
        Thanh toán Online (VNPay)
      </label>

      <br />

      <label style={{ opacity: isLoggedIn && (totalPrice <= 0 || (walletBalance ?? 0) >= totalPrice) ? 1 : 0.5 }}>
        <input
          type="radio"
          value="WALLET"
          checked={paymentMethod === "WALLET"}
          disabled={!isLoggedIn || (totalPrice > 0 && (walletBalance ?? 0) < totalPrice)}
          onChange={(e) => setPaymentMethod(e.target.value)}
        />
        Ví tài khoản
        {isLoggedIn && walletBalance != null && (
          <span style={{ marginLeft: 8, fontSize: 12 }}>
            (Số dư: {walletBalance.toLocaleString("vi-VN")}đ)
          </span>
        )}
      </label>

      <br /><br />

      <h3>Tổng tiền: {totalPrice} VNĐ</h3>

      <button onClick={handleOrder}>
        Đặt hàng
      </button>

    </div>
  );
}

export default CheckOutPage;