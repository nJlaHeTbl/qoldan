// Anti-spam and anti-fraud checks for the in-app chat. Each check returns a ready Response when the
// message must not be sent, or null. Detections are logged so moderators can spot spammers.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
export const CHAT_LIMITS = {
  perTenMinutes: 60,
  massCopies: 5,
  newConversationsPerHour: 20,
} as const;

const refuse = (status: number, error: string, code: string) =>
  Response.json({ error, code }, { status, headers: { 'cache-control': 'no-store' } });

function luhn(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** True when the text contains something that looks like a bank card number (16–19 digits, Luhn-valid). */
export function containsCardNumber(text: string) {
  for (const match of text.matchAll(/(?:\d[ -]?){15,18}\d/g)) {
    const digits = match[0].replace(/\D/g, '');
    if (digits.length >= 16 && digits.length <= 19 && luhn(digits)) return true;
  }
  return false;
}

export async function checkOutgoingMessage(
  db: D1Database,
  senderId: string,
  conversationId: string,
  body: string,
  now = Date.now(),
): Promise<Response | null> {
  if (containsCardNumber(body)) {
    return refuse(
      400,
      'Не отправляйте номер карты в чате. Qoldan не принимает оплату, а мошенники часто просят данные карты.',
      'card_number',
    );
  }
  const duplicate = await db
    .prepare(
      `SELECT 1 AS found FROM messages
       WHERE conversation_id = ? AND sender_id = ? AND body = ? AND created_at >= ? LIMIT 1`,
    )
    .bind(conversationId, senderId, body, now - MINUTE)
    .first();
  if (duplicate) return refuse(409, 'Это сообщение уже отправлено.', 'duplicate');

  const copies = await db
    .prepare(
      `SELECT COUNT(DISTINCT conversation_id) AS n FROM messages
       WHERE sender_id = ? AND body = ? AND created_at >= ? AND conversation_id != ?`,
    )
    .bind(senderId, body, now - HOUR, conversationId)
    .first<{ n: number }>();
  if (Number(copies?.n) >= CHAT_LIMITS.massCopies - 1) {
    console.warn(JSON.stringify({ event: 'chat_mass_message', senderId }));
    return refuse(
      429,
      'Похоже на массовую рассылку: одинаковый текст уже отправлен в несколько диалогов. Напишите каждому отдельно.',
      'mass_message',
    );
  }
  const recent = await db
    .prepare('SELECT COUNT(*) AS n FROM messages WHERE sender_id = ? AND created_at >= ?')
    .bind(senderId, now - 10 * MINUTE)
    .first<{ n: number }>();
  if (Number(recent?.n) >= CHAT_LIMITS.perTenMinutes) {
    console.warn(JSON.stringify({ event: 'chat_rate_limited', senderId }));
    return refuse(429, 'Слишком много сообщений. Подождите несколько минут.', 'rate_limited');
  }
  return null;
}

/** Limit on starting new conversations (re-opening an existing one is always allowed). */
export async function checkNewConversation(db: D1Database, participantId: string, now = Date.now()) {
  const started = await db
    .prepare('SELECT COUNT(*) AS n FROM conversations WHERE participant_id = ? AND created_at >= ?')
    .bind(participantId, now - HOUR)
    .first<{ n: number }>();
  if (Number(started?.n) >= CHAT_LIMITS.newConversationsPerHour) {
    console.warn(JSON.stringify({ event: 'chat_new_conversations_limited', participantId }));
    return refuse(
      429,
      'Слишком много новых диалогов за час. Попробуйте позже.',
      'rate_limited',
    );
  }
  return null;
}
