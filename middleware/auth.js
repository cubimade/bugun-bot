// ============================================================
//  MIDDLEWARE/AUTH.JS — Basic Auth himoyasi (ROADMAP-6 A3)
//  DASHBOARD_PASSWORD o'rnatilgan bo'lsa — parol talab qilinadi.
//  O'rnatilmagan bo'lsa — ochiq (Railway'da parol qo'shilishi kerak).
//  Foydalanuvchi nomi ixtiyoriy (masalan "admin"), parol = DASHBOARD_PASSWORD.
// ============================================================
export function protect(req, res, next) {
  const pass = process.env.DASHBOARD_PASSWORD;
  if (!pass) return next(); // parol yo'q — ochiq

  const hdr = req.get("authorization") || "";
  const [scheme, encoded] = hdr.split(" ");
  if (scheme === "Basic" && encoded) {
    const decoded = Buffer.from(encoded, "base64").toString();
    const pwd = decoded.slice(decoded.indexOf(":") + 1);
    if (pwd === pass) return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="Bugun Bot Dashboard"');
  res.status(401).send("Ruxsat yo'q — parol kerak");
}
