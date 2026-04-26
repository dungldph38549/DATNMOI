import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import Order from "./Order";
import Products from "./Products";
import Categories from "./Categories";
import Dashboard from "./Dashboard";
import Users from "./Users";
import Vouchers from "./Vouchers";
import Sizes from "./Sizes";
import ShoelaceSizes from "./ShoelaceSizes";
import Colors from "./Colors";
import Reviews from "./Reviews";
import ChatAdmin from "./ChatAdmin";
import WalletTopups from "./WalletTopups";
// import OrderReturn from "./OrderReturn";
// import Comments from "./Comments";
// import StaffManagement from "./StaffManagement";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAllOrders, adminListTopupTransactions } from "../api/index";
import { clearUser } from "../redux/user";

const getAdminSession = () => {
  try {
    const raw =
      localStorage.getItem("admin_v1") || localStorage.getItem("admin");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const toSingleLine = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .trim();

// ================================================================
// Design tokens — SneakerConverse
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

const MENU_ITEMS = {
  dashboard: { key: "dashboard", icon: "dashboard", label: "Dashboard" },
  orders: { key: "orders", icon: "local_shipping", label: "Đơn hàng" },
  "order-returns": {
    key: "order-returns",
    icon: "assignment_return",
    label: "Hoàn hàng",
  },
  chat: { key: "chat", icon: "chat", label: "Chat" },
  products: { key: "products", icon: "inventory_2", label: "Sản phẩm" },
  categories: { key: "categories", icon: "category", label: "Danh mục" },
  sizes: { key: "sizes", icon: "straighten", label: "Size" },
  colors: { key: "colors", icon: "palette", label: "Màu" },
  "shoelace-sizes": {
    key: "shoelace-sizes",
    icon: "sprint",
    label: "PK dây giày",
  },
  vouchers: { key: "vouchers", icon: "confirmation_number", label: "Voucher" },
  comments: { key: "comments", icon: "star", label: "Đánh giá" },
  users: { key: "users", icon: "group", label: "Khách hàng" },
  "wallet-topups": {
    key: "wallet-topups",
    icon: "account_balance_wallet",
    label: "Giao dịch nạp ví",
  },
  staff: { key: "staff", icon: "badge", label: "Nhân viên" },
};

const MENU_GROUPS = [
  {
    id: "operations",
    label: "Vận hành",
    icon: "settings",
    items: ["orders", "order-returns"],
  },
  {
    id: "products",
    label: "Sản phẩm",
    icon: "inventory_2",
    items: ["products", "categories", "sizes", "colors", "shoelace-sizes"],
  },
  {
    id: "promo-feedback",
    label: "Ưu đãi và phản hồi",
    icon: "campaign",
    items: ["vouchers", "comments", "chat"],
  },
  {
    id: "customers-wallet",
    label: "Khách hàng và ví",
    icon: "groups",
    items: ["users", "wallet-topups"],
  },
];

// ================================================================
// Sidebar item
// ================================================================
const SideItem = ({
  item,
  active,
  onClick,
  nested = false,
  hideIcon = false,
  asSection = false,
}) => (
  <button
    onClick={onClick}
    style={{
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: asSection ? "9px 12px" : nested ? "9px 12px 9px 26px" : "10px 14px",
      borderRadius: 12,
      border: "none",
      cursor: "pointer",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      transition: "all 0.15s",
      background: asSection
        ? active
          ? T.primaryBg
          : "#F8FAFC"
        : active
          ? T.primaryBg
          : "transparent",
      color: active ? T.primary : asSection ? T.text : T.textMid,
      textAlign: "left",
    }}
    onMouseEnter={(e) => {
      if (!active) e.currentTarget.style.background = asSection ? "#F1F5F9" : "#F8FAFC";
    }}
    onMouseLeave={(e) => {
      if (!active) e.currentTarget.style.background = asSection ? "#F8FAFC" : "transparent";
    }}
  >
    {!hideIcon && (
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
    )}
    <span style={{ fontSize: 13, fontWeight: asSection ? 800 : active ? 700 : 500 }}>
      <span
        style={{
          display: "block",
          minWidth: 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {item.label}
      </span>
    </span>
    {item.count > 0 && (
      <span
        style={{
          marginLeft: "auto",
          background: T.red,
          color: "#fff",
          fontSize: 10,
          fontWeight: 800,
          padding: "2px 6px",
          borderRadius: 10,
          lineHeight: 1,
          minWidth: 16,
          textAlign: "center",
        }}
      >
        {item.count > 99 ? "99+" : item.count}
      </span>
    )}
    {active && !item.count && (
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
const getMobileMatch = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
};

const AdminPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [adminSession, setAdminSession] = useState(() => getAdminSession());
  const [selectedMenu, setSelectedMenu] = useState("dashboard");
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? getMobileMatch() : false,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== "undefined" ? getMobileMatch() : false,
  );
  const [expandedGroups, setExpandedGroups] = useState({
    operations: true,
    products: true,
    "promo-feedback": true,
    "customers-wallet": true,
  });

  const { data: orderData } = useQuery({
    queryKey: ["admin-orders-badges"],
    queryFn: async () => {
      const res = await getAllOrders(0, 50);
      return res?.data || [];
    },
    refetchInterval: 15000,
  });

  const { data: topupData } = useQuery({
    queryKey: ["admin-topups-badges"],
    queryFn: () => adminListTopupTransactions(1, 100),
    refetchInterval: 15000,
  });

  const orders = Array.isArray(orderData) ? orderData : [];
  const topups = Array.isArray(topupData?.data) ? topupData.data : [];
  const pendingOrdersCount = orders.filter((o) =>
    ["pending", "confirmed", "shipped", "delivered"].includes(o.status),
  ).length;
  const returnRequestsCount = orders.filter(
    (o) => o.status === "return-request",
  ).length;
  const pendingTopupsCount = topups.filter((t) => {
    if (t?.method !== "bank_transfer") return false;
    return ["awaiting_transfer", "awaiting_admin"].includes(t?.status);
  }).length;

  const menuWithBadges = Object.values(MENU_ITEMS).map((item) => {
    if (item.key === "orders") return { ...item, count: pendingOrdersCount };
    if (item.key === "order-returns") return { ...item, count: returnRequestsCount };
    if (item.key === "wallet-topups") return { ...item, count: pendingTopupsCount };
    return item;
  });
  const menuMap = menuWithBadges.reduce((acc, item) => {
    acc[item.key] = item;
    return acc;
  }, {});

  // ── mobile / desktop (matchMedia ổn định hơn innerWidth khi zoom / DevTools) ──
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      if (mobile) setSidebarCollapsed(true);
      else setSidebarCollapsed(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && isMobile && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile, sidebarCollapsed]);

  // ── auth guard (admin only) ──
  useEffect(() => {
    const freshAdmin = getAdminSession();
    setAdminSession(freshAdmin);

    const isLoggedIn = !!freshAdmin?.login;
    const isAdmin = !!freshAdmin?.isAdmin;

    // Nếu chưa đăng nhập -> chuyển về trang login
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    // Nếu đã đăng nhập nhưng không phải admin -> chặn truy cập admin
    if (!isAdmin) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const handleMenuClick = (key) => {
    setSelectedMenu(key);
    if (isMobile) setSidebarCollapsed(true);
  };
  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const isChatView = selectedMenu === "chat";

  const renderContent = () => {
    switch (selectedMenu) {
      case "dashboard":
        return <Dashboard onNavigateTo={handleMenuClick} />;
      case "products":
        return <Products />;
      case "orders":
        return (
          <Order mode="all" />
        );
      case "users":
        return <Users mode="customers" />;
      case "vouchers":
        return <Vouchers />;
      case "wallet-topups":
        return <WalletTopups />;
      case "sizes":
        return <Sizes />;
      case "shoelace-sizes":
        return <ShoelaceSizes />;
      case "colors":
        return <Colors />;
      case "chat":
        return <ChatAdmin />;
      case "categories":
        return <Categories />;
      case "order-returns":
        return <Order mode="returns" />;
      case "orders-completed":
        return <Order mode="completed" />;
      case "comments":
        return <Reviews />;
      case "staff":
        return <Users mode="staff" />;
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
  if (!adminSession) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: T.bg,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
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

  const adminDisplayName = toSingleLine(adminSession.name || "Admin");
  const adminDisplayEmail = toSingleLine(adminSession.email || "");

  const initials = (adminDisplayName || adminDisplayEmail || "A")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-style: normal; line-height: 1;
          text-transform: none; display: inline-block;
          white-space: nowrap; font-size: 24px;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        ::-webkit-scrollbar       { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 99px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .sh-content-anim { animation: fadeIn 0.2s ease; }
        .admin-shell,
        .admin-shell * {
          box-sizing: border-box;
        }
        .admin-main {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          min-height: 0;
        }
        .admin-nav-scroll {
          overscroll-behavior: contain;
        }
        .admin-content {
          width: 100%;
          max-width: 100%;
          padding: 16px;
        }
        @media (min-width: 1024px) {
          .admin-content {
            padding: 20px;
          }
        }
        .admin-shell .ant-table-wrapper {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
        }
        .admin-shell .ant-table-cell {
          vertical-align: middle;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .admin-shell .admin-allow-wrap,
        .admin-shell .admin-allow-wrap * {
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
      `}</style>

      <div
        className="admin-shell"
        style={{
          display: "flex",
          height: "100vh",
          maxHeight: "100vh",
          overflow: "hidden",
          background: T.bg,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          position: "relative",
        }}
      >
        {/* Mobile overlay */}
        {isMobile && !sidebarCollapsed && (
          <div
            role="presentation"
            aria-hidden
            onClick={() => setSidebarCollapsed(true)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 90,
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
            zIndex: isMobile ? 100 : 1,
            pointerEvents: "auto",
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
                  SneakerConverse
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
                  {adminDisplayName}
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
                  {adminDisplayEmail}
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
            className="admin-nav-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              padding: "12px 12px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <SideItem
              item={menuMap.dashboard}
              active={selectedMenu === "dashboard"}
              asSection
              onClick={() => handleMenuClick("dashboard")}
            />

            {MENU_GROUPS.map((group) => {
              const isOpen = !!expandedGroups[group.id];
              return (
                <div key={group.id} style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 12px",
                      border: "none",
                      background: "#F8FAFC",
                      cursor: "pointer",
                      color: T.text,
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: "0.01em",
                      borderRadius: 10,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        {group.icon || "folder"}
                      </span>
                      {group.label}
                    </span>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {isOpen ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                  {isOpen &&
                    group.items.map((itemKey) => {
                      const item = menuMap[itemKey];
                      if (!item) return null;
                      return (
                        <SideItem
                          key={item.key}
                          item={item}
                          active={selectedMenu === item.key}
                          nested
                          onClick={() => handleMenuClick(item.key)}
                        />
                      );
                    })}
                </div>
              );
            })}

            <div style={{ marginTop: 8 }}>
              <SideItem
                item={menuMap.staff}
                active={selectedMenu === "staff"}
                onClick={() => handleMenuClick("staff")}
                asSection
              />
            </div>
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
                localStorage.removeItem("admin_v1");
                localStorage.removeItem("admin");
                localStorage.removeItem("admin_access_token");
                localStorage.removeItem("admin_token");
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
                fontFamily: "'Plus Jakarta Sans', sans-serif",
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
          className="admin-main"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
            marginLeft: isMobile ? 0 : 0,
          }}
        >
          {/* Content */}
          {/* Mobile: nút mở sidebar (thay cho Top header đã cắt) */}
          {isMobile && sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              style={{
                position: "fixed",
                top: 14,
                left: 14,
                zIndex: 110,
                width: 42,
                height: 42,
                borderRadius: 12,
                background: T.bgCard,
                border: `1px solid ${T.border}`,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 24, color: T.textMid }}
              >
                menu
              </span>
            </button>
          )}
          <main
            key={selectedMenu}
            className="sh-content-anim"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: isChatView ? "hidden" : "auto",
              overflowX: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="admin-content"
              style={
                isChatView
                  ? {
                      flex: 1,
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }
                  : undefined
              }
            >
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminPage;
