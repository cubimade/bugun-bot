// ============================================================
//  CLAUDE.JS — AI javob mantiqi (Anthropic Claude bilan ishlash)
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import {
  ANTHROPIC_KEY,
  MODEL_HAIKU,
  SYSTEM_PROMPT,
  COMMENT_SYSTEM_PROMPT,
} from "./config.js";

const claude = new Anthropic({ apiKey: ANTHROPIC_KEY });

// DM suhbatiga javob. `messages` — to'liq suhbat tarixi [{role, content}].
// `systemPrompt` — akkauntga xos prompt (bilim bazasi bilan, Bosqich 2).
export async function getClaudeReply(messages, systemPrompt = SYSTEM_PROMPT, model = MODEL_HAIKU) {
  try {
    const response = await claude.messages.create({
      model,
      max_tokens: 500,
      system: systemPrompt,
      messages,
    });
    return response.content[0].text;
  } catch (err) {
    console.error("⚠️ Claude xatoligi:", err.message);
    return "Kechirasiz, hozir javob bera olmayapman. Birozdan keyin urinib ko'ring.";
  }
}

// Kommentga qisqa javob.
export async function getCommentReply(
  commentText,
  username,
  systemPrompt = COMMENT_SYSTEM_PROMPT
) {
  try {
    const response = await claude.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 150,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Komment${username ? " (@" + username + ")" : ""}: ${commentText}`,
        },
      ],
    });
    return response.content[0].text.trim();
  } catch (err) {
    console.error("⚠️ Claude (komment) xatoligi:", err.message);
    return "Rahmat! 🙌";
  }
}
