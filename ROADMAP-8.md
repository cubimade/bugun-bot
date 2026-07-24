# BUGUN BOT — 8-BOSQICH: FLOW BUILDER VA SOTUV VORONKASI

> **Claude Code uchun:** Bu faylni to'liq o'qi. **ROADMAP-7 dan KEYIN bajariladi.** Vazifalarni KETMA-KET bajar, har birini commit + push qil, deploy tekshir. Regressiya har qismdan keyin SHART. Mendan so'rama — faqat env/token kerak bo'lsa ayt. Tugagach "8-BOSQICH TUGADI" deb yoz.

## MAQSAD
ChatPlace/ManyChat'ning yuragi — vizual suhbat oqimlari (flow builder) va sotuv voronkasi. Bu eng katta yetishmayotgan funksiya.

---

## VAZIFA 1 — TUGMALI JAVOBLAR (flow uchun asos)

Instagram matn emas, **tugmalar** yuborishni qo'llab-quvvatlaydi (quick replies va button templates).

1. `instagram.js` ga yangi funksiya: `sendButtons(recipientId, text, buttons, token)` — Instagram API'ning quick_replies formatida yuboradi (maksimum 13 ta, har biri 20 belgigacha).
2. Webhook: foydalanuvchi tugmani bosganda `message.quick_reply.payload` keladi — buni ushlab, mos javob berish.
3. Sozlamalarda: "Salomlashish tugmalari" — yangi mijozga birinchi xabarda tugmalar ko'rsatish (masalan: "Narxlar", "Xizmatlar", "Bog'lanish"). Har tugma uchun matn + javob.
4. Test: tugmali xabar yuborilishi va bosilganda javob kelishi.

**Tugagach:** commit "8.1: tugmali javoblar".

---

## VAZIFA 2 — FLOW BUILDER: MA'LUMOTLAR MODELI VA MOTOR

Bu katta vazifa — avval backend, keyin UI.

1. **Database:**
   - `flows` — `id, project_id, name, trigger_type (keyword/story/comment/new_contact/manual), trigger_value, is_active, created_at`
   - `flow_nodes` — `id, flow_id, type (message/buttons/condition/action/delay), config (jsonb), position_x, position_y`
   - `flow_edges` — `id, flow_id, from_node_id, to_node_id, condition_label` (tugma matni yoki shart natijasi)
   - `contact_flow_state` — `id, contact_id, flow_id, current_node_id, variables (jsonb), next_run_at, status (active/completed/stopped)`

2. **Flow motori** (`services/flow-engine.js`):
   - Trigger tekshirish: xabar kelganda mos flow bormi
   - Node bajarish: message → yubor; buttons → tugmalar bilan yubor va javob kut; condition → shart tekshir, mos yo'lga o't; delay → next_run_at belgilab to'xta; action → teg qo'sh / operatorga uzat / follow-up rejalash
   - Keyingi node'ga o'tish (edge bo'yicha)
   - Scheduler: `next_run_at` kelganlarni davom ettirish

3. **Muhim:** flow faol bo'lsa — AI javob berilmaydi (flow boshqaradi). Flow tugagach yoki to'xtatilsa — AI qaytadan ishlaydi.

4. **24-soat qoidasi:** delay 24 soatdan oshsa ogohlantirish (Instagram xabar yuborishga ruxsat bermasligi mumkin).

**Tugagach:** commit "8.2: flow motori (backend)".

---

## VAZIFA 3 — FLOW BUILDER: VIZUAL MUHARRIR

Yangi sahifa `/dashboard/flows` (sidebar: 🔀 Oqimlar).

1. **Ro'yxat sahifasi:** mavjud flow'lar kartalari — nom, trigger, holat (faol/pauza), statistika (nechta kontakt o'tgan, konversiya), "Tahrirlash"/"Nusxalash"/"O'chirish".

2. **Muharrir** (`/dashboard/flows/:id`):
   - **Canvas** — SVG asosida, node'lar to'rtburchak kartalar, edge'lar egri chiziqlar (bezier)
   - **Node turlari** (chap paneldan sudrab olinadi yoki "+ qo'shish"):
     - 💬 **Xabar** — matn (o'zgaruvchilar bilan: `{ism}`)
     - 🔘 **Tugmalar** — matn + 2-5 tugma (har tugmadan alohida chiqish)
     - ❓ **Shart** — teg bor/yo'q, xabarda so'z bor/yo'q (ha/yo'q chiqishlari)
     - ⚡ **Amal** — teg qo'sh/olib tashla, operatorga uzat, botni pauza qil
     - ⏱ **Kutish** — N daqiqa/soat
   - **Node tahrirlash** — bosilganda o'ng panel (drawer) ochiladi, sozlamalar kiritiladi
   - **Ulash** — node chetidagi nuqtadan boshqa node'ga chiziq tortish
   - **Sudrab ko'chirish** — node'ni surish, pozitsiya saqlanadi
   - **Zoom/pan** — canvas'ni kattalashtirish, surish

3. **Soddalik muhim:** murakkab kutubxona ishlatma. Sof SVG + vanilla JS (mousedown/mousemove/mouseup). Node'lar `position_x/y` bilan saqlanadi.

4. **Test rejimi:** "Sinab ko'rish" tugmasi — flow'ni o'zingga yuborib ko'rish (yoki simulyatsiya: qaysi node'lar ketma-ket bajarilishini ko'rsatish).

**Tugagach:** commit "8.3: flow vizual muharrir".

---

## VAZIFA 4 — TAYYOR FLOW SHABLONLARI

Yangi flow yaratishda "Shablondan boshlash" varianti. Tayyor shablonlar:

1. **Salomlashish + menyu** — yangi mijozga: salom + 3 tugma (Narxlar/Xizmatlar/Bog'lanish)
2. **Narx so'rovi** — "Qaysi xizmat qiziqtirdi?" → tugmalar → har biriga narx + "Bog'lanish" tugmasi
3. **Lead yig'ish** — savol-javob: ism → telefon → ehtiyoj → operatorga uzatish
4. **Story javobi** — story'ga javob berganlarga maxsus taklif
5. **Qaytarish (win-back)** — uzoq jim qolganlarga chegirma taklifi

Har shablon bir bosishda yaratiladi va tahrirlanadi.

**Tugagach:** commit "8.4: flow shablonlari".

---

## VAZIFA 5 — SOTUV VORONKASI (KANBAN)

Yangi sahifa `/dashboard/pipeline` (sidebar: 📋 Voronka).

1. **Database:** `contacts` ga `stage` ustuni (`new/interested/negotiation/won/lost`), `stage_changed_at`.
2. **Kanban ko'rinishi:** 5 ustun (Yangi / Qiziqqan / Muzokara / Sotildi / Yo'q). Har ustunda kontakt kartalari (avatar, ism, oxirgi xabar, teglar, summa).
3. **Sudrab ko'chirish** — kartani ustundan ustunga surish (drag & drop, vanilla JS).
4. **Karta bosilganda** — kontakt profili drawer'i (mavjud) ochiladi.
5. **Summa maydoni** — har kontaktga potensial summa yozish mumkin. Ustun tepasida jami summa.
6. **Avtomatik harakat:** teg qo'yilganda bosqich o'zgarishi (masalan "qiziqqan" tegi → Qiziqqan ustuni). Flow'dagi "amal" node'i ham bosqichni o'zgartira olsin.
7. **Statistika:** har bosqichda nechta, konversiya foizi, o'rtacha o'tish vaqti.

**Tugagach:** commit "8.5: sotuv voronkasi (kanban)".

---

## VAZIFA 6 — E'TIROZLARGA JAVOBLAR VA SOTUV SKRIPTI

1. **Bilim bazasiga yangi bo'lim:** "E'tirozlar" — tayyor javoblar:
   - "Qimmat" → qiymat tushuntirish
   - "O'ylab ko'raman" → yumshoq turtki
   - "Keyin bog'lanaman" → follow-up taklifi
   - "Boshqa joyda arzon" → farqni tushuntirish
2. Bilim bazasi shablonida bu bo'lim bo'lsin.
3. **Sotuv rejimi** (sozlamalarda yoqiladi): bot shunchaki javob bermaydi, balki:
   - Ehtiyojni aniqlaydi (savol beradi)
   - Yechim taklif qiladi
   - E'tirozga javob beradi
   - Harakatga chaqiradi (bog'lanish/bron)
   
   Buni SYSTEM_PROMPT'ga qo'shimcha ko'rsatma sifatida qo'sh (sozlamalarda yoqilganda).

**Tugagach:** commit "8.6: e'tirozlar va sotuv skripti".

---

## YAKUNIY NAZORAT

1. Flow motori barqaror: xatolik bo'lsa flow to'xtaydi, bot AI rejimiga qaytadi (mijoz javobsiz qolmasin)
2. Flow + follow-up + broadcast bir-biriga xalaqit bermaydi
3. Vizual muharrir mobil'da ham ishlaydi (kamida ko'rish rejimida)
4. Regressiya to'liq
5. Hisobot

**Tugagach:** commit "8.7: yakuniy nazorat" va "8-BOSQICH TUGADI".

---

## TEXNIK QOIDALAR
1. Flow builder — sof SVG + vanilla JS (React Flow SHART EMAS)
2. Flow motori xatoga chidamli: har node try/catch, xato bo'lsa loglanadi va flow to'xtaydi
3. Database: ALTER TABLE IF NOT EXISTS, indekslar (contact_flow_state.next_run_at)
4. Mavjud funksiyani buzish TAQIQLANADI
