# BUGUN BOT — 7-BOSQICH: MIJOZ OQIMI VA AVTOMATIZATSIYA

> **Claude Code uchun:** Bu faylni to'liq o'qi. Vazifalarni KETMA-KET bajar. Har vazifani tugatib GitHub'ga commit + push qil, Railway deploy'ni tekshir. Regressiya: bot (DM, komment, bilim bazasi, pauza, broadcast) har qismdan keyin ishlashi SHART. Mendan so'rama — faqat env/token kerak bo'lsa to'xtab ayt. Tugagach "7-BOSQICH TUGADI" deb yoz va hisobot ber.

## MAQSAD
Instagram'da mijoz oqimini kengaytirish (story, kalit so'z) va yo'qotilgan mijozlarni qaytarish (follow-up). Plus: akkaunt ulashni oson qilish.

---

## VAZIFA 1 — AKKAUNT ULASH SEHRGARI (onboarding wizard)

Dashboard → Akkauntlar → "+ Yangi akkaunt" ni qadam-baqadam sehrgarga aylantir:

**Qadam 1:** "Akkauntingiz Business/Creator turidami?" — Ha/Yo'q. Yo'q bo'lsa: Instagram'da qanday o'zgartirish yo'riqnomasi.

**Qadam 2:** "Instagram Tester roli" — Meta Roles sahifasiga havola (yangi oynada), qisqa yo'riqnoma, "Bajardim" tugmasi.

**Qadam 3:** "Instagram'da taklifni qabul qiling" — telefonda qayerga borish (Settings → Apps and websites → Tester invites), "Bajardim" tugmasi.

**Qadam 4:** "Token oling" — Meta API Setup sahifasiga havola, "Add account" → "Generate token" yo'riqnomasi. Token kiritish maydoni.

**Qadam 5:** "Webhook obunasini yoqing" — o'sha qatorda Webhook Subscription = On qilish (ekran tasviri tavsifi bilan), "Bajardim" tugmasi.

**Qadam 6:** Tekshirish — token API'da tekshiriladi, username ko'rsatiladi, saqlanadi. Muvaffaqiyat xabari.

Har qadamda: progress ko'rsatkichi (1/6), orqaga/oldinga tugmalari, aniq matn. Havolalar `target="_blank"`.

**Tugagach:** commit "7.1: akkaunt ulash sehrgari".

---

## VAZIFA 2 — AKKAUNT DIAGNOSTIKASI

Har akkaunt kartasida "🔍 Tekshirish" tugmasi. Bosilganda:

1. **Token holati** — Instagram API'ga so'rov (`/me`), tirikmi? Kimga tegishli (username)? ID mos keladimi?
2. **Webhook obunasi** — Meta API'dan tekshir (`/{app-id}/subscriptions` yoki akkaunt subscribed_apps). Agar tekshirib bo'lmasa — "Qo'lda tekshiring" + havola.
3. **Faollik** — oxirgi xabar qachon kelgan (database'dan). "3 kun oldin" yoki "Hali xabar kelmagan".
4. **Bilim bazasi** — to'ldirilganmi, necha belgi.

Natija: har band yonida ✅/⚠️/❌ + muammo bo'lsa **aniq nima qilish kerakligi** (havola bilan).

**Tugagach:** commit "7.2: akkaunt diagnostikasi".

---

## VAZIFA 3 — STORY REPLY (eng muhim!)

Instagram story'ga javob yozganlarni ushlash — bu Instagram'da eng katta mijoz oqimi manbai.

1. **Webhook:** `messaging` hodisasida `message.reply_to.story` mavjud bo'lsa — bu story reply.
2. Bot javob berishi kerak, lekin **kontekst bilan**: "Story'imga javob berganingiz uchun rahmat!" + savolga javob.
3. Database: `messages` jadvaliga `source` ustuni (`dm` / `story_reply` / `comment`).
4. Dashboard: Inbox'da story reply'lar alohida belgi bilan (📸), filtr: "Story javoblari".
5. Sozlamalarda: story reply uchun alohida salomlashish matni (ixtiyoriy).
6. Analitikada: qaysi manbadan qancha mijoz kelgani (dm/story/komment taqsimoti — donut chart).

**Tugagach:** commit "7.3: story reply".

---

## VAZIFA 4 — KALIT SO'Z → AVTO-JAVOB

ManyChat'ning klassik funksiyasi: postda "NARX deb yozing" → kim yozsa avtomatik javob.

1. Database: `keyword_rules` jadvali — `id, project_id, keyword, match_type (exact/contains), reply_text, media_url, is_active, created_at`.
2. Dashboard: yangi sahifa `/dashboard/keywords` (sidebar: 🔑 Kalit so'zlar) — qoidalar ro'yxati, qo'shish/tahrirlash/o'chirish.
3. Webhook mantiqi: xabar kelganda avval kalit so'z qoidalari tekshiriladi. Mos kelsa — o'sha javob yuboriladi (AI chaqirilmaydi, tejamkor!). Mos kelmasa — odatdagi AI javob.
4. Kalit so'z komment'da ham ishlasin (komment → avtomatik DM).
5. Statistika: har qoida necha marta ishlagani.

**Tugagach:** commit "7.4: kalit so'z avto-javob".

---

## VAZIFA 5 — FOLLOW-UP AVTOMATIZATSIYA (sotuvni oshiradi)

Mijoz yozdi, bot javob berdi, mijoz **jim qoldi** → bir muddatdan keyin bot eslatadi.

1. Database: `contacts` ga `last_message_at`, `followup_sent_count`, `followup_paused` ustunlari.
2. Sozlamalarda: follow-up yoqish/o'chirish, kutish vaqti (24 soat / 48 soat / 3 kun), maksimal urinishlar (1-3), matn shablonlari.
3. Scheduler (har soatda): shartlarga mos kontaktlarni top → follow-up yubor:
   - Oxirgi xabar bot'dan bo'lgan (mijoz javob bermagan)
   - Belgilangan vaqt o'tgan
   - Follow-up limiti tugamagan
   - Bot pauzada emas, kontakt arxivlanmagan
4. **24-soat qoidasi:** Instagram faqat 24 soat ichida oddiy xabar yuborishga ruxsat beradi. Agar 24 soat o'tgan bo'lsa — yuborma (yoki loglarga yoz). Bu MUHIM.
5. Matn shablonlari: "{ism}, savolingiz qoldimi? 😊", "Yordam kerakmi?"
6. Dashboard: Analitikada "Follow-up natijalari" — nechta yuborildi, nechtasi javob oldi (konversiya).

**Tugagach:** commit "7.5: follow-up avtomatizatsiya".

---

## VAZIFA 6 — RASM VA OVOZ XABARLARIGA JAVOB

Hozir bot faqat matnga javob beradi. Mijoz rasm/ovoz yuborsa — jim qoladi (yomon tajriba).

1. Webhook: `message.attachments` bo'lsa turini aniqla (image/audio/video/file).
2. Rasm: bot javob bersin — "Rasmni oldim! 📸 Savolingizni yozib yuborsangiz, aniq javob beraman." (Kelajakda AI rasm tahlili qo'shiladi.)
3. Ovoz: "Ovozli xabaringizni oldim 🎤 Iltimos, savolingizni matn bilan yozing — shunda tez javob beraman."
4. Sozlamalarda bu matnlarni tahrirlash imkoni.
5. Database'ga saqlansin (`content` = "[rasm]" yoki "[ovozli xabar]"), inbox'da belgi bilan ko'rinsin.

**Tugagach:** commit "7.6: media xabarlarga javob".

---

## VAZIFA 7 — BILIM BAZASI SIFAT BAHOLOVCHI

1. Bilim bazasi sahifasida "🔍 Sifatni tekshirish" tugmasi.
2. Claude (Haiku) bilim bazasini o'qiydi va baholaydi:
   - Nima bor: xizmatlar ✅ / narxlar ❌ / aloqa ✅ / ish vaqti ❌ / FAQ ⚠️
   - Umumiy ball (0-100)
   - Aniq tavsiyalar: "Narxlar ko'rsatilmagan — mijozlar eng ko'p shuni so'raydi"
3. Natija chiroyli kartada, tavsiyalar ro'yxat bilan.
4. Bonus: "Javobsiz savollar" (bot javob berolmagan) bilan bog'la — "Bu savollarga javob bilim bazasida yo'q".

**Tugagach:** commit "7.7: bilim bazasi baholovchi".

---

## VAZIFA 8 — AVTOMATIK TEGLASH QOIDALARI

1. Database: `tag_rules` jadvali — `id, project_id, keyword, tag_name, is_active`.
2. Sozlamalarda: qoidalar boshqaruvi (so'z → teg).
3. Standart qoidalar (o'rnatishda avtomatik qo'shilsin):
   - "narx", "qancha", "necha pul" → **qiziqqan**
   - "keyin", "o'ylab ko'raman", "rahmat" → **sovuq**
   - "qachon", "band qilay", "kelaman" → **issiq**
   - "shikoyat", "yomon", "qaytaring" → **e'tibor kerak**
4. Xabar kelganda avtomatik teg qo'yiladi (mavjud teglar ustiga).
5. Kontaktlar sahifasida teg bo'yicha filtr allaqachon bor — ishlashini tekshir.

**Tugagach:** commit "7.8: avtomatik teglash".

---

## YAKUNIY NAZORAT

1. Barcha yangi sahifalar light/dark + mobil'da ishlaydi
2. Yangi endpointlar parol himoyasida
3. Regressiya: to'liq bot zanjiri
4. Scheduler'lar bir-biriga xalaqit bermaydi (broadcast + follow-up)
5. Hisobot: qo'shilgan funksiyalar, sozlamalar ro'yxati, keyingi tavsiyalar

**Tugagach:** commit "7.9: yakuniy nazorat" va "7-BOSQICH TUGADI".

---

## TEXNIK QOIDALAR
1. Kutubxonasiz (sof CSS/SVG/vanilla JS)
2. AI chaqiruvlari: Haiku + kesh
3. Database: ALTER TABLE IF NOT EXISTS
4. Har qadamda: node --check → commit → push → deploy
5. Mavjud funksiyani buzish TAQIQLANADI
6. Instagram 24-soat qoidasiga qat'iy amal qil (follow-up va broadcast'da)
