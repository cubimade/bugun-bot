// ============================================================
//  SERVICES/IG-PROFILE.JS — mijoz profili (ROADMAP-16, 2.1)
//
//  Instagram Messaging API sizga YOZGAN mijoz haqida ma'lumot beradi:
//    GET graph.instagram.com/v23.0/{IGSID}?fields=name,username,profile_pic
//
//  Cheklovlar (bilib turish kerak):
//   - faqat sizga yozgan mijozlar uchun ishlaydi
//   - profile_pic URL'i vaqtinchalik — muddati tugaydi, qayta olish kerak
//   - mijoz ma'lumot ulashishni o'chirgan bo'lsa xato qaytadi → ID bilan qolamiz
//
//  Bu modul HECH QACHON yiqilmaydi: xato bo'lsa null qaytaradi va WARN yozadi.
//  Telegram kontaktlari uchun chaqirilmaydi (u yerda ism webhook'dan keladi).
// ============================================================
import { markProfileChecked, saveContactProfile } from "../db.js";

const GRAPH_V = "https://graph.instagram.com/v23.0";

// Profilni Meta'dan olish. Muvaffaqiyatsizlikda null.
export async function fetchContactProfile(igsid, token) {
  if (!igsid || !token) return null;
  try {
    const params = new URLSearchParams({
      fields: "name,username,profile_pic",
      access_token: token,
    });
    const res = await fetch(`${GRAPH_V}/${encodeURIComponent(igsid)}?${params.toString()}`);
    const json = await res.json().catch(() => ({}));

    if (!res.ok || json.error) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      console.warn(`⚠️ Profil olinmadi (${igsid}): ${msg}`);
      return null;
    }
    return {
      username: json.username || null,
      fullName: json.name || null,
      pic: json.profile_pic || null,
    };
  } catch (err) {
    console.warn(`⚠️ Profil so'rovi xatosi (${igsid}): ${err.message}`);
    return null;
  }
}

// Bitta kontakt profilini yangilash va bazaga yozish.
// Natija: true (yangilandi) / false (olinmadi — lekin urinish belgilanadi)
export async function refreshContactProfile(contactId, igsid, token) {
  const profile = await fetchContactProfile(igsid, token);
  if (!profile || (!profile.username && !profile.fullName && !profile.pic)) {
    // Muvaffaqiyatsiz urinishni ham belgilaymiz — har xabarda qayta
    // urinib Meta limitini yeb qo'ymaslik uchun (7 kundan keyin yana uriniladi)
    await markProfileChecked(contactId).catch(() => {});
    return false;
  }
  await saveContactProfile(contactId, profile);
  return true;
}

// FON REJIMI: webhook javobini KECHIKTIRMAYDI (roadmap 2.1/3-band).
// Xato bo'lsa ham kiruvchi xabar oqimiga umuman ta'sir qilmaydi.
export function refreshContactProfileInBackground(contactId, igsid, token) {
  setImmediate(() => {
    refreshContactProfile(contactId, igsid, token).catch((err) =>
      console.warn(`⚠️ Fon profil yangilash xatosi: ${err.message}`)
    );
  });
}
