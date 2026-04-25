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
  previewVoucherDiscount,
  getProductById,
  updateCustomerById,
  getWalletBalance,
  getAllVouchers,
} from "../../api";
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCreditCard, FaTruck, FaMoneyBillWave, FaShieldAlt, FaWallet, FaTicketAlt } from "react-icons/fa";
import notify from "../../utils/notify";

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
  const [errors, setErrors] = useState({});
  const [voucherCode, setVoucherCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [voucherChecking, setVoucherChecking] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [collectedVoucherCodes, setCollectedVoucherCodes] = useState([]);
  const [expiredVoucherCodes, setExpiredVoucherCodes] = useState([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [draftVoucherCode, setDraftVoucherCode] = useState("");
  const [voucherAvailability, setVoucherAvailability] = useState({});
  const [checkingVoucherList, setCheckingVoucherList] = useState(false);
  const [voucherMetaByCode, setVoucherMetaByCode] = useState({});
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
        if (!cancelled) {
          setWalletBalance(
            typeof d?.balance === "number"
              ? d.balance
              : Number(d?.balance) || 0,
          );
        }
      })
      .catch(() => {
        if (!cancelled) setWalletBalance(0);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id]);

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

  const getVoucherStorageKey = () => {
    const identity = user?._id || user?.id || user?.email || "guest";
    return `collected_vouchers_v1_${String(identity)}`;
  };

  const normalizeVoucherCode = (code) => String(code || "").trim().toUpperCase();

  const loadVoucherStorage = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(getVoucherStorageKey()) || "[]");
      if (Array.isArray(parsed)) {
        return {
          active: parsed.map(normalizeVoucherCode).filter(Boolean),
          expired: [],
        };
      }
      if (parsed && typeof parsed === "object") {
        const active = Array.isArray(parsed.active) ? parsed.active.map(normalizeVoucherCode).filter(Boolean) : [];
        const expired = Array.isArray(parsed.expired) ? parsed.expired.map(normalizeVoucherCode).filter(Boolean) : [];
        return { active, expired };
      }
      return { active: [], expired: [] };
    } catch {
      return { active: [], expired: [] };
    }
  };

  const saveVoucherStorage = (activeCodes, expiredCodes) => {
    try {
      localStorage.setItem(
        getVoucherStorageKey(),
        JSON.stringify({
          active: [...new Set((activeCodes || []).map(normalizeVoucherCode).filter(Boolean))],
          expired: [...new Set((expiredCodes || []).map(normalizeVoucherCode).filter(Boolean))],
        }),
      );
    } catch {
      // ignore localStorage write error
    }
  };

  const isExpiredVoucherError = (message) => {
    const msg = String(message || "").toLowerCase();
    return msg.includes("hết hạn") || msg.includes("het han") || msg.includes("expired");
  };

  const markVoucherAsExpired = (code) => {
    const normalizedCode = normalizeVoucherCode(code);
    if (!normalizedCode) return;
    const nextActive = collectedVoucherCodes.filter((c) => c !== normalizedCode);
    const nextExpired = [...new Set([...expiredVoucherCodes, normalizedCode])];
    setCollectedVoucherCodes(nextActive);
    setExpiredVoucherCodes(nextExpired);
    saveVoucherStorage(nextActive, nextExpired);
  };

  const markVouchersAsExpired = (codes) => {
    const normalized = [...new Set((codes || []).map(normalizeVoucherCode).filter(Boolean))];
    if (normalized.length === 0) return;
    const expiredSet = new Set(normalized);
    const nextActive = collectedVoucherCodes.filter((c) => !expiredSet.has(c));
    const nextExpired = [...new Set([...expiredVoucherCodes, ...normalized])];
    setCollectedVoucherCodes(nextActive);
    setExpiredVoucherCodes(nextExpired);
    saveVoucherStorage(nextActive, nextExpired);
  };

  useEffect(() => {
    const data = loadVoucherStorage();
    setCollectedVoucherCodes(data.active);
    setExpiredVoucherCodes(data.expired);
  }, [user?._id, user?.id, user?.email]);

  const voucherPreviewItems = () =>
    checkoutItems.map((i) => ({
      productId: String(i.productId || i._id || ""),
      price: Number(i.price || 0),
      quantity: Number(i.qty || 0),
    }));

  const applyVoucherByCode = async (rawCode) => {
    const normalizedCode = String(rawCode || "").trim().toUpperCase();
    if (!normalizedCode) {
      setVoucherError("Vui lòng nhập mã giảm giá");
      setAppliedVoucher(null);
      setDiscount(0);
      return false;
    }

    const collectedSet = new Set(collectedVoucherCodes);
    const expiredSet = new Set(expiredVoucherCodes);
    if (expiredSet.has(normalizedCode)) {
      setVoucherError("Mã này đã hết hạn.");
      setAppliedVoucher(null);
      setDiscount(0);
      return false;
    }
    if (!collectedSet.has(normalizedCode)) {
      setVoucherError("Bạn chưa thu thập mã này. Vào trang Voucher để thu thập trước.");
      setAppliedVoucher(null);
      setDiscount(0);
      return false;
    }

    try {
      setVoucherChecking(true);
      const result = await previewVoucherDiscount({
        code: normalizedCode,
        items: voucherPreviewItems(),
      });
      if (result?.status === "ERR" || result?.status === "Err") {
        if (isExpiredVoucherError(result?.message)) {
          markVoucherAsExpired(normalizedCode);
        }
        setVoucherError(result.message || "Không áp dụng được mã.");
        setAppliedVoucher(null);
        setDiscount(0);
        return false;
      }
      setVoucherCode(normalizedCode);
      setAppliedVoucher({ code: normalizedCode });
      setDiscount(Number(result?.data?.discountAmount ?? 0));
      setVoucherError("");
      try { localStorage.removeItem("pending_checkout_voucher_v1"); } catch { }
      return true;
    } catch {
      setVoucherError("Lỗi kết nối kiểm tra mã.");
      setAppliedVoucher(null);
      setDiscount(0);
      return false;
    } finally {
      setVoucherChecking(false);
    }
  };

  const onApplyVoucher = async () => applyVoucherByCode(voucherCode);

  const onRemoveVoucher = () => {
    setAppliedVoucher(null);
    setDiscount(0);
    setVoucherError("");
  };

  const onSelectCollectedVoucher = (code) => {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) return;
    setVoucherCode(normalizedCode);
    setVoucherError("");
    if (appliedVoucher) {
      setAppliedVoucher(null);
      setDiscount(0);
    }
  };

  const onOpenVoucherModal = () => {
    setDraftVoucherCode(voucherCode || "");
    setShowVoucherModal(true);
  };

  const onConfirmVoucherFromModal = async () => {
    const draftCode = String(draftVoucherCode || "").trim().toUpperCase();
    if (voucherAvailability[draftCode]?.status === "unavailable") {
      setVoucherError("Voucher này hiện không khả dụng với giỏ hàng.");
      return;
    }
    const ok = await applyVoucherByCode(draftVoucherCode);
    if (ok) setShowVoucherModal(false);
  };

  useEffect(() => {
    if (!showVoucherModal || collectedVoucherCodes.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        setCheckingVoucherList(true);
        const rows = await Promise.all(
          collectedVoucherCodes.map(async (code) => {
            try {
              const result = await previewVoucherDiscount({
                code,
                items: voucherPreviewItems(),
              });
              if (result?.status === "ERR" || result?.status === "Err") {
                if (isExpiredVoucherError(result?.message)) {
                  return { code, status: "expired", message: result?.message || "Mã đã hết hạn." };
                }
                return { code, status: "unavailable", message: result?.message || "Không khả dụng." };
              }
              return {
                code,
                status: "available",
                discountAmount: Number(result?.data?.discountAmount ?? 0),
              };
            } catch {
              return { code, status: "unknown", message: "Không thể kiểm tra lúc này." };
            }
          }),
        );

        if (cancelled) return;
        const toExpired = rows.filter((r) => r.status === "expired").map((r) => r.code);
        if (toExpired.length > 0) {
          markVouchersAsExpired(toExpired);
        }

        const nextAvailability = {};
        rows.forEach((r) => {
          if (r.status !== "expired") nextAvailability[r.code] = r;
        });
        setVoucherAvailability(nextAvailability);
      } finally {
        if (!cancelled) setCheckingVoucherList(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showVoucherModal, collectedVoucherCodes, subtotal, checkoutItems.length]);

  useEffect(() => {
    if (!showVoucherModal) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await getAllVouchers();
        if (cancelled) return;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const next = {};
        list.forEach((v) => {
          const code = String(v?.code || "").trim().toUpperCase();
          if (!code) return;
          next[code] = v;
        });
        setVoucherMetaByCode(next);
      } catch {
        if (!cancelled) setVoucherMetaByCode({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showVoucherModal]);

  useEffect(() => {
    const code = appliedVoucher?.code ? String(appliedVoucher.code).trim().toUpperCase() : "";
    if (!code) return;

    let cancelled = false;
    (async () => {
      try {
        const result = await previewVoucherDiscount({
          code,
          items: checkoutItems.map((i) => ({
            productId: String(i.productId || i._id || ""),
            price: Number(i.price || 0),
            quantity: Number(i.qty || 0),
          })),
        });
        if (cancelled) return;
        if (result?.status === "ERR" || result?.status === "Err") {
          if (isExpiredVoucherError(result?.message)) {
            markVoucherAsExpired(code);
          }
          setAppliedVoucher(null);
          setDiscount(0);
          setVoucherError(result?.message || "Mã không còn hợp lệ với giỏ hàng hiện tại.");
          return;
        }
        setDiscount(Number(result?.data?.discountAmount ?? 0));
        setVoucherError("");
      } catch {
        if (!cancelled) {
          setAppliedVoucher(null);
          setDiscount(0);
          setVoucherError("Lỗi kiểm tra mã giảm giá.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [subtotal, appliedVoucher?.code, checkoutItems]);

  useEffect(() => {
    const queryVoucherCode = new URLSearchParams(location.search).get("voucher");
    if (queryVoucherCode) {
      setVoucherCode(String(queryVoucherCode).trim().toUpperCase());
      return;
    }
    try {
      const pending = localStorage.getItem("pending_checkout_voucher_v1");
      if (pending) setVoucherCode(String(pending).trim().toUpperCase());
    } catch {
      // ignore localStorage read error
    }
  }, [location.search]);

  const shipping = 0; // Luôn miễn phí vì đã bỏ giao hàng hỏa tốc
  const total = Math.max(0, subtotal + shipping - discount);

  const validateForm = () => {
    let newErrors = {};
    if (!form.fullName?.trim()) {
      newErrors.fullName = "Vui lòng nhập họ và tên";
    } else if (form.fullName.trim().length < 2) {
      newErrors.fullName = "Họ và tên phải có ít nhất 2 ký tự";
    }

    if (!form.email?.trim()) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Email không hợp lệ";
    }

    if (!form.phone?.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại";
    } else if (!/^0\d{9,10}$/.test(form.phone.trim())) {
      newErrors.phone = "Số điện thoại phải bắt đầu bằng 0 và có 10-11 chữ số";
    }

    if (!selectedProvinceCode) newErrors.province = "Vui lòng chọn Tỉnh/Thành";
    if (!selectedDistrictCode) newErrors.district = "Vui lòng chọn Quận/Huyện";
    if (!selectedWardCode) newErrors.ward = "Vui lòng chọn Phường/Xã";
    if (!streetAddress?.trim()) newErrors.streetAddress = "Vui lòng nhập địa chỉ cụ thể";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onPlaceOrder = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      notify.warning("Vui lòng kiểm tra lại thông tin giao hàng.");
      return;
    }

    const userIdCandidate = user?._id || user?.id;
    const isLoggedIn = !!user?.login;
    const userId = isLoggedIn && isProbablyObjectId(userIdCandidate) ? userIdCandidate : null;
    const guestId = !isLoggedIn ? String(user?.id || "") : null;

    if (!userId && (!guestId || guestId.length < 6)) { notify.error("Không xác định được tài khoản. Vui lòng đăng nhập lại."); return; }
    if (paymentMethod === "wallet") {
      if (!userId) {
        notify.warning("Vui lòng đăng nhập để thanh toán bằng ví.");
        return;
      }
      if (total > 0 && (walletBalance ?? 0) < total) {
        notify.warning(
          `Số dư ví không đủ. Cần ${total.toLocaleString("vi-VN")}đ, hiện có ${(walletBalance ?? 0).toLocaleString("vi-VN")}đ.`,
        );
        return;
      }
    }
    if (checkoutItems.length === 0) { notify.warning("Giỏ hàng trống."); return; }

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
        paymentMethod:
          paymentMethod === "vnpay"
            ? "vnpay"
            : paymentMethod === "wallet"
              ? "wallet"
              : "cod",
        shippingMethod: shippingMethod === "fast" ? "fast" : "standard",
        products,
        discount,
        voucherCode: appliedVoucher ? voucherCode.trim() : null,
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
              voucherCode: appliedVoucher ? voucherCode.trim() : null,
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
          notify.error(order.vnpayBuildError);
          return;
        }
        notify.error(
          "Không nhận được liên kết thanh toán VNPay. Kiểm tra máy chủ (nhật ký lỗi), biến môi trường BE_URL / VNP_TMN_CODE trong tệp .env.",
        );
        return;
      }

      hasPlacedOrderRef.current = true;
      dispatch(removeManyFromCart(checkoutItems.map((i) => i.cartKey || i.productId)));
      persistCheckoutInfo();
      await updateProfileIfLoggedIn();

      notify.success("Đặt hàng thành công!");
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
          if (fixed) { notify.warning(`${msg}\nĐã tự cập nhật mã SKU theo kích cỡ (${cartItem?.size}). Thử thanh toán lại.`); return; }
        } catch { }

        notify.error(`${msg}\n${data?.invalidSku ? `Mã SKU đang gửi: ${data.invalidSku}\n` : ""}Các mã SKU hợp lệ: ${availableSkus.join(", ")}`);
        if (productId) dispatch(removeFromCart(productId));
        return;
      }
      notify.error(data?.stack && String(msg).includes("next") ? `${msg}\n\n${data.stack}` : msg);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (v) => `${Number(v || 0).toLocaleString("vi-VN")}đ`;

  return (
    <div className="min-h-screen font-body pb-14 pt-8 bg-[#f7f3ec]">
      <div className="mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.9fr] gap-8 items-start">
          <div className="order-2 xl:order-1">
            <div className="mb-6">
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Thanh Toán</h1>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="px-3 py-1 rounded-full bg-white/80 text-slate-500 border border-slate-200">1. Giỏ hàng</span>
                <span className="text-slate-300">›</span>
                <span className="px-3 py-1 rounded-full bg-[#ee4d2d] text-white font-semibold">2. Giao hàng & Thanh toán</span>
                <span className="text-slate-300">›</span>
                <span className="px-3 py-1 rounded-full bg-white/80 text-slate-500 border border-slate-200">3. Xác nhận</span>
              </div>
            </div>

            <form onSubmit={onPlaceOrder} className="space-y-5">
              <div className="bg-white/90 backdrop-blur-sm p-5 md:p-6 rounded-2xl border border-[#e8e4db] shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Thông tin giao hàng</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">Họ và tên</label>
                    <div className="relative">
                      <input
                        className={`w-full bg-white border ${errors.fullName ? 'border-red-500' : 'border-[#d8d5cc]'} rounded-xl px-4 py-2.5 pl-11 text-slate-700 outline-none focus:border-[#ee4d2d]`}
                        value={form.fullName}
                        onChange={(e) => {
                          setForm({ ...form, fullName: e.target.value });
                          if (errors.fullName) setErrors(prev => ({ ...prev, fullName: null }));
                        }}
                        placeholder="Nhập họ và tên"
                      />
                      <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                    {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        className={`w-full bg-white border ${errors.email ? 'border-red-500' : 'border-[#d8d5cc]'} rounded-xl px-4 py-2.5 pl-11 text-slate-700 outline-none focus:border-[#ee4d2d]`}
                        value={form.email}
                        onChange={(e) => {
                          setForm({ ...form, email: e.target.value });
                          if (errors.email) setErrors(prev => ({ ...prev, email: null }));
                        }}
                        placeholder="Nhập email"
                      />
                      <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">Địa chỉ</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <select
                        className={`w-full bg-white border ${errors.province ? 'border-red-500' : 'border-[#d8d5cc]'} rounded-xl px-3 py-2.5 text-slate-700 outline-none focus:border-[#ee4d2d]`}
                        value={selectedProvinceCode}
                        onChange={(e) => {
                          setSelectedProvinceCode(e.target.value);
                          if (errors.province) setErrors(prev => ({ ...prev, province: null }));
                        }}
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
                        className={`w-full bg-white border ${errors.district ? 'border-red-500' : 'border-[#d8d5cc]'} rounded-xl px-3 py-2.5 text-slate-700 outline-none focus:border-[#ee4d2d] disabled:bg-slate-100 disabled:text-slate-400`}
                        value={selectedDistrictCode}
                        onChange={(e) => {
                          setSelectedDistrictCode(e.target.value);
                          if (errors.district) setErrors(prev => ({ ...prev, district: null }));
                        }}
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
                        className={`w-full bg-white border ${errors.ward ? 'border-red-500' : 'border-[#d8d5cc]'} rounded-xl px-3 py-2.5 text-slate-700 outline-none focus:border-[#ee4d2d] disabled:bg-slate-100 disabled:text-slate-400`}
                        value={selectedWardCode}
                        onChange={(e) => {
                          setSelectedWardCode(e.target.value);
                          if (errors.ward) setErrors(prev => ({ ...prev, ward: null }));
                        }}
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
                        className={`w-full bg-white border ${errors.streetAddress ? 'border-red-500' : 'border-[#d8d5cc]'} rounded-xl px-4 py-2.5 pl-11 text-slate-700 outline-none focus:border-[#ee4d2d]`}
                        value={streetAddress}
                        onChange={(e) => {
                          setStreetAddress(e.target.value);
                          if (errors.streetAddress) setErrors(prev => ({ ...prev, streetAddress: null }));
                        }}
                        placeholder="Địa chỉ cụ thể"
                      />
                      <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                    {(errors.province || errors.district || errors.ward || errors.streetAddress) && (
                      <p className="text-red-500 text-xs mt-1">
                        {[errors.province, errors.district, errors.ward, errors.streetAddress].filter(Boolean).join(" • ")}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">Số điện thoại</label>
                    <div className="relative">
                      <input
                        type="text"
                        className={`w-full bg-white border ${errors.phone ? 'border-red-500' : 'border-[#d8d5cc]'} rounded-xl px-4 py-2.5 pl-11 text-slate-700 outline-none focus:border-[#ee4d2d]`}
                        value={form.phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, ''); // Ensure only numbers
                          setForm({ ...form, phone: val });
                          if (errors.phone) setErrors(prev => ({ ...prev, phone: null }));
                        }}
                        placeholder="Nhập số điện thoại"
                      />
                      <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">Ghi chú đơn hàng</label>
                    <textarea
                      rows="3"
                      className="w-full bg-white border border-[#d8d5cc] rounded-xl px-4 py-2.5 text-slate-700 outline-none focus:border-[#ee4d2d] resize-none custom-scrollbar"
                      value={form.note}
                      onChange={(e) => setForm({ ...form, note: e.target.value })}
                      placeholder="Ghi chú thêm về đơn hàng hoặc thời gian giao nhận..."
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e8e4db] bg-[#fafafa] shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={onOpenVoucherModal}
                  className="w-full flex items-center justify-between gap-4 px-5 py-5 hover:bg-white/90 transition-colors text-left border-b border-[#eee]"
                >
                  <span className="flex items-center gap-3.5 min-w-0">
                    <FaTicketAlt className="text-[#ee4d2d] shrink-0 text-2xl" aria-hidden />
                    <span className="text-lg font-semibold text-slate-800 truncate">
                      Voucher shop
                      {discount > 0 && (
                        <span className="ml-2 text-base font-semibold text-green-600">
                          Đã giảm {formatMoney(discount)}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="text-lg font-semibold text-[#0088ff] shrink-0">Chọn Voucher</span>
                </button>
                {(voucherError || expiredVoucherCodes.length > 0 || discount > 0) && (
                  <div className="px-4 py-2 bg-white/80 space-y-1">
                    {discount > 0 && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveVoucher();
                          }}
                          className="text-xs font-semibold text-slate-500 hover:text-[#ee4d2d]"
                        >
                          Bỏ mã
                        </button>
                      </div>
                    )}
                    {voucherError && <p className="text-xs font-medium text-red-500">{voucherError}</p>}
                    {expiredVoucherCodes.length > 0 && (
                      <p className="text-[11px] text-slate-400">
                        {expiredVoucherCodes.length} mã hết hạn đã ẩn khỏi danh sách.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white/90 backdrop-blur-sm p-5 md:p-6 rounded-2xl border border-[#e8e4db] shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Thông tin thanh toán</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <FaTruck className="text-[#ee4d2d]" /> Vận chuyển
                    </h3>
                    <div className="space-y-2.5">
                      <div className="block p-4 rounded-xl border border-[#ee4d2d] bg-[#fff2ee]">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">Giao hàng tiêu chuẩn</span>
                          <span className="text-sm font-bold text-green-600">Miễn phí</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Từ 2-4 ngày làm việc</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <FaCreditCard className="text-[#ee4d2d]" /> Thanh toán
                    </h3>
                    <div className="space-y-2.5">
                      <label className={`block p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === "cod" ? "border-[#ee4d2d] bg-[#fff2ee]" : "border-[#e4e1d8] bg-white"}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">Thanh toán khi nhận hàng</span>
                          <FaMoneyBillWave className={paymentMethod === "cod" ? "text-[#ee4d2d]" : "text-slate-400"} />
                        </div>
                        <input type="radio" className="hidden" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                      </label>
                      <label className={`block p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === "vnpay" ? "border-[#ee4d2d] bg-[#fff2ee]" : "border-[#e4e1d8] bg-white"}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">Thanh toán qua VNPay</span>
                          <span className="text-xs font-bold text-[#ee4d2d]">VNPAY</span>
                        </div>
                        <input type="radio" className="hidden" value="vnpay" checked={paymentMethod === "vnpay"} onChange={() => setPaymentMethod("vnpay")} />
                      </label>
                      {(() => {
                        const walletOk = isLoggedIn && (total <= 0 || (walletBalance !== null && walletBalance >= total));
                        return (
                          <label className={`block p-3 rounded-xl border transition-all ${!isLoggedIn || !walletOk ? "border-[#ece8df] bg-slate-50 opacity-70 cursor-not-allowed" : paymentMethod === "wallet" ? "border-[#ee4d2d] bg-[#fff2ee] cursor-pointer" : "border-[#e4e1d8] bg-white cursor-pointer"}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800">Ví SNEAKERCONVERSE</span>
                              <FaWallet className={paymentMethod === "wallet" ? "text-[#ee4d2d]" : "text-slate-400"} />
                              <input
                                type="radio"
                                className="hidden"
                                value="wallet"
                                checked={paymentMethod === "wallet"}
                                disabled={!isLoggedIn || !walletOk}
                                onChange={() => {
                                  if (isLoggedIn && walletOk) setPaymentMethod("wallet");
                                }}
                              />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {!isLoggedIn
                                ? "Đăng nhập để thanh toán bằng ví."
                                : walletBalance === null
                                  ? "Đang tải số dư ví..."
                                  : total > 0 && walletBalance < total
                                    ? `Không đủ số dư (còn ${walletBalance.toLocaleString("vi-VN")}đ).`
                                    : `Số dư: ${walletBalance.toLocaleString("vi-VN")}đ`}
                            </p>
                          </label>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

            </form>
          </div>

          <aside className="order-1 xl:order-2 xl:sticky xl:top-6">
            <div className="bg-white/90 backdrop-blur-sm border border-[#e8e4db] rounded-2xl p-5 shadow-md">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Sản phẩm</h2>
              <div className="rounded-xl border border-[#ece7dd] bg-white overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-[#faf8f3] text-xs font-semibold text-slate-500">
                  <span className="col-span-6">Sản phẩm</span>
                  <span className="col-span-2 text-right">Đơn giá</span>
                  <span className="col-span-2 text-center">Số lượng</span>
                  <span className="col-span-2 text-right">Thành tiền</span>
                </div>
                <div className="max-h-[290px] overflow-y-auto custom-scrollbar">
                  {checkoutItems.map((item, index) => (
                    <div key={item.productId || index} className="grid grid-cols-12 gap-2 px-4 py-3 border-t border-[#f0ece3] first:border-t-0">
                      <div className="col-span-12 md:col-span-6 flex items-start gap-3">
                        <div className="w-14 h-14 rounded-md overflow-hidden border border-[#ebe7de] bg-white shrink-0">
                          <img
                            src={item.image ? (item.image.startsWith("http") ? item.image : `http://localhost:3002/uploads/${item.image.startsWith("/") ? item.image.slice(1) : item.image}`) : "https://via.placeholder.com/80/f0f0f0/999?text=No+Image"}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 line-clamp-2">{item.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Phân loại: {item.size || "Mặc định"}</p>
                        </div>
                      </div>
                      <div className="hidden md:flex col-span-2 items-center justify-end text-sm text-slate-700">{formatMoney(item.price || 0)}</div>
                      <div className="hidden md:flex col-span-2 items-center justify-center text-sm text-slate-700">{item.qty}</div>
                      <div className="hidden md:flex col-span-2 items-center justify-end text-sm font-bold text-slate-800">{formatMoney((item.price || 0) * (item.qty || 0))}</div>
                      <div className="md:hidden col-span-12 flex items-center justify-between text-sm">
                        <span className="text-slate-500">{formatMoney(item.price || 0)} x {item.qty}</span>
                        <span className="font-bold text-slate-800">{formatMoney((item.price || 0) * (item.qty || 0))}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 bg-[#f8fbff] border-t border-[#e8edf6] text-xs text-slate-600 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold">Phương thức vận chuyển:</span>
                    <span className="text-right">Giao hàng tiêu chuẩn (Miễn phí)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Voucher của shop:</span>
                    <span className="text-[#ee4d2d] font-semibold">{discount > 0 ? `Đã giảm ${formatMoney(discount)}` : "Chưa áp dụng"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#efebe3] space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Tạm tính</span>
                  <span className="font-semibold text-slate-800">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Phí vận chuyển</span>
                  <span className="font-semibold text-slate-800">{shipping === 0 ? "Miễn phí" : formatMoney(shipping)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá</span>
                    <span className="font-semibold">-{formatMoney(discount)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-[#efebe3]">
                <div className="flex justify-between items-end">
                  <span className="text-base font-semibold text-slate-700">Tổng tiền</span>
                  <span className="text-3xl leading-none font-black text-[#ee4d2d]">{formatMoney(total)}</span>
                </div>
              </div>

              <button
                onClick={onPlaceOrder}
                disabled={checkoutItems.length === 0 || loading}
                className="w-full mt-5 h-11 rounded-full bg-[#f6a37e] hover:bg-[#ee8c61] text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FaShieldAlt />}
                {loading
                  ? "Đang xử lý..."
                  : paymentMethod === "vnpay"
                    ? "Thanh Toán VNPay"
                    : paymentMethod === "wallet"
                      ? "Thanh Toán Bằng Ví"
                      : "Đặt hàng"}
              </button>
              <Link to="/cart" className="mt-3 inline-flex w-full items-center justify-center text-sm font-semibold text-slate-500 hover:text-slate-800">
                Quay lại giỏ hàng
              </Link>
            </div>
          </aside>
        </div>
      </div>
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-lg shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Chọn Voucher</h3>
              <button
                type="button"
                onClick={() => setShowVoucherModal(false)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-800"
              >
                Đóng
              </button>
            </div>
            <div className="p-5">
              <div className="flex gap-2 mb-4">
                <input
                  className="flex-1 border border-slate-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-[#ee4d2d] uppercase"
                  placeholder="Nhập mã voucher"
                  value={draftVoucherCode}
                  onChange={(e) => setDraftVoucherCode(e.target.value)}
                />
                <button
                  type="button"
                  onClick={onConfirmVoucherFromModal}
                  disabled={voucherChecking || !String(draftVoucherCode || "").trim()}
                  className="px-4 rounded-md bg-[#ee4d2d] text-white text-sm font-bold hover:bg-[#d84325] disabled:opacity-50"
                >
                  ÁP DỤNG
                </button>
              </div>

              <p className="text-sm font-semibold text-slate-700 mb-2">Mã đã thu thập</p>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {checkingVoucherList && (
                  <p className="text-xs text-slate-500">Đang kiểm tra khả dụng voucher...</p>
                )}
                {collectedVoucherCodes.length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa có voucher khả dụng.</p>
                ) : (
                  collectedVoucherCodes.map((code) => {
                    const selected = String(draftVoucherCode || "").trim().toUpperCase() === code;
                    const info = voucherAvailability[code];
                    const meta = voucherMetaByCode[code];
                    const unavailable = info?.status === "unavailable";
                    const unknown = info?.status === "unknown";
                    const dimmed = unavailable || unknown;
                    const estimatedDiscount = info?.status === "available" ? Number(info?.discountAmount || 0) : 0;
                    const discountLabel =
                      meta?.discountType === "percent"
                        ? `Giảm ${Number(meta?.discountValue || 0)}%`
                        : meta?.discountValue != null
                          ? `Giảm ${formatMoney(meta?.discountValue)}`
                          : null;
                    const minOrderLabel =
                      meta?.minOrderAmount != null && Number(meta.minOrderAmount) > 0
                        ? `Đơn tối thiểu ${formatMoney(meta.minOrderAmount)}`
                        : null;
                    const expiryLabel =
                      meta?.endDate
                        ? `HSD: ${new Date(meta.endDate).toLocaleDateString("vi-VN")}`
                        : null;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          if (!dimmed) setDraftVoucherCode(code);
                        }}
                        disabled={dimmed}
                        className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors ${
                          dimmed
                            ? "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                            : selected
                              ? "border-[#ee4d2d] bg-[#fff3ef]"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-800">{code}</span>
                          {unavailable ? (
                            <span className="text-[11px] font-semibold text-slate-500">Không khả dụng</span>
                          ) : unknown ? (
                            <span className="text-[11px] font-semibold text-slate-500">Tạm thời không khả dụng</span>
                          ) : estimatedDiscount > 0 ? (
                            <span className="text-[11px] font-semibold text-green-700">Giảm {formatMoney(estimatedDiscount)}</span>
                          ) : null}
                        </div>
                        {(meta?.description || discountLabel || minOrderLabel || expiryLabel) && (
                          <div className="mt-1 space-y-0.5">
                            {meta?.description && <p className="text-[11px] text-slate-500 line-clamp-2">{meta.description}</p>}
                            {(discountLabel || minOrderLabel || expiryLabel) && (
                              <p className="text-[11px] text-slate-500">
                                {[discountLabel, minOrderLabel, expiryLabel].filter(Boolean).join(" • ")}
                              </p>
                            )}
                          </div>
                        )}
                        {dimmed && (
                          <p className="text-[11px] text-slate-500 mt-1">
                            {unavailable
                              ? info?.message || "Voucher không áp dụng cho giỏ hàng này."
                              : info?.message || "Không thể kiểm tra voucher lúc này."}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowVoucherModal(false)}
                className="px-5 h-10 rounded-md border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
              >
                TRỞ LẠI
              </button>
              <button
                type="button"
                onClick={onConfirmVoucherFromModal}
                disabled={
                  voucherChecking ||
                  !String(draftVoucherCode || "").trim() ||
                  voucherAvailability[String(draftVoucherCode || "").trim().toUpperCase()]?.status === "unavailable"
                }
                className="px-5 h-10 rounded-md bg-[#ee4d2d] text-white font-bold hover:bg-[#d84325] disabled:opacity-50"
              >
                ĐỒNG Ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckOut;
