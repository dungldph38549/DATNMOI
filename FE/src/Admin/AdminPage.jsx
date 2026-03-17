import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Order from "./Order";
import Products from "./Products";
import Categories from "./Categories";
import Brands from "./Brands";
import Dashboard from "./Dashboard";
import Users from "./Users";
import Vouchers from "./Vouchers";
// import OrderReturn from "./OrderReturn";
// import Comments from "./Comments";
// import InventoryManagement from "./InventoryManagement";
// import StaffManagement from "./StaffManagement";
import { Link, useNavigate } from "react-router-dom";
import { clearUser } from "../redux/user";

// ================================================================
// Design tokens — SneakerHouse
// ================================================================
const T = {
  primary: "#f49d25",
  primaryBg: "rgba(244,157,37,0.10)",
  primaryHover: "rgba(244,157,37,0.16)",
  bg: "#F8F7F5",
  bgCard: "#ffffff",
  sidebar: "#ffffff",
  border: "#E2E8F0",
  text: "#0F172A",
  textMid: "#475569",
  textMuted: "#94A3B8",
  red: "#EF4444",
  redBg: "rgba(239,68,68,0.08)",
  green: "#22C55E",
  greenBg: "rgba(34,197,94,0.10)",
};

// ================================================================
// Menu items — khớp với các component hiện có
// ================================================================
const MENU = [
  {
    key: "dashboard",
    icon: "dashboard",
    label: "Dashboard",
    desc: "Tổng quan kinh doanh",
  },
  {
    key: "products",
    icon: "inventory_2",
    label: "Sản phẩm",
    desc: "Quản lý danh mục giày",
  },
  {
    key: "orders",
    icon: "local_shipping",
    label: "Đơn hàng",
    desc: "Theo dõi & xử lý đơn",
  },
  {
    key: "users",
    icon: "group",
    label: "Khách hàng",
    desc: "Tài khoản & hồ sơ",
  },
  {
    key: "vouchers",
    icon: "confirmation_number",
    label: "Voucher",
    desc: "Mã giảm giá & khuyến mãi",
  },
  {
    key: "categories",
    icon: "category",
    label: "Danh mục",
    desc: "Phân loại sản phẩm",
  },
  {
    key: "brands",
    icon: "verified",
    label: "Thương hiệu",
    desc: "Nike, Adidas, Jordan...",
  },
  {
    key: "order-returns",
    icon: "assignment_return",
    label: "Hoàn hàng",
    desc: "Xử lý yêu cầu hoàn trả",
  },
  {
    key: "comments",
    icon: "star",
    label: "Đánh giá",
    desc: "Phản hồi & xếp hạng",
  },
  {
    key: "inventory",
    icon: "warehouse",
    label: "Kho hàng",
    desc: "Nhập kho & tồn kho",
  },
  {
    key: "staff",
    icon: "badge",
    label: "Nhân viên",
    desc: "Phân quyền & quản lý",
  },
];

// ================================================================
// Sidebar item
// ================================================================
const SideItem = ({ item, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 14px",
      borderRadius: 12,
      border: "none",
      cursor: "pointer",
      fontFamily: "'Lexend', sans-serif",
      transition: "all 0.15s",
      background: active ? T.primaryBg : "transparent",
      color: active ? T.primary : T.textMid,
      textAlign: "left",
    }}
    onMouseEnter={(e) => {
      if (!active) e.currentTarget.style.background = "#F8FAFC";
    }}
    onMouseLeave={(e) => {
      if (!active) e.currentTarget.style.background = "transparent";
    }}
  >
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: 20,
        color: active ? T.primary : T.textMuted,
        flexShrink: 0,
        fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
      }}
    >
      {item.icon}
    </span>
    <span style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>
      {item.label}
    </span>
    {active && (
      <div
        style={{
          marginLeft: "auto",
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: T.primary,
          flexShrink: 0,
        }}
      />
    )}
  </button>
);

// ================================================================
// AdminPage
// ================================================================
const AdminPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user);
  const [selectedMenu, setSelectedMenu] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // ── resize handler ──
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setSidebarCollapsed(mobile);
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── auth guard ──
  // useEffect(() => {
  //   if (!user || !user.login || !user.isAdmin) {
  //     navigate("/login");
  //   }
  // }, [user, navigate]);

  const handleMenuClick = (key) => {
    // Tạm thời bỏ điều kiện if (user?.isAdmin) để test UI dễ dàng hơn
    setSelectedMenu(key);
    if (isMobile) setSidebarCollapsed(true);
  };

  const currentItem = MENU.find((m) => m.key === selectedMenu);

  const renderContent = () => {
    switch (selectedMenu) {
      case "dashboard":
        return <Dashboard />;
      case "products":
        return <Products />;
      case "orders":
        return <Order />;
      case "users":
        return <Users />;
      case "vouchers":
        return <Vouchers />;
      case "brands":
        return <Brands />;
      case "categories":
        return <Categories />;
      //   case "order-returns":
      //     return <OrderReturn />;
      //   case "comments":
      //     return <Comments />;
      case "inventory":
        return <InventoryDashboard />;
      case "staff":
      //     return <StaffManagement />;
      default:
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: 360,
              color: T.textMuted,
              gap: 12,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 48, opacity: 0.3 }}
            >
              touch_app
            </span>
            <p style={{ fontSize: 14, fontWeight: 500 }}>
              Chọn mục từ sidebar để bắt đầu
            </p>
          </div>
        );
    }
  };

  // ── loading state ──
  if (!user) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: T.bg,
          fontFamily: "'Lexend', sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: `3px solid ${T.border}`,
              borderTopColor: T.primary,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: T.textMuted, fontSize: 14 }}>
            Đang kiểm tra quyền truy cập...
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const initials = (user.name || user.email || "A")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-style: normal; line-height: 1;
          text-transform: none; display: inline-block;
          white-space: nowrap; font-size: 24px;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Lexend', sans-serif; }
        ::-webkit-scrollbar       { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 99px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .sh-content-anim { animation: fadeIn 0.2s ease; }
      `}</style>

      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background: T.bg,
          fontFamily: "'Lexend', sans-serif",
          position: "relative",
        }}
      >
        {/* Mobile overlay */}
        {isMobile && !sidebarCollapsed && (
          <div
            onClick={() => setSidebarCollapsed(true)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 40,
            }}
          />
        )}

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <aside
          style={{
            width: 260,
            background: T.sidebar,
            borderRight: `1px solid ${T.border}`,
            display: "flex",
            flexDirection: "column",
            position: isMobile ? "fixed" : "sticky",
            top: 0,
            height: "100vh",
            zIndex: 50,
            transition: "transform 0.25s ease",
            transform:
              isMobile && sidebarCollapsed
                ? "translateX(-100%)"
                : "translateX(0)",
            flexShrink: 0,
          }}
        >
          {/* Logo */}
          <div
            style={{
              padding: "22px 20px 18px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: T.primary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
                >
                  skateboarding
                </span>
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    color: T.text,
                    lineHeight: 1.2,
                  }}
                >
                  SneakerHouse
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: T.textMuted,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Admin Panel
                </div>
              </div>
            </div>
            {isMobile && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: T.textMuted,
                  padding: 4,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 20 }}
                >
                  close
                </span>
              </button>
            )}
          </div>

          {/* User card */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                background: "#F8FAFC",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: T.primary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: T.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.name || "Admin"}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.textMuted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.email}
                </div>
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: T.green,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav
            style={{
              flex: 1,
              padding: "12px 12px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {MENU.map((item) => (
              <SideItem
                key={item.key}
                item={item}
                active={selectedMenu === item.key}
                onClick={() => handleMenuClick(item.key)}
              />
            ))}
          </nav>

          {/* Bottom */}
          <div style={{ padding: "12px", borderTop: `1px solid ${T.border}` }}>
            <Link
              to="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 12,
                color: T.textMid,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 500,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = T.greenBg;
                e.currentTarget.style.color = "#16A34A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = T.textMid;
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20 }}
              >
                storefront
              </span>
              Trang cửa hàng
            </Link>
            <button
              onClick={() => {
                dispatch(clearUser());
                navigate("/login");
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 12,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: T.textMid,
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "'Lexend', sans-serif",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = T.redBg;
                e.currentTarget.style.color = T.red;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = T.textMid;
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20 }}
              >
                logout
              </span>
              Đăng xuất
            </button>
          </div>
        </aside>

        {/* ── MAIN ─────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
            minWidth: 0,
            marginLeft: isMobile ? 0 : 0,
          }}
        >
          {/* Top header */}
          <header
            style={{
              background: T.bgCard,
              borderBottom: `1px solid ${T.border}`,
              padding: "0 28px",
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "sticky",
              top: 0,
              zIndex: 20,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Mobile hamburger */}
              {isMobile && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: T.textMid,
                    padding: 4,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 24 }}
                  >
                    menu
                  </span>
                </button>
              )}
              {/* Breadcrumb */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: T.textMuted,
                      fontWeight: 500,
                    }}
                  >
                    Admin
                  </span>
                  <span style={{ fontSize: 11, color: T.textMuted }}>/</span>
                  <span
                    style={{ fontSize: 11, color: T.primary, fontWeight: 600 }}
                  >
                    {currentItem?.label}
                  </span>
                </div>
                <h1
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: T.text,
                    letterSpacing: "-0.2px",
                    lineHeight: 1.2,
                  }}
                >
                  {currentItem?.desc || currentItem?.label}
                </h1>
              </div>
            </div>

            {/* Right actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Date */}
              <div
                style={{
                  display: isMobile ? "none" : "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  background: "#F8FAFC",
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  fontSize: 12,
                  color: T.textMuted,
                  fontWeight: 500,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 15 }}
                >
                  calendar_today
                </span>
                {new Date().toLocaleDateString("vi-VN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>

              {/* Notification bell */}
              <button
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  background: T.bgCard,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18, color: T.textMid }}
                >
                  notifications
                </span>
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: T.red,
                    border: "1.5px solid #fff",
                  }}
                />
              </button>

              {/* New product shortcut */}
              <button
                onClick={() => handleMenuClick("products")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 10,
                  background: T.primary,
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "'Lexend', sans-serif",
                  boxShadow: "0 2px 10px rgba(244,157,37,0.30)",
                  transition: "opacity 0.15s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 16 }}
                >
                  add
                </span>
                Sản phẩm mới
              </button>
            </div>
          </header>

          {/* Content */}
          <main
            key={selectedMenu}
            className="sh-content-anim"
            style={{ flex: 1, overflowY: "auto" }}
          >
            {renderContent()}
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminPage;
