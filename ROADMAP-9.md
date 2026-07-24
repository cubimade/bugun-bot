# BUGUN BOT — 9-BOSQICH: TELEGRAM VA KO'P KANALLILIK

> **Claude Code uchun:** Bu faylni to'liq o'qi. **ROADMAP-8 dan KEYIN bajariladi.** Vazifalarni KETMA-KET bajar, har birini commit + push qil, deploy tekshir. Regressiya SHART. Mendan so'rama — faqat env/token kerak bo'lsa ayt. Tugagach "9-BOSQICH TUGADI" deb yoz.

## MAQSAD
Platformani ko'p kanalli qilish: Telegram (App Review kerak emas — tez natija!), ko'p tillilik, ovozli xabarlar.

---

## VAZIFA 1 — TELEGRAM BOT INTEGRATSIYASI (eng qimmatli!)

Telegram — Instagram'dan ancha oson: App Review yo'q, cheklovlar kam, 24-soat qoidasi yo'q.

1. **Arxitektura:** platforma allaqachon `projects` jadvalida `platform` ustuniga ega. Uni ishlat: `instagram` yoki `telegram`.

2. **Telegram adapteri** (`services/telegram.js`):
   - `sendMessage(chatId, text, token)` — Bot API orqali
   - `sendButtons(chatId, text, buttons, token)` — inline keyboard
   - `setWebhook(token, url)` — webhook o'rnatish
   - Xabar formatini umumiy modelga o'girish (webhook'dan kelgan)

3. **Webhook:** `/webhook/telegram/:projectId` — har bot uchun alohida yo'l. Kelgan xabarni umumiy oqimga uzatish (bir xil AI, bilim bazasi, flow, teglar).

4. **Akkaunt qo'shish:** Akkauntlar sahifasida "Telegram bot qo'shish" — BotFather'dan token olish yo'riqnomasi (qadam-baqadam: @BotFather → /newbot → nom → token), token kiritish, avtomatik webhook o'rnatish va tekshirish.

5. **Umumiy inbox:** Telegram suhbatlari ham Inbox'da, platforma belgisi bilan (📷 Instagram / ✈️ Telegram). Filtr: platforma bo'yicha.

6. **Farqlar:** Telegram'da 24-soat qoidasi yo'q → broadcast va follow-up cheklovsiz. Buni kodda hisobga ol.

**Tugagach:** commit "9.1: Telegram integratsiyasi".

---

## VAZIFA 2 — TELEGRAM MAXSUS IMKONIYATLARI

1. **Inline tugmalar** — Telegram'da chiroyliroq (URL tugmalar ham mumkin)
2. **Fayl yuborish** — PDF/rasm yuborish (lead magnit uchun ideal)
3. **Obuna tekshirish** — kanalga a'zomi? (`getChatMember`) → "Avval kanalimizga obuna bo'ling" (ChatPlace'ning mashhur funksiyasi)
4. **Guruhda ishlash** — bot guruhga qo'shilsa, mention'ga javob berish (ixtiyoriy)

**Tugagach:** commit "9.2: Telegram maxsus funksiyalar".

---

## VAZIFA 3 — KO'P TILLILIK (mijozlar uchun)

1. **Til aniqlash:** mijoz xabaridan tilni aniqlash (o'zbek/rus/ingliz). Oddiy usul: harflar va keng tarqalgan so'zlar bo'yicha, yoki Claude'dan so'rash (birinchi xabarda).
2. `contacts` ga `language` ustuni.
3. Bot o'sha tilda javob beradi (SYSTEM_PROMPT'ga qo'shiladi: "Mijoz rus tilida yozdi — rus tilida javob ber").
4. Bilim bazasi bitta (o'zbekcha) qolaveradi — Claude tarjima qilib javob beradi.
5. Sozlamalarda: qo'llab-quvvatlanadigan tillar ro'yxati, standart til.
6. Inbox'da til bayrog'i ko'rinsin.

**Tugagach:** commit "9.3: ko'p tillilik".

---

## VAZIFA 4 — OVOZLI XABARNI MATNGA O'GIRISH

1. Mijoz ovozli xabar yuborsa — audio faylni yuklab ol (Instagram/Telegram URL'idan).
2. Transkripsiya: agar ELEVENLABS_API_KEY yoki boshqa STT xizmati env'da bo'lsa — ishlat. Bo'lmasa — hozirgi javob ("matn bilan yozing") qolsin va Elbek'ga ayt: "Ovoz→matn uchun STT API kaliti kerak".
3. Matnga o'girilgach — odatdagidek AI javob beradi.
4. Inbox'da: ovozli xabar + uning matni ko'rinsin.

**Tugagach:** commit "9.4: ovoz→matn".

---

## VAZIFA 5 — MEDIA KUTUBXONA

1. **Database:** `media_library` — `id, project_id, name, type (image/video/file), url, size, created_at`.
2. **Sahifa:** `/dashboard/media` (sidebar: 🖼 Media) — yuklangan fayllar galereyasi, yuklash, o'chirish, nusxalash (URL).
3. **Saqlash:** fayllar Railway diskida (`/uploads`) yoki tashqi xizmatda. Diskda saqlansa — hajm chegarasini hisobga ol (masalan 100 MB), eskisini o'chirish siyosati.
4. **Ishlatish:** inbox'da javob yozganda "📎 Media" tugmasi — kutubxonadan tanlab yuborish. Flow'da ham (message node'iga media biriktirish). Broadcast'da ham.
5. **Portfolio:** "Ishlaringizni ko'rsating" so'ralganda bot avtomatik tanlangan rasmlarni yuborsin (bilim bazasida "portfolio" belgisi bilan).

**Tugagach:** commit "9.5: media kutubxona".

---

## VAZIFA 6 — LEAD MAGNIT

1. Sozlamalarda: "Lead magnit" — fayl (PDF/rasm) + matn + qaysi kalit so'zda yuboriladi.
2. Mijoz kalit so'z yozsa (masalan "PDF") → bot faylni yuboradi + kontaktni "lead" tegi bilan belgilaydi.
3. Statistika: nechta yuborilgan, keyin nechtasi mijozga aylangan.

**Tugagach:** commit "9.6: lead magnit".

---

## YAKUNIY NAZORAT

1. Instagram va Telegram bir vaqtda ishlaydi, aralashmaydi
2. Umumiy inbox ikkala platformani ko'rsatadi
3. Flow'lar ikkala platformada ishlaydi
4. Regressiya to'liq
5. Hisobot: qaysi kanallar ulangan, farqlar jadvali

**Tugagach:** commit "9.7: yakuniy nazorat" va "9-BOSQICH TUGADI".

---

## TEXNIK QOIDALAR
1. Platforma adapterlari alohida fayllarda (`services/instagram.js`, `services/telegram.js`) — umumiy interfeys
2. Webhook mantiqi umumiy: platformadan qat'i nazar bir xil oqim (AI, flow, teglar)
3. Telegram token env'da emas, database'da (`projects.access_token`)
4. Mavjud funksiyani buzish TAQIQLANADI
