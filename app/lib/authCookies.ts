import crypto from "crypto";

// Sign "raw" -> "raw.sig" with HMAC (JWT_SECRET)
export function signValue(raw: string, secret: string) {
  const sig = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return `${raw}.${sig}`;
}

export function verifyValue(signed: string, secret: string) {
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const raw = signed.slice(0, i);
  const sig = signed.slice(i + 1);
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return raw;
}

export function parseState(raw: string) {
  // state = `${uuid}|${timestamp}|${origin}`
  const [uuid, ts, origin] = raw.split("|");
  if (!uuid || !ts) return null;
  const timestamp = Number(ts);
  if (!Number.isFinite(timestamp)) return null;
  return { uuid, timestamp, origin: origin || "" };
}

