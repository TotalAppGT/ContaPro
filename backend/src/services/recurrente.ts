const RECURRENTE_URL = process.env.RECURRENTE_API_URL || 'https://app.recurrente.com/api';
const RECURRENTE_KEY = process.env.RECURRENTE_API_KEY || '';

interface CreateCheckoutParams {
  tenant_id: string;
  subscription_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  email: string;
  success_url: string;
  cancel_url: string;
}

interface RecurrenteCheckoutResponse {
  id: string;
  url: string;
  status: string;
}

export async function createRecurrenteCheckout(params: CreateCheckoutParams): Promise<string> {
  if (!RECURRENTE_KEY) {
    console.warn('RECURRENTE_API_KEY no configurada. Usando modo simulación.');
    return `/api/subscriptions/simulate-payment?sub_id=${params.subscription_id}`;
  }

  try {
    const response = await fetch(`${RECURRENTE_URL}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RECURRENTE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amount * 100,
        currency: params.currency,
        description: `ContaPro - Plan ${params.plan_name}`,
        customer_email: params.email,
        metadata: {
          tenant_id: params.tenant_id,
          subscription_id: params.subscription_id,
        },
        success_url: params.success_url,
        cancel_url: params.cancel_url,
      }),
    });

    const data: RecurrenteCheckoutResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.status || 'Error creando checkout Recurrente');
    }

    return data.url;
  } catch (error: any) {
    console.error('Error Recurrente:', error.message);
    throw error;
  }
}

export function verifyRecurrenteWebhook(body: any, signature: string): boolean {
  if (!RECURRENTE_KEY) return true;

  try {
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', RECURRENTE_KEY)
      .update(JSON.stringify(body))
      .digest('hex');
    return signature === expected;
  } catch {
    return false;
  }
}
