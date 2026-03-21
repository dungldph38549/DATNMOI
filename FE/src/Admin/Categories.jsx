// import { useState } from "react";
// import { Form } from "antd";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import {
//   getAllCategories,
//   updateCategory,
//   createCategory,
//   uploadImage,
// } from "../api/index";

// // ── Design tokens ──────────────────────────────────────────────
// const T = {
//   primary: "#f49d25",
//   primaryBg: "rgba(244,157,37,0.08)",
//   border: "#E2E8F0",
//   text: "#0F172A",
//   textMid: "#475569",
//   textMuted: "#94A3B8",
//   card: "#ffffff",
//   bg: "#F8F7F5",
//   red: "#EF4444",
//   redBg: "rgba(239,68,68,0.08)",
//   green: "#22C55E",
//   greenBg: "rgba(34,197,94,0.10)",
// };

// // ── Toast ──────────────────────────────────────────────────────
// const useToast = () => {
//   const [toast, setToast] = useState(null);
//   const show = (msg, type = "success") => {
//     setToast({ msg, type });
//     setTimeout(() => setToast(null), 3000);
//   };
//   return { toast, show };
// };

// // ── Status badge ───────────────────────────────────────────────
// const StatusBadge = ({ status }) => {
//   const active = status === "active";
//   return (
//     <span
//       style={{
//         display: "inline-flex",
//         alignItems: "center",
//         gap: 6,
//         padding: "4px 12px",
//         borderRadius: 999,
//         fontSize: 11,
//         fontWeight: 700,
//         background: active ? T.greenBg : "#F1F5F9",
//         color: active ? "#16A34A" : T.textMuted,
//       }}
//     >
//       <span
//         style={{
//           width: 6,
//           height: 6,
//           borderRadius: "50%",
//           background: active ? T.green : "#CBD5E1",
//           flexShrink: 0,
//         }}
//       />
//       {active ? "Đang hoạt động" : "Ngừng hoạt động"}
//     </span>
//   );
// };

// // ── Modal wrapper ──────────────────────────────────────────────
// const SHModal = ({ open, title, onClose, children }) => {
//   if (!open) return null;
//   return (
//     <div
//       onClick={(e) => {
//         if (e.target === e.currentTarget) onClose();
//       }}
//       style={{
//         position: "fixed",
//         inset: 0,
//         zIndex: 1000,
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         background: "rgba(15,23,42,0.40)",
//         backdropFilter: "blur(3px)",
//       }}
//     >
//       <div
//         style={{
//           background: T.card,
//           borderRadius: 20,
//           border: `1px solid ${T.border}`,
//           boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
//           width: "100%",
//           maxWidth: 420,
//           padding: "28px 28px 24px",
//           fontFamily: "'Lexend', sans-serif",
//           animation: "slideUp 0.2s ease",
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "space-between",
//             marginBottom: 24,
//           }}
//         >
//           <h3
//             style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}
//           >
//             {title}
//           </h3>
//           <button
//             onClick={onClose}
//             style={{
//               width: 30,
//               height: 30,
//               borderRadius: 8,
//               border: "none",
//               background: "#F1F5F9",
//               cursor: "pointer",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               color: T.textMid,
//             }}
//           >
//             <span
//               className="material-symbols-outlined"
//               style={{ fontSize: 16 }}
//             >
//               close
//             </span>
//           </button>
//         </div>
//         {children}
//       </div>
//     </div>
//   );
// };

// // ── Confirm delete modal ───────────────────────────────────────
// const ConfirmModal = ({ open, name, loading, onConfirm, onCancel }) => {
//   if (!open) return null;
//   return (
//     <div
//       style={{
//         position: "fixed",
//         inset: 0,
//         zIndex: 1100,
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         background: "rgba(15,23,42,0.40)",
//         backdropFilter: "blur(3px)",
//       }}
//     >
//       <div
//         style={{
//           background: T.card,
//           borderRadius: 20,
//           border: `1px solid ${T.border}`,
//           boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
//           width: "100%",
//           maxWidth: 360,
//           padding: 28,
//           fontFamily: "'Lexend', sans-serif",
//           animation: "slideUp 0.15s ease",
//           textAlign: "center",
//         }}
//       >
//         <div
//           style={{
//             width: 52,
//             height: 52,
//             borderRadius: "50%",
//             background: T.redBg,
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             margin: "0 auto 16px",
//           }}
//         >
//           <span
//             className="material-symbols-outlined"
//             style={{ fontSize: 24, color: T.red }}
//           >
//             delete_forever
//           </span>
//         </div>
//         <h3
//           style={{
//             margin: "0 0 8px",
//             fontSize: 15,
//             fontWeight: 800,
//             color: T.text,
//           }}
//         >
//           Xác nhận xoá?
//         </h3>
//         <p
//           style={{
//             margin: "0 0 24px",
//             fontSize: 13,
//             color: T.textMuted,
//             lineHeight: 1.6,
//           }}
//         >
//           Bạn có chắc muốn xoá danh mục{" "}
//           <b style={{ color: T.text }}>"{name}"</b>?<br />
//           Danh mục sẽ bị ngừng hoạt động.
//         </p>
//         <div style={{ display: "flex", gap: 10 }}>
//           <button
//             onClick={onCancel}
//             style={{
//               flex: 1,
//               padding: "10px",
//               borderRadius: 999,
//               border: `1.5px solid ${T.border}`,
//               background: "#fff",
//               color: T.textMid,
//               fontWeight: 600,
//               fontSize: 13,
//               cursor: "pointer",
//               fontFamily: "'Lexend',sans-serif",
//             }}
//           >
//             Huỷ
//           </button>
//           <button
//             onClick={onConfirm}
//             disabled={loading}
//             style={{
//               flex: 1,
//               padding: "10px",
//               borderRadius: 999,
//               border: "none",
//               background: T.red,
//               color: "#fff",
//               fontWeight: 700,
//               fontSize: 13,
//               cursor: "pointer",
//               fontFamily: "'Lexend',sans-serif",
//               opacity: loading ? 0.7 : 1,
//             }}
//           >
//             {loading ? "Đang xoá..." : "Xoá"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ── Category form body ─────────────────────────────────────────
// const CategoryFormBody = ({
//   form,
//   imgPreview,
//   onUpload,
//   loading,
//   submitLabel,
// }) => {
//   const inp = {
//     width: "100%",
//     padding: "10px 14px",
//     borderRadius: 10,
//     border: `1.5px solid ${T.border}`,
//     outline: "none",
//     fontSize: 13,
//     fontFamily: "'Lexend',sans-serif",
//     background: "#F8FAFC",
//     boxSizing: "border-box",
//     color: T.text,
//   };
//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
//       {/* Name */}
//       <div>
//         <label
//           style={{
//             fontSize: 12,
//             fontWeight: 600,
//             color: T.textMid,
//             display: "block",
//             marginBottom: 6,
//           }}
//         >
//           Tên danh mục *
//         </label>
//         <Form.Item
//           name="name"
//           rules={[{ required: true, message: "Vui lòng nhập tên" }]}
//           style={{ margin: 0 }}
//         >
//           <input
//             style={inp}
//             placeholder="VD: Giày chạy bộ"
//             onFocus={(e) => (e.target.style.borderColor = T.primary)}
//             onBlur={(e) => (e.target.style.borderColor = T.border)}
//             onChange={(e) => form.setFieldValue("name", e.target.value)}
//           />
//         </Form.Item>
//       </div>

//       {/* Image */}
//       <div>
//         <label
//           style={{
//             fontSize: 12,
//             fontWeight: 600,
//             color: T.textMid,
//             display: "block",
//             marginBottom: 8,
//           }}
//         >
//           Hình ảnh
//         </label>
//         <Form.Item name="image" noStyle>
//           <input type="hidden" />
//         </Form.Item>
//         <label
//           style={{
//             display: "flex",
//             flexDirection: "column",
//             alignItems: "center",
//             justifyContent: "center",
//             border: `2px dashed ${T.border}`,
//             borderRadius: 14,
//             padding: 20,
//             background: "#F8FAFC",
//             cursor: "pointer",
//             transition: "all 0.15s",
//             gap: 8,
//             minHeight: 110,
//           }}
//           onMouseEnter={(e) => {
//             e.currentTarget.style.borderColor = T.primary;
//             e.currentTarget.style.background = "#FFFBF5";
//           }}
//           onMouseLeave={(e) => {
//             e.currentTarget.style.borderColor = T.border;
//             e.currentTarget.style.background = "#F8FAFC";
//           }}
//         >
//           {imgPreview ? (
//             <>
//               <img
//                 src={`${process.env.REACT_APP_API_URL_BACKEND}/image/${imgPreview}`}
//                 alt="preview"
//                 style={{
//                   width: 72,
//                   height: 72,
//                   objectFit: "cover",
//                   borderRadius: 10,
//                   border: `1.5px solid ${T.border}`,
//                 }}
//               />
//               <span
//                 style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}
//               >
//                 Nhấn để thay đổi
//               </span>
//             </>
//           ) : (
//             <>
//               <span
//                 className="material-symbols-outlined"
//                 style={{ fontSize: 30, color: "#CBD5E1" }}
//               >
//                 add_photo_alternate
//               </span>
//               <span
//                 style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}
//               >
//                 Chọn ảnh hoặc kéo thả
//               </span>
//             </>
//           )}
//           <input
//             type="file"
//             accept=".jpg,.jpeg,.png,.webp,.gif"
//             style={{ display: "none" }}
//             onChange={onUpload}
//           />
//         </label>
//       </div>

//       {/* Submit */}
//       <button
//         type="button"
//         onClick={() => form.submit()}
//         disabled={loading}
//         style={{
//           padding: "11px",
//           borderRadius: 999,
//           border: "none",
//           background: T.primary,
//           color: "#fff",
//           fontWeight: 700,
//           fontSize: 13,
//           cursor: "pointer",
//           fontFamily: "'Lexend',sans-serif",
//           boxShadow: "0 4px 14px rgba(244,157,37,0.28)",
//           opacity: loading ? 0.7 : 1,
//           marginTop: 4,
//         }}
//       >
//         {loading ? "Đang lưu..." : submitLabel}
//       </button>
//     </div>
//   );
// };

// // ================================================================
// // Main component
// // ================================================================
// export default function Categories() {
//   const queryClient = useQueryClient();
//   const { toast, show: showToast } = useToast();

//   const [selected, setSelected] = useState(null);
//   const [editOpen, setEditOpen] = useState(false);
//   const [createOpen, setCreateOpen] = useState(false);
//   const [deleteTarget, setDeleteTarget] = useState(null);
//   const [editPreview, setEditPreview] = useState("");
//   const [createPreview, setCreatePreview] = useState("");
//   const [search, setSearch] = useState("");

//   const [form] = Form.useForm();
//   const [createForm] = Form.useForm();

//   // ── Queries ────────────────────────────────────────────────
//   const { data, isLoading, isError } = useQuery({
//     queryKey: ["admin-categories"],
//     queryFn: () => getAllCategories("all"),
//     keepPreviousData: true,
//   });

//   // ── Mutations ──────────────────────────────────────────────
//   const transformFormValues = (values) => ({
//     ...values,
//     status:
//       values.status === undefined
//         ? "active"
//         : values.status
//           ? "active"
//           : "inactive",
//   });

//   const updateMutation = useMutation({
//     mutationFn: ({ id, data }) => updateCategory({ id, ...data }),
//     onSuccess: () => {
//       showToast("Cập nhật thành công!");
//       queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
//       setEditOpen(false);
//     },
//     onError: (err) =>
//       showToast(err?.response?.data?.message || "Lỗi khi cập nhật", "error"),
//   });

//   const createMutation = useMutation({
//     mutationFn: createCategory,
//     onSuccess: () => {
//       showToast("Tạo danh mục thành công!");
//       queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
//       setCreateOpen(false);
//     },
//     onError: (err) =>
//       showToast(err?.response?.data?.message || "Lỗi khi tạo mới", "error"),
//   });

//   const deleteMutation = useMutation({
//     mutationFn: ({ id }) => updateCategory({ id, status: "inactive" }),
//     onSuccess: () => {
//       showToast("Đã xoá danh mục");
//       queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
//       setDeleteTarget(null);
//     },
//     onError: (err) =>
//       showToast(err?.response?.data?.message || "Lỗi khi xoá", "error"),
//   });

//   // ── Upload image ───────────────────────────────────────────
//   const handleUpload = async (e, targetForm, setPreview) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     const fd = new FormData();
//     fd.append("file", file);
//     try {
//       const result = await uploadImage(fd);
//       targetForm.setFieldsValue({ image: result.path });
//       setPreview(result.path);
//       showToast("Tải ảnh thành công");
//     } catch {
//       showToast("Upload ảnh thất bại", "error");
//     }
//   };

//   // ── Open edit ──────────────────────────────────────────────
//   const handleEdit = (record) => {
//     setSelected(record);
//     setEditPreview(record.image || "");
//     form.setFieldsValue({
//       name: record.name,
//       image: record.image,
//       status: record.status === "active",
//     });
//     setEditOpen(true);
//   };

//   // ── Filter ─────────────────────────────────────────────────
//   const categories = (data?.data || []).filter(
//     (c) =>
//       !search.trim() || c.name?.toLowerCase().includes(search.toLowerCase()),
//   );

//   // ── States ─────────────────────────────────────────────────
//   if (isLoading)
//     return (
//       <div
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           justifyContent: "center",
//           height: 300,
//           gap: 12,
//           fontFamily: "'Lexend',sans-serif",
//         }}
//       >
//         <div
//           style={{
//             width: 34,
//             height: 34,
//             border: `3px solid #E2E8F0`,
//             borderTopColor: T.primary,
//             borderRadius: "50%",
//             animation: "spin 0.8s linear infinite",
//           }}
//         />
//         <p style={{ fontSize: 13, color: T.textMuted }}>
//           Đang tải danh sách...
//         </p>
//       </div>
//     );

//   if (isError || !data)
//     return (
//       <div
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           justifyContent: "center",
//           height: 240,
//           gap: 8,
//           color: T.textMuted,
//           fontFamily: "'Lexend',sans-serif",
//         }}
//       >
//         <span
//           className="material-symbols-outlined"
//           style={{ fontSize: 36, color: T.red }}
//         >
//           error_outline
//         </span>
//         <p style={{ fontSize: 13, fontWeight: 500 }}>Lỗi khi tải danh sách</p>
//       </div>
//     );

//   // ================================================================
//   // RENDER
//   // ================================================================
//   return (
//     <>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap');
//         @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
//         .material-symbols-outlined{font-family:'Material Symbols Outlined';font-style:normal;line-height:1;display:inline-block;white-space:nowrap;}
//         @keyframes spin    { to{transform:rotate(360deg)} }
//         @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
//         @keyframes slideUp { from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)} }
//         .sh-row:hover td { background:#FFFBF5 !important; }
//         .ant-form-item{margin-bottom:0!important;}
//         .ant-form-item-explain-error{display:none!important;}
//       `}</style>

//       <div
//         style={{
//           padding: 28,
//           fontFamily: "'Lexend',sans-serif",
//           background: T.bg,
//           minHeight: "100vh",
//         }}
//       >
//         {/* Toast */}
//         {toast && (
//           <div
//             style={{
//               position: "fixed",
//               top: 20,
//               right: 24,
//               zIndex: 9999,
//               padding: "11px 18px",
//               borderRadius: 12,
//               animation: "fadeIn 0.2s ease",
//               background: toast.type === "error" ? T.redBg : T.greenBg,
//               border: `1.5px solid ${toast.type === "error" ? T.red : T.green}`,
//               color: toast.type === "error" ? T.red : "#16A34A",
//               fontWeight: 600,
//               fontSize: 13,
//               display: "flex",
//               alignItems: "center",
//               gap: 8,
//               boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
//             }}
//           >
//             <span
//               className="material-symbols-outlined"
//               style={{ fontSize: 17 }}
//             >
//               {toast.type === "error" ? "error" : "check_circle"}
//             </span>
//             {toast.msg}
//           </div>
//         )}

//         {/* Header */}
//         <header
//           style={{
//             display: "flex",
//             alignItems: "flex-start",
//             justifyContent: "space-between",
//             marginBottom: 24,
//           }}
//         >
//           <div>
//             <h2
//               style={{
//                 margin: 0,
//                 fontSize: 26,
//                 fontWeight: 900,
//                 color: T.text,
//                 letterSpacing: "-0.5px",
//               }}
//             >
//               Quản lý danh mục
//             </h2>
//             <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>
//               Xem và quản lý danh sách danh mục sản phẩm.
//             </p>
//           </div>
//           <button
//             onClick={() => {
//               setCreatePreview("");
//               createForm.resetFields();
//               setCreateOpen(true);
//             }}
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: 6,
//               padding: "10px 22px",
//               borderRadius: 999,
//               border: "none",
//               background: T.primary,
//               color: "#fff",
//               fontWeight: 700,
//               fontSize: 13,
//               cursor: "pointer",
//               fontFamily: "'Lexend',sans-serif",
//               boxShadow: "0 4px 16px rgba(244,157,37,0.30)",
//             }}
//           >
//             <span
//               className="material-symbols-outlined"
//               style={{ fontSize: 19 }}
//             >
//               add_circle
//             </span>
//             Thêm danh mục mới
//           </button>
//         </header>

//         {/* Search & filter bar */}
//         <div
//           style={{
//             background: T.card,
//             borderRadius: 14,
//             border: `1px solid ${T.border}`,
//             boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
//             padding: "12px 16px",
//             display: "flex",
//             gap: 10,
//             alignItems: "center",
//             marginBottom: 18,
//           }}
//         >
//           <div style={{ position: "relative", flex: 1 }}>
//             <span
//               className="material-symbols-outlined"
//               style={{
//                 position: "absolute",
//                 left: 14,
//                 top: "50%",
//                 transform: "translateY(-50%)",
//                 fontSize: 18,
//                 color: T.textMuted,
//               }}
//             >
//               search
//             </span>
//             <input
//               placeholder="Tìm kiếm danh mục..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               style={{
//                 width: "100%",
//                 padding: "10px 14px 10px 42px",
//                 borderRadius: 999,
//                 border: "none",
//                 outline: "none",
//                 background: "#F1F5F9",
//                 fontSize: 13,
//                 color: T.text,
//                 fontFamily: "'Lexend',sans-serif",
//                 boxSizing: "border-box",
//               }}
//             />
//           </div>
//           {["filter_list:Trạng thái", "sort:Sắp xếp"].map((s) => {
//             const [icon, label] = s.split(":");
//             return (
//               <button
//                 key={label}
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: 6,
//                   padding: "10px 16px",
//                   borderRadius: 999,
//                   border: "none",
//                   background: "#F1F5F9",
//                   color: T.textMid,
//                   fontSize: 13,
//                   fontWeight: 500,
//                   cursor: "pointer",
//                   fontFamily: "'Lexend',sans-serif",
//                   whiteSpace: "nowrap",
//                 }}
//               >
//                 <span
//                   className="material-symbols-outlined"
//                   style={{ fontSize: 18 }}
//                 >
//                   {icon}
//                 </span>
//                 {label}
//                 <span
//                   className="material-symbols-outlined"
//                   style={{ fontSize: 16 }}
//                 >
//                   expand_more
//                 </span>
//               </button>
//             );
//           })}
//         </div>

//         {/* Table */}
//         <div
//           style={{
//             background: T.card,
//             borderRadius: 14,
//             border: `1px solid ${T.border}`,
//             boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
//             overflow: "hidden",
//           }}
//         >
//           <div style={{ overflowX: "auto" }}>
//             <table style={{ width: "100%", borderCollapse: "collapse" }}>
//               <thead>
//                 <tr
//                   style={{
//                     background: "#F8FAFC",
//                     borderBottom: `1.5px solid ${T.border}`,
//                   }}
//                 >
//                   {["Danh mục", "Ngày tạo", "Trạng thái", "Thao tác"].map(
//                     (h) => (
//                       <th
//                         key={h}
//                         style={{
//                           padding: "12px 20px",
//                           textAlign: h === "Thao tác" ? "right" : "left",
//                           fontSize: 10,
//                           fontWeight: 700,
//                           color: T.textMuted,
//                           textTransform: "uppercase",
//                           letterSpacing: "0.06em",
//                           whiteSpace: "nowrap",
//                         }}
//                       >
//                         {h}
//                       </th>
//                     ),
//                   )}
//                 </tr>
//               </thead>
//               <tbody>
//                 {categories.length === 0 ? (
//                   <tr>
//                     <td
//                       colSpan={4}
//                       style={{ padding: 56, textAlign: "center" }}
//                     >
//                       <div
//                         style={{
//                           display: "flex",
//                           flexDirection: "column",
//                           alignItems: "center",
//                           gap: 10,
//                           color: T.textMuted,
//                         }}
//                       >
//                         <span
//                           className="material-symbols-outlined"
//                           style={{ fontSize: 40, opacity: 0.25 }}
//                         >
//                           category
//                         </span>
//                         <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>
//                           Không tìm thấy danh mục nào
//                         </p>
//                       </div>
//                     </td>
//                   </tr>
//                 ) : (
//                   categories.map((record) => (
//                     <tr
//                       key={record._id}
//                       className="sh-row"
//                       style={{ borderBottom: `1px solid #F1F5F9` }}
//                     >
//                       {/* Tên + ảnh */}
//                       <td style={{ padding: "14px 20px" }}>
//                         <div
//                           style={{
//                             display: "flex",
//                             alignItems: "center",
//                             gap: 14,
//                           }}
//                         >
//                           <div
//                             style={{
//                               width: 48,
//                               height: 48,
//                               borderRadius: 12,
//                               background: "#F1F5F9",
//                               border: `1px solid ${T.border}`,
//                               overflow: "hidden",
//                               flexShrink: 0,
//                               display: "flex",
//                               alignItems: "center",
//                               justifyContent: "center",
//                             }}
//                           >
//                             {record.image ? (
//                               <img
//                                 src={`${process.env.REACT_APP_API_URL_BACKEND}/image/${record.image}`}
//                                 alt={record.name}
//                                 style={{
//                                   width: "100%",
//                                   height: "100%",
//                                   objectFit: "cover",
//                                 }}
//                               />
//                             ) : (
//                               <span
//                                 className="material-symbols-outlined"
//                                 style={{ fontSize: 22, color: "#CBD5E1" }}
//                               >
//                                 category
//                               </span>
//                             )}
//                           </div>
//                           <div>
//                             <p
//                               style={{
//                                 margin: 0,
//                                 fontSize: 14,
//                                 fontWeight: 700,
//                                 color: T.text,
//                               }}
//                             >
//                               {record.name}
//                             </p>
//                             <p
//                               style={{
//                                 margin: "2px 0 0",
//                                 fontSize: 11,
//                                 color: T.textMuted,
//                               }}
//                             >
//                               ID: {record._id?.slice(-6)}
//                             </p>
//                           </div>
//                         </div>
//                       </td>
//                       {/* Ngày tạo */}
//                       <td
//                         style={{
//                           padding: "14px 20px",
//                           fontSize: 13,
//                           color: T.textMuted,
//                           whiteSpace: "nowrap",
//                         }}
//                       >
//                         {new Date(record.createdAt).toLocaleDateString(
//                           "vi-VN",
//                           { year: "numeric", month: "2-digit", day: "2-digit" },
//                         )}
//                       </td>
//                       {/* Trạng thái */}
//                       <td style={{ padding: "14px 20px" }}>
//                         <StatusBadge status={record.status} />
//                       </td>
//                       {/* Thao tác */}
//                       <td style={{ padding: "14px 20px" }}>
//                         <div
//                           style={{
//                             display: "flex",
//                             gap: 6,
//                             justifyContent: "flex-end",
//                           }}
//                         >
//                           <button
//                             onClick={() => handleEdit(record)}
//                             style={{
//                               width: 36,
//                               height: 36,
//                               borderRadius: "50%",
//                               border: `1.5px solid ${T.border}`,
//                               background: "#fff",
//                               color: T.textMuted,
//                               cursor: "pointer",
//                               display: "flex",
//                               alignItems: "center",
//                               justifyContent: "center",
//                               transition: "all 0.15s",
//                             }}
//                             onMouseEnter={(e) => {
//                               e.currentTarget.style.borderColor = T.primary;
//                               e.currentTarget.style.color = T.primary;
//                               e.currentTarget.style.background = T.primaryBg;
//                             }}
//                             onMouseLeave={(e) => {
//                               e.currentTarget.style.borderColor = T.border;
//                               e.currentTarget.style.color = T.textMuted;
//                               e.currentTarget.style.background = "#fff";
//                             }}
//                           >
//                             <span
//                               className="material-symbols-outlined"
//                               style={{ fontSize: 17 }}
//                             >
//                               edit
//                             </span>
//                           </button>
//                           <button
//                             onClick={() => setDeleteTarget(record)}
//                             style={{
//                               width: 36,
//                               height: 36,
//                               borderRadius: "50%",
//                               border: `1.5px solid ${T.border}`,
//                               background: "#fff",
//                               color: T.textMuted,
//                               cursor: "pointer",
//                               display: "flex",
//                               alignItems: "center",
//                               justifyContent: "center",
//                               transition: "all 0.15s",
//                             }}
//                             onMouseEnter={(e) => {
//                               e.currentTarget.style.borderColor = T.red;
//                               e.currentTarget.style.color = T.red;
//                               e.currentTarget.style.background = T.redBg;
//                             }}
//                             onMouseLeave={(e) => {
//                               e.currentTarget.style.borderColor = T.border;
//                               e.currentTarget.style.color = T.textMuted;
//                               e.currentTarget.style.background = "#fff";
//                             }}
//                           >
//                             <span
//                               className="material-symbols-outlined"
//                               style={{ fontSize: 17 }}
//                             >
//                               delete
//                             </span>
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* Footer */}
//           <div
//             style={{
//               padding: "12px 20px",
//               borderTop: `1px solid ${T.border}`,
//               background: "#F8FAFC",
//             }}
//           >
//             <p style={{ margin: 0, fontSize: 13, color: T.textMuted }}>
//               Hiển thị <b style={{ color: T.text }}>{categories.length}</b> /{" "}
//               {data?.data?.length || 0} danh mục
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Edit modal */}
//       <SHModal
//         open={editOpen}
//         title="Chỉnh sửa danh mục"
//         onClose={() => setEditOpen(false)}
//       >
//         <Form
//           form={form}
//           layout="vertical"
//           onFinish={(values) =>
//             updateMutation.mutate({
//               id: selected._id,
//               data: transformFormValues(values),
//             })
//           }
//         >
//           <CategoryFormBody
//             form={form}
//             imgPreview={editPreview}
//             onUpload={(e) => handleUpload(e, form, setEditPreview)}
//             loading={updateMutation.isPending}
//             submitLabel="Lưu thay đổi"
//           />
//         </Form>
//       </SHModal>

//       {/* Create modal */}
//       <SHModal
//         open={createOpen}
//         title="Thêm danh mục mới"
//         onClose={() => setCreateOpen(false)}
//       >
//         <Form
//           form={createForm}
//           layout="vertical"
//           initialValues={{ name: "", image: "", status: true }}
//           onFinish={(values) =>
//             createMutation.mutate(transformFormValues(values))
//           }
//         >
//           <CategoryFormBody
//             form={createForm}
//             imgPreview={createPreview}
//             onUpload={(e) => handleUpload(e, createForm, setCreatePreview)}
//             loading={createMutation.isPending}
//             submitLabel="Tạo danh mục"
//           />
//         </Form>
//       </SHModal>

//       {/* Confirm delete */}
//       <ConfirmModal
//         open={!!deleteTarget}
//         name={deleteTarget?.name}
//         loading={deleteMutation.isPending}
//         onConfirm={() => deleteMutation.mutate({ id: deleteTarget._id })}
//         onCancel={() => setDeleteTarget(null)}
//       />
//     </>
//   );
// }

import { useState } from "react";
import { Form } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllCategories,
  updateCategory,
  createCategory,
  uploadImage,
} from "../api/index";

// Backend đang chạy tại 3002. Ép base URL đúng port để ảnh luôn load được (tránh dính 3001 -> ERR_CONNECTION_REFUSED).
const BACKEND_BASE_URL = (
  process.env.REACT_APP_API_URL_BACKEND || "http://localhost:3002/api"
)
  .replace(/\/api\/?$/, "")
  .replace(/localhost:\d+/, "localhost:3002")
  .replace(/127\.0\.0\.1:\d+/, "127.0.0.1:3002");

// ── Design tokens ──────────────────────────────────────────────
const T = {
  primary: "#f49d25",
  primaryBg: "rgba(244,157,37,0.08)",
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
};

// ── Toast ──────────────────────────────────────────────────────
const useToast = () => {
  const [toast, setToast] = useState(null);
  const show = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, show };
};

// ── Status badge ───────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const active = status === "active";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: active ? T.greenBg : "#F1F5F9",
        color: active ? "#16A34A" : T.textMuted,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: active ? T.green : "#CBD5E1",
          flexShrink: 0,
        }}
      />
      {active ? "Đang hoạt động" : "Ngừng hoạt động"}
    </span>
  );
};

// ── Modal wrapper ──────────────────────────────────────────────
const SHModal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15,23,42,0.40)",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        style={{
          background: T.card,
          borderRadius: 20,
          border: `1px solid ${T.border}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          width: "100%",
          maxWidth: 420,
          padding: "28px 28px 24px",
          fontFamily: "'Lexend', sans-serif",
          animation: "slideUp 0.2s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <h3
            style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            type="button"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "none",
              background: "#F1F5F9",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.textMid,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16 }}
            >
              close
            </span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ── Confirm delete modal ───────────────────────────────────────
const ConfirmModal = ({ open, name, loading, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15,23,42,0.40)",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        style={{
          background: T.card,
          borderRadius: 20,
          border: `1px solid ${T.border}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          width: "100%",
          maxWidth: 360,
          padding: 28,
          fontFamily: "'Lexend', sans-serif",
          animation: "slideUp 0.15s ease",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: T.redBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 24, color: T.red }}
          >
            delete_forever
          </span>
        </div>
        <h3
          style={{
            margin: "0 0 8px",
            fontSize: 15,
            fontWeight: 800,
            color: T.text,
          }}
        >
          Xác nhận xoá?
        </h3>
        <p
          style={{
            margin: "0 0 24px",
            fontSize: 13,
            color: T.textMuted,
            lineHeight: 1.6,
          }}
        >
          Bạn có chắc muốn xoá danh mục{" "}
          <b style={{ color: T.text }}>"{name}"</b>?<br />
          Danh mục sẽ bị ngừng hoạt động.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            type="button"
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 999,
              border: `1.5px solid ${T.border}`,
              background: "#fff",
              color: T.textMid,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Lexend',sans-serif",
            }}
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            type="button"
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: 999,
              border: "none",
              background: T.red,
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Lexend',sans-serif",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Đang xoá..." : "Xoá"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Category form body ─────────────────────────────────────────
const CategoryFormBody = ({
  form,
  imgPreview,
  onUpload,
  loading,
  submitLabel,
}) => {
  const inp = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1.5px solid ${T.border}`,
    outline: "none",
    fontSize: 13,
    fontFamily: "'Lexend',sans-serif",
    background: "#F8FAFC",
    boxSizing: "border-box",
    color: T.text,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Name */}
      <div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: T.textMid,
            display: "block",
            marginBottom: 6,
          }}
        >
          Tên danh mục *
        </label>
        <Form.Item
          name="name"
          rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          style={{ margin: 0 }}
        >
          <input
            style={inp}
            placeholder="VD: Giày chạy bộ"
            onFocus={(e) => (e.target.style.borderColor = T.primary)}
            onBlur={(e) => (e.target.style.borderColor = T.border)}
          />
        </Form.Item>
      </div>

      {/* Image */}
      <div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: T.textMid,
            display: "block",
            marginBottom: 8,
          }}
        >
          Hình ảnh
        </label>
        <Form.Item name="image" noStyle>
          <input type="hidden" />
        </Form.Item>
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: `2px dashed ${T.border}`,
            borderRadius: 14,
            padding: 20,
            background: "#F8FAFC",
            cursor: "pointer",
            transition: "all 0.15s",
            gap: 8,
            minHeight: 110,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = T.primary;
            e.currentTarget.style.background = "#FFFBF5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.border;
            e.currentTarget.style.background = "#F8FAFC";
          }}
        >
          {imgPreview ? (
            <>
              <img
                src={`${BACKEND_BASE_URL}/uploads/${imgPreview}`}
                alt="preview"
                style={{
                  width: 72,
                  height: 72,
                  objectFit: "cover",
                  borderRadius: 10,
                  border: `1.5px solid ${T.border}`,
                }}
              />
              <span
                style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}
              >
                Nhấn để thay đổi
              </span>
            </>
          ) : (
            <>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 30, color: "#CBD5E1" }}
              >
                add_photo_alternate
              </span>
              <span
                style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}
              >
                Chọn ảnh hoặc kéo thả
              </span>
            </>
          )}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif"
            style={{ display: "none" }}
            onChange={onUpload}
          />
        </label>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={() => form.submit()}
        disabled={loading}
        style={{
          padding: "11px",
          borderRadius: 999,
          border: "none",
          background: T.primary,
          color: "#fff",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "'Lexend',sans-serif",
          boxShadow: "0 4px 14px rgba(244,157,37,0.28)",
          opacity: loading ? 0.7 : 1,
          marginTop: 4,
        }}
      >
        {loading ? "Đang lưu..." : submitLabel}
      </button>
    </div>
  );
};

// ================================================================
// Main component
// ================================================================
export default function Categories() {
  const queryClient = useQueryClient();
  const { toast, show: showToast } = useToast();

  const [selected, setSelected] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editPreview, setEditPreview] = useState("");
  const [createPreview, setCreatePreview] = useState("");
  const [search, setSearch] = useState("");

  const [form] = Form.useForm();
  const [createForm] = Form.useForm();

  // ── Queries ────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => getAllCategories("all"),
    keepPreviousData: true,
  });

  // ── Mutations ──────────────────────────────────────────────
  const transformFormValues = (values) => ({
    ...values,
    status:
      values.status === undefined
        ? "active"
        : values.status
          ? "active"
          : "inactive",
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateCategory({ id, ...data }),
    onSuccess: () => {
      showToast("Cập nhật thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setEditOpen(false);
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || "Lỗi khi cập nhật", "error"),
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      showToast("Tạo danh mục thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setCreateOpen(false);
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || "Lỗi khi tạo mới", "error"),
  });

  // ── Upload image ───────────────────────────────────────────
  const handleUpload = async (e, targetForm, setPreview) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const result = await uploadImage(fd);
      targetForm.setFieldsValue({ image: result.path });
      setPreview(result.path);
      showToast("Tải ảnh thành công");
    } catch {
      showToast("Upload ảnh thất bại", "error");
    }
  };

  // ── Open edit ──────────────────────────────────────────────
  const handleEdit = (record) => {
    setSelected(record);
    setEditPreview(record.image || "");
    setEditOpen(true); // Mở modal lên trước để Form kịp render
    setTimeout(() => {
      form.setFieldsValue({
        name: record.name,
        image: record.image,
        status: record.status === "active",
      });
    }, 50);
  };

  // ── Filter ─────────────────────────────────────────────────
  const categories = (data?.data || []).filter(
    (c) =>
      !search.trim() || c.name?.toLowerCase().includes(search.toLowerCase()),
  );

  // ================================================================
  // RENDER (Không dùng early return chặn bên ngoài nữa)
  // ================================================================
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        .material-symbols-outlined{font-family:'Material Symbols Outlined';font-style:normal;line-height:1;display:inline-block;white-space:nowrap;}
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)} }
        .sh-row:hover td { background:#FFFBF5 !important; }
        .ant-form-item{margin-bottom:0!important;}
        .ant-form-item-explain-error{display:none!important;}
      `}</style>

      <div
        style={{
          padding: 28,
          fontFamily: "'Lexend',sans-serif",
          background: T.bg,
          minHeight: "100vh",
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
              padding: "11px 18px",
              borderRadius: 12,
              animation: "fadeIn 0.2s ease",
              background: toast.type === "error" ? T.redBg : T.greenBg,
              border: `1.5px solid ${toast.type === "error" ? T.red : T.green}`,
              color: toast.type === "error" ? T.red : "#16A34A",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 17 }}
            >
              {toast.type === "error" ? "error" : "check_circle"}
            </span>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 900,
                color: T.text,
                letterSpacing: "-0.5px",
              }}
            >
              Quản lý danh mục
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>
              Xem và quản lý danh sách danh mục sản phẩm.
            </p>
          </div>
          <button
            onClick={() => {
              setCreatePreview("");
              setCreateOpen(true); // Mở form lên trước
              setTimeout(() => createForm.resetFields(), 50); // Reset trắng ô nhập liệu sau 1 chút
            }}
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 22px",
              borderRadius: 999,
              border: "none",
              background: T.primary,
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Lexend',sans-serif",
              boxShadow: "0 4px 16px rgba(244,157,37,0.30)",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 19 }}
            >
              add_circle
            </span>
            Thêm danh mục mới
          </button>
        </header>

        {/* Search & filter bar */}
        <div
          style={{
            background: T.card,
            borderRadius: 14,
            border: `1px solid ${T.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            padding: "12px 16px",
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 18,
                color: T.textMuted,
              }}
            >
              search
            </span>
            <input
              placeholder="Tìm kiếm danh mục..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px 10px 42px",
                borderRadius: 999,
                border: "none",
                outline: "none",
                background: "#F1F5F9",
                fontSize: 13,
                color: T.text,
                fontFamily: "'Lexend',sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>
          {["filter_list:Trạng thái", "sort:Sắp xếp"].map((s) => {
            const [icon, label] = s.split(":");
            return (
              <button
                key={label}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: "none",
                  background: "#F1F5F9",
                  color: T.textMid,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "'Lexend',sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18 }}
                >
                  {icon}
                </span>
                {label}
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 16 }}
                >
                  expand_more
                </span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div
          style={{
            background: T.card,
            borderRadius: 14,
            border: `1px solid ${T.border}`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
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
                  {["Danh mục", "Ngày tạo", "Trạng thái", "Thao tác"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 20px",
                          textAlign: h === "Thao tác" ? "right" : "left",
                          fontSize: 10,
                          fontWeight: 700,
                          color: T.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
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
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ padding: 56, textAlign: "center" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            border: `3px solid #E2E8F0`,
                            borderTopColor: T.primary,
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                          }}
                        />
                        <p style={{ fontSize: 13, color: T.textMuted }}>
                          Đang tải danh sách...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : isError || !data ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ padding: 56, textAlign: "center" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 8,
                          color: T.textMuted,
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 36, color: T.red }}
                        >
                          error_outline
                        </span>
                        <p style={{ fontSize: 13, fontWeight: 500 }}>
                          Lỗi khi tải danh sách
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ padding: 56, textAlign: "center" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 10,
                          color: T.textMuted,
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 40, opacity: 0.25 }}
                        >
                          category
                        </span>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>
                          Không tìm thấy danh mục nào
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  categories.map((record) => (
                    <tr
                      key={record._id}
                      className="sh-row"
                      style={{ borderBottom: `1px solid #F1F5F9` }}
                    >
                      <td style={{ padding: "14px 20px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                          }}
                        >
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 12,
                              background: "#F1F5F9",
                              border: `1px solid ${T.border}`,
                              overflow: "hidden",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {record.image ? (
                              <img
                                src={`${BACKEND_BASE_URL}/uploads/${record.image}`}
                                alt={record.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: 22, color: "#CBD5E1" }}
                              >
                                category
                              </span>
                            )}
                          </div>
                          <div>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 14,
                                fontWeight: 700,
                                color: T.text,
                              }}
                            >
                              {record.name}
                            </p>
                            <p
                              style={{
                                margin: "2px 0 0",
                                fontSize: 11,
                                color: T.textMuted,
                              }}
                            >
                              ID: {record._id?.slice(-6)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "14px 20px",
                          fontSize: 13,
                          color: T.textMuted,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(record.createdAt).toLocaleDateString(
                          "vi-VN",
                          { year: "numeric", month: "2-digit", day: "2-digit" },
                        )}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <StatusBadge status={record.status} />
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleEdit(record)}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              border: `1.5px solid ${T.border}`,
                              background: "#fff",
                              color: T.textMuted,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = T.primary;
                              e.currentTarget.style.color = T.primary;
                              e.currentTarget.style.background = T.primaryBg;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = T.border;
                              e.currentTarget.style.color = T.textMuted;
                              e.currentTarget.style.background = "#fff";
                            }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: 17 }}
                            >
                              edit
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "12px 20px",
              borderTop: `1px solid ${T.border}`,
              background: "#F8FAFC",
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: T.textMuted }}>
              Hiển thị <b style={{ color: T.text }}>{categories.length}</b> /{" "}
              {data?.data?.length || 0} danh mục
            </p>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <SHModal
        open={editOpen}
        title="Chỉnh sửa danh mục"
        onClose={() => setEditOpen(false)}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) =>
            updateMutation.mutate({
              id: selected._id,
              data: transformFormValues(values),
            })
          }
        >
          <CategoryFormBody
            form={form}
            imgPreview={editPreview}
            onUpload={(e) => handleUpload(e, form, setEditPreview)}
            loading={updateMutation.isPending}
            submitLabel="Lưu thay đổi"
          />
        </Form>
      </SHModal>

      {/* Create modal */}
      <SHModal
        open={createOpen}
        title="Thêm danh mục mới"
        onClose={() => setCreateOpen(false)}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ name: "", image: "", status: true }}
          onFinish={(values) =>
            createMutation.mutate(transformFormValues(values))
          }
        >
          <CategoryFormBody
            form={createForm}
            imgPreview={createPreview}
            onUpload={(e) => handleUpload(e, createForm, setCreatePreview)}
            loading={createMutation.isPending}
            submitLabel="Tạo danh mục"
          />
        </Form>
      </SHModal>

    </>
  );
}
