const mongoose = require("mongoose");

/** ObjectId cố định cho tin nhắn do AI gửi (không trùng user thật). */
const AI_SENDER_OBJECT_ID = new mongoose.Types.ObjectId("0000000000000000000000a1");

const DEFAULT_SYSTEM_PROMPT = `Bạn là trợ lý ảo thân thiện của cửa hàng thời trang online. Trả lời ngắn gọn, rõ ràng bằng tiếng Việt.
Giúp khách: tìm sản phẩm, size, đổi trả, vận chuyển, thanh toán. Nếu không chắc hoặc cần xử lý đặc biệt, hãy gợi ý khách liên hệ bộ phận hỗ trợ hoặc hotline của cửa hàng.`;

function buildOpenAiMessages(dbMessages) {
  const system = {
    role: "system",
    content: process.env.AI_CHAT_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT,
  };
  const out = [system];
  for (const row of dbMessages) {
    const role = row.senderRole;
    if (role === "user") {
      out.push({ role: "user", content: row.message });
    } else if (role === "ai" || role === "admin") {
      out.push({ role: "assistant", content: row.message });
    }
  }
  return out;
}

/**
 * @param {Array<{ senderRole: string, message: string }>} dbMessages — theo thời gian tăng dần
 */
async function getAiReplyFromHistory(dbMessages) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const model = (process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini").trim();

  if (!apiKey) {
    return {
      text: "Trợ lý AI chưa được cấu hình (thiếu OPENAI_API_KEY trên server). Vui lòng liên hệ quản trị viên.",
      error: "NO_API_KEY",
    };
  }

  const messages = buildOpenAiMessages(dbMessages);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[aiChatService] OpenAI HTTP", res.status, errText);
    return {
      text: "Xin lỗi, tôi chưa thể trả lời lúc này. Bạn thử lại sau nhé.",
      error: "OPENAI_HTTP",
    };
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return {
      text: "Xin lỗi, tôi chưa có câu trả lời phù hợp. Bạn thử hỏi theo cách khác nhé.",
      error: "EMPTY",
    };
  }

  return { text };
}

module.exports = {
  AI_SENDER_OBJECT_ID,
  getAiReplyFromHistory,
};
