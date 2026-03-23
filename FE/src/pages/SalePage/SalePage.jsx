import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Product from "../../components/Product/Product";
import { fetchProducts } from "../../api";
import { FaBolt, FaFire, FaClock } from "react-icons/fa";

const SalePage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState({
        hours: 12,
        minutes: 45,
        seconds: 30
    });

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
                if (prev.minutes > 0) return { ...prev, seconds: 59, minutes: prev.minutes - 1 };
                if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
                return prev;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetchProducts({ limit: 40, page: 0, isSale: true });
                const list = res?.data ?? [];
                setProducts(list);
            } catch (err) {
                console.error("Load sale products error:", err);
            }
            setLoading(false);
        };
        load();
    }, []);

    return (
        <div className="bg-background-light min-h-screen font-body pb-20 pt-24">
            {/* HERO PROMO */}
            <header className="relative bg-slate-900 overflow-hidden py-24 mb-16">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/30 via-orange-500/20 to-transparent z-0 animate-pulse"></div>
                <div className="container mx-auto px-4 max-w-7xl relative z-10">
                    <div className="max-w-3xl">
                        <span className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6 shadow-xl shadow-red-500/30">
                            <FaBolt className="animate-bounce" /> Limited Time Offer
                        </span>
                        <h1 className="text-5xl md:text-7xl font-display font-black text-white leading-tight mb-8 tracking-tighter">
                            FLASH <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">SALE.</span><br />
                            UP TO 50% OFF.
                        </h1>

                        <div className="flex flex-wrap items-center gap-10">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="bg-white/10 backdrop-blur-md w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white border border-white/10 shadow-xl">
                                        {timeLeft.hours.toString().padStart(2, '0')}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Hours</span>
                                </div>
                                <span className="text-2xl font-black text-red-500 animate-pulse">:</span>
                                <div className="flex flex-col items-center">
                                    <div className="bg-white/10 backdrop-blur-md w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white border border-white/10 shadow-xl">
                                        {timeLeft.minutes.toString().padStart(2, '0')}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Mins</span>
                                </div>
                                <span className="text-2xl font-black text-red-500 animate-pulse">:</span>
                                <div className="flex flex-col items-center">
                                    <div className="bg-white/10 backdrop-blur-md w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white border border-white/10 shadow-xl">
                                        {timeLeft.seconds.toString().padStart(2, '0')}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Secs</span>
                                </div>
                            </div>
                            
                            <p className="text-slate-400 font-medium text-lg max-w-xs border-l-2 border-red-600/30 pl-6">
                                Cơ hội cuối cùng để sở hữu những siêu phẩm với mức giá không tưởng.
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 max-w-7xl">
                <div className="flex items-center justify-between mb-12">
                    <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <FaFire className="text-orange-500" /> Hot Deals
                    </h2>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                        <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
                        <span>/</span>
                        <span className="text-slate-900">Sale 50%</span>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-white rounded-3xl h-[420px] shadow-sm animate-pulse border border-slate-100 overflow-hidden">
                                <div className="h-[280px] bg-slate-100"></div>
                                <div className="p-6 space-y-4">
                                    <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                                    <div className="h-6 bg-slate-100 rounded w-3/4"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {products.map((p) => (
                            <Product key={p._id} product={p} />
                        ))}
                    </div>
                )}

                {!loading && products.length === 0 && (
                    <div className="text-center py-32 bg-white rounded-[3rem] shadow-sm border border-slate-100">
                        <p className="text-slate-500 text-lg font-bold">Chương trình khuyến mãi tạm thời kết thúc. Hãy quay lại sau nhé!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalePage;
