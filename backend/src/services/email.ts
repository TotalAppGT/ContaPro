const RESEND_URL = "https://api.resend.com/emails";
const FROM = process.env.RESEND_FROM || "ContaPro <no-reply@totalappgt.com>";

export async function sendEmail(
  to: string | null | undefined,
  subject: string,
  html: string
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!res.ok) console.error("[Email] Resend", res.status, (await res.text()).slice(0, 120));
    return res.ok;
  } catch (e: any) {
    console.error("[Email] fallo:", e.message);
    return false;
  }
}
