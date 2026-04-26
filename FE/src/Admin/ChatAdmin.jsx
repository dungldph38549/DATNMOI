import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Button, Input, message } from "antd";
import { getChatHistory, getChatInbox } from "../api";

const SOCKET_URL = "http://localhost:3002";

const fmtTime = (ts) => {
  try {
    const d = ts instanceof Date ? ts : new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

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

const normalizeMessage = (m) => {
  const message = m?.message ?? m?.text ?? "";
  const senderRole = m?.senderRole ?? "user";
  return {
    _id: m?._id ?? m?.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    senderRole,
    message: String(message),
    timestamp: m?.timestamp ?? m?.createdAt ?? new Date().toISOString(),
    customerId: m?.customerId,
  };
};

/** Tên hiển thị đồng bộ với User trong DB (name → email → mã) */
const customerDisplayName = (entry, fallbackId) => {
  const n = entry?.customer?.name?.trim();
  if (n) return n;
  const em = entry?.customer?.email?.trim();
  if (em) return em;
  if (fallbackId != null && String(fallbackId).trim()) return String(fallbackId).trim();
  return "Khách hàng";
};

const getAdminToken = () => {
  try {
    const raw = localStorage.getItem("admin_v1") || localStorage.getItem("admin");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (
      parsed?.token ||
      parsed?.access_token ||
      parsed?.accessToken ||
      parsed?.user?.token ||
      null
    );
  } catch {
    return null;
  }
};

export default function ChatAdmin() {
  const token = getAdminToken();
  const socketRef = useRef(null);
  const selectedCustomerIdRef = useRef(null);

  const [inboxLoading, setInboxLoading] = useState(false);
  const [inbox, setInbox] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const selectedRoomID = useMemo(() => {
    if (!selectedCustomerId) return null;
    return `customer:${selectedCustomerId}`;
  }, [selectedCustomerId]);

  const selectedInboxEntry = useMemo(() => {
    if (!selectedCustomerId) return null;
    return (
      inbox.find((x) => String(x.customerId) === String(selectedCustomerId)) ||
      null
    );
  }, [inbox, selectedCustomerId]);

  const selectedChatTitle = selectedInboxEntry
    ? customerDisplayName(selectedInboxEntry, selectedCustomerId)
    : "";

  const loadInbox = async () => {
    setInboxLoading(true);
    try {
      const list = await getChatInbox();
      const rows = Array.isArray(list) ? list : [];
      setInbox(
        rows.map((row) => ({
          ...row,
          customerId:
            row.customerId != null ? String(row.customerId).trim() : "",
        })),
      );
    } catch (e) {
      message.error(e?.response?.data?.message || e?.message || "Không tải được danh sách tin nhắn");
    } finally {
      setInboxLoading(false);
    }
  };

  const loadHistory = async (customerId) => {
    if (!customerId) return;
    const list = await getChatHistory({ customerId });
    const mapped = (Array.isArray(list) ? list : []).map(normalizeMessage);
    setMessages(mapped);
  };

  useEffect(() => {
    if (!token) return;
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    selectedCustomerIdRef.current = selectedCustomerId;
  }, [selectedCustomerId]);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("chat:inbox:newMessage", (payload) => {
      const cid = payload?.customerId;
      if (!cid) return;
      const idStr = String(cid).trim();

      setInbox((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const idx = next.findIndex((x) => String(x.customerId) === idStr);
        const item = {
          customerId: idStr,
          lastMessage: payload?.lastMessage || payload?.message || "",
          lastTimestamp: payload?.lastTimestamp || payload?.timestamp || new Date().toISOString(),
          senderRole: payload?.senderRole,
          customer: payload?.customer ?? undefined,
        };

        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            ...item,
            customer: item.customer ?? next[idx].customer ?? null,
          };
        } else {
          next.unshift({ ...item, customer: item.customer ?? null });
        }
        return next;
      });
    });

    socket.on("chat:newMessage", (payload) => {
      const cid = payload?.customerId;
      if (!cid) return;
      const currentSelected = selectedCustomerIdRef.current;
      if (currentSelected && String(cid) !== String(currentSelected)) return;

      const mapped = normalizeMessage(payload);
      setMessages((prev) => [...prev, mapped]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    if (!selectedCustomerId || !socketRef.current) return;
    // join room của customer đang được xem
    socketRef.current.emit("chat:joinCustomerRoom", {
      customerId: selectedCustomerId,
      roomID: selectedRoomID,
    });
    loadHistory(selectedCustomerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId]);

  const send = () => {
    const v = String(text || "").trim();
    if (!v) return;
    if (!selectedCustomerId || !socketRef.current) return;

    setText("");
    socketRef.current.emit("chat:sendMessage", {
      customerId: selectedCustomerId,
      message: v,
    });
  };

  const scrollPane = {
    overflowY: "auto",
    overscrollBehavior: "contain",
    WebkitOverflowScrolling: "touch",
    minHeight: 0,
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#F8F7F5",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0F172A" }}>Chat Inbox</h2>
          <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: 13 }}>
            Tin nhắn từ khách — trả lời trực tiếp qua chat (không dùng AI tự động)
          </p>
        </div>
        <Button type="primary" onClick={loadInbox} loading={inboxLoading}>
          Làm mới
        </Button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)",
          gridTemplateRows: "minmax(0, 1fr)",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 14,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              padding: "12px 14px",
              borderBottom: "1px solid #F1F5F9",
              background: "#F8FAFC",
            }}
          >
            <b style={{ color: "#0F172A" }}>Danh sách</b>
          </div>
          <div style={{ ...scrollPane, flex: 1 }}>
            {inbox.length === 0 && (
              <div style={{ padding: 18, color: "#94A3B8", fontSize: 13 }}>
                Chưa có hội thoại
              </div>
            )}
            {inbox.map((item, rowIdx) => {
              const idStr = String(item.customerId ?? "").trim();
              const active = idStr === String(selectedCustomerId ?? "").trim();
              return (
                <button
                  key={idStr || `inbox-row-${rowIdx}`}
                  type="button"
                  onClick={() => setSelectedCustomerId(idStr)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 14px",
                    border: "none",
                    cursor: "pointer",
                    background: active ? "rgba(244,157,37,0.10)" : "transparent",
                    borderBottom: "1px solid #F1F5F9",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: "#0F172A", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {customerDisplayName(item, idStr)}
                      </div>
                      <div style={{ marginTop: 4, color: "#64748B", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.lastMessage || "—"}
                      </div>
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {fmtTime(item.lastTimestamp)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 14,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              padding: "12px 14px",
              borderBottom: "1px solid #F1F5F9",
              background: "#F8FAFC",
            }}
          >
            <b style={{ color: "#0F172A" }}>
              {selectedCustomerId ? `Chat: ${selectedChatTitle}` : "Chọn một khách hàng"}
            </b>
          </div>

          <div
            style={{
              ...scrollPane,
              flex: 1,
              padding: 14,
              background: "#FAFAF8",
            }}
          >
            {selectedCustomerId && messages.length === 0 && (
              <div style={{ padding: 18, color: "#94A3B8", fontSize: 13 }}>
                Chưa có tin nhắn
              </div>
            )}
            {messages.map((m) => {
              const isAdmin = m.senderRole === "admin";
              const bubbleKey =
              m.senderRole === "ai" ? "ai"  : m.senderRole === "admin"? "admin" : "user";
              return (
                <div
                  key={m._id}
                  style={{ display: "flex", justifyContent: isAdmin ? "flex-end" : "flex-start", marginBottom: 10 }}
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
                        Tin tự động (lưu trong lịch sử)
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
          </div>

          <div
            style={{
              flexShrink: 0,
              padding: 12,
              borderTop: "1px solid #F1F5F9",
              background: "#fff",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={selectedCustomerId ? "Nhập tin nhắn..." : "Chọn khách hàng để nhắn"}
              onPressEnter={send}
              disabled={!selectedCustomerId}
            />
            <Button type="primary" onClick={send} disabled={!selectedCustomerId || !String(text || "").trim()}>
              Gửi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

