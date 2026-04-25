import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { FaUser, FaLock, FaShoppingBag, FaCamera, FaChevronRight, FaSignOutAlt, FaWallet, FaArrowUp, FaArrowDown } from "react-icons/fa";
import {
    updateCustomerById,
    getOrdersByUser,
    getWalletBalance,
    getWalletTransactions,
    createWalletVnpayTopupUrl,
    createWalletBankTopupRequest,
    markWalletBankTopupSent,
} from "../../api";
import { updateUserInfo, clearUser } from "../../redux/user";
import notify from "../../utils/notify";

const ProfilePage = () => {
    const user = useSelector((state) => state.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const [activeTab, setActiveTab] = useState("info");
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState([]);

    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        address: user?.address || "",
    });

    const [message, setMessage] = useState({ type: "", text: "" });
    const [walletBalance, setWalletBalance] = useState(null);
    const [walletTx, setWalletTx] = useState([]);
    const [walletLoading, setWalletLoading] = useState(false);
    const [topupAmountVnpay, setTopupAmountVnpay] = useState("100000");
    const [showAllWalletTx, setShowAllWalletTx] = useState(false);
    const [topupSubmitting, setTopupSubmitting] = useState(false);
    const [bankAmount, setBankAmount] = useState("100000");
    const [bankCreating, setBankCreating] = useState(false);
    const [bankConfirming, setBankConfirming] = useState(false);
    const [bankRequest, setBankRequest] = useState(null);

    // Handle tab switching from query params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");
        if (tab && ["info", "wallet", "security"].includes(tab)) {
            setActiveTab(tab);
        }
    }, [location]);

    useEffect(() => {
        if (!user?.login) {
            navigate("/login");
            return;
        }

        // Fetch some recent orders
        const fetchOrders = async () => {
            try {
                const res = await getOrdersByUser(user.id || user._id, 1, 3);
                setOrders(res?.data || []);
            } catch (err) {
                console.error("Failed to fetch orders", err);
            }
        };
        fetchOrders();
    }, [user, navigate]);

    useEffect(() => {
        if (!user?.login || activeTab !== "wallet") return;
        let cancelled = false;
        (async () => {
            setWalletLoading(true);
            try {
                const [bal, txRes] = await Promise.all([
                    getWalletBalance(),
                    getWalletTransactions(1, 30),
                ]);
                if (!cancelled) {
                    setWalletBalance(
                        typeof bal?.balance === "number"
                            ? bal.balance
                            : Number(bal?.balance) || 0,
                    );
                    setWalletTx(Array.isArray(txRes?.data) ? txRes.data : []);
                }
            } catch {
                if (!cancelled) {
                    setWalletBalance(0);
                    setWalletTx([]);
                }
            } finally {
                if (!cancelled) setWalletLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.login, activeTab]);

    useEffect(() => {
        if (activeTab !== "wallet") return;
        const params = new URLSearchParams(location.search);
        if (params.get("topup") === "1") {
            const amt = params.get("amount");
            notify.success(
                amt
                    ? `Nạp ví thành công: ${Number(amt).toLocaleString("vi-VN")}đ`
                    : "Nạp ví thành công.",
            );
            navigate("/profile?tab=wallet", { replace: true });
        }
    }, [activeTab, location.search, navigate]);

    const handleVnpayTopup = async () => {
        const n = Number(String(topupAmountVnpay).replace(/\D/g, ""));
        if (!Number.isFinite(n) || n < 10000) {
            notify.warning("Số tiền tối thiểu 10.000đ.");
            return;
        }
        setTopupSubmitting(true);
        try {
            const base = window.location.origin;
            const data = await createWalletVnpayTopupUrl({
                amount: n,
                returnUrl: `${base}/profile?tab=wallet`,
                cancelUrl: `${base}/profile?tab=wallet`,
            });
            if (data?.paymentUrl) window.location.href = data.paymentUrl;
            else notify.error("Không nhận được liên kết thanh toán.");
        } catch (err) {
            notify.error(err?.response?.data?.message || "Không tạo được liên kết VNPay.");
        } finally {
            setTopupSubmitting(false);
        }
    };


    const handleCreateBankRequest = async () => {
        const n = Number(String(bankAmount).replace(/\D/g, ""));
        if (!Number.isFinite(n) || n < 10000) {
            notify.warning("Số tiền tối thiểu 10.000đ.");
            return;
        }
        setBankCreating(true);
        try {
            const data = await createWalletBankTopupRequest(n);
            setBankRequest(data);
            notify.success(
                "Đã tạo yêu cầu. Chuyển khoản đúng số tiền và nội dung, sau đó bấm xác nhận để gửi admin duyệt.",
            );
        } catch (err) {
            notify.error(err?.response?.data?.message || "Không tạo được yêu cầu nạp CK.");
        } finally {
            setBankCreating(false);
        }
    };

    const handleConfirmBankSent = async () => {
        const id = bankRequest?.topUp?._id;
        if (!id) return;
        setBankConfirming(true);
        try {
            await markWalletBankTopupSent(id);
            notify.success("Đã gửi xác nhận chuyển khoản. Vui lòng chờ admin duyệt.");
            setBankRequest(null);
        } catch (err) {
            notify.error(err?.response?.data?.message || "Không xác nhận được.");
        } finally {
            setBankConfirming(false);
        }
    };


    const displayedWalletTx = showAllWalletTx ? walletTx : walletTx.slice(0, 3);

    const handleInfoUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: "", text: "" });

        try {
            const res = await updateCustomerById({
                ...formData,
                id: user.id || user._id
            });

            if (res?.status === "OK" || res?.success) {
                dispatch(updateUserInfo(formData));
                setMessage({ type: "success", text: "Cập nhật thông tin thành công!" });
            } else {
                setMessage({ type: "error", text: res?.message || "Có lỗi xảy ra." });
            }
        } catch (err) {
            setMessage({ type: "error", text: "Lỗi kết nối máy chủ." });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        dispatch(clearUser());
        navigate("/");
    };

    return (
        <div className="min-h-screen bg-slate-50 pt-28 pb-20 font-body">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* LEFT SIDEBAR */}
                    <div className="w-full lg:w-1/3">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden sticky top-28">
                            <div className="p-8 text-center border-b border-slate-50">
                                <div className="relative inline-block mb-4">
                                    <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border-4 border-white shadow-lg overflow-hidden">
                                        {user?.avatar ? (
                                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <FaUser size={40} />
                                        )}
                                    </div>
                                    <button className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                                        <FaCamera size={12} />
                                    </button>
                                </div>
                                <h2 className="text-xl font-display font-black text-slate-900">{user?.name}</h2>
                                <p className="text-slate-400 text-sm font-medium">{user?.email}</p>
                            </div>

                            <div className="p-4 flex flex-col gap-1">
                                <button
                                    onClick={() => setActiveTab("info")}
                                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-sm ${activeTab === "info" ? "bg-primary text-white shadow-lg shadow-primary/25" : "text-slate-500 hover:bg-slate-50"}`}
                                >
                                    <FaUser size={16} /> Thông tin cá nhân
                                </button>
                                <button
                                    onClick={() => setActiveTab("wallet")}
                                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-sm ${activeTab === "wallet" ? "bg-primary text-white shadow-lg shadow-primary/25" : "text-slate-500 hover:bg-slate-50"}`}
                                >
                                    <FaWallet size={16} /> Ví SNEAKERCONVERSE
                                </button>
                                <button
                                    onClick={() => setActiveTab("security")}
                                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-sm ${activeTab === "security" ? "bg-primary text-white shadow-lg shadow-primary/25" : "text-slate-500 hover:bg-slate-50"}`}
                                >
                                    <FaLock size={16} /> Bảo mật
                                </button>
                                <button
                                    onClick={() => navigate("/orders")}
                                    className="flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-sm text-slate-500 hover:bg-slate-50"
                                >
                                    <FaShoppingBag size={16} /> Lịch sử đơn hàng
                                </button>
                                <div className="h-px bg-slate-100 my-2 mx-6"></div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-sm text-red-500 hover:bg-red-50"
                                >
                                    <FaSignOutAlt size={16} /> Đăng xuất
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT CONTENT */}
                    <div className="w-full lg:w-2/3 min-h-[600px]">
                        {message.text && (
                            <div className={`mb-6 p-4 rounded-2xl font-bold text-sm ${message.type === "success" ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                                {message.text}
                            </div>
                        )}

                        {activeTab === "info" && (
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="mb-8">
                                    <h3 className="text-2xl font-display font-black text-slate-900 mb-2">Thông tin cá nhân</h3>
                                    <p className="text-slate-400 text-sm">Cập nhật thông tin chi tiết để chúng tôi phục vụ bạn tốt hơn.</p>
                                </div>

                                <form onSubmit={handleInfoUpdate} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-slate-700"
                                                placeholder="Nhập tên của bạn"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                disabled
                                                className="w-full px-6 py-4 bg-slate-100 border border-transparent rounded-2xl text-slate-400 font-bold cursor-not-allowed"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-slate-700"
                                                placeholder="Số điện thoại của bạn"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ</label>
                                            <input
                                                type="text"
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-slate-700"
                                                placeholder="Địa chỉ giao hàng"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="bg-primary text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest text-sm"
                                        >
                                            {loading ? "Đang lưu..." : "Lưu thay đổi"}
                                        </button>
                                    </div>
                                </form>

                                <div className="mt-12 pt-12 border-t border-slate-50">
                                    <div className="flex items-center justify-between mb-6">
                                        <h4 className="text-lg font-display font-black text-slate-900">Đơn hàng gần đây</h4>
                                        <button onClick={() => navigate("/orders")} className="text-primary font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                                            Tất cả <FaChevronRight size={10} />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {orders.length > 0 ? orders.map(order => (
                                            <div key={order._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary/20 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm font-black text-xs">#{order._id.slice(-4).toUpperCase()}</div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">Đơn hàng {order.status === "pending" ? "chờ xử lý" : order.status}</p>
                                                        <p className="text-xs text-slate-400 font-medium">{new Date(order.createdAt).toLocaleDateString("vi-VN")}</p>
                                                    </div>
                                                </div>
                                                <p className="font-black text-slate-900 text-sm">{(order.totalPrice || 0).toLocaleString()}₫</p>
                                            </div>
                                        )) : (
                                            <p className="text-center py-8 text-slate-400 font-bold italic text-sm bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                                Bạn chưa có đơn hàng nào
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: WALLET */}
                        {activeTab === "wallet" && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-[80px] -ml-24 -mb-24"></div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-12">
                                            <div>
                                                <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Số dư hiện tại</p>
                                                <h3 className="text-4xl md:text-5xl font-display font-black text-white">
                                                    {walletLoading && walletBalance === null ? "…" : (walletBalance ?? 0).toLocaleString("vi-VN")}₫
                                                </h3>
                                            </div>
                                            <div className="w-16 h-10 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center text-white/40 italic font-black">VISA</div>
                                        </div>
                                        <p className="text-slate-400 text-sm font-medium max-w-md">
                                            Nạp qua VNPay; hoàn hàng / hoàn hủy đơn cũng được cộng vào ví.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8">
                                        <h4 className="font-black text-slate-900 mb-2 flex items-center gap-2">
                                            <span className="text-primary">●</span> Nạp qua VNPay
                                        </h4>
                                        <p className="text-xs text-slate-500 mb-4">Chuyển hướng sang cổng thanh toán; tiền vào ví khi giao dịch thành công.</p>
                                        <div className="flex flex-wrap gap-3 items-end">
                                            <div className="flex-1 min-w-[140px]">
                                                <label className="text-xs font-bold text-slate-400 uppercase">Số tiền (đ)</label>
                                                <input
                                                    type="number"
                                                    min={10000}
                                                    step={1000}
                                                    value={topupAmountVnpay}
                                                    onChange={(e) => setTopupAmountVnpay(e.target.value)}
                                                    className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-800"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                disabled={topupSubmitting}
                                                onClick={handleVnpayTopup}
                                                className="px-6 py-3 rounded-xl bg-slate-900 text-white font-black text-sm hover:bg-primary transition-colors disabled:opacity-50"
                                            >
                                                {topupSubmitting ? "…" : "Thanh toán VNPay"}
                                            </button>
                                        </div>
                                    </div>


                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8">
                                        <h4 className="font-black text-slate-900 mb-2 flex items-center gap-2">
                                            <span className="text-primary">●</span> Nạp chuyển khoản
                                        </h4>
                                        <p className="text-xs text-slate-500 mb-4">
                                            Tạo mã nội dung, chuyển đúng số tiền rồi bấm &quot;Đã chuyển khoản&quot; để gửi admin xác nhận.
                                        </p>
                                        {!bankRequest ? (
                                            <div className="flex flex-wrap gap-3 items-end">
                                                <div className="flex-1 min-w-[140px]">
                                                    <label className="text-xs font-bold text-slate-400 uppercase">Số tiền (đ)</label>
                                                    <input
                                                        type="number"
                                                        min={10000}
                                                        step={1000}
                                                        value={bankAmount}
                                                        onChange={(e) => setBankAmount(e.target.value)}
                                                        className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-800"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={bankCreating}
                                                    onClick={handleCreateBankRequest}
                                                    className="px-6 py-3 rounded-xl bg-slate-900 text-white font-black text-sm hover:bg-primary transition-colors disabled:opacity-50"
                                                >
                                                    {bankCreating ? "…" : "Tạo mã nạp"}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 rounded-2xl bg-slate-50 border border-slate-100 p-5">
                                                <p className="text-sm font-bold text-slate-800">
                                                    Số tiền:{" "}
                                                    <span className="text-primary">
                                                        {Number(bankRequest.topUp?.amount || 0).toLocaleString("vi-VN")}đ
                                                    </span>
                                                </p>
                                                <div className="text-sm text-slate-700 space-y-1">
                                                    <p>
                                                        <span className="font-bold text-slate-500">Ngân hàng:</span>{" "}
                                                        {bankRequest.bank?.bankName || "—"}
                                                    </p>
                                                    <p>
                                                        <span className="font-bold text-slate-500">Số TK:</span>{" "}
                                                        <code className="bg-white px-2 py-0.5 rounded border border-slate-200">
                                                            {bankRequest.bank?.accountNumber || "—"}
                                                        </code>
                                                    </p>
                                                    <p>
                                                        <span className="font-bold text-slate-500">Chủ TK:</span>{" "}
                                                        {bankRequest.bank?.accountOwner || "—"}
                                                    </p>
                                                    {bankRequest.bank?.branch ? (
                                                        <p>
                                                            <span className="font-bold text-slate-500">Chi nhánh:</span>{" "}
                                                            {bankRequest.bank.branch}
                                                        </p>
                                                    ) : null}
                                                    <p>
                                                        <span className="font-bold text-slate-500">Nội dung CK:</span>{" "}
                                                        <code className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 font-bold">
                                                            {bankRequest.topUp?.referenceCode || "—"}
                                                        </code>
                                                    </p>
                                                    {bankRequest.bank?.note ? (
                                                        <p className="text-xs text-slate-500 italic">{bankRequest.bank.note}</p>
                                                    ) : null}
                                                </div>
                                                <div className="flex flex-wrap gap-3 pt-2">
                                                    <button
                                                        type="button"
                                                        disabled={bankConfirming}
                                                        onClick={handleConfirmBankSent}
                                                        className="px-6 py-3 rounded-xl bg-green-600 text-white font-black text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {bankConfirming ? "…" : "Đã chuyển khoản — gửi admin duyệt"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={bankConfirming}
                                                        onClick={() => setBankRequest(null)}
                                                        className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white"
                                                    >
                                                        Hủy
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                </div>

                                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-10">
                                    <div className="mb-8">
                                        <h3 className="text-2xl font-display font-black text-slate-900 mb-2">Lịch sử giao dịch</h3>
                                        <p className="text-slate-400 text-sm">Theo dõi các hoạt động nạp tiền và thanh toán gần đây.</p>
                                    </div>
                                    <div className="space-y-1">
                                        {walletLoading && walletTx.length === 0 ? (
                                            <p className="text-center py-8 text-slate-400 font-bold text-sm">Đang tải...</p>
                                        ) : walletTx.length === 0 ? (
                                            <p className="text-center py-8 text-slate-400 font-bold text-sm italic">Chưa có giao dịch</p>
                                        ) : (
                                            displayedWalletTx.map((tx) => {
                                                const oid = tx.orderId?._id || tx.orderId;
                                                const shortId = oid ? String(oid).slice(-6).toUpperCase() : "";
                                                const title =
                                                    tx.type === "return_refund"
                                                        ? `Hoàn tiền hoàn hàng${shortId ? ` · #${shortId}` : ""}`
                                                        : tx.type === "order_payment"
                                                          ? `Thanh toán đơn bằng ví${shortId ? ` · #${shortId}` : ""}`
                                                          : tx.type === "order_cancel_refund"
                                                            ? `Hoàn ví (hủy đơn)${shortId ? ` · #${shortId}` : ""}`
                                                            : tx.type === "topup_vnpay"
                                                              ? "Nạp tiền VNPay"
                                                              : tx.type === "topup_bank"
                                                                ? "Nạp tiền chuyển khoản"
                                                                : (tx.note || "Giao dịch ví");
                                                const amt = Number(tx.amount) || 0;
                                                const when = tx.createdAt
                                                    ? new Date(tx.createdAt).toLocaleString("vi-VN")
                                                    : "";
                                                const credit =
                                                    tx.type === "return_refund" ||
                                                    tx.type === "order_cancel_refund" ||
                                                    tx.type === "topup_vnpay" ||
                                                    tx.type === "topup_bank";
                                                return (
                                                    <div key={tx._id} className="flex items-center justify-between p-5 hover:bg-slate-50 rounded-2xl transition-colors group">
                                                        <div className="flex items-center gap-5">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${credit ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"}`}>
                                                                {credit ? <FaArrowUp /> : <FaArrowDown />}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors">{title}</p>
                                                                <p className="text-xs text-slate-400 font-medium">{when}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`font-black text-sm ${credit ? "text-green-600" : "text-slate-900"}`}>
                                                                {credit ? "+" : "−"}
                                                                {amt.toLocaleString("vi-VN")}₫
                                                            </p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thành công</p>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    {walletTx.length > 3 && (
                                        <div className="mt-4 flex justify-center">
                                            <button
                                                type="button"
                                                onClick={() => setShowAllWalletTx((prev) => !prev)}
                                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
                                            >
                                                {showAllWalletTx ? "Ẩn bớt" : "Xem thêm"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB: SECURITY */}
                        {activeTab === "security" && (
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="mb-8">
                                    <h3 className="text-2xl font-display font-black text-slate-900 mb-2">Bảo mật</h3>
                                    <p className="text-slate-400 text-sm">Quản lý mật khẩu để bảo vệ tài khoản của bạn.</p>
                                </div>
                                <form className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu hiện tại</label>
                                        <input type="password" className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary transition-all outline-none font-bold text-slate-700" placeholder="••••••••" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu mới</label>
                                            <input type="password" className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary transition-all outline-none font-bold text-slate-700" placeholder="••••••••" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Xác nhận mật khẩu</label>
                                            <input type="password" className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary transition-all outline-none font-bold text-slate-700" placeholder="••••••••" />
                                        </div>
                                    </div>
                                    <div className="pt-4">
                                        <button className="bg-slate-900 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-slate-900/20 hover:bg-primary hover:shadow-primary/25 transition-all uppercase tracking-widest text-sm">Đổi mật khẩu</button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
