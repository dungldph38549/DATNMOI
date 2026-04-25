import { useState } from "react";
import { Form, Input, Switch } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllUser, updateUserById, createUserByAdmin } from "../api/index";

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

// ================================================================
// Design tokens
// ================================================================
const T = {
  primary: "#f49d25",
  primaryBg: "rgba(244,157,37,0.10)",
  border: "#E2E8F0",
  text: "#0F172A",
  textMid: "#475569",
  textMuted: "#94A3B8",
  card: "#ffffff",
  bg: "#F8F7F5",
  red: "#EF4444",
  redBg: "rgba(239,68,68,0.08)",
  green: "#22C55E",
  greenBg: "rgba(34,197,94,0.10)",
  blue: "#3B82F6",
  blueBg: "rgba(59,130,246,0.10)",
};

const toSingleLine = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .trim();

const toAvatarUrl = (avatar) => {
  if (!avatar || typeof avatar !== "string") return "";
  if (
    avatar.startsWith("http://") ||
    avatar.startsWith("https://") ||
    avatar.startsWith("data:") ||
    avatar.startsWith("blob:")
  ) {
    return avatar;
  }
  // Backend serves uploaded files from /uploads
  const normalized = avatar.startsWith("/") ? avatar.slice(1) : avatar;
  return `http://localhost:3002/uploads/${normalized}`;
};

const roleBadgeBase = {
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
};

// ── Role badge (ưu tiên `role` từ API: admin / manager / staff / customer) ──
const RoleBadge = ({ role, isAdmin, isStaff }) => {
  const r =
    role ||
    (isAdmin ? "admin" : isStaff ? "staff" : "customer");

  if (r === "admin") {
    return (
      <span
        style={{
          ...roleBadgeBase,
          background: "rgba(239,68,68,0.10)",
          color: "#DC2626",
        }}
      >
        Quản trị viên
      </span>
    );
  }
  if (r === "manager") {
    return (
      <span
        style={{
          ...roleBadgeBase,
          background: "rgba(124,58,237,0.10)",
          color: "#7C3AED",
        }}
      >
        Quản lý
      </span>
    );
  }
  if (r === "staff") {
    return (
      <span
        style={{
          ...roleBadgeBase,
          background: T.blueBg,
          color: T.blue,
        }}
      >
        Nhân viên
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "-0.015em",
        lineHeight: 1.25,
        textTransform: "none",
        whiteSpace: "nowrap",
        color: "#9A3412",
        background:
          "linear-gradient(180deg, #FFFCF9 0%, #FFF7ED 45%, #FFEDD5 100%)",
        border: "1px solid rgba(251, 146, 60, 0.42)",
        boxShadow:
          "0 1px 2px rgba(154, 52, 18, 0.06), inset 0 1px 0 rgba(255,255,255,0.92)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          flexShrink: 0,
          background: "#F59E0B",
          boxShadow: "0 0 0 2px rgba(251, 191, 36, 0.4)",
        }}
      />
      Khách hàng
    </span>
  );
};

// ── Status dot ─────────────────────────────────────────────────
const StatusDot = ({ isBanned }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: isBanned ? T.red : T.green,
        boxShadow: isBanned
          ? "0 0 0 3px rgba(239,68,68,0.18)"
          : "0 0 0 3px rgba(34,197,94,0.18)",
      }}
    />
    <span
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: isBanned ? T.red : T.green,
      }}
    >
      {isBanned ? "Bị khóa" : "Hoạt động"}
    </span>
  </div>
);

// ── Avatar ─────────────────────────────────────────────────────
const Avatar = ({ name, avatar }) => {
  const initials = (name || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const avatarUrl = toAvatarUrl(avatar);
  return avatarUrl ? (
    <img
      src={avatarUrl}
      alt={name}
      style={{
        width: 38,
        height: 38,
        borderRadius: "50%",
        objectFit: "cover",
        border: `2px solid ${T.border}`,
      }}
    />
  ) : (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: "50%",
        background: T.primaryBg,
        border: `2px solid rgba(244,157,37,0.25)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 13,
        color: T.primary,
      }}
    >
      {initials}
    </div>
  );
};

// ── Pagination ─────────────────────────────────────────────────
const Pagination = ({ page, total, limit, onChange, entityLabel = "người dùng" }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pages = [];

  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    )
      pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  const btnStyle = (active) => ({
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    border: "none",
    background: active ? T.primary : "transparent",
    color: active ? "#fff" : T.textMid,
    fontWeight: active ? 700 : 500,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "all 0.15s",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 24,
      }}
    >
      <p style={{ fontSize: 13, color: T.textMuted }}>
        Hiển thị{" "}
        <b style={{ color: T.text }}>
          {Math.min((page - 1) * limit + 1, total)}–
          {Math.min(page * limit, total)}
        </b>{" "}
        của <b style={{ color: T.text }}>{total}</b> {entityLabel}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          style={btnStyle(false)}
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          onMouseEnter={(e) => {
            if (page !== 1) e.currentTarget.style.background = "#F1F5F9";
          }}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            chevron_left
          </span>
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`dot-${i}`}
              style={{ fontSize: 13, color: T.textMuted, padding: "0 4px" }}
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              style={btnStyle(p === page)}
              onClick={() => onChange(p)}
              onMouseEnter={(e) => {
                if (p !== page) e.currentTarget.style.background = "#F1F5F9";
              }}
              onMouseLeave={(e) => {
                if (p !== page)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              {p}
            </button>
          ),
        )}
        <button
          style={btnStyle(false)}
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          onMouseEnter={(e) => {
            if (page !== totalPages)
              e.currentTarget.style.background = "#F1F5F9";
          }}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            chevron_right
          </span>
        </button>
      </div>
    </div>
  );
};

// ── Role Picker trong modal ────────────────────────────────────
const ROLES = [
  {
    key: "customer",
    label: "Khách hàng",
    icon: "person",
    bg: "#F1F5F9",
    color: "#64748B",
  },
  {
    key: "staff",
    label: "Nhân viên",
    icon: "badge",
    bg: T.blueBg,
    color: T.blue,
  },
  {
    key: "manager",
    label: "Quản lý",
    icon: "supervisor_account",
    bg: "rgba(59,130,246,0.08)",
    color: "#2563EB",
  },
  {
    key: "admin",
    label: "Quản trị",
    icon: "admin_panel_settings",
    bg: "rgba(239,68,68,0.10)",
    color: "#DC2626",
  },
];

const RolePicker = ({ value, onChange, variant = "all" }) => {
  const roles =
    variant === "staff"
      ? ROLES.filter((r) => r.key !== "customer")
      : ROLES;
  const cols =
    roles.length <= 3 ? "repeat(3, 1fr)" : "repeat(2, 1fr)";
  return (
  <div style={{ display: "grid", gridTemplateColumns: cols, gap: 8 }}>
    {roles.map((r) => {
      const active = value === r.key;
      return (
        <button
          key={r.key}
          type="button"
          onClick={() => onChange(r.key)}
          style={{
            padding: "10px 8px",
            borderRadius: 10,
            border: `2px solid ${active ? r.color : T.border}`,
            background: active ? r.bg : "#fff",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
            transition: "all 0.15s",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
              color: active ? r.color : T.textMuted,
              fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            {r.icon}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: active ? r.color : T.textMuted,
            }}
          >
            {r.label}
          </span>
        </button>
      );
    })}
  </div>
  );
};

// ================================================================
// Main Component
// mode: "customers" — chỉ khách hàng | "staff" — chỉ nhân viên (staff/manager/admin)
// ================================================================
const Users = ({ mode = "customers" }) => {
  const listScope = mode === "staff" ? "staff" : "customers";
  const isStaffPage = mode === "staff";
  const canAddStaff = getAdminSession()?.role === "admin";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleValue, setRoleValue] = useState("customer");
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "staff",
  });
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const limit = 10;

  // ── Query ──────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-user", page, listScope],
    queryFn: () => getAllUser(page - 1, limit, { scope: listScope }),
    keepPreviousData: true,
  });

  // ── Mutation ───────────────────────────────────────────────
  const { mutate: updateUser, isPending } = useMutation({
    mutationFn: ({ id, data }) => updateUserById(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user"] });
      setSelectedUser(null);
      showToast("Cập nhật người dùng thành công!", "success");
    },
    onError: () => showToast("Lỗi khi cập nhật người dùng", "error"),
  });

  const { mutate: createStaff, isPending: createPending } = useMutation({
    mutationFn: (payload) => createUserByAdmin(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user"] });
      setShowCreateStaff(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        role: "staff",
      });
      showToast("Đã tạo tài khoản nhân viên", "success");
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Không tạo được tài khoản";
      showToast(msg, "error");
    },
  });

  // ── Toast đơn giản ────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Mở modal edit ─────────────────────────────────────────
  const handleEdit = (user) => {
    setSelectedUser(user);
    const r = user.role;
    if (["customer", "staff", "manager", "admin"].includes(r)) {
      setRoleValue(r);
    } else {
      setRoleValue(user.isAdmin ? "admin" : user.isStaff ? "staff" : "customer");
    }
    form.setFieldsValue({
      password: "",
      isBanned: user.isBanned || false,
      voucherUsageLimit:
        user.voucherUsageLimit === null || user.voucherUsageLimit === undefined
          ? ""
          : String(user.voucherUsageLimit),
    });
  };

  // ── Submit modal ──────────────────────────────────────────
  const handleSubmit = (values) => {
    const voucherLimitRaw = String(values.voucherUsageLimit || "").trim();
    let voucherUsageLimit = null;
    if (voucherLimitRaw !== "") {
      const parsed = Number(voucherLimitRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        showToast("Giới hạn voucher phải là số >= 0", "error");
        return;
      }
      voucherUsageLimit = Math.floor(parsed);
    }

    updateUser({
      id: selectedUser._id,
      data: {
        ...(values.password ? { password: values.password } : {}),
        role: roleValue,
        isBanned: values.isBanned,
        voucherUsageLimit,
      },
    });
  };

  // ── Filter client-side theo search ───────────────────────
  // data = { status, data: { data: [...], total, page } }  ← cấu trúc từ successResponse
  const STAFF_ROLES = new Set(["staff", "manager", "admin"]);
  const ROLE_PRIORITY = { admin: 0, manager: 1, staff: 2 };
  const users = (data?.data?.data || [])
    .filter((u) => {
      if (!isStaffPage) return true;
      const r = String(u?.role || "").toLowerCase();
      return STAFF_ROLES.has(r) || u.isStaff || u.isAdmin;
    })
    .filter((u) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (!isStaffPage) return 0;
      const ra = String(a?.role || "").toLowerCase();
      const rb = String(b?.role || "").toLowerCase();
      const pa = ROLE_PRIORITY[ra] ?? 99;
      const pb = ROLE_PRIORITY[rb] ?? 99;
      if (pa !== pb) return pa - pb;
      const ta = new Date(a?.createdAt || 0).getTime();
      const tb = new Date(b?.createdAt || 0).getTime();
      return tb - ta;
    });

  // ── Loading / error states ────────────────────────────────
  if (isLoading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 320,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: `3px solid ${T.border}`,
              borderTopColor: T.primary,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ color: T.textMuted, fontSize: 13 }}>
            {isStaffPage
              ? "Đang tải danh sách nhân viên..."
              : "Đang tải danh sách người dùng..."}
          </p>
        </div>
      </div>
    );

  if (isError || !data)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 280,
          gap: 10,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: T.textMuted,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 40, color: T.red }}
        >
          error_outline
        </span>
        <p style={{ fontSize: 14, fontWeight: 500 }}>
          Lỗi khi tải danh sách người dùng
        </p>
      </div>
    );

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined'; font-style: normal;
          line-height: 1; text-transform: none; display: inline-block;
          white-space: nowrap; font-size: 24px;
        }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .sh-row:hover td { background: #FFFBF5 !important; }
        .sh-form .ant-form-item { margin-bottom: 0; }
        .sh-form .ant-input, .sh-form .ant-input-password {
          border-radius: 10px !important; font-family: 'Plus Jakarta Sans', sans-serif !important;
          font-size: 13px !important; border: 1.5px solid #E2E8F0 !important;
        }
        .sh-form .ant-input:focus, .sh-form .ant-input-affix-wrapper:focus,
        .sh-form .ant-input-affix-wrapper-focused {
          border-color: #f49d25 !important;
          box-shadow: 0 0 0 3px rgba(244,157,37,0.10) !important;
        }
        .sh-form .ant-switch-checked { background: #f49d25 !important; }
        .staff-add-btn { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .staff-add-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(244,157,37,0.28) !important;
        }
        .staff-add-btn:active { transform: translateY(0); }
        .staff-admin-root .sh-row:hover td {
          background: #fff8f0 !important;
        }
      `}</style>

      <div
        className={isStaffPage ? "staff-admin-root" : undefined}
        style={{
          padding: 28,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          minHeight: "100vh",
          background: isStaffPage
            ? "linear-gradient(165deg, #FFFCF9 0%, #FAF6F0 38%, #F5F0E8 100%)"
            : T.bg,
        }}
      >
        {/* Toast */}
        {toast && (
          <div
            style={{
              position: "fixed",
              top: 20,
              right: 24,
              zIndex: 9999,
              padding: "12px 20px",
              borderRadius: 12,
              background: toast.type === "success" ? T.greenBg : T.redBg,
              border: `1.5px solid ${toast.type === "success" ? T.green : T.red}`,
              color: toast.type === "success" ? "#15803D" : T.red,
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              animation: "fadeIn 0.2s ease",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              {toast.type === "success" ? "check_circle" : "error"}
            </span>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: isStaffPage ? "flex-start" : "center",
            justifyContent: "space-between",
            marginBottom: isStaffPage ? 20 : 24,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: isStaffPage ? 14 : 0,
              alignItems: "flex-start",
              minWidth: 0,
            }}
          >
            {isStaffPage && (
              <div
                aria-hidden
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  flexShrink: 0,
                  background:
                    "linear-gradient(150deg, rgba(244,157,37,0.2) 0%, rgba(244,157,37,0.06) 100%)",
                  border: "1px solid rgba(244,157,37,0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow:
                    "0 3px 12px rgba(244,157,37,0.12), inset 0 1px 0 rgba(255,255,255,0.75)",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 28, color: "#C2410C" }}
                >
                  groups
                </span>
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: isStaffPage ? 24 : 22,
                  fontWeight: 800,
                  color: T.text,
                  letterSpacing: "-0.35px",
                  lineHeight: 1.2,
                }}
              >
                {isStaffPage ? "Quản lý nhân viên" : "Quản lý khách hàng"}
              </h1>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 13,
                  color: T.textMuted,
                  lineHeight: 1.45,
                  maxWidth: isStaffPage ? 540 : undefined,
                }}
              >
                {isStaffPage
                  ? "Gồm nhân viên, quản lý và quản trị viên — không hiển thị khách hàng"
                  : "Danh sách tài khoản khách hàng đăng ký trên shop"}
              </p>
            </div>
          </div>
          {isStaffPage && canAddStaff && (
            <button
              type="button"
              className="staff-add-btn"
              onClick={() => setShowCreateStaff(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "11px 22px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(180deg, #f6b356 0%, #f49d25 55%, #ea8e18 100%)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                boxShadow: "0 4px 16px rgba(244,157,37,0.28)",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                person_add
              </span>
              Thêm nhân viên
            </button>
          )}
        </div>

        {isStaffPage && (
          <div
            style={{
              marginBottom: 18,
              borderRadius: 14,
              overflow: "hidden",
              background: "#fff",
              border: `1px solid ${T.border}`,
              boxShadow: "0 4px 20px rgba(15,23,42,0.06)",
            }}
          >
            <div
              aria-hidden
              style={{
                height: 3,
                background:
                  "linear-gradient(90deg, #f49d25 0%, #fbbf24 50%, #f97316 100%)",
              }}
            />
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 11,
                padding: "14px 17px 15px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.textMid,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 19, color: T.primary }}
                >
                  label
                </span>
                Vai trò hiển thị
              </span>
              <span
                style={{
                  width: 1,
                  height: 22,
                  background: T.border,
                  alignSelf: "center",
                  flexShrink: 0,
                  display: "inline-block",
                }}
                aria-hidden
              />
              <span
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  background: T.blueBg,
                  color: T.blue,
                  border: "1px solid rgba(59,130,246,0.25)",
                  whiteSpace: "nowrap",
                }}
              >
                Nhân viên
              </span>
              <span
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  background: "rgba(124,58,237,0.10)",
                  color: "#7C3AED",
                  border: "1px solid rgba(124,58,237,0.25)",
                  whiteSpace: "nowrap",
                }}
              >
                Quản lý
              </span>
              <span
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  background: "rgba(239,68,68,0.10)",
                  color: "#DC2626",
                  border: "1px solid rgba(239,68,68,0.22)",
                  whiteSpace: "nowrap",
                }}
              >
                Quản trị viên
              </span>
            </div>
          </div>
        )}

        {/* Search + filter bar */}
        <div
          style={{
            background: T.card,
            borderRadius: 14,
            border: isStaffPage
              ? "1px solid rgba(244,157,37,0.18)"
              : `1px solid ${T.border}`,
            boxShadow: isStaffPage
              ? "0 2px 14px rgba(244,157,37,0.08), 0 1px 3px rgba(0,0,0,0.03)"
              : "0 1px 3px rgba(0,0,0,0.04)",
            padding: "14px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, position: "relative" }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 18,
                color: T.textMuted,
              }}
            >
              search
            </span>
            <input
              placeholder="Tìm kiếm theo tên, email, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 14px 9px 38px",
                borderRadius: 10,
                border: `1.5px solid ${T.border}`,
                outline: "none",
                fontSize: 13,
                color: T.text,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: isStaffPage ? "#FFFCF9" : "#F8FAFC",
                boxSizing: "border-box",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = T.primary;
                if (isStaffPage) {
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(244,157,37,0.12)";
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = T.border;
                if (isStaffPage) e.target.style.boxShadow = "none";
              }}
            />
          </div>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 16px",
              borderRadius: 10,
              border: `1.5px solid ${T.border}`,
              background: "#fff",
              color: T.textMid,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              filter_list
            </span>
            Bộ lọc
          </button>
        </div>

        {/* Table */}
        <div
          style={{
            background: T.card,
            borderRadius: 14,
            border: isStaffPage
              ? "1px solid rgba(244,157,37,0.14)"
              : `1px solid ${T.border}`,
            boxShadow: isStaffPage
              ? "0 4px 22px rgba(15,23,42,0.07), 0 0 0 1px rgba(244,157,37,0.04)"
              : "0 1px 3px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: isStaffPage
                      ? "linear-gradient(180deg, #FFF9F3 0%, #F8FAFC 55%, #F1F5F9 100%)"
                      : "#F8FAFC",
                    borderBottom: `1.5px solid ${T.border}`,
                  }}
                >
                  {[
                    isStaffPage ? "Nhân sự" : "Người dùng",
                    "Email",
                    "SĐT",
                    isStaffPage
                      ? "Vai trò (nhân viên · quản lý · quản trị)"
                      : "Vai trò",
                    "Giới hạn voucher",
                    "Ngày tham gia",
                    "Trạng thái",
                    "Thao tác",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 18px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: T.textMuted,
                        fontSize: 13,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 36, opacity: 0.3 }}
                        >
                          person_off
                        </span>
                        {isStaffPage
                          ? "Không tìm thấy nhân viên hoặc quản lý"
                          : "Không tìm thấy khách hàng"}
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user._id}
                      className="sh-row"
                      style={{ borderBottom: `1px solid #F1F5F9` }}
                    >
                      {/* Avatar + Tên */}
                      <td style={{ padding: "14px 18px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <Avatar name={user.name} avatar={user.avatar} />
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: T.text,
                              display: "block",
                              minWidth: 0,
                              maxWidth: 180,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={toSingleLine(user.name || "—")}
                          >
                            {toSingleLine(user.name || "—")}
                          </span>
                        </div>
                      </td>
                      {/* Email */}
                      <td
                        style={{
                          padding: "14px 18px",
                          fontSize: 13,
                          color: T.textMid,
                        }}
                      >
                        {user.email}
                      </td>
                      {/* SĐT */}
                      <td
                        style={{
                          padding: "14px 18px",
                          fontSize: 13,
                          color: T.textMid,
                        }}
                      >
                        {user.phone || "—"}
                      </td>
                      {/* Vai trò — nhân viên / quản lý / quản trị (theo role) */}
                      <td
                        style={{
                          padding: "14px 18px",
                          verticalAlign: "middle",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <RoleBadge
                          role={user.role}
                          isAdmin={user.isAdmin}
                          isStaff={user.isStaff}
                        />
                      </td>
                      {/* Giới hạn voucher */}
                      <td
                        style={{
                          padding: "14px 18px",
                          fontSize: 13,
                          color: T.textMid,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {user.voucherUsageLimit == null
                          ? "Mặc định theo hạng"
                          : Number(user.voucherUsageLimit) === 0
                            ? "Không giới hạn"
                            : `${Number(user.voucherUsageLimit)} lần`}
                      </td>
                      {/* Ngày tham gia */}
                      <td
                        style={{
                          padding: "14px 18px",
                          fontSize: 13,
                          color: T.textMid,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      {/* Trạng thái */}
                      <td style={{ padding: "14px 18px" }}>
                        <StatusDot isBanned={user.isBanned} />
                      </td>
                      {/* Thao tác */}
                      <td style={{ padding: "14px 18px" }}>
                        <button
                          onClick={() => handleEdit(user)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "7px 14px",
                            borderRadius: 8,
                            border: `1.5px solid ${T.border}`,
                            background: "#fff",
                            color: T.textMid,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = T.primary;
                            e.currentTarget.style.color = T.primary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = T.border;
                            e.currentTarget.style.color = T.textMid;
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 15 }}
                          >
                            edit
                          </span>
                          Sửa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            style={{
              padding: "16px 20px",
              borderTop: `1px solid ${T.border}`,
              background: isStaffPage
                ? "linear-gradient(180deg, #FFFCF9 0%, #ffffff 100%)"
                : undefined,
            }}
          >
            <Pagination
              page={page}
              total={data?.data?.total || 0}
              limit={limit}
              onChange={setPage}
              entityLabel={isStaffPage ? "nhân viên" : "khách hàng"}
            />
          </div>
        </div>
      </div>

      {/* ── Modal chỉnh sửa ──────────────────────────────────── */}
      {selectedUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(2px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedUser(null);
          }}
        >
          <div
            style={{
              background: T.card,
              borderRadius: 20,
              border: `1px solid ${T.border}`,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              width: "100%",
              maxWidth: 440,
              padding: 28,
              animation: "slideUp 0.2s ease",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 22,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <Avatar name={selectedUser.name} avatar={selectedUser.avatar} />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: T.text,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 240,
                    }}
                    title={toSingleLine(selectedUser.name)}
                  >
                    {toSingleLine(selectedUser.name)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: T.textMuted,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 240,
                    }}
                    title={toSingleLine(selectedUser.email)}
                  >
                    {toSingleLine(selectedUser.email)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                style={{
                  background: "#F1F5F9",
                  border: "none",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.textMid,
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

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              className="sh-form"
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: 18 }}
              >
                {/* Phân quyền */}
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: T.textMid,
                      marginBottom: 8,
                    }}
                  >
                    Vai trò người dùng
                  </div>
                  <RolePicker
                    value={roleValue}
                    onChange={setRoleValue}
                    variant={isStaffPage ? "staff" : "all"}
                  />
                </div>

                <div
                  style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}
                >
                  {/* Giới hạn voucher theo tài khoản */}
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.textMid,
                        marginBottom: 6,
                      }}
                    >
                      Giới hạn dùng voucher{" "}
                      <span style={{ color: T.textMuted, fontWeight: 400 }}>
                        (để trống = theo hạng tài khoản, 0 = không giới hạn)
                      </span>
                    </div>
                    <Form.Item name="voucherUsageLimit" noStyle>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Ví dụ: 3"
                        style={{
                          borderRadius: 10,
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: 13,
                        }}
                      />
                    </Form.Item>
                  </div>

                  {/* Mật khẩu mới */}
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.textMid,
                        marginBottom: 6,
                      }}
                    >
                      Mật khẩu mới{" "}
                      <span style={{ color: T.textMuted, fontWeight: 400 }}>
                        (để trống nếu không đổi)
                      </span>
                    </div>
                    <Form.Item name="password" noStyle>
                      <Input.Password
                        placeholder="Nhập mật khẩu mới..."
                        style={{
                          borderRadius: 10,
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: 13,
                        }}
                      />
                    </Form.Item>
                  </div>

                  {/* Trạng thái tài khoản */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: `1px solid ${T.border}`,
                      background: "#F8FAFC",
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 13, fontWeight: 600, color: T.text }}
                      >
                        Khóa tài khoản
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: T.textMuted,
                          marginTop: 1,
                        }}
                      >
                        Người dùng sẽ không thể đăng nhập
                      </div>
                    </div>
                    <Form.Item name="isBanned" valuePropName="checked" noStyle>
                      <Switch
                        style={{
                          background: form.getFieldValue("isBanned")
                            ? T.red
                            : undefined,
                        }}
                      />
                    </Form.Item>
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: 10,
                      border: `1.5px solid ${T.border}`,
                      background: "#fff",
                      color: T.textMid,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    style={{
                      flex: 2,
                      padding: "10px",
                      borderRadius: 10,
                      border: "none",
                      background: T.primary,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      boxShadow: "0 4px 14px rgba(244,157,37,0.30)",
                      opacity: isPending ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {isPending ? (
                      <>
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            border: "2px solid rgba(255,255,255,0.4)",
                            borderTopColor: "#fff",
                            borderRadius: "50%",
                            animation: "spin 0.7s linear infinite",
                          }}
                        />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 16 }}
                        >
                          save
                        </span>
                        Lưu thay đổi
                      </>
                    )}
                  </button>
                </div>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* Tạo nhân viên — chỉ admin */}
      {showCreateStaff && canAddStaff && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(2px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateStaff(false);
          }}
        >
          <div
            style={{
              background: T.card,
              borderRadius: 20,
              border: `1px solid ${T.border}`,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              width: "100%",
              maxWidth: 440,
              padding: 28,
              animation: "slideUp 0.2s ease",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>
                Thêm nhân viên
              </div>
              <button
                type="button"
                onClick={() => setShowCreateStaff(false)}
                style={{
                  background: "#F1F5F9",
                  border: "none",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.textMid,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  close
                </span>
              </button>
            </div>
            <p style={{ fontSize: 12, color: T.textMuted, margin: "0 0 16px" }}>
              Chỉ tài khoản quản trị viên (admin) mới tạo được. Khách hàng đăng ký qua trang chủ, không thêm tại đây.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 6 }}>
                  Họ tên
                </div>
                <Input
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Nguyễn Văn A"
                  style={{ borderRadius: 10, fontSize: 13 }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 6 }}>
                  Email
                </div>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="email@company.com"
                  style={{ borderRadius: 10, fontSize: 13 }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 6 }}>
                  Mật khẩu
                </div>
                <Input.Password
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Tối thiểu 6 ký tự"
                  style={{ borderRadius: 10, fontSize: 13 }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 6 }}>
                  Số điện thoại
                </div>
                <Input
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="09xxxxxxxx"
                  style={{ borderRadius: 10, fontSize: 13 }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 8 }}>
                  Vai trò
                </div>
                <RolePicker
                  value={createForm.role}
                  onChange={(key) =>
                    setCreateForm((f) => ({ ...f, role: key }))
                  }
                  variant="staff"
                />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateStaff(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 10,
                    border: `1.5px solid ${T.border}`,
                    background: "#fff",
                    color: T.textMid,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={createPending}
                  onClick={() => {
                    const { name, email, password, phone, role } = createForm;
                    if (
                      !String(name || "").trim() ||
                      !String(email || "").trim() ||
                      !password ||
                      !String(phone || "").trim()
                    ) {
                      showToast("Vui lòng điền đủ họ tên, email, mật khẩu và SĐT", "error");
                      return;
                    }
                    if (String(password).length < 6) {
                      showToast("Mật khẩu ít nhất 6 ký tự", "error");
                      return;
                    }
                    createStaff({
                      name: String(name).trim(),
                      email: String(email).trim(),
                      password,
                      phone: String(phone).trim(),
                      role,
                    });
                  }}
                  style={{
                    flex: 2,
                    padding: "10px",
                    borderRadius: 10,
                    border: "none",
                    background: T.primary,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    opacity: createPending ? 0.7 : 1,
                  }}
                >
                  {createPending ? "Đang tạo…" : "Tạo tài khoản"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Users;
