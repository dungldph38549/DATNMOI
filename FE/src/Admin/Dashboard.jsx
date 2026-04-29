import { useEffect, useState, useId } from "react";
import { DatePicker, Segmented } from "antd";
import {
  ComposedChart,
  Area,
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

/** 7 ngày gần nhất (đủ 7 mốc theo ngày trên biểu đồ): từ 6 ngày trước → hôm nay. */
const getLast7DaysRange = () => {
  const end = dayjs().endOf("day");
  const start = dayjs().subtract(6, "day").startOf("day");
  return [start, end];
};

/** Chuẩn hóa [bắt đầu, kết thúc] đủ 24h/ngày — tránh cùng 00:00 → span 0, mất so sánh. */
const normalizeDateRangeBounds = (range) => {
  if (!range?.[0] || !range?.[1]) return null;
  return [range[0].startOf("day"), range[1].endOf("day")];
};

/** Nhãn mốc so sánh: cùng độ dài, ngay trước khoảng đang xem. */
const formatComparisonCaption = (period, showZeroBaselineHint) => {
  if (!period?.start || !period?.end) return null;
  const a = dayjs(period.start);
  const b = dayjs(period.end);
  const oneCalendarDay = a.format("YYYY-MM-DD") === b.format("YYYY-MM-DD");
  let s = oneCalendarDay
    ? `So với ngày ${a.format("DD/MM/YYYY")}`
    : `So với (${a.format("DD/MM/YYYY")} → ${b.format("DD/MM/YYYY")})`;
  if (showZeroBaselineHint) s += " · kỳ trước = 0, không tính %";
  return s;
};

/** % thay đổi: âm/dương đều tính. Kỳ trước = 0: coi như mức tăng +100% nếu kỳ này > 0. */
const roundPctChange = (cur, prev) => {
  const c = Number(cur) || 0;
  const p = Number(prev) || 0;
  if (p === 0 && c === 0) return 0;
  if (p === 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 1000) / 10;
};

// ── Design tokens ──────────────────────────────────────────────
const T = {
  primary: "#f05a22",
  primaryBg: "rgba(240,90,34,0.10)",
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
  chartNavy: "#0F172A",
};

const formatRevenueAxisTick = (v) => {
  const n = Number(v) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
};

// ── Badge phương thức thanh toán (COD / VNPay / Ví) ───────────
const PayBadge = ({ method }) => {
  const map = {
    cod: { label: "COD", bg: T.amberBg, color: T.amber },
    vnpay: { label: "VNPay", bg: T.blueBg, color: T.blue },
    wallet: { label: "Ví", bg: "rgba(34,197,94,0.12)", color: T.green },
    momo: { label: "MoMo", bg: "rgba(234,56,88,0.10)", color: "#EA3858" },
  };
  const key = String(method || "").toLowerCase();
  const m = map[key] || {
    label: method || "Khác",
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

// ── Metric card ────────────────────────────────────────────────
const MetricCard = ({
  icon,
  label,
  value,
  deltaPercent,
  comparisonLabel,
  color,
  bg,
  /** true: tăng % là xấu (vd. đơn hủy) → đỏ khi dương, xanh khi âm */
  invertDelta = false,
}) => {
  const hasDelta =
    deltaPercent !== null && deltaPercent !== undefined && !Number.isNaN(deltaPercent);
  const isUp = hasDelta && deltaPercent > 0;
  const isDown = hasDelta && deltaPercent < 0;
  const isFlat = hasDelta && deltaPercent === 0;
  let badgeBg;
  let badgeColor;
  if (!invertDelta) {
    badgeBg = isDown ? T.redBg : isFlat ? "#F1F5F9" : T.greenBg;
    badgeColor = isDown ? T.red : isFlat ? T.textMuted : T.green;
  } else {
    badgeBg = isUp ? T.redBg : isDown ? T.greenBg : "#F1F5F9";
    badgeColor = isUp ? T.red : isDown ? T.green : T.textMuted;
  }
  const deltaText = hasDelta
    ? (() => {
        const n = Number(deltaPercent);
        const fmt = Math.abs(n).toLocaleString("vi-VN", {
          maximumFractionDigits: 1,
          minimumFractionDigits: 0,
        });
        if (n > 0) return `+${fmt}%`;
        if (n < 0) return `-${fmt}%`;
        return `${fmt}%`;
      })()
    : null;

  return (
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
        gap: 12,
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
          flexShrink: 0,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 22, color }}
        >
          {icon}
        </span>
      </div>
      {(comparisonLabel || hasDelta) && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
            minWidth: 0,
            textAlign: "right",
          }}
        >
          {hasDelta && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 8,
                background: badgeBg,
                color: badgeColor,
                whiteSpace: "nowrap",
              }}
            >
              {deltaText}
            </span>
          )}
          {comparisonLabel && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: T.textMid,
                lineHeight: 1.4,
                maxWidth: 220,
              }}
            >
              {comparisonLabel}
            </span>
          )}
        </div>
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
};

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

// ── Chart legend (mockup) ────────────────────────────────────
const ChartLegend = ({ items }) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "14px 18px",
      marginBottom: 14,
    }}
  >
    {items.map(({ color, label }) => (
      <div
        key={label}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          fontWeight: 600,
          color: T.textMid,
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
        {label}
      </div>
    ))}
  </div>
);

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
          style={{ margin: 0, fontWeight: 600, color: p.color || p.stroke }}
        >
          {p.name ? `${p.name}: ` : ""}
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
const Dashboard = ({ onNavigateTo }) => {
  const [overview, setOverview] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    canceledOrders: 0,
    comparisonPeriod: null,
    revenueChangePercent: null,
    ordersChangePercent: null,
    canceledOrdersChangePercent: null,
  });
  const [revenue, setRevenue] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [topVariants, setTopVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(() => getLast7DaysRange());
  const [timeUnit, setTimeUnit] = useState("week");
  const revFillGradId = useId().replace(/:/g, "");
  const ordFillGradId = useId().replace(/:/g, "");

  const handleTimeUnitChange = (nextUnit) => {
    setTimeUnit(nextUnit);
    const now = dayjs();

    // Chọn đơn vị thời gian thì tự đặt lại range tính lùi từ hôm nay
    // để tránh cảm giác "trôi ngược" do startOf/endOf theo tháng/năm.
    if (nextUnit === "auto" || nextUnit === "week") {
      setDateRange(getLast7DaysRange());
      return;
    }

    if (nextUnit === "day") {
      setDateRange([now.subtract(1, "day").startOf("day"), now.endOf("day")]);
      return;
    }

    if (nextUnit === "month") {
      setDateRange([now.subtract(1, "month").startOf("day"), now.endOf("day")]);
      return;
    }

    if (nextUnit === "year") {
      setDateRange([now.subtract(1, "year").startOf("day"), now.endOf("day")]);
      return;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const bounds = normalizeDateRangeBounds(dateRange);
        if (!bounds) throw new Error("Khoảng ngày không hợp lệ");
        const [normStart, normEnd] = bounds;
        const params = {
          startDate: normStart.toISOString(),
          endDate: normEnd.toISOString(),
        };

        const revenueUnit =
          timeUnit === "month" ? "week" : timeUnit === "year" ? "month" : "day";

        const [overviewRes, revenueRes, paymentRes, topVariantRes] =
          await Promise.all([
            axiosInstance.get("/order/dashboard", { params }),
            axiosInstance.get("/order/revenue", {
              params: { ...params, unit: revenueUnit },
            }),
            axiosInstance.get("/order/paymentMethod", { params }),
            axiosInstance.get("/order/topSelling", {
              params: { ...params, limit: 10 },
            }),
          ]);

        const od = overviewRes.data?.data || {};
        const rd = revenueRes.data?.data || [];
        const pd = paymentRes.data?.data || [];
        const td = topVariantRes.data?.data || [];

        const startMs = normStart.valueOf();
        const endMs = normEnd.valueOf();
        const spanMs = endMs - startMs;
        const prevParams =
          spanMs > 0
            ? (() => {
                const prevEndMs = startMs - 1;
                const prevStartMs = prevEndMs - spanMs;
                return {
                  startDate: new Date(prevStartMs).toISOString(),
                  endDate: new Date(prevEndMs).toISOString(),
                };
              })()
            : null;

        const hasServerCompare =
          Boolean(od.comparisonPeriod?.start && od.comparisonPeriod?.end) &&
          typeof od.revenueChangePercent !== "undefined" &&
          typeof od.ordersChangePercent !== "undefined";

        let comparisonPeriod = od.comparisonPeriod || null;
        let revenueChangePercent =
          od.revenueChangePercent !== undefined
            ? od.revenueChangePercent
            : null;
        let ordersChangePercent =
          od.ordersChangePercent !== undefined ? od.ordersChangePercent : null;
        let canceledOrdersChangePercent =
          od.canceledOrdersChangePercent !== undefined
            ? od.canceledOrdersChangePercent
            : null;

        if (prevParams && !hasServerCompare) {
          try {
            const prevRes = await axiosInstance.get("/order/dashboard", {
              params: prevParams,
            });
            const pod = prevRes.data?.data || {};
            comparisonPeriod = {
              start: prevParams.startDate,
              end: prevParams.endDate,
            };
            revenueChangePercent = roundPctChange(
              od.totalRevenue || 0,
              pod.totalRevenue || 0,
            );
            ordersChangePercent = roundPctChange(
              od.totalOrders || 0,
              pod.totalOrders || 0,
            );
            canceledOrdersChangePercent = roundPctChange(
              od.canceledOrders || 0,
              pod.canceledOrders || 0,
            );
          } catch {
            comparisonPeriod = null;
            revenueChangePercent = null;
            ordersChangePercent = null;
            canceledOrdersChangePercent = null;
          }
        } else if (prevParams && hasServerCompare && od.canceledOrdersChangePercent === undefined) {
          try {
            const prevRes = await axiosInstance.get("/order/dashboard", {
              params: prevParams,
            });
            const pod = prevRes.data?.data || {};
            canceledOrdersChangePercent = roundPctChange(
              od.canceledOrders || 0,
              pod.canceledOrders || 0,
            );
          } catch {
            canceledOrdersChangePercent = null;
          }
        }

        setOverview({
          totalOrders: od.totalOrders || 0,
          totalRevenue: od.totalRevenue || 0,
          canceledOrders: od.canceledOrders || 0,
          comparisonPeriod,
          revenueChangePercent,
          ordersChangePercent,
          canceledOrdersChangePercent,
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
        setOverview({
          totalOrders: 0,
          totalRevenue: 0,
          canceledOrders: 0,
          comparisonPeriod: null,
          revenueChangePercent: null,
          ordersChangePercent: null,
          canceledOrdersChangePercent: null,
        });
        setRevenue([]);
        setPaymentMethods([]);
        setTopVariants([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange, timeUnit]);

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
        .ant-picker:hover,.ant-picker-focused { border-color:${T.primary} !important; box-shadow:0 0 0 3px rgba(240,90,34,0.12) !important; }
        .sh-metrics { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin-bottom:24px; }
        @media (max-width:900px){ .sh-metrics{ grid-template-columns:1fr !important; } }
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

        {/* ── Header: tiêu đề trái, khoảng thời gian góc phải ─ */}
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
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
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
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "flex-end",
              flexShrink: 0,
            }}
          >
            <Segmented
              value={timeUnit}
              onChange={handleTimeUnitChange}
              options={[
                { value: "auto", label: "Tự động" },
                { value: "day", label: "Ngày" },
                { value: "week", label: "Tuần" },
                { value: "month", label: "Tháng" },
                { value: "year", label: "Năm" },
              ]}
            />
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(values) => {
                if (values?.[0] && values?.[1]) {
                  setDateRange([
                    values[0].startOf("day"),
                    values[1].endOf("day"),
                  ]);
                }
              }}
              format="DD/MM/YYYY"
              allowClear={false}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />

          </div>
        </div>

        {/* ── Metric cards (3 ô như ban đầu) ────────────────── */}
        <div className="sh-metrics">
          <MetricCard
            icon="payments"
            label="Tổng doanh thu"
            color={T.primary}
            bg={T.primaryBg}
            value={`${overview.totalRevenue.toLocaleString("vi-VN")}₫`}
            deltaPercent={overview.revenueChangePercent}
            comparisonLabel={formatComparisonCaption(
              overview.comparisonPeriod,
              overview.revenueChangePercent === null &&
                overview.totalRevenue > 0,
            )}
          />
          <MetricCard
            icon="local_shipping"
            label="Tổng đơn hàng"
            color={T.blue}
            bg={T.blueBg}
            value={overview.totalOrders.toLocaleString()}
            deltaPercent={overview.ordersChangePercent}
            comparisonLabel={formatComparisonCaption(
              overview.comparisonPeriod,
              overview.ordersChangePercent === null &&
                overview.totalOrders > 0,
            )}
          />
          <MetricCard
            icon="cancel"
            label="Đơn bị hủy"
            color={T.red}
            bg={T.redBg}
            value={overview.canceledOrders.toLocaleString()}
            deltaPercent={overview.canceledOrdersChangePercent}
            comparisonLabel={formatComparisonCaption(
              overview.comparisonPeriod,
              overview.canceledOrdersChangePercent === null &&
                overview.canceledOrders > 0,
            )}
            invertDelta
          />
        </div>

        {/* ── Hai biểu đồ vùng (area) cạnh nhau ─────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            marginBottom: 24,
          }}
          className="sh-chart-row"
        >
          <style>{`
            @media (max-width: 960px) {
              .sh-chart-row { grid-template-columns: 1fr !important; }
            }
          `}</style>
          <SCard
            title="Xu hướng Doanh thu"
            action={null}
          >
            {revenue.length > 0 ? (
              <>
                <ChartLegend
                  items={[{ color: T.primary, label: "Doanh thu" }]}
                />
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart
                    data={revenue}
                    margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient
                        id={revFillGradId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={T.primary}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="92%"
                          stopColor={T.primary}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
                      tickFormatter={formatRevenueAxisTick}
                      tick={{
                        fontFamily: "'Plus Jakarta Sans'",
                        fontSize: 11,
                        fill: T.textMuted,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip type="revenue" />} />
                    <Area
                      type="monotone"
                      dataKey="totalRevenue"
                      name="Doanh thu"
                      stroke={T.primary}
                      strokeWidth={3}
                      fill={`url(#${revFillGradId})`}
                      dot={false}
                      activeDot={{ r: 4, fill: T.primary }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div
                style={{
                  height: 280,
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

          <SCard title="Số lượng đơn hàng" action={null}>
            {revenue.length > 0 ? (
              <>
                <ChartLegend
                  items={[
                    { color: T.chartNavy, label: "Đơn hàng" },
                    { color: T.red, label: "Đơn hủy" },
                  ]}
                />
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart
                    data={revenue}
                    margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient
                        id={ordFillGradId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={T.chartNavy}
                          stopOpacity={0.22}
                        />
                        <stop
                          offset="92%"
                          stopColor={T.chartNavy}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
                      allowDecimals={false}
                      tick={{
                        fontFamily: "'Plus Jakarta Sans'",
                        fontSize: 11,
                        fill: T.textMuted,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip type="orders" />} />
                    <Area
                      type="monotone"
                      dataKey="totalOrders"
                      name="Đơn hàng"
                      stroke={T.chartNavy}
                      strokeWidth={3}
                      fill={`url(#${ordFillGradId})`}
                      dot={false}
                      activeDot={{ r: 4, fill: T.chartNavy }}
                    />
                    <Line
                      type="monotone"
                      dataKey="canceledOrders"
                      name="Đơn hủy"
                      stroke={T.red}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                      activeDot={{ r: 3, fill: T.red }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div
                style={{
                  height: 280,
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

        {/* ── Thống kê thanh toán + Top bán chạy ─────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 20,
          }}
          className="sh-bottom-row"
        >
          <style>{`
            @media (max-width: 960px) {
              .sh-bottom-row { grid-template-columns: 1fr !important; }
            }
          `}</style>
          <SCard
            title="Thống kê thanh toán (COD, VNPay, Ví)"
            action={null}
          >
            {paymentMethods.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: T.textMuted,
                  padding: "24px 0",
                  fontSize: 13,
                }}
              >
                Không có đơn trong khoảng thời gian
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
                      key={String(p._id)}
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

          <SCard title="Top sản phẩm bán chạy" action={null}>
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
                <button
                  type="button"
                  onClick={() => onNavigateTo?.("products")}
                  style={{
                    width: "100%",
                    marginTop: 16,
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: `2px dashed ${T.border}`,
                    background: "#FFFBF8",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 13,
                    color: T.textMid,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  Quản lý sản phẩm
                </button>
              </div>
            )}
          </SCard>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
