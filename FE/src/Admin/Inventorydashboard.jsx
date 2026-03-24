import { useState, useEffect, useCallback } from "react";
import {
  getInventoryList,
  getWarehouses,
  getInventoryLogs,
  importInventoryStock,
  adjustInventoryStock,
  transferInventoryStock,
  createInventory,
  getAllProducts,
} from "../api";

// ── Components ────────────────────────────────────────────────
const STATUS_CONFIG = {
  in_stock: {
    label: "Còn hàng",
    bg: "#ECFDF5",
    color: "#065F46",
    dot: "#10B981",
  },
  low_stock: {
    label: "Sắp hết",
    bg: "#FFFBEB",
    color: "#92400E",
    dot: "#F59E0B",
  },
  out_of_stock: {
    label: "Hết hàng",
    bg: "#FEF2F2",
    color: "#991B1B",
    dot: "#EF4444",
  },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.in_stock;
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: c.dot,
          display: "inline-block",
        }}
      />
      {c.label}
    </span>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.45)",
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        width: "100%",
        maxWidth: 480,
        padding: 28,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        animation: "modalIn 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 20,
            color: "#6B7280",
          }}
        >
          ✕
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    <label
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        color: "#374151",
        marginBottom: 5,
      }}
    >
      {label}
    </label>
    <input
      {...props}
      style={{
        width: "100%",
        border: "1.5px solid #E5E7EB",
        borderRadius: 8,
        padding: "9px 12px",
        fontSize: 14,
        fontFamily: "inherit",
        outline: "none",
        boxSizing: "border-box",
        ...props.style,
      }}
    />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    <label
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        color: "#374151",
        marginBottom: 5,
      }}
    >
      {label}
    </label>
    <select
      {...props}
      style={{
        width: "100%",
        border: "1.5px solid #E5E7EB",
        borderRadius: 8,
        padding: "9px 12px",
        fontSize: 14,
        fontFamily: "inherit",
        outline: "none",
        background: "#fff",
        ...props.style,
      }}
    >
      {children}
    </select>
  </div>
);

const Btn = ({ children, variant = "primary", loading, ...props }) => {
  const styles = {
    primary: { background: "#1C1917", color: "#FCD34D" },
    secondary: { background: "#F3F4F6", color: "#374151" },
    danger: { background: "#FEF2F2", color: "#DC2626" },
    success: { background: "#ECFDF5", color: "#065F46" },
  };
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      style={{
        ...styles[variant],
        border: "none",
        borderRadius: 8,
        padding: "9px 18px",
        fontSize: 13,
        fontWeight: 700,
        cursor: loading ? "wait" : "pointer",
        fontFamily: "inherit",
        opacity: loading ? 0.7 : 1,
        transition: "all 0.15s",
        ...props.style,
      }}
    >
      {loading ? "Đang xử lý..." : children}
    </button>
  );
};

const Toast = ({ msg, type }) => (
  <div
    style={{
      position: "fixed",
      bottom: 20,
      right: 20,
      zIndex: 200,
      padding: "12px 20px",
      borderRadius: 12,
      fontWeight: 600,
      fontSize: 13,
      background: type === "error" ? "#FEF2F2" : "#F0FDF4",
      color: type === "error" ? "#DC2626" : "#15803D",
      border: `1.5px solid ${type === "error" ? "#FCA5A5" : "#86EFAC"}`,
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      animation: "slideUp 0.3s ease",
    }}
  >
    {type === "error" ? "✕ " : "✓ "}
    {msg}
  </div>
);

// ── Import Modal ──────────────────────────────────────────────
const ImportModal = ({ inv, warehouses, onClose, onDone }) => {
  const [form, setForm] = useState({
    qty: "",
    warehouseId: warehouses[0]?._id || "",
    note: "",
  });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.qty || !form.warehouseId) return;
    setLoading(true);
    try {
      await importInventoryStock(inv._id, {
        qty: Number(form.qty),
        warehouseId: form.warehouseId,
        note: form.note || undefined,
      });
      onDone("Nhập kho thành công!");
    } catch (e) {
      onDone(e?.response?.data?.message || e?.message || "Lỗi nhập kho", "error");
    }
    setLoading(false);
    onClose();
  };

  return (
    <Modal title={`📦 Nhập kho — ${inv.sku}`} onClose={onClose}>
      <Input
        label="Số lượng nhập *"
        type="number"
        min="1"
        value={form.qty}
        onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
        placeholder="VD: 50"
      />
      <Select
        label="Kho nhập *"
        value={form.warehouseId}
        onChange={(e) =>
          setForm((f) => ({ ...f, warehouseId: e.target.value }))
        }
      >
        {warehouses.map((w) => (
          <option key={w._id} value={w._id}>
            {w.name} ({w.code})
          </option>
        ))}
      </Select>
      <Input
        label="Ghi chú"
        value={form.note}
        onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        placeholder="VD: Hàng mới về từ NCC A"
      />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <Btn
          variant="primary"
          loading={loading}
          onClick={submit}
          style={{ flex: 1 }}
        >
          Xác nhận nhập
        </Btn>
        <Btn variant="secondary" onClick={onClose}>
          Huỷ
        </Btn>
      </div>
    </Modal>
  );
};

// ── Adjust Modal ──────────────────────────────────────────────
const AdjustModal = ({ inv, onClose, onDone }) => {
  const [form, setForm] = useState({ newQty: inv.totalQuantity, note: "" });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await adjustInventoryStock(inv._id, {
        newQty: Number(form.newQty),
        note: form.note || undefined,
      });
      onDone("Điều chỉnh thành công!");
    } catch (e) {
      onDone(e?.response?.data?.message || e?.message || "Lỗi điều chỉnh", "error");
    }
    setLoading(false);
    onClose();
  };

  return (
    <Modal title={`🔧 Điều chỉnh — ${inv.sku}`} onClose={onClose}>
      <div
        style={{
          background: "#F9FAFB",
          borderRadius: 8,
          padding: 12,
          marginBottom: 14,
          fontSize: 13,
          color: "#6B7280",
        }}
      >
        Tồn kho hiện tại:{" "}
        <strong style={{ color: "#1C1917" }}>{inv.totalQuantity}</strong>{" "}
        &nbsp;|&nbsp; Khả dụng:{" "}
        <strong>{inv.totalQuantity - inv.totalReserved}</strong>
      </div>
      <Input
        label="Số lượng mới *"
        type="number"
        min="0"
        value={form.newQty}
        onChange={(e) => setForm((f) => ({ ...f, newQty: e.target.value }))}
      />
      <Input
        label="Lý do điều chỉnh *"
        value={form.note}
        onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        placeholder="VD: Kiểm kho định kỳ tháng 3"
      />
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          variant="primary"
          loading={loading}
          onClick={submit}
          style={{ flex: 1 }}
        >
          Xác nhận
        </Btn>
        <Btn variant="secondary" onClick={onClose}>
          Huỷ
        </Btn>
      </div>
    </Modal>
  );
};

// ── Export Modal ──────────────────────────────────────────────
const ExportModal = ({ inv, warehouses, onClose, onDone }) => {
  const [form, setForm] = useState({
    qty: "",
    warehouseId:
      inv.warehouses.find((w) => Number(w.quantity || 0) > 0)?.warehouseId?._id ||
      inv.warehouses.find((w) => Number(w.quantity || 0) > 0)?.warehouseId ||
      warehouses[0]?._id ||
      "",
    note: "",
  });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.qty || !form.warehouseId) return;
    const qtyNum = Number(form.qty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      onDone("Số lượng xuất kho không hợp lệ", "error");
      return;
    }
    setLoading(true);
    try {
      await adjustInventoryStock(inv._id, {
        newQty: Math.max(0, Number(inv.totalQuantity || 0) - qtyNum),
        warehouseId: form.warehouseId,
        note: form.note || `Xuất kho ${qtyNum} cho SKU ${inv.sku}`,
      });
      onDone("Xuất kho thành công!");
    } catch (e) {
      onDone(
        e?.response?.data?.message || e?.message || "Lỗi xuất kho",
        "error",
      );
    }
    setLoading(false);
    onClose();
  };

  return (
    <Modal title={`📤 Xuất kho — ${inv.sku}`} onClose={onClose}>
      <Input
        label="Số lượng xuất *"
        type="number"
        min="1"
        value={form.qty}
        onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
        placeholder="VD: 5"
      />
      <Select
        label="Kho xuất *"
        value={form.warehouseId}
        onChange={(e) =>
          setForm((f) => ({ ...f, warehouseId: e.target.value }))
        }
      >
        {warehouses.map((w) => (
          <option key={w._id} value={w._id}>
            {w.name} ({w.code})
          </option>
        ))}
      </Select>
      <Input
        label="Ghi chú"
        value={form.note}
        onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        placeholder="VD: Xuất hàng cho đơn bán lẻ"
      />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <Btn
          variant="danger"
          loading={loading}
          onClick={submit}
          style={{ flex: 1 }}
        >
          Xác nhận xuất
        </Btn>
        <Btn variant="secondary" onClick={onClose}>
          Huỷ
        </Btn>
      </div>
    </Modal>
  );
};

// ── Transfer Modal ─────────────────────────────────────────────
const TransferModal = ({ inv, warehouses, onClose, onDone }) => {
  const firstWarehouse = inv.warehouses[0]?.warehouseId;
  const firstWarehouseId =
    typeof firstWarehouse === "object" ? firstWarehouse?._id : firstWarehouse;
  const secondWarehouseId =
    warehouses.find((w) => String(w._id) !== String(firstWarehouseId))?._id || "";

  const [form, setForm] = useState({
    qty: "",
    fromWarehouseId: firstWarehouseId || "",
    toWarehouseId: secondWarehouseId || "",
    note: "",
  });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.qty || !form.fromWarehouseId || !form.toWarehouseId) return;
    if (String(form.fromWarehouseId) === String(form.toWarehouseId)) {
      onDone("Kho nguồn và kho đích phải khác nhau", "error");
      return;
    }
    const qtyNum = Number(form.qty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      onDone("Số lượng chuyển kho không hợp lệ", "error");
      return;
    }
    setLoading(true);
    try {
      await transferInventoryStock(inv._id, {
        qty: qtyNum,
        fromWarehouseId: form.fromWarehouseId,
        toWarehouseId: form.toWarehouseId,
        note: form.note || undefined,
      });
      onDone("Chuyển kho thành công!");
    } catch (e) {
      onDone(
        e?.response?.data?.message || e?.message || "Lỗi chuyển kho",
        "error",
      );
    }
    setLoading(false);
    onClose();
  };

  return (
    <Modal title={`⇄ Chuyển kho — ${inv.sku}`} onClose={onClose}>
      <Input
        label="Số lượng chuyển *"
        type="number"
        min="1"
        value={form.qty}
        onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
        placeholder="VD: 10"
      />
      <Select
        label="Kho nguồn *"
        value={form.fromWarehouseId}
        onChange={(e) =>
          setForm((f) => ({ ...f, fromWarehouseId: e.target.value }))
        }
      >
        {warehouses.map((w) => (
          <option key={w._id} value={w._id}>
            {w.name} ({w.code})
          </option>
        ))}
      </Select>
      <Select
        label="Kho đích *"
        value={form.toWarehouseId}
        onChange={(e) =>
          setForm((f) => ({ ...f, toWarehouseId: e.target.value }))
        }
      >
        {warehouses.map((w) => (
          <option key={w._id} value={w._id}>
            {w.name} ({w.code})
          </option>
        ))}
      </Select>
      <Input
        label="Ghi chú"
        value={form.note}
        onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        placeholder="VD: Cân bằng tồn kho giữa 2 kho"
      />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <Btn
          variant="primary"
          loading={loading}
          onClick={submit}
          style={{ flex: 1 }}
        >
          Xác nhận chuyển
        </Btn>
        <Btn variant="secondary" onClick={onClose}>
          Huỷ
        </Btn>
      </div>
    </Modal>
  );
};

// ── Create SKU Modal ───────────────────────────────────────────
const CreateInventoryModal = ({ onClose, onDone }) => {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    productId: "",
    variantId: "",
    sku: "",
    lowStockThreshold: 10,
  });

  const selectedProduct = products.find((p) => p._id === form.productId);
  const hasVariants =
    !!selectedProduct?.hasVariants &&
    Array.isArray(selectedProduct?.variants) &&
    selectedProduct.variants.length > 0;

  useEffect(() => {
    let cancelled = false;
    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const res = await getAllProducts({
          page: 0,
          limit: 50,
          isListProductRemoved: false,
          filter: {},
        });
        const list = Array.isArray(res?.data) ? res.data : [];
        if (!cancelled) setProducts(list);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    };
    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    if (!form.productId || !form.sku.trim()) return;
    if (hasVariants && !form.variantId) return;
    setLoading(true);
    try {
      await createInventory({
        productId: form.productId,
        variantId: hasVariants ? form.variantId : undefined,
        sku: form.sku.trim().toUpperCase(),
        lowStockThreshold: Number(form.lowStockThreshold) || 10,
      });
      onDone("Tạo tồn kho/SKU thành công!", "success");
      onClose();
    } catch (e) {
      onDone(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Lỗi tạo tồn kho",
        "error",
      );
      setLoading(false);
    }
  };

  return (
    <Modal title="➕ Tạo tồn kho (SKU)" onClose={onClose}>
      {loadingProducts ? (
        <div style={{ textAlign: "center", color: "#9CA3AF", padding: 40 }}>
          Đang tải sản phẩm...
        </div>
      ) : (
        <>
          <Select
            label="Sản phẩm *"
            value={form.productId}
            onChange={(e) => {
              const productId = e.target.value;
              const product = products.find((p) => p._id === productId);
              const firstVariant =
                product?.hasVariants && Array.isArray(product?.variants)
                  ? product.variants[0]
                  : null;
              setForm((f) => ({
                ...f,
                productId,
                variantId: firstVariant?._id || "",
                sku: firstVariant?.sku || "",
              }));
            }}
          >
            <option value="" disabled>
              Chọn sản phẩm
            </option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>

          {hasVariants && (
            <Select
              label="Biến thể *"
              value={form.variantId}
              onChange={(e) => {
                const variantId = e.target.value;
                const variant = selectedProduct?.variants?.find(
                  (v) => v._id === variantId,
                );
                setForm((f) => ({
                  ...f,
                  variantId,
                  sku: variant?.sku || "",
                }));
              }}
            >
              <option value="" disabled>
                Chọn biến thể
              </option>
              {selectedProduct?.variants?.map((v) => {
                const attrs = v?.attributes
                  ? Object.entries(v.attributes)
                      .map(([k, val]) => `${k}: ${val}`)
                      .join(" · ")
                  : "";
                return (
                  <option key={v._id} value={v._id}>
                    {v.sku} {attrs ? `(${attrs})` : ""}
                  </option>
                );
              })}
            </Select>
          )}

          <Input
            label="SKU *"
            type="text"
            value={form.sku}
            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            placeholder="VD: NIKE-RED-42"
            disabled={hasVariants}
          />

          <Input
            label="Cảnh báo sắp hết (lowStockThreshold)"
            type="number"
            min="0"
            value={form.lowStockThreshold}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                lowStockThreshold: e.target.value,
              }))
            }
          />

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Btn
              variant="primary"
              loading={loading}
              onClick={submit}
              style={{ flex: 1 }}
            >
              Tạo tồn kho
            </Btn>
            <Btn variant="secondary" onClick={onClose} disabled={loading}>
              Huỷ
            </Btn>
          </div>
        </>
      )}
    </Modal>
  );
};

// ── Logs Modal ────────────────────────────────────────────────
const LogsModal = ({ inv, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInventoryLogs(inv._id)
      .then((res) => {
        setLogs(Array.isArray(res?.items) ? res.items : res || []);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [inv._id]);

  const TYPE_COLOR = {
    import: "#10B981",
    export: "#EF4444",
    adjust: "#6366F1",
    reserve: "#F59E0B",
    release: "#3B82F6",
    transfer: "#8B5CF6",
  };
  const TYPE_ICON = {
    import: "↑",
    export: "↓",
    adjust: "⊕",
    reserve: "⏸",
    release: "▷",
    transfer: "⇄",
  };

  return (
    <Modal title={`📋 Lịch sử — ${inv.sku}`} onClose={onClose}>
      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9CA3AF" }}>
            Đang tải...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9CA3AF" }}>
            Chưa có giao dịch nào
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log._id}
              style={{
                display: "flex",
                gap: 12,
                padding: "10px 0",
                borderBottom: "1px solid #F3F4F6",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `${TYPE_COLOR[log.type]}20`,
                  color: TYPE_COLOR[log.type],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {TYPE_ICON[log.type]}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: TYPE_COLOR[log.type],
                      textTransform: "uppercase",
                    }}
                  >
                    {log.type}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "#9CA3AF",
                      fontFamily: "monospace",
                    }}
                  >
                    {new Date(log.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#374151" }}>
                  <span style={{ color: "#6B7280" }}>Trước:</span>{" "}
                  <strong>{log.beforeQty}</strong> &nbsp;→&nbsp;{" "}
                  <span style={{ color: "#6B7280" }}>Sau:</span>{" "}
                  <strong>{log.afterQty}</strong>
                  &nbsp;(
                  <span
                    style={{
                      color: log.quantity > 0 ? "#10B981" : "#EF4444",
                      fontWeight: 700,
                    }}
                  >
                    {log.quantity > 0 ? "+" : ""}
                    {log.quantity}
                  </span>
                  )
                </div>
                {log.note && (
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                    {log.note}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};

// ── Main Dashboard ────────────────────────────────────────────
export default function InventoryDashboard() {
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [modal, setModal] = useState(null); // { type, inv }
  const [toast, setToast] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, whRes] = await Promise.all([
        getInventoryList({ status: filterStatus || undefined, q: search || undefined }),
        getWarehouses(),
      ]);
      setInventory(Array.isArray(listRes) ? listRes : []);
      setWarehouses(Array.isArray(whRes) ? whRes : []);
    } catch (e) {
      setInventory([]);
      setWarehouses([]);
      notify(e?.response?.data?.message || e?.message || "Không tải được dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, search]);

  const closeModal = () => {
    setModal(null);
    load();
  };

  const totalPages = Math.max(1, Math.ceil(inventory.length / pageSize));
  const paginatedInventory = inventory.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const toCsvCell = (value) => {
    const s = String(value ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const exportInventoryCsv = () => {
    const rows = [
      [
        "SKU",
        "San pham",
        "Ton kho",
        "Da giu",
        "Kha dung",
        "Trang thai",
        "Theo kho",
      ],
      ...inventory.map((inv) => {
        const warehouseText = (inv.warehouses || [])
          .map((w) => `${whName(w.warehouseId)}:${w.quantity}`)
          .join(" | ");
        return [
          inv.sku,
          inv.productId?.name ?? inv.productName ?? "",
          inv.totalQuantity ?? 0,
          inv.totalReserved ?? 0,
          (inv.totalQuantity ?? 0) - (inv.totalReserved ?? 0),
          inv.status ?? "",
          warehouseText,
        ];
      }),
    ];
    const csv = rows.map((r) => r.map(toCsvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `inventory-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify("Đã xuất file CSV tồn kho");
  };

  const stats = {
    total: inventory.length,
    in_stock: inventory.filter((i) => i.status === "in_stock").length,
    low_stock: inventory.filter((i) => i.status === "low_stock").length,
    out: inventory.filter((i) => i.status === "out_of_stock").length,
  };

  const whName = (id) => {
    if (!id) return "—";
    const _id = typeof id === "object" ? id?._id : id;
    const w = warehouses.find((w) => w._id === _id);
    if (w) return w.name;
    if (typeof id === "object" && id?.name) return id.name;
    return _id || "—";
  };

  return (
    <div
      style={{
        fontFamily: "'Lora', Georgia, serif",
        minHeight: "100vh",
        background: "#FAFAF8",
        color: "#1C1917",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes modalIn  { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        .inv-row { animation: fadeIn 0.3s ease; }
        .inv-row:hover { background: #FAFAF8 !important; }
        button:hover { opacity: 0.85; }
      `}</style>

      {/* Header */}
      <div
        style={{
          background: "#1C1917",
          padding: "18px 32px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ fontSize: 22, color: "#FCD34D" }}>⬡</span>
        <h1
          style={{
            margin: 0,
            color: "#FAFAF8",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "-0.3px",
          }}
        >
          Quản lý tồn kho
        </h1>
        <div style={{ flex: 1 }} />
        <span
          style={{
            color: "#A8A29E",
            fontSize: 12,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {new Date().toLocaleDateString("vi-VN", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </span>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px" }}>
        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {[
            {
              label: "Tổng SKU",
              value: stats.total,
              bg: "#F0F9FF",
              color: "#0369A1",
            },
            {
              label: "Còn hàng",
              value: stats.in_stock,
              bg: "#ECFDF5",
              color: "#065F46",
            },
            {
              label: "Sắp hết",
              value: stats.low_stock,
              bg: "#FFFBEB",
              color: "#92400E",
            },
            {
              label: "Hết hàng",
              value: stats.out,
              bg: "#FEF2F2",
              color: "#991B1B",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: s.bg,
                borderRadius: 14,
                padding: "18px 20px",
                border: `1px solid ${s.color}20`,
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: s.color,
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Tìm SKU hoặc tên sản phẩm..."
            style={{
              flex: 1,
              minWidth: 220,
              border: "1.5px solid #E5E7EB",
              borderRadius: 10,
              padding: "9px 14px",
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              border: "1.5px solid #E5E7EB",
              borderRadius: 10,
              padding: "9px 14px",
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
              background: "#fff",
              minWidth: 150,
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="in_stock">Còn hàng</option>
            <option value="low_stock">Sắp hết</option>
            <option value="out_of_stock">Hết hàng</option>
          </select>
          <Btn variant="secondary" onClick={exportInventoryCsv}>
            ⭳ Xuất CSV
          </Btn>
        </div>

        {/* Table */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #F0EFED",
            overflow: "hidden",
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
          >
            <thead>
              <tr
                style={{
                  background: "#F9FAFB",
                  borderBottom: "1px solid #F0EFED",
                }}
              >
                {[
                  "SKU",
                  "Sản phẩm",
                  "Tồn kho",
                  "Khả dụng",
                  "Đã giữ",
                  "Theo kho",
                  "Trạng thái",
                  "Thao tác",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#6B7280",
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
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: 60,
                      color: "#9CA3AF",
                    }}
                  >
                    Đang tải...
                  </td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: 60,
                      color: "#9CA3AF",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                      <div>Không tìm thấy dữ liệu</div>
                      <Btn
                        variant="primary"
                        onClick={() => setModal({ type: "create-inventory" })}
                        style={{ padding: "9px 18px", borderRadius: 10 }}
                      >
                        Tạo tồn kho (SKU)
                      </Btn>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInventory.map((inv) => {
                  const available = inv.totalQuantity - inv.totalReserved;
                  return (
                    <tr
                      key={inv._id}
                      className="inv-row"
                      style={{ borderBottom: "1px solid #F9FAFB" }}
                    >
                      <td
                        style={{
                          padding: "14px 16px",
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#374151",
                        }}
                      >
                        {inv.sku}
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: 500 }}>
                        {inv.productId?.name ?? inv.productName ?? "—"}
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: 700 }}>
                        {inv.totalQuantity}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          fontWeight: 700,
                          color:
                            available <= 0
                              ? "#EF4444"
                              : available <= inv.lowStockThreshold
                                ? "#F59E0B"
                                : "#10B981",
                        }}
                      >
                        {available}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#9CA3AF" }}>
                        {inv.totalReserved}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          {inv.warehouses.map((w, i) => (
                            <span
                              key={i}
                              style={{ fontSize: 11, color: "#6B7280" }}
                            >
                              {whName(w.warehouseId)}:{" "}
                              <strong>{w.quantity}</strong>
                            </span>
                          ))}
                          {inv.warehouses.length === 0 && (
                            <span style={{ fontSize: 11, color: "#D1D5DB" }}>
                              —
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <StatusBadge status={inv.status} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Btn
                            variant="success"
                            onClick={() => setModal({ type: "import", inv })}
                            style={{ padding: "5px 12px", fontSize: 12 }}
                          >
                            ↑ Nhập
                          </Btn>
                          <Btn
                            variant="secondary"
                            onClick={() => setModal({ type: "adjust", inv })}
                            style={{ padding: "5px 12px", fontSize: 12 }}
                          >
                            ⊕ Sửa
                          </Btn>
                          <Btn
                            variant="danger"
                            onClick={() => setModal({ type: "export", inv })}
                            style={{ padding: "5px 12px", fontSize: 12 }}
                          >
                            ↓ Xuất
                          </Btn>
                          <Btn
                            variant="secondary"
                            onClick={() => setModal({ type: "transfer", inv })}
                            style={{ padding: "5px 12px", fontSize: 12 }}
                          >
                            ⇄ Kho
                          </Btn>
                          <Btn
                            variant="secondary"
                            onClick={() => setModal({ type: "logs", inv })}
                            style={{ padding: "5px 12px", fontSize: 12 }}
                          >
                            📋
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {inventory.length > 0 && (
          <div
            style={{
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12, color: "#6B7280" }}>
              Hiển thị {(page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, inventory.length)} / {inventory.length}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Trước
              </Btn>
              <div
                style={{
                  minWidth: 90,
                  textAlign: "center",
                  alignSelf: "center",
                  fontSize: 12,
                  color: "#374151",
                  fontWeight: 700,
                }}
              >
                Trang {page}/{totalPages}
              </div>
              <Btn
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau →
              </Btn>
            </div>
          </div>
        )}

        {/* Low stock warning banner */}
        {stats.low_stock + stats.out > 0 && (
          <div
            style={{
              marginTop: 20,
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: 12,
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 20 }}>⚠️</span>
            <span style={{ fontSize: 14, color: "#92400E", fontWeight: 500 }}>
              Có <strong>{stats.low_stock}</strong> SKU sắp hết và{" "}
              <strong>{stats.out}</strong> SKU đã hết hàng. Vui lòng nhập kho
              sớm.
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === "import" && (
        <ImportModal
          inv={modal.inv}
          warehouses={warehouses}
          onClose={closeModal}
          onDone={(msg, type) => {
            notify(msg, type);
          }}
        />
      )}
      {modal?.type === "adjust" && (
        <AdjustModal
          inv={modal.inv}
          onClose={closeModal}
          onDone={(msg, type) => {
            notify(msg, type);
          }}
        />
      )}
      {modal?.type === "export" && (
        <ExportModal
          inv={modal.inv}
          warehouses={warehouses}
          onClose={closeModal}
          onDone={(msg, type) => {
            notify(msg, type);
          }}
        />
      )}
      {modal?.type === "transfer" && (
        <TransferModal
          inv={modal.inv}
          warehouses={warehouses}
          onClose={closeModal}
          onDone={(msg, type) => {
            notify(msg, type);
          }}
        />
      )}
      {modal?.type === "logs" && (
        <LogsModal inv={modal.inv} onClose={closeModal} />
      )}

      {modal?.type === "create-inventory" && (
        <CreateInventoryModal
          onClose={closeModal}
          onDone={(msg, type) => notify(msg, type)}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
