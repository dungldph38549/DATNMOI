import { useState } from "react";
import { Form, Input, Switch } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllUser, updateUserById } from "../api/index";

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

// ── Role badge ─────────────────────────────────────────────────
const RoleBadge = ({ isAdmin, isStaff }) => {
  if (isAdmin)
    return (
      <span
        style={{
          padding: "3px 10px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          background: "rgba(239,68,68,0.10)",
          color: "#DC2626",
        }}
      >
        Quản trị viên
      </span>
    );
  if (isStaff)
    return (
      <span
        style={{
          padding: "3px 10px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          background: T.blueBg,
          color: T.blue,
        }}
      >
        Nhân viên
      </span>
    );
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        background: "#F1F5F9",
        color: "#64748B",
      }}
    >
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
  return avatar ? (
    <img
      src={avatar}
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
const Pagination = ({ page, total, limit, onChange }) => {
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
        của <b style={{ color: T.text }}>{total}</b> người dùng
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
    key: "admin",
    label: "Quản trị",
    icon: "admin_panel_settings",
    bg: "rgba(239,68,68,0.10)",
    color: "#DC2626",
  },
];

const RolePicker = ({ value, onChange }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
    {ROLES.map((r) => {
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

// ================================================================
// Main Component
// ================================================================
const Users = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleValue, setRoleValue] = useState("customer");
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const limit = 10;

  // ── Query ──────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-user", page],
    queryFn: () => getAllUser(page - 1, limit),
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

  // ── Toast đơn giản ────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Mở modal edit ─────────────────────────────────────────
  const handleEdit = (user) => {
    setSelectedUser(user);
    const role = user.isAdmin ? "admin" : user.isStaff ? "staff" : "customer";
    setRoleValue(role);
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
        isAdmin: roleValue === "admin",
        isStaff: roleValue === "staff",
        isBanned: values.isBanned,
        voucherUsageLimit,
      },
    });
  };

  // ── Filter client-side theo search ───────────────────────
  // data = { status, data: { data: [...], total, page } }  ← cấu trúc từ successResponse
  const users = (data?.data?.data || []).filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    );
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
            Đang tải danh sách người dùng...
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
      `}</style>

      <div
        style={{
          padding: 28,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          minHeight: "100vh",
          background: T.bg,
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
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
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
              Quản lý người dùng
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>
              Xem và quản trị danh sách thành viên trong hệ thống
            </p>
          </div>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 20px",
              borderRadius: 999,
              border: "none",
              background: T.primary,
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: "0 4px 14px rgba(244,157,37,0.30)",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              person_add
            </span>
            Thêm người dùng
          </button>
        </div>

        {/* Search + filter bar */}
        <div
          style={{
            background: T.card,
            borderRadius: 14,
            border: `1px solid ${T.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
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
                background: "#F8FAFC",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = T.primary)}
              onBlur={(e) => (e.target.style.borderColor = T.border)}
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
            border: `1px solid ${T.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: "#F8FAFC",
                    borderBottom: `1.5px solid ${T.border}`,
                  }}
                >
                  {[
                    "Người dùng",
                    "Email",
                    "SĐT",
                    "Vai trò",
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
                        Không tìm thấy người dùng
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
                            }}
                          >
                            {user.name || "—"}
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
                      {/* Vai trò */}
                      <td style={{ padding: "14px 18px" }}>
                        <RoleBadge
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
            style={{ padding: "16px 20px", borderTop: `1px solid ${T.border}` }}
          >
            <Pagination
              page={page}
              total={data?.data?.total || 0}
              limit={limit}
              onChange={setPage}
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
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={selectedUser.name} avatar={selectedUser.avatar} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
                    {selectedUser.name}
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>
                    {selectedUser.email}
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
                  <RolePicker value={roleValue} onChange={setRoleValue} />
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
    </>
  );
};

export default Users;
