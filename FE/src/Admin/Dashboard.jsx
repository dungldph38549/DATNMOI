import { useEffect, useState } from "react";
import { DatePicker } from "antd";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import axiosInstance from "../api/axiosConfig";

dayjs.extend(isBetween);

// ── Design tokens ──────────────────────────────────────────────
const T = {
  primary: "#f49d25",
  primaryBg: "rgba(244,157,37,0.08)",
  border: "#E9EEF4",
  text: "#0F172A",
  textMid: "#475569",
  textMuted: "#94A3B8",
  card: "#ffffff",
  bg: "#F8F7F5",
  green: "#22C55E",
  greenBg: "rgba(34,197,94,0.10)",
  red: "#EF4444",
  redBg: "rgba(239,68,68,0.08)",
  blue: "#3B82F6",
  blueBg: "rgba(59,130,246,0.10)",
  amber: "#F59E0B",
  amberBg: "rgba(245,158,11,0.10)",
};

// ── Metric card ────────────────────────────────────────────────
const MetricCard = ({ icon, label, value, sub, color, bg }) => (
  <div
    style={{
      background: T.card,
      borderRadius: 16,
      border: `1px solid ${T.border}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      padding: "22px 24px",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 22, color }}
        >
          {icon}
        </span>
      </div>
      {sub && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 8,
            background: T.greenBg,
            color: T.green,
          }}
        >
          {sub}
        </span>
      )}
    </div>
    <p
      style={{
        margin: 0,
        fontSize: 12,
        fontWeight: 600,
        color: T.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </p>
    <p
      style={{
        margin: "4px 0 0",
        fontSize: 24,
        fontWeight: 800,
        color: T.text,
        letterSpacing: "-0.5px",
      }}
    >
      {value}
    </p>
  </div>
);

// ── Section card ───────────────────────────────────────────────
const SCard = ({ title, action, children }) => (
  <div
    style={{
      background: T.card,
      borderRadius: 16,
      border: `1px solid ${T.border}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        padding: "18px 24px",
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text }}>
        {title}
      </h3>
      {action}
    </div>
    <div style={{ padding: 24 }}>{children}</div>
  </div>
);

// ── Payment badge ──────────────────────────────────────────────
const PayBadge = ({ method }) => {
  const map = {
    cod: { label: "COD", bg: T.amberBg, color: T.amber },
    vnpay: { label: "VNPay", bg: T.blueBg, color: T.blue },
    momo: { label: "MoMo", bg: "rgba(234,56,88,0.10)", color: "#EA3858" },
  };
  const m = map[method?.toLowerCase()] || {
    label: method || "N/A",
    bg: "#F1F5F9",
    color: T.textMid,
  };
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        background: m.bg,
        color: m.color,
        textTransform: "uppercase",
      }}
    >
      {m.label}
    </span>
  );
};

// ── Custom tooltip for recharts ────────────────────────────────
const CustomTooltip = ({ active, payload, label, type }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 12,
      }}
    >
      <p style={{ margin: "0 0 6px", fontWeight: 700, color: T.textMid }}>
        {label}
      </p>
      {payload.map((p) => (
        <p
          key={p.dataKey}
          style={{ margin: 0, fontWeight: 600, color: p.stroke }}
        >
          {type === "revenue"
            ? `${p.value?.toLocaleString("vi-VN")}₫`
            : `${p.value} đơn`}
        </p>
      ))}
    </div>
  );
};

// ================================================================
// Dashboard
// ================================================================
const Dashboard = () => {
  const [overview, setOverview] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    canceledOrders: 0,
  });
  const [revenue, setRevenue] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [topVariants, setTopVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().startOf("month"),
    dayjs(),
  ]);

  const determineTimeUnit = (start, end) => {
    const diff = end.diff(start, "day");
    if (diff > 365) return "year";
    if (diff > 31) return "month";
    if (diff > 7) return "week";
    if (diff > 1) return "day";
    return "hour";
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const unit = determineTimeUnit(dateRange[0], dateRange[1]);
        const params = {
          startDate: dateRange[0].toISOString(),
          endDate: dateRange[1].toISOString(),
        };

        const [overviewRes, revenueRes, paymentRes, topVariantRes] =
          await Promise.all([
            axiosInstance.get("/order/dashboard", { params }),
            axiosInstance.get("/order/revenue", {
              params: { ...params, unit },
            }),
            axiosInstance.get("/order/paymentMethod", { params }),
            axiosInstance.get("/order/topSelling", { params }),
          ]);

        const od = overviewRes.data?.data || {};
        const rd = revenueRes.data?.data || [];
        const pd = paymentRes.data?.data || [];
        const td = topVariantRes.data?.data || [];

        setOverview({
          totalOrders: od.totalOrders || 0,
          totalRevenue: od.totalRevenue || 0,
          canceledOrders: od.canceledOrders || 0,
        });
        setRevenue(Array.isArray(rd) ? rd : []);
        setPaymentMethods(Array.isArray(pd) ? pd : []);
        setTopVariants(Array.isArray(td) ? td : []);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Không thể tải dữ liệu dashboard",
        );
        setOverview({ totalOrders: 0, totalRevenue: 0, canceledOrders: 0 });
        setRevenue([]);
        setPaymentMethods([]);
        setTopVariants([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange]);

  // ── Loading ────────────────────────────────────────────────
  if (loading)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 320,
          gap: 14,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: `3px solid ${T.border}`,
            borderTopColor: T.primary,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ fontSize: 13, color: T.textMuted }}>Đang tải dữ liệu...</p>
        <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
      </div>
    );

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        .material-symbols-outlined { font-family:'Material Symbols Outlined'; font-style:normal; line-height:1; text-transform:none; display:inline-block; white-space:nowrap; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .sh-dash { font-family:'Plus Jakarta Sans',sans-serif; background:${T.bg}; padding:28px; animation:fadeIn 0.2s ease; }
        .sh-tr:hover td { background:#FFFBF5 !important; }
        .ant-picker { border-radius:10px !important; font-family:'Plus Jakarta Sans',sans-serif !important; border:1.5px solid ${T.border} !important; }
        .ant-picker:hover,.ant-picker-focused { border-color:${T.primary} !important; box-shadow:0 0 0 3px rgba(244,157,37,0.10) !important; }
        .recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line { stroke: #F1F5F9; }
        .recharts-tooltip-wrapper { outline:none; }
      `}</style>

      <div className="sh-dash">
        {/* ── Error banner ──────────────────────────────────── */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 12,
              marginBottom: 20,
              background: T.amberBg,
              border: `1px solid ${T.amber}`,
              fontSize: 13,
              color: "#92400E",
              fontWeight: 500,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18, color: T.amber }}
            >
              warning
            </span>
            {error} — Hiển thị dữ liệu mặc định.
            <button
              onClick={() => setError(null)}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: T.amber,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                close
              </span>
            </button>
          </div>
        )}

        {/* ── Header ────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            padding: "16px 24px",
            background: T.card,
            borderRadius: 16,
            border: `1px solid ${T.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 800,
                color: T.text,
                letterSpacing: "-0.3px",
              }}
            >
              Tổng quan kinh doanh
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: T.textMuted }}>
              Thống kê doanh thu và đơn hàng theo thời gian
            </p>
          </div>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(values) => {
              if (values?.[0] && values?.[1]) setDateRange(values);
            }}
            format="DD/MM/YYYY"
            allowClear={false}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
        </div>

        {/* ── Metric cards ──────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <MetricCard
            icon="payments"
            label="Tổng doanh thu"
            color={T.primary}
            bg={T.primaryBg}
            value={`${overview.totalRevenue.toLocaleString("vi-VN")}₫`}
            sub="+12.5%"
          />
          <MetricCard
            icon="local_shipping"
            label="Tổng đơn hàng"
            color={T.blue}
            bg={T.blueBg}
            value={overview.totalOrders.toLocaleString()}
            sub="+8.2%"
          />
          <MetricCard
            icon="cancel"
            label="Đơn bị hủy"
            color={T.red}
            bg={T.redBg}
            value={overview.canceledOrders.toLocaleString()}
          />
        </div>

        {/* ── Revenue chart ─────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <SCard title="Biểu đồ doanh thu">
            {revenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={revenue}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontFamily: "'Plus Jakarta Sans'",
                      fontSize: 11,
                      fill: T.textMuted,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                    tick={{
                      fontFamily: "'Plus Jakarta Sans'",
                      fontSize: 11,
                      fill: T.textMuted,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip type="revenue" />} />
                  <Line
                    type="monotone"
                    dataKey="totalRevenue"
                    stroke={T.primary}
                    strokeWidth={3}
                    dot={false}
                    name="Doanh thu"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: 260,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: T.textMuted,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 36, opacity: 0.3 }}
                >
                  show_chart
                </span>
                <p style={{ fontSize: 13 }}>Không có dữ liệu doanh thu</p>
              </div>
            )}
          </SCard>
        </div>

        {/* ── Orders chart ──────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <SCard title="Biểu đồ đơn hàng">
            {revenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={revenue}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontFamily: "'Plus Jakarta Sans'",
                      fontSize: 11,
                      fill: T.textMuted,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fontFamily: "'Plus Jakarta Sans'",
                      fontSize: 11,
                      fill: T.textMuted,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip type="orders" />} />
                  <Line
                    type="monotone"
                    dataKey="totalOrders"
                    stroke={T.blue}
                    strokeWidth={3}
                    dot={false}
                    name="Số đơn hàng"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: 260,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: T.textMuted,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 36, opacity: 0.3 }}
                >
                  bar_chart
                </span>
                <p style={{ fontSize: 13 }}>Không có dữ liệu đơn hàng</p>
              </div>
            )}
          </SCard>
        </div>

        {/* ── Bottom 2 cols ─────────────────────────────────── */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}
        >
          {/* Payment methods */}
          <SCard title="Phương thức thanh toán">
            {paymentMethods.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: T.textMuted,
                  padding: "24px 0",
                  fontSize: 13,
                }}
              >
                Không có dữ liệu
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {paymentMethods.map((p) => {
                  const total = paymentMethods.reduce((s, x) => s + x.count, 0);
                  const pct =
                    total > 0 ? ((p.count / total) * 100).toFixed(0) : 0;
                  return (
                    <div
                      key={p._id}
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <PayBadge method={p._id} />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            height: 6,
                            background: "#F1F5F9",
                            borderRadius: 99,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: T.primary,
                              borderRadius: 99,
                              transition: "width 0.5s",
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 56 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: T.text,
                          }}
                        >
                          {p.count}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: T.textMuted,
                            marginLeft: 4,
                          }}
                        >
                          ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SCard>

          {/* Top selling */}
          <SCard title="Top 10 sản phẩm bán chạy">
            {topVariants.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: T.textMuted,
                  padding: "24px 0",
                  fontSize: 13,
                }}
              >
                Không có dữ liệu
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {["#", "Sản phẩm", "SKU", "Thuộc tính", "SL bán"].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 14px",
                              textAlign: h === "SL bán" ? "right" : "left",
                              fontSize: 10,
                              fontWeight: 700,
                              color: T.textMuted,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {topVariants.map((item, idx) => (
                      <tr
                        key={`${item.sku}-${idx}`}
                        className="sh-tr"
                        style={{ borderTop: `1px solid #F1F5F9` }}
                      >
                        <td style={{ padding: "10px 14px" }}>
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: idx < 3 ? T.primaryBg : "#F1F5F9",
                              color: idx < 3 ? T.primary : T.textMuted,
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            fontWeight: 600,
                            color: T.text,
                            maxWidth: 160,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.productName || "N/A"}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <code
                            style={{
                              background: "#F1F5F9",
                              padding: "2px 7px",
                              borderRadius: 6,
                              fontSize: 11,
                              color: T.textMid,
                            }}
                          >
                            {item.sku || "N/A"}
                          </code>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          {item.attributes &&
                          Object.keys(item.attributes).length > 0 ? (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 4,
                              }}
                            >
                              {Object.entries(item.attributes).map(([k, v]) => (
                                <span
                                  key={k}
                                  style={{
                                    padding: "2px 7px",
                                    borderRadius: 99,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    background: T.blueBg,
                                    color: T.blue,
                                  }}
                                >
                                  {k}: {v}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: T.textMuted }}>
                              —
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: T.green,
                          }}
                        >
                          {item.totalQuantity || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SCard>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
