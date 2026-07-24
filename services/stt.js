// ============================================================
//  SERVICES/STT.JS — 9.4: ovozli xabarni matnga o'girish
//  ELEVENLABS_API_KEY env bo'lsa ishlaydi (Scribe v1 modeli).
//  Kalit bo'lmasa — null qaytadi va bot eski tayyor javobni beradi.
// ============================================================

const ELEVENLABS_KEY = (process.env.ELEVENLABS_API_KEY || "").trim();
const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20 MB dan katta faylni o'tkazmaymiz

export function sttAvailable() {
  return Boolean(ELEVENLABS_KEY);
}

// audioUrl'dan yuklab olib, ElevenLabs STT'ga yuboradi. Matn yoki null.
export async function transcribeAudio(audioUrl) {
  if (!ELEVENLABS_KEY || !audioUrl) return null;
  try {
    // 1) Audio faylni yuklab olamiz
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      console.error(`⚠️ STT: audio yuklab bo'lmadi (HTTP ${audioRes.status})`);
      return null;
    }
    const buf = await audioRes.arrayBuffer();
    if (buf.byteLength > MAX_AUDIO_BYTES) {
      console.warn(`⚠️ STT: audio juda katta (${Math.round(buf.byteLength / 1e6)} MB) — o'tkazildi`);
      return null;
    }

    // 2) ElevenLabs Speech-to-Text (multipart)
    const form = new FormData();
    form.append("model_id", "scribe_v1");
    form.append("file", new Blob([buf]), "voice.ogg");

    const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_KEY },
      body: form,
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("⚠️ STT xatoligi:", data?.detail?.message || JSON.stringify(data).slice(0, 200));
      return null;
    }
    const text = (data.text || "").trim();
    if (!text) return null;
    console.log(`🎤→📝 Transkripsiya: ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`);
    return text;
  } catch (err) {
    console.error("⚠️ STT xatoligi:", err.message);
    return null;
  }
}
