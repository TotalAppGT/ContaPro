import crypto from 'crypto';

const RECURRENTE_URL = process.env.RECURRENTE_API_URL || 'https://app.recurrente.com/api';
const RECURRENTE_KEY = process.env.RECURRENTE_API_KEY || '';

export interface CreateCheckoutParams {
  tenant_id: string;
  subscription_id: string;
  plan_name: string;
  amount: number;
  email: string;
  success_url: string;
  cancel_url: string;
}

export async function createRecurrenteCheckout(params: CreateCheckoutParams): Promise<string> {
  if (!RECURRENTE_KEY) {
    throw new Error('RECURRENTE_API_KEY no configurada');
  }
  const response = await fetch(`${RECURRENTE_URL}/checkouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-SECRET-KEY': RECURRENTE_KEY,
    },
    body: JSON.stringify({
      items: [
        {
          name: `ContaPro - Plan ${params.plan_name}`,
          amount_in_cents: Math.round(params.amount * 100),
          quantity: 1,
        },
      ],
      metadata: {
        tenant_id: params.tenant_id,
        subscription_id: params.subscription_id,
        plan: params.plan_name,
      },
      success_url: params.success_url,
      cancel_url: params.cancel_url,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Recurrente API error ${response.status}: ${text}`);
  }
  const data = JSON.parse(text);
  return data.checkout_url || data.url;
}

export function verifySvix(rawBody: string, headers: Record<string, any>, secret: string): boolean {
  const id = headers['svix-id'];
  const ts = headers['svix-timestamp'];
  const sig = headers['svix-signature'];
  if (!secret || !id || !ts || !sig) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto
    .createHmac('sha256', key)
    .update(`${id}.${ts}.${rawBody}`)
    .digest('base64');
  return String(sig)
    .split(' ')
    .some((part) => {
      const [v, h] = part.split(',');
      return v === 'v1' && h === expected;
    });
}
