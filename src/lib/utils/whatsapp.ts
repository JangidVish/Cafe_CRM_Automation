// Wati WhatsApp Business API integration
// Docs: https://docs.wati.io
// Requires: WATI_API_ENDPOINT + WATI_ACCESS_TOKEN in .env.local

export interface WhatsAppOrderPayload {
  phone: string          // E.164 without +, e.g. "919876543210"
  orderNumber: string
  orderId: string
  cafeName: string
  tableNumber: number
  items: { name: string; quantity: number; price: number }[]
  total: number
}

function isConfigured(): boolean {
  return !!(process.env.WATI_API_ENDPOINT && process.env.WATI_ACCESS_TOKEN)
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.WATI_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

function baseUrl() {
  return process.env.WATI_API_ENDPOINT!.replace(/\/$/, '')
}

function formatPhone(phone: string): string {
  // Strip all non-digits, ensure starts with country code
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('91') ? digits : `91${digits}`
}

function orderSummaryText(payload: WhatsAppOrderPayload): string {
  const itemLines = payload.items
    .map(i => `  • ${i.name} x${i.quantity} — ₹${i.price * i.quantity}`)
    .join('\n')

  const trackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/order/${payload.orderId}`

  return (
    `✅ *Order Confirmed!*\n\n` +
    `📍 *${payload.cafeName}* — Table ${payload.tableNumber}\n` +
    `🔖 Order: *${payload.orderNumber}*\n\n` +
    `*Your order:*\n${itemLines}\n\n` +
    `💰 *Total: ₹${Math.round(payload.total)}*\n\n` +
    `Track your order live 👇\n${trackUrl}`
  )
}

function ownerAlertText(payload: WhatsAppOrderPayload): string {
  const itemLines = payload.items
    .map(i => `  • ${i.name} x${i.quantity}`)
    .join('\n')

  return (
    `🔔 *New Order — ${payload.orderNumber}*\n\n` +
    `Table ${payload.tableNumber}\n\n` +
    `${itemLines}\n\n` +
    `💰 Total: ₹${Math.round(payload.total)}`
  )
}

async function sendSessionMessage(phone: string, text: string): Promise<void> {
  const url = `${baseUrl()}/api/v1/sendSessionMessage/${formatPhone(phone)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ messageText: text }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Wati session message failed: ${res.status} ${body}`)
  }
}

// Send order confirmation to customer
export async function sendOrderConfirmation(payload: WhatsAppOrderPayload): Promise<void> {
  if (!isConfigured()) {
    console.log('[WhatsApp] Not configured — skipping order confirmation')
    return
  }
  try {
    await sendSessionMessage(payload.phone, orderSummaryText(payload))
    console.log(`[WhatsApp] Confirmation sent to ${payload.phone} for ${payload.orderNumber}`)
  } catch (err) {
    // Never block order placement
    console.error('[WhatsApp] sendOrderConfirmation failed:', err)
  }
}

// Alert cafe owner when new order arrives
export async function sendOwnerAlert(
  ownerPhone: string,
  payload: WhatsAppOrderPayload
): Promise<void> {
  if (!isConfigured()) return
  try {
    await sendSessionMessage(ownerPhone, ownerAlertText(payload))
    console.log(`[WhatsApp] Owner alert sent to ${ownerPhone}`)
  } catch (err) {
    console.error('[WhatsApp] sendOwnerAlert failed:', err)
  }
}
