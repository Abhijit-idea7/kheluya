// Razorpay checks, kept free of Supabase/Deno so they can be tested anywhere (Web Crypto only).

const enc = new TextEncoder();

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time comparison of two hex strings. */
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Checkout result: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export async function checkPaymentSignature(secret: string, orderId: string, paymentId: string, signature: string): Promise<boolean> {
  if (!secret || !orderId || !paymentId || !signature) return false;
  return safeEqual(await hmacHex(secret, `${orderId}|${paymentId}`), signature);
}

/** Webhook: X-Razorpay-Signature = HMAC_SHA256(raw body, webhook_secret). */
export async function checkWebhookSignature(secret: string, rawBody: string, signature: string): Promise<boolean> {
  if (!secret || !signature) return false;
  return safeEqual(await hmacHex(secret, rawBody), signature);
}

/** From a webhook body: the Razorpay order and payment of a successful payment, or null for other events. */
export function paidFromWebhook(body: unknown): { orderId: string; paymentId: string } | null {
  const b = body as { event?: string; payload?: { payment?: { entity?: { order_id?: string; id?: string; status?: string } }; order?: { entity?: { id?: string } } } };
  if (b?.event !== 'payment.captured' && b?.event !== 'order.paid') return null;
  const pay = b.payload?.payment?.entity;
  const orderId = pay?.order_id || b.payload?.order?.entity?.id || '';
  const paymentId = pay?.id || '';
  return orderId && paymentId ? { orderId, paymentId } : null;
}
