import { useMemo, useState } from "react";
import { Form, Radio } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  deleteCategories,
  getAllCategories,
  updateCategory,
  uploadImage,
} from "../api/index";

const BACKEND_BASE_URL = (
  process.env.REACT_APP_API_URL_BACKEND || "http://localhost:3002/api"
)
  .replace(/\/api\/?$/, "")
  .replace(/localhost:\d+/, "localhost:3002")
  .replace(/127\.0\.0\.1:\d+/, "127.0.0.1:3002");

const T = {
  primary: "#f49d25",
  primarySoft: "rgba(244,157,37,0.1)",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  card: "#FFFFFF",
  bg: "#F6F7FB",
  active: "#16A34A",
  activeBg: "rgba(22,163,74,0.12)",
  danger: "#EF4444",
  dangerSoft: "rgba(239,68,68,0.1)",
};

const useToast = () => {
  const [toast, setToast] = useState(null);
  const show = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };
  return { toast, show };
};

const StatusBadge = ({ status }) => {
  const isActive = status === "active";
  return (
    <span className={`cate-status ${isActive ? "active" : "inactive"}`}>
      <span className="dot" />
      {isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
    </span>
  );
};

const SHModal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div
      className="cate-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="cate-modal">
        <div className="cate-modal-header">
          <h3>{title}</h3>
          <button type="button" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const ConfirmDeleteModal = ({ open, item, loading, onCancel, onConfirm }) => {
  if (!open || !item) return null;
  return (
    <div
      className="cate-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="cate-confirm-modal">
        <div className="cate-confirm-icon">
          <span className="material-symbols-outlined">delete</span>
        </div>
        <h3>Xóa danh mục</h3>
        <p>
          Bạn có chắc muốn xóa danh mục <b>"{item.name}"</b>?
          <br />
          Hành động này sẽ xóa vĩnh viễn và không thể khôi phục.
        </p>
        <div className="cate-confirm-actions">
          <button type="button" className="ghost" onClick={onCancel}>
            Hủy
          </button>
          <button type="button" className="danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Đang xử lý..." : "Xác nhận xóa"}
          </button>
        </div>
      </div>
    </div>
  );
};

const CategoryFormBody = ({
  form,
  imgPreview,
  onUpload,
  loading,
  submitLabel,
}) => (
  <div className="cate-form-wrap">
    <div>
      <label>Tên danh mục *</label>
      <Form.Item
        name="name"
        rules={[{ required: true, message: "Vui lòng nhập tên danh mục" }]}
        style={{ margin: 0 }}
      >
        <input className="cate-input" placeholder="VD: Giày chạy bộ" />
      </Form.Item>
    </div>

    <div>
      <label>Hình ảnh</label>
      <Form.Item name="image" noStyle>
        <input type="hidden" />
      </Form.Item>
      <label className="cate-upload-box">
        {imgPreview ? (
          <div className="cate-upload-content has-image">
            <img
              src={`${BACKEND_BASE_URL}/uploads/${imgPreview}`}
              alt="preview"
              className="cate-upload-preview"
            />
            <span>Nhấn để thay đổi ảnh</span>
          </div>
        ) : (
          <div className="cate-upload-content">
            <span className="material-symbols-outlined upload-icon">
              add_photo_alternate
            </span>
            <span>Chọn ảnh hoặc kéo thả vào đây</span>
          </div>
        )}
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif"
          onChange={onUpload}
          hidden
        />
      </label>
    </div>

    <div>
      <label>Trạng thái</label>
      <Form.Item
        name="status"
        rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
        style={{ margin: 0 }}
      >
        <Radio.Group className="cate-status-choice">
          <Radio.Button value="active">Đang hoạt động</Radio.Button>
          <Radio.Button value="inactive">Ngừng hoạt động</Radio.Button>
        </Radio.Group>
      </Form.Item>
    </div>

    <button
      type="button"
      className="cate-submit-btn"
      onClick={() => form.submit()}
      disabled={loading}
    >
      {loading ? "Đang lưu..." : submitLabel}
    </button>
  </div>
);

export default function Categories() {
  const queryClient = useQueryClient();
  const { toast, show: showToast } = useToast();

  const [selected, setSelected] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editPreview, setEditPreview] = useState("");
  const [createPreview, setCreatePreview] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form] = Form.useForm();
  const [createForm] = Form.useForm();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => getAllCategories("all"),
    keepPreviousData: true,
  });

  const transformFormValues = (values) => ({
    ...values,
    status:
      values.status === "inactive" || values.status === false
        ? "inactive"
        : "active",
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: payload }) => updateCategory({ id, ...payload }),
    onSuccess: () => {
      showToast("Cập nhật danh mục thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setEditOpen(false);
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || "Lỗi khi cập nhật", "error"),
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      showToast("Tạo danh mục thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setCreateOpen(false);
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || "Lỗi khi tạo mới", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }) => deleteCategories([id]),
    onSuccess: () => {
      showToast("Đã xóa danh mục");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setDeleteTarget(null);
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || "Lỗi khi xóa danh mục", "error"),
  });

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

  const categories = useMemo(() => {
    const source = [...(data?.data || [])];
    const q = search.trim().toLowerCase();

    const filtered = source.filter((item) => {
      const bySearch = !q || item?.name?.toLowerCase().includes(q);
      const byStatus =
        statusFilter === "all" ? true : item.status === statusFilter;
      return bySearch && byStatus;
    });

    filtered.sort((a, b) => {
      if (sortBy === "a-z") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "z-a") return (b.name || "").localeCompare(a.name || "");
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortBy === "oldest" ? dateA - dateB : dateB - dateA;
    });

    return filtered;
  }, [data?.data, search, statusFilter, sortBy]);

  const handleEdit = (record) => {
    setSelected(record);
    setEditPreview(record.image || "");
    setEditOpen(true);
    setTimeout(() => {
      form.setFieldsValue({
        name: record.name,
        image: record.image,
        status: record.status === "inactive" ? "inactive" : "active",
      });
    }, 0);
  };

  const handleDelete = (record) => {
    setDeleteTarget(record);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        .material-symbols-outlined{font-family:'Material Symbols Outlined';font-style:normal;line-height:1;display:inline-block;white-space:nowrap}
        .ant-form-item{margin-bottom:0!important}
        .ant-form-item-explain-error{display:none!important}
        .cate-page{padding:24px;background:${T.bg};min-height:100vh;font-family:"Plus Jakarta Sans",sans-serif}
        .cate-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:18px}
        .cate-header h2{margin:0;font-size:28px;color:${T.text};font-weight:900;letter-spacing:-.02em}
        .cate-header p{margin:4px 0 0;color:${T.textMuted};font-size:13px}
        .cate-btn-primary{height:42px;border:0;border-radius:999px;background:${T.primary};color:#fff;font-weight:700;padding:0 18px;display:flex;align-items:center;gap:6px;cursor:pointer;box-shadow:0 8px 20px rgba(244,157,37,.3)}
        .cate-toolbar{display:flex;align-items:center;gap:10px;background:${T.card};border:1px solid ${T.border};border-radius:16px;padding:12px;margin-bottom:14px;flex-wrap:wrap}
        .cate-search{flex:1;min-width:220px;position:relative}
        .cate-search .material-symbols-outlined{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:18px;color:#94A3B8}
        .cate-search input{width:100%;height:40px;background:#F8FAFC;border:1px solid transparent;border-radius:999px;padding:0 12px 0 38px;color:${T.text};outline:none}
        .cate-search input:focus{border-color:${T.primary};background:#fff}
        .cate-select{height:40px;border-radius:999px;border:1px solid ${T.border};background:#fff;padding:0 14px;color:#334155;font-size:13px;outline:none}
        .cate-table-wrap{background:${T.card};border:1px solid ${T.border};border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.05)}
        .cate-table-scroll{overflow-x:auto}
        .cate-table{width:100%;border-collapse:collapse}
        .cate-table thead tr{background:#F8FAFC;border-bottom:1px solid ${T.border}}
        .cate-table th{padding:12px 18px;text-transform:uppercase;letter-spacing:.07em;font-size:10px;color:#94A3B8;text-align:left}
        .cate-table th:last-child,.cate-table td:last-child{text-align:right}
        .cate-table td{padding:14px 18px;border-bottom:1px solid #F1F5F9}
        .cate-row:hover td{background:#FFFBF5}
        .cate-cell-info{display:flex;align-items:center;gap:12px}
        .cate-avatar{width:46px;height:46px;border-radius:12px;border:1px solid ${T.border};background:#F8FAFC;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
        .cate-avatar img{width:100%;height:100%;object-fit:cover}
        .cate-name{margin:0;color:${T.text};font-size:14px;font-weight:700}
        .cate-id{margin:2px 0 0;font-size:11px;color:${T.textMuted}}
        .cate-date{font-size:13px;color:${T.textMuted};white-space:nowrap}
        .cate-status{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:999px;font-size:11px;font-weight:700}
        .cate-status .dot{width:6px;height:6px;border-radius:50%}
        .cate-status.active{background:${T.activeBg};color:${T.active}}
        .cate-status.active .dot{background:${T.active}}
        .cate-status.inactive{background:#F1F5F9;color:#64748B}
        .cate-status.inactive .dot{background:#94A3B8}
        .cate-row-actions{display:flex;justify-content:flex-end;gap:8px}
        .cate-icon-btn{width:36px;height:36px;border-radius:50%;border:1px solid ${T.border};background:#fff;color:#64748B;display:flex;align-items:center;justify-content:center;cursor:pointer}
        .cate-icon-btn:hover{border-color:${T.primary};background:${T.primarySoft};color:${T.primary}}
        .cate-icon-btn.delete:hover{border-color:${T.danger};background:${T.dangerSoft};color:${T.danger}}
        .cate-table-footer{padding:12px 18px;background:#F8FAFC;color:${T.textMuted};font-size:13px}
        .cate-empty{padding:56px 12px;text-align:center;color:${T.textMuted}}
        .cate-empty .material-symbols-outlined{font-size:40px;opacity:.35}
        .cate-modal-overlay{position:fixed;inset:0;z-index:1000;background:rgba(15,23,42,.45);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:16px}
        .cate-modal{width:100%;max-width:520px;background:#fff;border-radius:18px;border:1px solid #E5E7EB;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,.2)}
        .cate-modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
        .cate-modal-header h3{margin:0;color:${T.text};font-size:18px;font-weight:800}
        .cate-modal-header button{width:38px;height:38px;border:0;border-radius:50%;background:#EEF2F7;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#64748B}
        .cate-modal-header button .material-symbols-outlined{font-size:22px}
        .cate-form-wrap{display:flex;flex-direction:column;gap:14px}
        .cate-form-wrap label{display:block;margin-bottom:6px;color:#475569;font-size:14px;font-weight:700}
        .cate-input{width:100%;height:52px;border:1px solid #D6DEE8;border-radius:14px;padding:0 14px;background:#F6F8FB;outline:none;color:${T.text};font-size:16px}
        .cate-input:focus{border-color:${T.primary};background:#fff}
        .cate-upload-box{display:flex;border:2px dashed #D5DDE8;background:#F8FAFC;border-radius:14px;padding:14px;cursor:pointer;min-height:130px;color:${T.textMuted}}
        .cate-upload-box:hover{border-color:${T.primary};background:#FFFBF5}
        .cate-upload-content{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:100%}
        .cate-upload-content.has-image{align-items:flex-start}
        .cate-upload-preview{width:86px;height:86px;border-radius:14px;object-fit:cover;border:1px solid ${T.border}}
        .upload-icon{font-size:30px;color:#94A3B8}
        .cate-upload-content span{font-size:14px;font-weight:600;color:#475569}
        .cate-status-choice{display:grid!important;grid-template-columns:1fr 1fr;gap:10px}
        .cate-status-choice .ant-radio-button-wrapper{height:46px;border:1px solid #D6DEE8;border-radius:12px!important;background:#F6F8FB;color:#334155;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center}
        .cate-status-choice .ant-radio-button-wrapper::before{display:none!important}
        .cate-status-choice .ant-radio-button-wrapper-checked{border-color:${T.primary}!important;background:${T.primarySoft}!important;color:${T.primary}!important;box-shadow:none!important}
        .cate-submit-btn{height:52px;border:0;border-radius:999px;background:${T.primary};color:#fff;font-size:16px;font-weight:700;cursor:pointer;margin-top:4px}
        .cate-submit-btn:disabled{opacity:.7;cursor:not-allowed}
        .cate-confirm-modal{width:100%;max-width:430px;background:#fff;border:1px solid #E5E7EB;border-radius:18px;padding:22px;box-shadow:0 25px 60px rgba(0,0,0,.22)}
        .cate-confirm-icon{width:46px;height:46px;border-radius:50%;background:${T.dangerSoft};display:flex;align-items:center;justify-content:center;color:${T.danger};margin:0 auto 10px}
        .cate-confirm-modal h3{margin:0 0 8px;text-align:center;font-size:20px;color:${T.text};font-weight:800}
        .cate-confirm-modal p{margin:0 0 18px;text-align:center;font-size:14px;line-height:1.5;color:#475569}
        .cate-confirm-actions{display:flex;gap:10px}
        .cate-confirm-actions button{flex:1;height:44px;border-radius:999px;font-weight:700;font-size:14px;cursor:pointer}
        .cate-confirm-actions .ghost{border:1px solid ${T.border};background:#fff;color:#475569}
        .cate-confirm-actions .danger{border:0;background:${T.danger};color:#fff}
        .cate-confirm-actions .danger:disabled{opacity:.7;cursor:not-allowed}
        .cate-toast{position:fixed;top:16px;right:16px;z-index:1200;padding:10px 14px;border-radius:12px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px}
        .cate-toast.success{background:rgba(22,163,74,.12);border:1px solid rgba(22,163,74,.4);color:#15803D}
        .cate-toast.error{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.35);color:#B91C1C}
      `}</style>

      {toast && (
        <div className={`cate-toast ${toast.type === "error" ? "error" : "success"}`}>
          <span className="material-symbols-outlined">
            {toast.type === "error" ? "error" : "check_circle"}
          </span>
          {toast.msg}
        </div>
      )}

      <div className="cate-page">
        <header className="cate-header">
          <div>
            <h2>Quản lý danh mục</h2>
            <p>Quản trị danh sách danh mục sản phẩm theo giao diện mới.</p>
          </div>
          <button
            type="button"
            className="cate-btn-primary"
            onClick={() => {
              setCreatePreview("");
              setCreateOpen(true);
              setTimeout(() => createForm.resetFields(), 0);
            }}
          >
            <span className="material-symbols-outlined">add_circle</span>
            Thêm danh mục
          </button>
        </header>

        <section className="cate-toolbar">
          <div className="cate-search">
            <span className="material-symbols-outlined">search</span>
            <input
              placeholder="Tìm kiếm danh mục..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="cate-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Trạng thái: Tất cả</option>
            <option value="active">Trạng thái: Đang hoạt động</option>
            <option value="inactive">Trạng thái: Ngừng hoạt động</option>
          </select>

          <select
            className="cate-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Sắp xếp: Mới nhất</option>
            <option value="oldest">Sắp xếp: Cũ nhất</option>
            <option value="a-z">Sắp xếp: A - Z</option>
            <option value="z-a">Sắp xếp: Z - A</option>
          </select>
        </section>

        <section className="cate-table-wrap">
          <div className="cate-table-scroll">
            <table className="cate-table">
              <thead>
                <tr>
                  <th>Danh mục</th>
                  <th>Ngày tạo</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="cate-empty">
                      Đang tải danh sách danh mục...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={4} className="cate-empty">
                      Tải dữ liệu thất bại, vui lòng thử lại.
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="cate-empty">
                      <span className="material-symbols-outlined">category</span>
                      <p>Không có danh mục phù hợp bộ lọc.</p>
                    </td>
                  </tr>
                ) : (
                  categories.map((record) => (
                    <tr key={record._id} className="cate-row">
                      <td>
                        <div className="cate-cell-info">
                          <div className="cate-avatar">
                            {record.image ? (
                              <img
                                src={`${BACKEND_BASE_URL}/uploads/${record.image}`}
                                alt={record.name}
                              />
                            ) : (
                              <span className="material-symbols-outlined">
                                category
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="cate-name">{record.name}</p>
                            <p className="cate-id">ID: {record._id?.slice(-6)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="cate-date">
                        {new Date(record.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td>
                        <StatusBadge status={record.status} />
                      </td>
                      <td>
                        <div className="cate-row-actions">
                          <button
                            type="button"
                            className="cate-icon-btn"
                            onClick={() => handleEdit(record)}
                            title="Chỉnh sửa"
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button
                            type="button"
                            className="cate-icon-btn delete"
                            onClick={() => handleDelete(record)}
                            title="Xóa danh mục"
                            disabled={deleteMutation.isPending}
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="cate-table-footer">
            Hiển thị <b>{categories.length}</b> / {data?.data?.length || 0} danh mục
          </div>
        </section>
      </div>

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
              id: selected?._id,
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

      <SHModal
        open={createOpen}
        title="Thêm danh mục mới"
        onClose={() => setCreateOpen(false)}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ name: "", image: "" }}
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

      <ConfirmDeleteModal
        open={!!deleteTarget}
        item={deleteTarget}
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate({ id: deleteTarget?._id })}
      />
    </>
  );
}
