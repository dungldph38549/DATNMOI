import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Select, Modal, Input } from "antd";
import { getOrderById, updateOrderStatus, cancelOrderLineByAdmin } from "../api";
import notify from "../utils/notify";
import { confirmShopee } from "../utils/shopeeNotify";

const STATUS_OPTIONS = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "shipped", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "received", label: "Đã giao thành công" },
  { value: "canceled", label: "Đã hủy" },
  { value: "return-request", label: "Yêu cầu hoàn hàng" },
  { value: "accepted", label: "Chấp nhận hoàn hàng" },
  { value: "rejected", label: "Từ chối hoàn hàng" },
];

const MIN_ADMIN_CANCEL_NOTE_LEN = 5;

const TRANSITIONS = {
  pending: ["confirmed", "canceled"],
  confirmed: ["shipped", "canceled"],
  shipped: [],
  delivered: [],
  received: [],
  canceled: [],
  "return-request": ["accepted", "rejected"],
  accepted: [],
  rejected: [],
};

const FLOW = ["pending", "confirmed", "shipped", "delivered", "received"];
const RETURN_REASON_LABELS = {
  wrong_size: "Không đúng size / không vừa",
  wrong_item: "Giao sai mẫu / sai màu",
  defective: "Lỗi sản xuất",
  damaged_shipping: "Hư hỏng khi vận chuyển",
  not_as_described: "Không đúng mô tả",
  other: "Lý do khác",
};

const getAdminSession = () => {
  try {
    const raw = localStorage.getItem("admin_v1") || localStorage.getItem("admin");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const normalizeStatus = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const statusLabel = (status) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.label || status || "-";

const statusPillClass = (status) => {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "confirmed":
      return "bg-sky-100 text-sky-700";
    case "shipped":
      return "bg-violet-100 text-violet-700";
    case "delivered":
      return "bg-green-100 text-green-700";
    case "received":
      return "bg-emerald-100 text-emerald-700";
    case "canceled":
      return "bg-red-100 text-red-700";
    case "return-request":
      return "bg-orange-100 text-orange-700";
    case "accepted":
      return "bg-teal-100 text-teal-700";
    case "rejected":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const formatMoney = (v) => `${Number(v || 0).toLocaleString("vi-VN")}đ`;

const getImageUrl = (img) => {
  if (!img || typeof img !== "string") return "https://via.placeholder.com/64/f1f5f9/94a3b8?text=SP";
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  return `http://localhost:3002/uploads/${img.startsWith("/") ? img.slice(1) : img}`;
};

const formatLineVariant = (p) => {
  if (p?.size && String(p.size).trim() && p.size !== "Mặc định") {
    return `Size: ${p.size}`;
  }
  const attrs = p?.attributes;
  if (!attrs || typeof attrs !== "object") return null;
  const parts = Object.entries(attrs)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `${String(k).trim()}: ${String(v).trim()}`);
  return parts.length ? `Phân loại: ${parts.join(" · ")}` : null;
};

const shippingLabel = (m) => {
  const x = String(m || "").toLowerCase();
  if (x === "fast") return "Giao nhanh (+ phí)";
  return "Tiêu chuẩn";
};

const paymentMethodLabel = (m) => {
  const x = String(m || "").toLowerCase();
  if (x === "vnpay") return "VNPay";
  if (x === "wallet") return "Ví";
  return "COD";
};

export default function AdminOrderDetailModern() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [lineCanceling, setLineCanceling] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [previewImageOpen, setPreviewImageOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState("");

  useEffect(() => {
    const admin = getAdminSession();
    if (!admin?.login || !admin?.isAdmin) {
      navigate("/login", { replace: true });
      return;
    }
    if (!id) return;
    const run = async () => {
      setLoading(true);
      try {
        const res = await getOrderById(id);
        setOrder(res?.order || res);
        setHistory(Array.isArray(res?.history) ? res.history : []);
      } catch (err) {
        notify.error(err?.response?.data?.message || "Không tải được chi tiết đơn hàng.");
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id, navigate]);

  const currentStatus = useMemo(
    () => normalizeStatus(order?.status),
    [order?.status],
  );

  const allowedNext = useMemo(
    () => TRANSITIONS[currentStatus] || [],
    [currentStatus],
  );

  const historyByStatus = useMemo(() => {
    const map = {};
    const sorted = [...history].sort(
      (a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0),
    );
    sorted.forEach((h) => {
      const st = normalizeStatus(h?.newStatus);
      if (st) map[st] = h;
    });
    return map;
  }, [history]);

  const flowIndex = Math.max(0, FLOW.indexOf(currentStatus));
  const isReturnFlow = ["return-request", "accepted", "rejected"].includes(
    currentStatus,
  );
  const returnRequestEntry = useMemo(
    () =>
      [...history]
        .filter((h) => normalizeStatus(h?.newStatus) === "return-request")
        .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))[0] || null,
    [history],
  );
  const returnDecisionEntry = useMemo(
    () =>
      [...history]
        .filter((h) => {
          const st = normalizeStatus(h?.newStatus);
          return st === "accepted" || st === "rejected";
        })
        .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))[0] || null,
    [history],
  );
  const returnRequestImages = useMemo(() => {
    const fromHistory = Array.isArray(returnRequestEntry?.images)
      ? returnRequestEntry.images
      : [];
    const legacyImage = returnRequestEntry?.image ? [returnRequestEntry.image] : [];
    const fromOrder = Array.isArray(order?.returnRequestImages)
      ? order.returnRequestImages
      : [];
    return [...fromHistory, ...legacyImage, ...fromOrder]
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .filter((x, idx, arr) => arr.indexOf(x) === idx);
  }, [returnRequestEntry, order?.returnRequestImages]);
  const returnReasonCode = String(
    returnRequestEntry?.reasonCode || order?.returnRequestReasonCode || "",
  ).trim();

  const isLineLive = (p) => !p?.lineStatus || p.lineStatus !== "canceled";

  const onCancelOrderLine = async (lineIndex) => {
    if (!order?._id) return;
    const ok = await confirmShopee({
      text: `Hủy  (#${lineIndex + 1}) khỏi đơn?`,
      confirmText: "Đồng ý",
      cancelText: "Đóng",
    });
    if (!ok) return;
    setLineCanceling(lineIndex);
    try {
      const data = await cancelOrderLineByAdmin(order._id, lineIndex);
      if (data?.order) setOrder(data.order);
      if (Array.isArray(data?.history)) setHistory(data.history);
      notify.success("Đã hủy dòng hàng.");
    } catch (err) {
      notify.error(err?.response?.data?.message || "Không hủy được dòng hàng.");
    } finally {
      setLineCanceling(null);
    }
  };

  const applyStatusChange = async (newStatus, note) => {
    if (!order?._id || newStatus === currentStatus) return;
    const prevStatus = currentStatus;
    setSaving(true);
    try {
      const body = {
        status: newStatus,
        lookup: {
          createdAt: order?.createdAt || null,
          totalAmount: order?.totalAmount ?? null,
          fullName: order?.fullName || order?.userId?.name || "",
        },
      };
      if (note != null && String(note).trim() !== "") {
        body.note = String(note).trim();
      }
      const data = await updateOrderStatus(order._id, body);
      setOrder((prev) => ({ ...prev, ...data, status: newStatus }));
      if (newStatus === "accepted" && prevStatus === "return-request") {
        const amt = Number(data?.walletRefundAmount);
        notify.success(
          amt > 0
            ? `Đã chuyển ${amt.toLocaleString("vi-VN")}đ về ví tài khoản khách hàng.`
            : "Đã chấp nhận hoàn hàng.",
        );
      } else if (newStatus === "canceled") {
        notify.success("Đã hủy đơn hàng.");
      } else {
        notify.success("Cập nhật trạng thái thành công.");
      }
    } catch (err) {
      notify.error(err?.response?.data?.message || "Không cập nhật được trạng thái.");
    } finally {
      setSaving(false);
    }
  };

  const onChangeStatus = async (newStatus) => {
    if (!order?._id || newStatus === currentStatus) return;
    if (newStatus === "canceled") {
      setCancelNote("");
      setCancelModalOpen(true);
      return;
    }
    await applyStatusChange(newStatus);
  };

  if (loading) return <div className="p-6">Đang tải chi tiết đơn hàng...</div>;
  if (!order) return <div className="p-6">Không tìm thấy đơn hàng.</div>;

  const subtotal =
    Number(order?.totalAmount || 0) -
    Number(order?.shippingFee || 0) +
    Number(order?.discount || 0);

  const products = Array.isArray(order?.products) ? order.products : [];

  return (
    <div className="min-h-screen bg-[#f8f6f6] p-6 lg:p-8">
      <Modal
        title="Lý do hủy đơn (bắt buộc)"
        open={cancelModalOpen}
        okText="Xác nhận hủy"
        cancelText="Đóng"
        destroyOnClose
        confirmLoading={saving}
        onCancel={() => {
          setCancelModalOpen(false);
          setCancelNote("");
        }}
        onOk={async () => {
          const t = cancelNote.trim();
          if (t.length < MIN_ADMIN_CANCEL_NOTE_LEN) {
            notify.error(
              `Vui lòng nhập lý do hủy (ít nhất ${MIN_ADMIN_CANCEL_NOTE_LEN} ký tự).`,
            );
            return Promise.reject(new Error("invalid-note"));
          }
          setCancelModalOpen(false);
          setCancelNote("");
          await applyStatusChange("canceled", t);
        }}
      >
        <p className="mb-2 text-sm text-slate-600">
          Lý do sẽ được lưu trong lịch sử trạng thái đơn hàng.
        </p>
        <Input.TextArea
          rows={4}
          maxLength={2000}
          showCount
          value={cancelNote}
          onChange={(e) => setCancelNote(e.target.value)}
          placeholder="Ví dụ: Khách yêu cầu hủy — hết hàng, sai thông tin giao hàng..."
        />
      </Modal>
      <Modal
        open={previewImageOpen}
        footer={null}
        centered
        width={900}
        onCancel={() => {
          setPreviewImageOpen(false);
          setPreviewImageSrc("");
        }}
      >
        {previewImageSrc ? (
          <img
            src={previewImageSrc}
            alt="return-preview"
            className="max-h-[75vh] w-full rounded-lg object-contain"
          />
        ) : null}
      </Modal>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/admin" className="hover:text-[#874e00]">Quản lý đơn hàng</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-slate-900">Chi tiết #{String(order?._id || "").slice(-8).toUpperCase()}</span>
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                #{String(order?._id || "").slice(-8).toUpperCase()}
              </h1>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusPillClass(currentStatus)}`}>
                {statusLabel(currentStatus)}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">
              Ngày đặt: {order?.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "-"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin"><Button>Quay lại Admin</Button></Link>
            <Select
              size="middle"
              loading={saving}
              value={currentStatus}
              style={{ width: 230 }}
              options={[
                { value: currentStatus, label: statusLabel(currentStatus) },
                ...allowedNext.map((v) => ({ value: v, label: statusLabel(v) })),
              ]}
              onChange={onChangeStatus}
            />
          </div>
        </div>

        {!isReturnFlow && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <div className="relative flex items-start justify-between gap-3 overflow-x-auto pb-2">
              <div className="absolute left-10 right-10 top-5 h-1 rounded bg-slate-200" />
              <div
                className="absolute left-10 top-5 h-1 rounded bg-[#874e00]"
                style={{ width: `${Math.max(0, (flowIndex / (FLOW.length - 1)) * 100)}%`, right: "auto" }}
              />
              {FLOW.map((step, idx) => {
                const active = idx <= flowIndex;
                const stepTime = historyByStatus[step]?.createdAt;
                return (
                  <div key={step} className="relative z-10 flex min-w-[120px] flex-col items-center gap-2">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${active ? "bg-[#874e00] text-white" : "bg-slate-200 text-slate-400"}`}>
                      <span className="material-symbols-outlined text-[18px]">
                        {active ? "check" : "radio_button_unchecked"}
                      </span>
                    </div>
                    <p className={`text-center text-xs font-bold ${active ? "text-slate-900" : "text-slate-400"}`}>
                      {statusLabel(step)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {stepTime ? new Date(stepTime).toLocaleString("vi-VN") : "-"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="text-lg font-bold text-slate-900">
                  Chi tiết đơn — {products.length}  sản phẩm
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-800">Một đơn duy nhất</span>
                  {" "}
                  (mã #{String(order?._id || "").slice(-8).toUpperCase()}). Mỗi khung bên dưới là{" "}
                  <span className="font-semibold">một dòng hàng</span> (size/SKU khác nhau).
                </p>
              </div>
              <div className="space-y-3 p-4" style={{ background: "#f5f5f5" }}>
                {products.map((p, idx) => {
                  const qty = Number(p?.quantity || 0);
                  const unit = Number(p?.price || 0);
                  const base = Number(p?.basePrice || 0);
                  const lineDisc = Number(p?.lineDiscount || 0);
                  const saleName = p?.appliedSaleName ? String(p.appliedSaleName) : "";
                  const lineTotal = unit * qty;
                  const variant = formatLineVariant(p);
                  const pid = p?.productId?._id || p?.productId;
                  const cardKey = `${order?._id}-${String(p?.sku ?? "")}-${idx}`;
                  const showStrike = base > unit && base > 0;
                  const lineLive = isLineLive(p);
                  const canCancelLine =
                    lineLive &&
                    (currentStatus === "pending" || currentStatus === "confirmed");
                  return (
                    <div
                      key={cardKey}
                      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-md ${lineLive ? "" : "border-dashed opacity-75"}`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <img
                          src={getImageUrl(p?.image || p?.productId?.image)}
                          alt={p?.productId?.name || p?.name || "Sản phẩm"}
                          className="h-20 w-20 shrink-0 rounded-xl border border-slate-100 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                            Sản phẩm {idx + 1}/{products.length}
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            {p?.productId?.name || p?.name || "Sản phẩm"}
                          </p>
                          {variant && (
                            <p className="mt-1 text-xs text-slate-600">{variant}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-600">
                              SKU: {p?.sku || "—"}
                            </span>
                            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-600">
                              SL: {qty}
                            </span>
                            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-600">
                              Đơn giá: {formatMoney(unit)}
                              {showStrike ? (
                                <span className="ml-1 text-slate-400 line-through">
                                  {formatMoney(base)}
                                </span>
                              ) : null}
                            </span>
                          </div>
                          {lineDisc > 0 ? (
                            <p className="mt-2 text-xs font-semibold text-emerald-700">
                              Giảm : −{formatMoney(lineDisc)}
                            </p>
                          ) : null}
                          {saleName ? (
                            <p className="mt-1 text-xs font-medium text-amber-800">KM: {saleName}</p>
                          ) : null}
                          {pid ? (
                            <Link
                              to={`/product/${pid}`}
                              className="mt-3 inline-block text-xs font-bold text-[#874e00] hover:underline"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Xem sản phẩm trên shop →
                            </Link>
                          ) : null}
                          {!lineLive && (
                            <p className="mt-2 text-xs font-bold text-red-600">
                              Đã hủy 
                              {p.canceledBy === "user" ? " (khách)" : ""}
                            </p>
                          )}
                          {canCancelLine ? (
                            <Button
                              danger
                              size="small"
                              className="mt-3"
                              loading={lineCanceling === idx}
                              onClick={() => onCancelOrderLine(idx)}
                            >
                              Hủy 
                            </Button>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right sm:min-w-[140px]">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Thành tiền 
                          </p>
                          <p className="text-lg font-black text-[#874e00]">
                            {formatMoney(lineTotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-slate-900">Lịch sử trạng thái</h3>
              {history.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có lịch sử cập nhật.</p>
              ) : (
                <div className="space-y-2">
                  {[...history]
                    .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
                    .map((h, idx) => (
                      <div key={`${h?._id || idx}-${h?.createdAt || ""}`} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${statusPillClass(normalizeStatus(h?.newStatus))}`}>
                            {statusLabel(normalizeStatus(h?.newStatus))}
                          </span>
                          {h?.note ? (
                            <span className="line-clamp-2 text-xs text-slate-600">
                              Ghi chú: {h.note}
                            </span>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-xs font-medium text-slate-500">
                          {h?.createdAt ? new Date(h.createdAt).toLocaleString("vi-VN") : "-"}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {isReturnFlow && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-orange-800">Chi tiết lý do hoàn hàng</h3>
                <div className="space-y-3 text-sm">
                  <p>
                    <b>Khách gửi lúc:</b>{" "}
                    {returnRequestEntry?.createdAt
                      ? new Date(returnRequestEntry.createdAt).toLocaleString("vi-VN")
                      : "-"}
                  </p>
                  <div>
                    <p className="mb-1 font-semibold">Lý do khách hàng:</p>
                    <p className="rounded-xl border border-orange-200 bg-white p-3 leading-relaxed text-slate-700">
                      {returnRequestEntry?.note?.trim()
                        ? returnRequestEntry.note
                        : "Chưa có lý do hoàn hàng."}
                    </p>
                  </div>
                  {returnReasonCode ? (
                    <p>
                      <b>Danh mục lý do:</b>{" "}
                      {RETURN_REASON_LABELS[returnReasonCode] || returnReasonCode}
                    </p>
                  ) : null}
                  {returnRequestImages.length > 0 ? (
                    <div>
                      <p className="mb-2 font-semibold">Ảnh khách gửi:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {returnRequestImages.map((img, idx) => {
                          const src = String(img).startsWith("http")
                            ? img
                            : `http://localhost:3002/uploads/${String(img).replace(/^\/+/, "")}`;
                          return (
                            <button
                              type="button"
                              key={`${img}-${idx}`}
                              onClick={() => {
                                setPreviewImageSrc(src);
                                setPreviewImageOpen(true);
                              }}
                              className="block overflow-hidden rounded-lg border border-orange-200 bg-white"
                            >
                              <img
                                src={src}
                                alt={`return-${idx + 1}`}
                                className="h-20 w-full object-cover transition-transform duration-200 hover:scale-105"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  {returnDecisionEntry?.note ? (
                    <div>
                      <p className="mb-1 font-semibold">Phản hồi admin:</p>
                      <p className="rounded-xl border border-orange-200 bg-white p-3 leading-relaxed text-slate-700">
                        {returnDecisionEntry.note}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-slate-900">Khách & giao hàng</h3>
              <div className="space-y-3 text-sm">
                <p><b>Tên:</b> {order?.fullName || "-"}</p>
                <p><b>SĐT:</b> {order?.phone || "-"}</p>
                <p><b>Email:</b> {order?.email || "-"}</p>
                <p className="leading-relaxed"><b>Địa chỉ:</b> {order?.address || "-"}</p>
                <p><b>Hình thức giao:</b> {shippingLabel(order?.shippingMethod)}</p>
                <p>
                  <b>Voucher:</b>{" "}
                  {order?.voucherCode && String(order.voucherCode).trim()
                    ? String(order.voucherCode).trim().toUpperCase()
                    : "—"}
                </p>
                <p><b>Ghi chú đơn:</b> {order?.note != null && String(order.note).trim() ? order.note : "—"}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-xl">
              <h3 className="mb-4 text-lg font-bold">Tổng kết đơn hàng</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Tạm tính</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Phí vận chuyển</span>
                  <span>{formatMoney(order?.shippingFee || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-red-300">
                  <span>Giảm giá</span>
                  <span>-{formatMoney(order?.discount || 0)}</span>
                </div>
                <div className="mt-2 flex items-end justify-between border-t border-slate-700 pt-3">
                  <span className="text-xs uppercase tracking-wider text-slate-400">Tổng thanh toán</span>
                  <span className="text-2xl font-black text-orange-400">{formatMoney(order?.totalAmount || 0)}</span>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-white/10 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span>Phương thức</span>
                  <span className="font-bold">{paymentMethodLabel(order?.paymentMethod)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>Trạng thái TT</span>
                  <span className="font-bold">
                    {order?.paymentStatus === "paid" ? "Đã thanh toán" : order?.paymentStatus === "unpaid" ? "Chưa thanh toán" : (order?.paymentStatus || "—")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
