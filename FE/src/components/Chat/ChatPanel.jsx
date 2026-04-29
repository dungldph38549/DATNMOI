import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";
import { getChatHistory, getOrdersByUserOrGuest } from "../../api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3002";

const zaloUrl = String(import.meta.env.VITE_CONTACT_ZALO_URL || "").trim();
const messengerUrl = String(import.meta.env.VITE_CONTACT_MESSENGER_URL || "").trim();
const facebookUrl = String(import.meta.env.VITE_CONTACT_FACEBOOK_URL || "").trim();

const bubbleStyle = {
  user: {
    background: "#f49d25",
    color: "#fff",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  ai: {
    background: "#EEF2FF",
    color: "#1E1B4B",
    border: "1px solid #C7D2FE",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  admin: {
    background: "#F1F5F9",
    color: "#0F172A",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
};

const QUICK_QUESTIONS = [
  { key: "order_status", label: "Đơn hàng của tôi", message: "Cho tôi xem tình trạng đơn hàng hiện tại." },
  { key: "shipping_fee", label: "Phí vận chuyển", message: "Shop tư vấn giúp phí vận chuyển với ạ." },
  { key: "return_policy", label: "Đổi/trả hàng", message: "Cho tôi hỏi điều kiện đổi/trả hàng." },
  { key: "size_help", label: "Tư vấn size", message: "Nhờ shop tư vấn size phù hợp giúp tôi." },
];

const AUTO_ADMIN_REPLY =
  "Cảm ơn bạn đã liên hệ với SneakerConverse 👋\nShop sẽ phản hồi trong vòng 5–10 phút. Vui lòng chờ giúp shop nhé!";

const QUICK_REPLY_BY_KEY = {
  shipping_fee:
    "🚚 SneakerConverse hỗ trợ FREESHIP toàn quốc 💙\nBạn có thể yên tâm đặt hàng mà không cần lo về phí vận chuyển!",
  return_policy:
    "Shop đã nhận yêu cầu đổi/trả hàng. Bạn vui lòng gửi mã đơn để shop kiểm tra điều kiện hỗ trợ nhanh nhất nhé!",
  size_help:
    "Shop đã nhận yêu cầu tư vấn size. Bạn vui lòng cho shop chiều dài bàn chân (cm) để shop gợi ý chuẩn nhất nhé!",
};

const ORDER_CODE_REQUIRED_REPLY = "Vui lòng cung cấp mã đơn !";
const ORDER_NOT_FOUND_REPLY =
  "⚠️ Shop chưa tìm thấy đơn hàng với mã bạn cung cấp.\nBạn vui lòng kiểm tra lại mã đơn giúp shop nhé!";

const normalizeOrderCode = (value = "") =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const getOrderDisplayCode = (order) => `#${String(order?._id || "").slice(-8).toUpperCase()}`;

const buildOrderStatusReply = (order) => {
  const status = String(order?.status || "")
    .trim()
    .toLowerCase();
  const code = getOrderDisplayCode(order);

  if (["pending", "confirmed", "processing"].includes(status)) {
    return `📦 Đơn hàng "${code}" của bạn đang được xử lý.\nShop sẽ sớm bàn giao cho đơn vị vận chuyển.\nBạn vui lòng chờ thêm nhé!`;
  }
  if (["shipped", "delivered"].includes(status)) {
    return `🚚 Đơn hàng "${code}" đang được giao.\nDự kiến giao trong 1–3 ngày tới.\nBạn chú ý điện thoại giúp shipper nhé!`;
  }
  if (status === "received") {
    return `✅ Đơn hàng "${code}" đã giao thành công.\nCảm ơn bạn đã mua hàng tại SneakerConverse 💙\nBạn nhớ đánh giá sản phẩm giúp shop nhé!`;
  }
  if (status === "canceled") {
    return `❌ Đơn hàng "${code}" đã được hủy.\nNếu bạn cần hỗ trợ đặt lại, shop luôn sẵn sàng!`;
  }
  if (status === "return-request") {
    return `🔄 Yêu cầu hoàn hàng "${code}" đang được xử lý.\nShop sẽ phản hồi trong vòng 24h.\nBạn vui lòng theo dõi thêm nhé!`;
  }
  return `📦 Đơn hàng "${code}" hiện có trạng thái: ${status || "đang cập nhật"}.\nShop sẽ tiếp tục hỗ trợ bạn ngay khi có thay đổi mới nhé!`;
};

const fmtTime = (ts) => {
  try {
    const d = ts instanceof Date ? ts : new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

const normalizeMessage = (m, customerId) => {
  const message = m?.message ?? m?.text ?? "";
  const senderId = m?.senderId ?? m?.sender_id ?? m?.from ?? null;
  const timestamp = m?.timestamp ?? m?.createdAt ?? new Date().toISOString();

  const senderRole =
    m?.senderRole ??
    (senderId && String(senderId) === String(customerId) ? "user" : "admin");

  return {
    _id: m?._id ?? m?.id ?? `${timestamp}-${Math.random().toString(16).slice(2)}`,
    senderId,
    senderRole,
    message: String(message),
    timestamp,
  };
};

const getHistoryKey = (customerId) => `chat_history_v1_${String(customerId || "guest")}`;
const getHistoryClearedKey = (customerId) => `chat_history_cleared_v1_${String(customerId || "guest")}`;
const getHistoryClearedAtKey = (customerId) => `chat_history_cleared_at_v1_${String(customerId || "guest")}`;

export default function ChatPanel({ onClose, compact = false }) {
  const user = useSelector((s) => s.user);
  const token = user?.token;
  const customerId = user?.id || user?._id || user?.userId;
  const displayName = String(
    user?.name || user?.fullName || user?.username || user?.email?.split("@")?.[0] || "bạn",
  ).trim();

  const roomID = useMemo(
    () => (customerId ? `customer:${customerId}` : null),
    [customerId],
  );

  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorHistory, setErrorHistory] = useState("");
  const [text, setText] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const [savedHistory, setSavedHistory] = useState([]);
  const [dockQuickQuestionsBottom, setDockQuickQuestionsBottom] = useState(false);
  const [historyHardCleared, setHistoryHardCleared] = useState(false);
  const [historyClearedAt, setHistoryClearedAt] = useState(0);
  const [awaitingOrderCode, setAwaitingOrderCode] = useState(false);
  const socketRef = useRef(null);
  const persistRef = useRef({
    customerId: null,
    savedHistory: [],
    messages: [],
    historyClearedAt: 0,
  });

  const buildMergedHistory = (base = [], incoming = []) => {
    return [...base, ...incoming].reduce((acc, item) => {
      if (!acc.some((m) => String(m._id) === String(item._id))) {
        acc.push(item);
      }
      return acc;
    }, []);
  };

  const getTimestamp = (item) => {
    const t = new Date(item?.timestamp || item?.createdAt || 0).getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const historyMessages = useMemo(() => {
    return [...savedHistory].sort((a, b) => getTimestamp(a) - getTimestamp(b));
  }, [savedHistory]);

  useEffect(() => {
    persistRef.current = {
      customerId,
      savedHistory,
      messages,
      historyClearedAt,
    };
  }, [customerId, savedHistory, messages, historyClearedAt]);

  const persistHistorySnapshot = () => {
    const {
      customerId: currentCustomerId,
      savedHistory: currentSavedHistory,
      messages: currentMessages,
      historyClearedAt: currentHistoryClearedAt,
    } = persistRef.current;

    if (!currentCustomerId) return;
    try {
      const merged = buildMergedHistory(currentSavedHistory, currentMessages).filter(
        (m) => getTimestamp(m) >= Number(currentHistoryClearedAt || 0),
      );
      if (merged.length > 0) {
        localStorage.setItem(getHistoryKey(currentCustomerId), JSON.stringify(merged));
      } else {
        localStorage.removeItem(getHistoryKey(currentCustomerId));
      }
    } catch {
      // ignore localStorage errors
    }
  };

  useEffect(() => {
    const persistOnLeave = () => {
      persistHistorySnapshot();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        persistOnLeave();
      }
    };

    window.addEventListener("beforeunload", persistOnLeave);
    window.addEventListener("pagehide", persistOnLeave);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", persistOnLeave);
      window.removeEventListener("pagehide", persistOnLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (!customerId) return;
    try {
      const isHardCleared = localStorage.getItem(getHistoryClearedKey(customerId)) === "1";
      const clearedAt = Number(localStorage.getItem(getHistoryClearedAtKey(customerId)) || 0);
      const raw = localStorage.getItem(getHistoryKey(customerId));
      const list = raw ? JSON.parse(raw) : [];
      const normalizedLocal = Array.isArray(list)
        ? list.map((m) => normalizeMessage(m, customerId))
        : [];
      const filteredLocal = normalizedLocal.filter((m) => getTimestamp(m) >= clearedAt);
      setSavedHistory(isHardCleared ? filteredLocal : filteredLocal);
      setHistoryHardCleared(isHardCleared);
      setHistoryClearedAt(clearedAt);
    } catch {
      setSavedHistory([]);
      setHistoryHardCleared(false);
      setHistoryClearedAt(0);
    }
  }, [customerId]);

  useEffect(() => {
    if (!customerId || !token) return;

    setLoadingHistory(true);
    setErrorHistory("");
    setMessages([]);
    setDockQuickQuestionsBottom(false);
    getChatHistory({ customerId })
      .then((data) => {
        const isHardCleared = localStorage.getItem(getHistoryClearedKey(customerId)) === "1";
        const clearedAt = Number(localStorage.getItem(getHistoryClearedAtKey(customerId)) || 0);
        if (historyHardCleared || isHardCleared) setHistoryHardCleared(true);
        const list = Array.isArray(data) ? data : data?.messages ?? [];
        const normalizedRemote = (list || []).map((m) => normalizeMessage(m, customerId));
        const filteredRemote = normalizedRemote.filter((m) => getTimestamp(m) >= clearedAt);
        if (filteredRemote.length > 0) {
          setSavedHistory(filteredRemote);
        } else if (isHardCleared) {
          setSavedHistory([]);
        }
      })
      .catch(() => {
        // Endpoint có thể chưa sẵn; vẫn cho chat UI chạy để test.
        setErrorHistory("");
      })
      .finally(() => setLoadingHistory(false));
  }, [customerId, token, historyHardCleared]);

  useEffect(() => {
    setActiveTab("chat");
  }, []);

  const pushAdminReply = (message) => {
    setMessages((prev) => [
      ...prev,
      {
        _id: `auto-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        senderId: "admin-auto",
        senderRole: "admin",
        message,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const findOrderByProvidedCode = async (rawCode) => {
    const queryCode = normalizeOrderCode(rawCode);
    if (!queryCode || !customerId) return null;

    const all = [];
    let pageCursor = 1;
    let totalPage = 1;
    const LIMIT = 50;
    do {
      const res = await getOrdersByUserOrGuest({
        userId: customerId,
        page: pageCursor,
        limit: LIMIT,
      });
      const rows = Array.isArray(res?.data) ? res.data : [];
      all.push(...rows);
      totalPage = Number(res?.totalPage || 1);
      pageCursor += 1;
    } while (pageCursor <= totalPage);

    return all.find((order) => {
      const id = String(order?._id || "");
      const idNorm = normalizeOrderCode(id);
      const last8 = normalizeOrderCode(id.slice(-8));
      const cvCode = normalizeOrderCode(`CV${id.slice(-6)}`);
      return (
        queryCode === idNorm ||
        queryCode === last8 ||
        queryCode === cvCode ||
        queryCode.endsWith(last8)
      );
    }) || null;
  };

  useEffect(() => {
    if (!customerId || !token || !roomID) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    // Join đúng room của customer
    socket.emit("chat:joinCustomerRoom", { customerId, roomID });

    socket.on("chat:newMessage", (payload) => {
      // Backend chatSocket luôn emit payload dạng object (message/senderRole/...)
      // nhưng vẫn hỗ trợ trường hợp payload chỉ là string.
      const incoming = normalizeMessage(payload, customerId);
      setMessages((prev) => [...prev, incoming]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [customerId, token, roomID]);

  const send = async (presetMessage = "", options = {}) => {
    const { source = "manual", quickKey = "" } = options;
    const safePreset =
      typeof presetMessage === "string" || typeof presetMessage === "number"
        ? String(presetMessage)
        : "";
    const v = String(safePreset || text || "").trim();
    if (!v || !socketRef.current || !roomID) return;

    setText("");

    socketRef.current.emit("chat:sendMessage", {
      customerId,
      roomID,
      message: v,
    });

    if (source === "quick") {
      if (quickKey === "order_status" || quickKey === "return_policy") {
        setAwaitingOrderCode(true);
        const quickReply =
          quickKey === "order_status"
            ? ORDER_CODE_REQUIRED_REPLY
            : QUICK_REPLY_BY_KEY.return_policy || ORDER_CODE_REQUIRED_REPLY;
        setTimeout(() => pushAdminReply(quickReply), 220);
        return;
      }
      setAwaitingOrderCode(false);
      const quickReply = QUICK_REPLY_BY_KEY[quickKey] || "Shop đã nhận yêu cầu của bạn, vui lòng chờ trong giây lát nhé!";
      setTimeout(() => pushAdminReply(quickReply), 220);
      return;
    }

    if (awaitingOrderCode) {
      if (!/[a-zA-Z0-9]/.test(v)) {
        setTimeout(() => pushAdminReply("Bạn vui lòng nhập mã đơn dạng chuỗi ký tự để shop tra cứu nhé!"), 220);
        return;
      }
      try {
        const matchedOrder = await findOrderByProvidedCode(v);
        setTimeout(() => {
          pushAdminReply(matchedOrder ? buildOrderStatusReply(matchedOrder) : ORDER_NOT_FOUND_REPLY);
        }, 220);
      } catch {
        setTimeout(() => pushAdminReply(ORDER_NOT_FOUND_REPLY), 220);
      } finally {
        setAwaitingOrderCode(false);
      }
      return;
    }

    setTimeout(() => pushAdminReply(AUTO_ADMIN_REPLY), 220);
  };

  return (
    <div
      style={{
        width: compact ? 360 : "100%",
        height: compact ? 520 : "80vh",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid #E2E8F0",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          background: "#1C1917",
          color: "#FCD34D",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 800 }}>
          {compact ? "Hỗ trợ" : "Chat với SneakerConverse"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab((prev) => (prev === "history" ? "chat" : "history"))}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#FCD34D",
              fontSize: 16,
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              borderRadius: 999,
              opacity: activeTab === "history" ? 1 : 0.85,
            }}
            title={activeTab === "history" ? "Quay về chat" : "Xem lịch sử chat"}
            aria-label={activeTab === "history" ? "Quay về chat" : "Xem lịch sử chat"}
          >
            🕘
          </button>
          {onClose && (
            <button
              type="button"
              onClick={() => {
                onClose();
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#FCD34D",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {(zaloUrl || messengerUrl || facebookUrl) && (
        <div
          style={{
            padding: "10px 14px",
            background: "#FFFBF5",
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
            Liên hệ nhanh:
          </span>
          {facebookUrl && (
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#1877F2",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 900,
                fontSize: 13,
              }}
              aria-label="Liên hệ Facebook"
              title="Facebook"
            >
              f
            </a>
          )}
          {zaloUrl && (
            <a
              href={zaloUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0068FF",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 900,
                fontSize: 13,
              }}
              aria-label="Liên hệ Zalo"
              title="Zalo"
            >
              Z
            </a>
          )}
          {messengerUrl && (
            <a
              href={messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0084FF",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 900,
                fontSize: 13,
              }}
              aria-label="Liên hệ Messenger"
              title="Messenger"
            >
              M
            </a>
          )}
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 14px",
          background: "#FAFAF8",
        }}
      >
        {activeTab === "history" && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Lịch sử chat
              </div>
              <button
                type="button"
                onClick={() => {
                  setSavedHistory([]);
                  if (customerId) {
                    try {
                      const now = Date.now();
                      localStorage.removeItem(getHistoryKey(customerId));
                      localStorage.setItem(getHistoryClearedKey(customerId), "1");
                      localStorage.setItem(getHistoryClearedAtKey(customerId), String(now));
                      setHistoryHardCleared(true);
                      setHistoryClearedAt(now);
                    } catch {
                      // ignore localStorage errors
                    }
                  }
                }}
                style={{
                  border: "1px solid #FCA5A5",
                  background: "#FEF2F2",
                  color: "#B91C1C",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                title="Xóa toàn bộ lịch sử chat đã lưu"
              >
                Xóa lịch sử
              </button>
            </div>
            {historyMessages.length === 0 ? (
              <div style={{ color: "#64748B", fontSize: 13, marginTop: 8 }}>
                Chưa có lịch sử chat nào được lưu.
              </div>
            ) : (
              historyMessages.map((m) => {
                const isUser = m.senderRole === "user";
                const bubbleKey =
                  m.senderRole === "ai" ? "ai" : isUser ? "user" : "admin";
                return (
                  <div
                    key={`history-${m._id}`}
                    style={{
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "82%",
                        padding: "10px 12px",
                        fontSize: 13,
                        lineHeight: 1.35,
                        wordBreak: "break-word",
                        ...bubbleStyle[bubbleKey],
                      }}
                    >
                      {m.message}
                      <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                        {fmtTime(m.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {activeTab === "chat" && (
          <>
        {loadingHistory && (
          <div style={{ color: "#6B7280", fontSize: 13 }}>Đang tải lịch sử...</div>
        )}
        {!loadingHistory && errorHistory && (
          <div style={{ color: "#EF4444", fontSize: 13 }}>{errorHistory}</div>
        )}

        {messages.length === 0 && !loadingHistory && (
          <div
            style={{
              color: "#64748B",
              fontSize: 13,
              textAlign: "center",
              marginTop: 20,
              lineHeight: 1.5,
              padding: "0 8px",
            }}
          >
            Xin chào {displayName}, SneakerConverse có thể hỗ trợ được gì cho bạn?
            {zaloUrl || messengerUrl ? (
              <>
                <br />
                Hoặc dùng Zalo / Messenger phía trên nếu bạn tiện hơn.
              </>
            ) : null}
          </div>
        )}
        {messages.length === 0 && !loadingHistory && !dockQuickQuestionsBottom && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
              marginTop: 10,
            }}
          >
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  setDockQuickQuestionsBottom(true);
                  send(q.message, { source: "quick", quickKey: q.key });
                }}
                style={{
                  border: "1px solid #E5E7EB",
                  background: "#FFFFFF",
                  color: "#334155",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                    transition: "all 0.18s ease",
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#FFF7ED";
                    e.currentTarget.style.borderColor = "#FDBA74";
                    e.currentTarget.style.color = "#C2410C";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(251,146,60,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#FFFFFF";
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.color = "#334155";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                title={q.message}
              >
                {q.label}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.senderRole === "user";
          const bubbleKey =
            m.senderRole === "ai" ? "ai" : isUser ? "user" : "admin";
          return (
            <div
              key={m._id}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  maxWidth: "82%",
                  padding: "10px 12px",
                  fontSize: 13,
                  lineHeight: 1.35,
                  wordBreak: "break-word",
                  ...bubbleStyle[bubbleKey],
                }}
              >
                {m.senderRole === "ai" && (
                  <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.75, marginBottom: 4 }}>
                    Tin cũ (tự động)
                  </div>
                )}
                {m.message}
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                  {fmtTime(m.timestamp)}
                </div>
              </div>
            </div>
          );
        })}
          </>
        )}
      </div>

      {activeTab === "chat" && (
        <div
          style={{
            padding: 12,
            borderTop: "1px solid #F1F5F9",
            background: "#fff",
          }}
        >
          {dockQuickQuestionsBottom && (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                gap: 8,
                marginBottom: 10,
                overflowX: "auto",
              }}
            >
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={`bottom-${q.label}`}
                  type="button"
                  onClick={() => send(q.message, { source: "quick", quickKey: q.key })}
                  style={{
                    border: "1px solid #E5E7EB",
                    background: "#FFFFFF",
                    color: "#334155",
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    width: "auto",
                    textAlign: "center",
                    flexShrink: 0,
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#FFF7ED";
                    e.currentTarget.style.borderColor = "#FDBA74";
                    e.currentTarget.style.color = "#C2410C";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(251,146,60,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#FFFFFF";
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.color = "#334155";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  title={q.message}
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhập tin nhắn cho admin…"
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            style={{
              flex: 1,
              border: "1.5px solid #E5E7EB",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={() => send()}
            style={{
              background: "#1C1917",
              color: "#FCD34D",
              border: "none",
              borderRadius: 10,
              padding: "10px 14px",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 13,
              opacity: text.trim() ? 1 : 0.6,
            }}
          >
            Gửi
          </button>
          </div>
        </div>
      )}
    </div>
  );
}

