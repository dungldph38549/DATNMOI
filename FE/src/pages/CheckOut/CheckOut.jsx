import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  addToCart,
  removeBuyNowItems,
  removeManyFromCart,
  removeFromCart,
} from "../../redux/cart/cartSlice";
import {
  createOrder,
  createVnpayUrl,
  getVoucherByCode,
  getProductById,
  updateCustomerById,
} from "../../api";
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCreditCard, FaTruck, FaMoneyBillWave, FaShieldAlt } from "react-icons/fa";

const VIETNAM_LOCATION_API = "https://provinces.open-api.vn/api";

const CheckOut = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const allItems = useSelector((state) => state.cart.items);
  const items = useMemo(
    () =>
      (allItems || []).filter(
        (item) =>
          !String(item?.cartKey || "").includes("::BUY_NOW::"),
      ),
    [allItems],
  );
  const buyNowItems = useMemo(
    () =>
      (allItems || []).filter((item) =>
        String(item?.cartKey || "").includes("::BUY_NOW::"),
      ),
    [allItems],
  );
  const user = useSelector((state) => state.user);

  const selectedItemKeys = useMemo(() => {
    const selectedKeys = location?.state?.selectedItemKeys;
    if (Array.isArray(selectedKeys)) return selectedKeys;
    const selectedIds = location?.state?.selectedItemIds;
    return Array.isArray(selectedIds) ? selectedIds : [];
  }, [location?.state?.selectedItemKeys, location?.state?.selectedItemIds]);

  const selectedIdSet = useMemo(() => new Set(selectedItemKeys.map((id) => String(id))), [selectedItemKeys]);
  const buyNowStateItem = useMemo(() => {
    const item = location?.state?.buyNowItem;
    if (!item) return null;
    return {
      ...item,
      qty: Number(item.qty || 1),
      price: Number(item.price || 0),
      originalPrice:
        item.originalPrice == null ? null : Number(item.originalPrice),
    };
  }, [location?.state?.buyNowItem]);

  const checkoutItems = useMemo(() => {
    if (selectedIdSet.size === 0) return items;
    const source = [...items, ...buyNowItems];
    const selected = source.filter((item) => {
      const lineKey = item.cartKey || item.productId;
      return selectedIdSet.has(String(lineKey));
    });
    if (selected.length === 0 && buyNowStateItem) return [buyNowStateItem];
    return selected;
  }, [items, buyNowItems, selectedIdSet, buyNowStateItem]);
  const buyNowSelectedKeys = useMemo(
    () =>
      selectedItemKeys.filter((key) =>
        String(key || "").includes("::BUY_NOW::"),
      ),
    [selectedItemKeys],
  );
  const hasPlacedOrderRef = useRef(false);

  const subtotal = useMemo(() => checkoutItems.reduce((sum, i) => sum + Number(i.qty || 0) * Number(i.price || 0), 0), [checkoutItems]);

  useEffect(() => {
    // Dọn item BUY_NOW rác từ phiên trước (không nằm trong checkout hiện tại)
    const selectedSet = new Set(buyNowSelectedKeys.map((k) => String(k)));
    const staleKeys = buyNowItems
      .map((i) => String(i.cartKey || ""))
      .filter((k) => !selectedSet.has(k));
    if (staleKeys.length > 0) dispatch(removeBuyNowItems(staleKeys));
  }, [buyNowItems, buyNowSelectedKeys, dispatch]);

  useEffect(() => {
    // Nếu rời trang checkout khi chưa đặt thành công thì xóa item BUY_NOW của phiên hiện tại
    return () => {
      if (!hasPlacedOrderRef.current && buyNowSelectedKeys.length > 0) {
        dispatch(removeBuyNowItems(buyNowSelectedKeys));
      }
    };
  }, [buyNowSelectedKeys, dispatch]);

  const LAST_CHECKOUT_KEY = "last_checkout_v1";
  const safeJsonParse = (raw) => { try { return JSON.parse(raw); } catch { return null; } };
  const isProbablyObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || ""));
  const lastCheckout = safeJsonParse(localStorage.getItem(LAST_CHECKOUT_KEY));

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [voucherChecking, setVoucherChecking] = useState(false);
  const [voucherError, setVoucherError] = useState("");

  const [form, setForm] = useState({
    fullName: lastCheckout?.fullName ?? "",
    email: lastCheckout?.email ?? "",
    phone: lastCheckout?.phone ?? "",
    address: lastCheckout?.address ?? "",
    note: "",
  });
  const [streetAddress, setStreetAddress] = useState(lastCheckout?.streetAddress ?? "");
  const [selectedProvinceCode, setSelectedProvinceCode] = useState(lastCheckout?.provinceCode ? String(lastCheckout.provinceCode) : "");
  const [selectedDistrictCode, setSelectedDistrictCode] = useState(lastCheckout?.districtCode ? String(lastCheckout.districtCode) : "");
  const [selectedWardCode, setSelectedWardCode] = useState(lastCheckout?.wardCode ? String(lastCheckout.wardCode) : "");
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [addressLoading, setAddressLoading] = useState({
    province: false,
    district: false,
    ward: false,
  });

  useEffect(() => {
    if (user?.name) setForm((f) => ({ ...f, fullName: user.name }));
    if (user?.email) setForm((f) => ({ ...f, email: user.email }));
    if (user?.phone) setForm((f) => ({ ...f, phone: user.phone || "" }));
    if (user?.address) setForm((f) => ({ ...f, address: Array.isArray(user.address) ? user.address[0] : user.address || "" }));
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const loadProvinces = async () => {
      try {
        setAddressLoading((s) => ({ ...s, province: true }));
        const res = await fetch(`${VIETNAM_LOCATION_API}/p/`);
        const data = await res.json();
        if (!cancelled) setProvinces(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setProvinces([]);
      } finally {
        if (!cancelled) setAddressLoading((s) => ({ ...s, province: false }));
      }
    };
    loadProvinces();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadDistricts = async () => {
      if (!selectedProvinceCode) {
        setDistricts([]);
        setWards([]);
        setSelectedDistrictCode("");
        setSelectedWardCode("");
        return;
      }
      try {
        setAddressLoading((s) => ({ ...s, district: true }));
        const res = await fetch(`${VIETNAM_LOCATION_API}/p/${selectedProvinceCode}?depth=2`);
        const data = await res.json();
        if (!cancelled) {
          const nextDistricts = Array.isArray(data?.districts) ? data.districts : [];
          setDistricts(nextDistricts);
          const hasDistrict = nextDistricts.some((d) => String(d.code) === String(selectedDistrictCode));
          if (!hasDistrict) {
            setSelectedDistrictCode("");
            setSelectedWardCode("");
            setWards([]);
          }
        }
      } catch {
        if (!cancelled) {
          setDistricts([]);
          setSelectedDistrictCode("");
          setSelectedWardCode("");
          setWards([]);
        }
      } finally {
        if (!cancelled) setAddressLoading((s) => ({ ...s, district: false }));
      }
    };
    loadDistricts();
    return () => { cancelled = true; };
  }, [selectedProvinceCode]);

  useEffect(() => {
    let cancelled = false;
    const loadWards = async () => {
      if (!selectedDistrictCode) {
        setWards([]);
        setSelectedWardCode("");
        return;
      }
      try {
        setAddressLoading((s) => ({ ...s, ward: true }));
        const res = await fetch(`${VIETNAM_LOCATION_API}/d/${selectedDistrictCode}?depth=2`);
        const data = await res.json();
        if (!cancelled) {
          const nextWards = Array.isArray(data?.wards) ? data.wards : [];
          setWards(nextWards);
          const hasWard = nextWards.some((w) => String(w.code) === String(selectedWardCode));
          if (!hasWard) setSelectedWardCode("");
        }
      } catch {
        if (!cancelled) {
          setWards([]);
          setSelectedWardCode("");
        }
      } finally {
        if (!cancelled) setAddressLoading((s) => ({ ...s, ward: false }));
      }
    };
    loadWards();
    return () => { cancelled = true; };
  }, [selectedDistrictCode]);

  const fullAddress = useMemo(() => {
    const provinceName = provinces.find((p) => String(p.code) === String(selectedProvinceCode))?.name || "";
    const districtName = districts.find((d) => String(d.code) === String(selectedDistrictCode))?.name || "";
    const wardName = wards.find((w) => String(w.code) === String(selectedWardCode))?.name || "";
    return [streetAddress.trim(), wardName, districtName, provinceName].filter(Boolean).join(", ");
  }, [streetAddress, selectedProvinceCode, selectedDistrictCode, selectedWardCode, provinces, districts, wards]);

  useEffect(() => {
    const code = voucherCode.trim();
    if (!code) { setDiscount(0); setVoucherError(""); return; }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setVoucherChecking(true);
        const voucher = await getVoucherByCode(code);
        if (cancelled) return;

        if (!voucher) { setDiscount(0); setVoucherError("Mã giảm giá không hợp lệ"); return; }
        const now = new Date();
        const start = voucher.startDate ? new Date(voucher.startDate) : null;
        const end = voucher.endDate ? new Date(voucher.endDate) : null;
        const statusOk = voucher.status === "active";
        const timeOk = (!start || now >= start) && (!end || now <= end);
        const minOk = subtotal >= (voucher.minOrderValue ?? 0);
        const usageLimit = voucher.usageLimit ?? 0;
        const usedCount = voucher.usedCount ?? 0;
        const usageOk = usageLimit === 0 || usedCount < usageLimit;

        if (!statusOk) { setDiscount(0); setVoucherError("Mã không hoạt động"); return; }
        if (!timeOk) { setDiscount(0); setVoucherError("Mã đã hết hạn"); return; }
        if (!minOk) { setDiscount(0); setVoucherError(`Đơn tối thiểu ${Number(voucher.minOrderValue ?? 0).toLocaleString()}đ`); return; }
        if (!usageOk) { setDiscount(0); setVoucherError("Mã đã hết lượt"); return; }

        const rawDiscount = voucher.discountType === "fixed" ? Number(voucher.discountValue ?? 0) : (subtotal * Number(voucher.discountValue ?? 0)) / 100;
        const discountAmount = Math.max(0, Math.min(subtotal, rawDiscount));
        setDiscount(discountAmount); setVoucherError("");
      } catch (e) {
        if (cancelled) return;
        setDiscount(0); setVoucherError("Lỗi kết nối kiểm tra mã.");
      } finally {
        if (!cancelled) setVoucherChecking(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [voucherCode, subtotal]);

  const shipping = useMemo(() => (shippingMethod === "fast" ? 30000 : 0), [shippingMethod]);
  const total = Math.max(0, subtotal + shipping - discount);

  const onPlaceOrder = async (e) => {
    e.preventDefault();
    const userIdCandidate = user?._id || user?.id;
    const isLoggedIn = !!user?.login;
    const userId = isLoggedIn && isProbablyObjectId(userIdCandidate) ? userIdCandidate : null;
    const guestId = !isLoggedIn ? String(user?.id || "") : null;

    if (!userId && (!guestId || guestId.length < 6)) { alert("Không xác định được tài khoản. Vui lòng đăng nhập lại."); return; }
    if (checkoutItems.length === 0) { alert("Giỏ hàng trống"); return; }
    if (!form.email?.trim()) { alert("Vui lòng nhập email"); return; }
    if (!selectedProvinceCode || !selectedDistrictCode || !selectedWardCode || !streetAddress.trim()) {
      alert("Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã và nhập số nhà, tên đường.");
      return;
    }

    try {
      setLoading(true);
      const products = checkoutItems.map((item) => ({
        productId: item.productId || item._id,
        quantity: item.qty || 1,
        sku: item.sku == null ? null : String(item.sku).trim().toUpperCase(),
      }));

      const baseUrl = window.location.origin;
      const orderPayload = {
        ...(userId ? { userId } : {}),
        ...(guestId ? { guestId } : {}),
        fullName: form.fullName, email: form.email, phone: form.phone, address: fullAddress,
        paymentMethod: paymentMethod === "vnpay" ? "vnpay" : "cod",
        shippingMethod: shippingMethod === "fast" ? "fast" : "standard",
        products, discount, voucherCode: voucherCode.trim() || null,
        shippingFee: shipping, totalAmount: total,
        ...(paymentMethod === "vnpay"
          ? {
              vnpReturnUrl: `${baseUrl}/payment/return`,
              vnpCancelUrl: `${baseUrl}/checkout`,
            }
          : {}),
      };

      const order = await createOrder(orderPayload);
      const persistCheckoutInfo = () => {
        try {
          localStorage.setItem(
            LAST_CHECKOUT_KEY,
            JSON.stringify({
              ...form,
              note: "",
              address: fullAddress,
              streetAddress: streetAddress.trim(),
              provinceCode: selectedProvinceCode || null,
              districtCode: selectedDistrictCode || null,
              wardCode: selectedWardCode || null,
              shippingMethod,
              paymentMethod,
              voucherCode: voucherCode.trim() || null,
            }),
          );
        } catch { }
      };

      const updateProfileIfLoggedIn = async () => {
        if (!isLoggedIn || !user?.id) return;
        try { await updateCustomerById({ id: user.id, name: form.fullName, email: form.email, phone: form.phone, address: fullAddress }); } catch (err) { }
      };

      if (order?.paymentMethod === "vnpay" && order?._id) {
        let payUrl = order.vnpayPaymentUrl;
        if (!payUrl) {
          const { url } = await createVnpayUrl(
            order._id,
            `${baseUrl}/payment/return`,
            `${baseUrl}/checkout`,
          );
          payUrl = url;
        }
        if (payUrl) {
          hasPlacedOrderRef.current = true;
          persistCheckoutInfo(); await updateProfileIfLoggedIn();
          dispatch(removeManyFromCart(checkoutItems.map((i) => i.cartKey || i.productId)));
          window.location.href = payUrl; return;
        }
        if (order.vnpayBuildError) {
          alert(order.vnpayBuildError);
          return;
        }
        alert(
          "Không nhận được link thanh toán VNPay. Kiểm tra backend (log lỗi), biến BE_URL / VNP_TMN_CODE trong .env.",
        );
        return;
      }

      hasPlacedOrderRef.current = true;
      dispatch(removeManyFromCart(checkoutItems.map((i) => i.cartKey || i.productId)));
      persistCheckoutInfo();
      await updateProfileIfLoggedIn();

      alert("Đặt hàng thành công!");
      navigate("/orders");
    } catch (error) {
      console.error(error);
      const data = error?.response?.data;
      const msg = data?.message || "Có lỗi xảy ra khi đặt hàng";
      if (Array.isArray(data?.availableSkus) && data?.availableSkus.length > 0) {
        const productId = data?.productId;
        const availableSkus = data?.availableSkus || [];
        const normalizeSku = (s) => s == null ? null : String(s).trim().toUpperCase();
        const cartItem = productId ? checkoutItems.find((i) => String(i?.productId || i?._id || "") === String(productId)) : null;
        const wantedSize = cartItem?.size ?? null;
        const skuSet = new Set(availableSkus.map(normalizeSku).filter(Boolean));

        const attemptAutoFix = async () => {
          if (!productId || !cartItem) return false;
          const sizeKey = wantedSize ? String(wantedSize).trim().toUpperCase() : null;
          try {
            const res = await getProductById(productId);
            const p = res?.data ?? res;
            const variants = Array.isArray(p?.variants) ? p.variants : [];
            const getVariantSizeValue = (variant) => {
              const attrs = variant?.attributes;
              if (!attrs) return null;
              if (typeof attrs.get === "function") return attrs.get("Size") ?? attrs.get("size") ?? null;
              if (typeof attrs === "object") {
                const foundKey = Object.keys(attrs).find((k) => String(k).toLowerCase() === "size");
                return foundKey ? attrs[foundKey] : null;
              }
              return null;
            };

            let target = null;
            if (sizeKey) { target = variants.find((v) => skuSet.has(normalizeSku(v?.sku)) && String(getVariantSizeValue(v) ?? "").trim().toUpperCase() === sizeKey) ?? null; }
            if (!target) { target = variants.find((v) => skuSet.has(normalizeSku(v?.sku))); }
            if (!target) return false;

            const finalSize = cartItem?.size ? cartItem.size : getVariantSizeValue(target);
            dispatch(removeFromCart(productId));
            dispatch(addToCart({ productId: productId, name: cartItem.name, image: cartItem.image, price: target.price, qty: cartItem.qty || 1, sku: target.sku, size: finalSize ?? null }));
            return true;
          } catch { return false; }
        };

        try {
          const fixed = await attemptAutoFix();
          if (fixed) { alert(`${msg}\nMình đã tự cập nhật SKU theo size (${cartItem?.size}). Bấm OK để thử checkout lại.`); return; }
        } catch { }

        alert(`${msg}\n${data?.invalidSku ? `SKU đang gửi: ${data.invalidSku}\n` : ""}Các SKU hợp lệ: ${availableSkus.join(", ")}`);
        if (productId) dispatch(removeFromCart(productId));
        return;
      }
      alert(data?.stack && String(msg).includes("next") ? `${msg}\n\n${data.stack}` : msg);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (v) => `${Number(v || 0).toLocaleString("vi-VN")}đ`;

  return (
    <div className="bg-background-light min-h-screen font-body pb-20 pt-24">
      {/* HEADER */}
      <div className="bg-slate-900 border-b border-slate-800 relative xl:hidden mb-10">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 z-0"></div>
        <div className="container mx-auto px-4 relative z-10 py-12 text-center">
          <h1 className="text-4xl font-display font-black text-white tracking-tight">Thanh Toán</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* LEFT: CHECKOUT FORM */}
          <div className="w-full lg:w-[60%] xl:w-[65%]">
            <div className="hidden xl:block mb-8">
              <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight">Thanh Toán An Toàn.</h1>
              <p className="text-slate-500 mt-2">Vui lòng điền đầy đủ thông tin để chúng tôi có thể giao hàng đến bạn sớm nhất.</p>
            </div>

            <form onSubmit={onPlaceOrder} className="space-y-8">
              {/* CONTACT INFO */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>

                <h2 className="text-xl font-display font-black text-slate-800 mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-primary"><FaUser size={14} /></div>
                  Thông Tin Giao Hàng
                </h2>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Họ & Tên *</label>
                      <div className="relative">
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 pl-12 font-medium text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                          value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required placeholder="Nhập họ và tên..." />
                        <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Số điện thoại *</label>
                      <div className="relative">
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 pl-12 font-medium text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                          value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="Nhập số điện thoại..." />
                        <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Email *</label>
                    <div className="relative">
                      <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 pl-12 font-medium text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="Nhập email của bạn..." />
                      <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Địa chỉ nhận hàng *</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 font-medium text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                        value={selectedProvinceCode}
                        onChange={(e) => setSelectedProvinceCode(e.target.value)}
                        required
                        disabled={addressLoading.province}
                      >
                        <option value="">{addressLoading.province ? "Đang tải Tỉnh/Thành..." : "Chọn Tỉnh/Thành"}</option>
                        {provinces.map((province) => (
                          <option key={province.code} value={province.code}>
                            {province.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 font-medium text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                        value={selectedDistrictCode}
                        onChange={(e) => setSelectedDistrictCode(e.target.value)}
                        required
                        disabled={!selectedProvinceCode || addressLoading.district}
                      >
                        <option value="">
                          {!selectedProvinceCode ? "Chọn Quận/Huyện" : addressLoading.district ? "Đang tải Quận/Huyện..." : "Chọn Quận/Huyện"}
                        </option>
                        {districts.map((district) => (
                          <option key={district.code} value={district.code}>
                            {district.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 font-medium text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                        value={selectedWardCode}
                        onChange={(e) => setSelectedWardCode(e.target.value)}
                        required
                        disabled={!selectedDistrictCode || addressLoading.ward}
                      >
                        <option value="">
                          {!selectedDistrictCode ? "Chọn Phường/Xã" : addressLoading.ward ? "Đang tải Phường/Xã..." : "Chọn Phường/Xã"}
                        </option>
                        {wards.map((ward) => (
                          <option key={ward.code} value={ward.code}>
                            {ward.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="relative">
                      <input
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 pl-12 font-medium text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                        value={streetAddress}
                        onChange={(e) => setStreetAddress(e.target.value)}
                        required
                        placeholder="Địa chỉ cụ thể..."
                      />
                      <FaMapMarkerAlt className="absolute left-4 top-[17px] text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Ghi chú đơn hàng (Tùy chọn)</label>
                    <textarea rows="3" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 font-medium text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm resize-none custom-scrollbar"
                      value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú thêm về đơn hàng hoặc thời gian giao nhận..."></textarea>
                  </div>
                </div>
              </div>

              {/* SHIPPING & PAYMENT OPTIONS */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* SHIPPING */}
                  <div>
                    <h2 className="text-xl font-display font-black text-slate-800 mb-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-primary"><FaTruck size={14} /></div>
                      Vận Chuyển
                    </h2>

                    <div className="space-y-3">
                      <label className={`block flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${shippingMethod === "standard" ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${shippingMethod === "standard" ? "border-primary" : "border-slate-300"}`}>
                            <div className={`w-2.5 h-2.5 rounded-full bg-primary transition-transform ${shippingMethod === "standard" ? "scale-100" : "scale-0"}`}></div>
                          </div>
                          <div>
                            <span className="block font-bold text-slate-800">Giao hàng tiêu chuẩn</span>
                            <span className="block text-xs font-semibold text-slate-400">Từ 2-4 ngày làm việc</span>
                          </div>
                        </div>
                        <span className="font-bold text-green-600">Miễn Phí</span>
                        <input type="radio" className="hidden" value="standard" checked={shippingMethod === "standard"} onChange={() => setShippingMethod("standard")} />
                      </label>

                      <label className={`block flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${shippingMethod === "fast" ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${shippingMethod === "fast" ? "border-primary" : "border-slate-300"}`}>
                            <div className={`w-2.5 h-2.5 rounded-full bg-primary transition-transform ${shippingMethod === "fast" ? "scale-100" : "scale-0"}`}></div>
                          </div>
                          <div>
                            <span className="block font-bold text-slate-800">Giao hàng hỏa tốc</span>
                            <span className="block text-xs font-semibold text-slate-400">Giao trong ngày</span>
                          </div>
                        </div>
                        <span className="font-bold text-slate-600">+30.000đ</span>
                        <input type="radio" className="hidden" value="fast" checked={shippingMethod === "fast"} onChange={() => setShippingMethod("fast")} />
                      </label>
                    </div>
                  </div>

                  {/* PAYMENT */}
                  <div>
                    <h2 className="text-xl font-display font-black text-slate-800 mb-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-primary"><FaCreditCard size={14} /></div>
                      Thanh Toán
                    </h2>

                    <div className="space-y-3">
                      <label className={`block flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === "cod" ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === "cod" ? "border-primary" : "border-slate-300"}`}>
                            <div className={`w-2.5 h-2.5 rounded-full bg-primary transition-transform ${paymentMethod === "cod" ? "scale-100" : "scale-0"}`}></div>
                          </div>
                          <span className="font-bold text-slate-800">Thanh toán khi nhận hàng (COD)</span>
                        </div>
                        <FaMoneyBillWave className={paymentMethod === "cod" ? "text-primary text-xl" : "text-slate-300 text-xl"} />
                        <input type="radio" className="hidden" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                      </label>

                      <label className={`block flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === "vnpay" ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === "vnpay" ? "border-primary" : "border-slate-300"}`}>
                            <div className={`w-2.5 h-2.5 rounded-full bg-primary transition-transform ${paymentMethod === "vnpay" ? "scale-100" : "scale-0"}`}></div>
                          </div>
                          <span className="font-bold text-slate-800">Thanh toán qua VNPay</span>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-xs font-bold border ${paymentMethod === "vnpay" ? "border-primary text-primary" : "border-slate-200 text-slate-400"}`}>VNPAY</div>
                        <input type="radio" className="hidden" value="vnpay" checked={paymentMethod === "vnpay"} onChange={() => setPaymentMethod("vnpay")} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* VOUCHER */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-display font-black text-slate-800 mb-4 flex items-center gap-3">
                  <span className="text-xl">🎟️</span> Mã Khuyến Mãi
                </h2>
                <div className="relative">
                  <input
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm uppercase tracking-wide"
                    placeholder="NHẬP MÃ GIẢM GIÁ (NẾU CÓ)"
                    value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)}
                  />
                  {voucherChecking && <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">Đang tìm...</span>}
                  {discount > 0 && !voucherChecking && (
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-green-500 bg-green-50 px-3 py-1 rounded-lg">Áp dụng thành công!</span>
                  )}
                </div>
                {voucherError && <p className="text-sm font-bold text-red-500 mt-2 ml-1">{voucherError}</p>}
              </div>

            </form>
          </div>

          {/* RIGHT: ORDER SUMMARY */}
          <div className="w-full lg:w-[40%] xl:w-[35%] lg:sticky lg:top-28">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full max-h-[85vh]">
              <h2 className="text-xl font-display font-black text-slate-800 mb-6">Chi Tiết Đơn Hàng</h2>

              {/* ORDER ITEMS */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6 space-y-4">
                {checkoutItems.map((item, index) => (
                  <div key={item.productId || index} className="flex gap-4 p-3 rounded-2xl border border-slate-100 bg-slate-50 relative group">
                    <div className="w-20 h-20 bg-white rounded-xl overflow-hidden border border-slate-200 shrink-0">
                      <img src={item.image ? (item.image.startsWith("http") ? item.image : `http://localhost:3002/uploads/${item.image.startsWith("/") ? item.image.slice(1) : item.image}`) : "https://via.placeholder.com/80/f0f0f0/999?text=No+Image"}
                        alt={item.name} className="w-full h-full object-cover p-1" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 hover:text-primary transition-colors cursor-pointer">{item.name}</h3>
                        <p className="text-xs font-semibold text-slate-400 mt-1">Phân loại: {item.size || "Mặc định"}</p>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="font-bold text-slate-600 text-sm">x{item.qty}</span>
                        <span className="font-black text-secondary">{formatMoney((item.price || 0) * (item.qty || 0))}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CALCULATION */}
              <div className="space-y-3 mb-6 pb-6 border-b border-slate-100 text-sm font-semibold text-slate-500">
                <div className="flex justify-between items-center">
                  <span>Tạm tính ({checkoutItems.length} sản phẩm)</span>
                  <span className="font-bold text-slate-800 text-base">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Phí giao hàng</span>
                  <span className="font-bold text-slate-800">{shipping === 0 ? "Miễn phí" : formatMoney(shipping)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-center text-green-600 font-bold bg-green-50 p-2 rounded-lg -mx-2 px-2">
                    <span>Giảm giá khuyến mãi</span>
                    <span>-{formatMoney(discount)}</span>
                  </div>
                )}
              </div>

              {/* TOTAL & SUBMIT */}
              <div>
                <div className="flex justify-between items-end mb-6">
                  <span className="font-bold text-slate-700">Tổng thanh toán:</span>
                  <div className="text-right">
                    <span className="block text-3xl font-black text-primary">{formatMoney(total)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={onPlaceOrder}
                    disabled={checkoutItems.length === 0 || loading}
                    className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FaShieldAlt />}
                    {loading ? "Đang Xử Lý..." : paymentMethod === "vnpay" ? "Thanh Toán VNPay" : "Xác Nhận Đặt Hàng"}
                  </button>
                  <Link to="/cart" className="w-full h-12 flex items-center justify-center font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">
                    Quay lại giỏ hàng
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CheckOut;
