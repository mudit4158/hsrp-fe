import { api, request, session } from '../api';

/** Starts hosted checkout: asks the API for the signed form and posts it to the (mock) gateway. */
export async function payOnline(orderId: string) {
  const co = await api.post(`/public/orders/${orderId}/checkout`, { returnOrigin: window.location.origin }, { customer: true });
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = co.action;
  for (const [k, v] of Object.entries<string>(co.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = k;
    input.value = v;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export async function downloadReceipt(orderId: string, orderNo: string) {
  const blob = await request<Blob>('GET', `/public/orders/${orderId}/receipt`, { customer: true });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt-${orderNo}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export const hasCustomerSession = () => Boolean(session.customer);

export const OTP_HINT = 'Demo: the OTP is on the admin Simulator → SMS list. With DEMO_MODE on, 123456 also works.';
