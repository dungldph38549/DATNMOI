import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import notify from "../utils/notify";
import {
  createBanner,
  deleteBanner,
  getAdminBanners,
  reorderBanners,
  toggleBanner,
  updateBanner,
  uploadImage,
} from "../api";

const T = {
  primary: "#f49d25",
  border: "#E5E7EB",
  text: "#111827",
  muted: "#6B7280",
};

const emptyForm = {
  title: "",
  subtitle: "",
  image: "",
  link: "",
  order: 0,
  isActive: true,
  startDate: "",
  endDate: "",
};

const toDatetimeInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mm = `${d.getMinutes()}`.padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
};

const toApiDate = (value) => (value ? new Date(value).toISOString() : null);

export default function BannerManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [dragId, setDragId] = useState("");
  const [rows, setRows] = useState([]);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: getAdminBanners,
  });

  const list = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data]);

  useEffect(() => {
    setRows(list);
  }, [list]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-banners"] });

  const createMut = useMutation({
    mutationFn: createBanner,
    onSuccess: () => {
      notify.success("Tạo banner thành công");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      refresh();
    },
    onError: (e) => notify.error(e?.response?.data?.message || "Không thể tạo banner"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => updateBanner(id, payload),
    onSuccess: () => {
      notify.success("Cập nhật banner thành công");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      refresh();
    },
    onError: (e) => notify.error(e?.response?.data?.message || "Không thể cập nhật banner"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteBanner,
    onSuccess: () => {
      notify.success("Xóa banner thành công");
      refresh();
    },
    onError: (e) => notify.error(e?.response?.data?.message || "Không thể xóa banner"),
  });

  const toggleMut = useMutation({
    mutationFn: toggleBanner,
    onSuccess: () => {
      notify.success("Đã cập nhật trạng thái banner");
      refresh();
    },
    onError: (e) => notify.error(e?.response?.data?.message || "Không thể đổi trạng thái"),
  });

  const reorderMut = useMutation({
    mutationFn: reorderBanners,
    onSuccess: () => {
      notify.success("Đã cập nhật thứ tự hiển thị");
      refresh();
    },
    onError: (e) => notify.error(e?.response?.data?.message || "Không thể sắp xếp banner"),
  });

  const onSubmit = () => {
    if (!form.title.trim()) return notify.warning("Vui lòng nhập tiêu đề banner");
    if (!form.image.trim()) return notify.warning("Vui lòng chọn ảnh banner");
    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      image: form.image.trim(),
      link: form.link.trim(),
      order: Number(form.order || 0),
      isActive: !!form.isActive,
      startDate: toApiDate(form.startDate),
      endDate: toApiDate(form.endDate),
    };
    if (editing?._id) updateMut.mutate({ id: editing._id, payload });
    else createMut.mutate(payload);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, order: rows.length });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      title: row.title || "",
      subtitle: row.subtitle || "",
      image: row.image || "",
      link: row.link || "",
      order: Number(row.order || 0),
      isActive: row.isActive !== false,
      startDate: toDatetimeInput(row.startDate),
      endDate: toDatetimeInput(row.endDate),
    });
    setOpen(true);
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadImage(fd);
      const path = String(res?.path || "").trim();
      if (!path) throw new Error("Upload thất bại");
      setForm((prev) => ({
        ...prev,
        image: `http://localhost:3002/uploads/${path}`,
      }));
      notify.success("Tải ảnh lên thành công");
    } catch (e) {
      notify.error(e?.response?.data?.message || e?.message || "Không thể tải ảnh");
    } finally {
      setUploading(false);
    }
  };

  const onDropRow = (targetId) => {
    if (!dragId || dragId === targetId) return;
    const from = rows.findIndex((x) => x._id === dragId);
    const to = rows.findIndex((x) => x._id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const payload = next.map((item, idx) => ({ id: item._id, order: idx }));
    setRows(next.map((item, idx) => ({ ...item, order: idx })));
    reorderMut.mutate(payload);
  };

  return (
    <div style={{ fontFamily: "Lexend, Plus Jakarta Sans, sans-serif", color: T.text }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Quản lý banner trang chủ</h2>
        <button
          onClick={openCreate}
          style={{
            border: "none",
            background: T.primary,
            color: "#fff",
            borderRadius: 12,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Thêm banner
        </button>
      </div>

      <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#F9FAFB" }}>
            <tr>
              {["Thứ tự", "Ảnh", "Tiêu đề", "Trạng thái", "Hiệu lực", "Thao tác"].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 12, padding: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: 16 }}>Đang tải dữ liệu...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 16 }}>Chưa có banner nào</td></tr>
            ) : (
              rows.map((b) => (
                <tr
                  key={b._id}
                  draggable
                  onDragStart={() => setDragId(b._id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropRow(b._id)}
                  style={{ borderTop: `1px solid ${T.border}` }}
                >
                  <td style={{ padding: 12, fontWeight: 700 }}>{b.order ?? 0}</td>
                  <td style={{ padding: 12 }}>
                    <img src={b.image} alt={b.title} style={{ width: 90, height: 48, objectFit: "cover", borderRadius: 8 }} loading="lazy" />
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 700 }}>{b.title}</div>
                    <div style={{ color: T.muted, fontSize: 12 }}>{b.subtitle || "—"}</div>
                  </td>
                  <td style={{ padding: 12 }}>
                    <button
                      onClick={() => toggleMut.mutate(b._id)}
                      style={{
                        border: `1px solid ${b.isActive ? "#86EFAC" : "#FCA5A5"}`,
                        borderRadius: 999,
                        padding: "4px 10px",
                        background: b.isActive ? "#ECFDF3" : "#FEF2F2",
                        color: b.isActive ? "#15803D" : "#B91C1C",
                        cursor: "pointer",
                      }}
                    >
                      {b.isActive ? "Đang bật" : "Đang tắt"}
                    </button>
                  </td>
                  <td style={{ padding: 12, fontSize: 12 }}>
                    {b.startDate ? new Date(b.startDate).toLocaleString("vi-VN") : "Không giới hạn"}<br />
                    {b.endDate ? new Date(b.endDate).toLocaleString("vi-VN") : "Không giới hạn"}
                  </td>
                  <td style={{ padding: 12, display: "flex", gap: 8 }}>
                    <button onClick={() => openEdit(b)} style={{ borderRadius: 10, border: `1px solid ${T.border}`, padding: "6px 10px", cursor: "pointer" }}>Sửa</button>
                    <button
                      onClick={() => {
                        if (window.confirm("Bạn có chắc muốn xóa banner này?")) deleteMut.mutate(b._id);
                      }}
                      style={{ borderRadius: 10, border: "1px solid #FCA5A5", color: "#B91C1C", background: "#fff", padding: "6px 10px", cursor: "pointer" }}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ width: "min(920px, 92vw)", background: "#fff", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>{editing ? "Cập nhật banner" : "Tạo banner mới"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Tiêu đề" style={{ borderRadius: 12, border: `1px solid ${T.border}`, padding: 10 }} />
              <input value={form.subtitle} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} placeholder="Phụ đề" style={{ borderRadius: 12, border: `1px solid ${T.border}`, padding: 10 }} />
              <input value={form.link} onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))} placeholder="Link đích" style={{ borderRadius: 12, border: `1px solid ${T.border}`, padding: 10 }} />
              <input type="number" value={form.order} onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))} placeholder="Thứ tự" style={{ borderRadius: 12, border: `1px solid ${T.border}`, padding: 10 }} />
              <input type="datetime-local" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} style={{ borderRadius: 12, border: `1px solid ${T.border}`, padding: 10 }} />
              <input type="datetime-local" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} style={{ borderRadius: 12, border: `1px solid ${T.border}`, padding: 10 }} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
                Đang kích hoạt
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0])} />
                {uploading ? "Đang tải ảnh..." : "Tải ảnh"}
              </label>
            </div>

            <div style={{ marginTop: 12 }}>
              <input value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} placeholder="URL ảnh banner" style={{ width: "100%", borderRadius: 12, border: `1px solid ${T.border}`, padding: 10 }} />
            </div>

            {form.image && (
              <div style={{ marginTop: 12, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: 8, background: "#F9FAFB", fontSize: 12, color: T.muted }}>Preview banner</div>
                <div style={{ position: "relative" }}>
                  <img src={form.image} alt="preview" style={{ width: "100%", height: 230, objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.4))" }} />
                  <div style={{ position: "absolute", left: 16, bottom: 16, color: "#fff" }}>
                    <div style={{ fontWeight: 800, fontSize: 24 }}>{form.title || "Tiêu đề banner"}</div>
                    <div style={{ fontSize: 13 }}>{form.subtitle || "Phụ đề banner"}</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button onClick={() => setOpen(false)} style={{ borderRadius: 12, border: `1px solid ${T.border}`, background: "#fff", padding: "8px 14px", cursor: "pointer" }}>Đóng</button>
              <button onClick={onSubmit} style={{ borderRadius: 12, border: "none", background: T.primary, color: "#fff", padding: "8px 14px", cursor: "pointer", fontWeight: 700 }}>
                {editing ? "Lưu cập nhật" : "Tạo banner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
