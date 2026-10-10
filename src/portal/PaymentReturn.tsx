import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, describeError, session } from '../api';
import { rupees } from '../format';
import { Alert, Button, Card, KV, Loading } from '../ui';
import { PortalLayout } from './PortalRoutes';
import { downloadReceipt, payOnline } from './shared';

/**
 * The gateway sends the browser back here. The order is marked paid only by the gateway's webhook or a
 * server-to-server verify (queued by the API on return) — this page just waits for that.
 */
export function PaymentReturn() {
  const [sp] = useSearchParams();
  const orderId = sp.get('orderId') ?? '';
  const result = sp.get('result');
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session.customer) {
      setError('Your session ended. Open HSRP Status to see the payment result.');
      return;
    }
    let stop = false;
    (async () => {
      try {
        await api.post(`/public/orders/${orderId}/verify-payment`, undefined, { customer: true });
        for (let i = 0; i < 40 && !stop; i++) {
          const o = await api.get(`/public/orders/${orderId}`, undefined, true);
          setOrder(o);
          if (o.status !== 'AWAITING_PAYMENT' || (o.payment && ['FAILED', 'CANCELLED'].includes(o.payment.status))) break;
          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch (e) {
        setError(describeError(e));
      }
    })();
    return () => {
      stop = true;
    };
  }, [orderId]);

  const paid = order && order.status !== 'AWAITING_PAYMENT' && order.payment?.status === 'SUCCESS';
  const failed = order && order.status === 'AWAITING_PAYMENT' && order.payment && ['FAILED', 'CANCELLED'].includes(order.payment.status);
  return (
    <PortalLayout>
      <h1>Payment</h1>
      {error && <Alert tone="bad">{error}</Alert>}
      <Card>
        {!order && !error && <Loading label="Confirming the payment with the gateway…" />}
        {paid && (
          <div className="stack">
            <Alert tone="ok">Payment received. Your order {order.orderNo} is confirmed.</Alert>
            <KV
              items={[
                ['Vehicle', order.regnNo],
                ['Amount paid', rupees(order.payment.amountPaise)],
                ['Transaction', order.payment.txnId],
                ['Fitment', order.booking ? `${order.centre?.name}, ${order.booking.date} at ${order.booking.slot}` : '–'],
              ]}
            />
            <div className="row gap">
              <Button variant="primary" onClick={() => downloadReceipt(order.id, order.orderNo)}>
                Download receipt (PDF)
              </Button>
              <Link to="/portal/status">Track the order</Link>
            </div>
          </div>
        )}
        {failed && (
          <div className="stack">
            <Alert tone="warn">The payment {order.payment.status === 'CANCELLED' ? 'was cancelled' : 'failed'}. Your booking is kept; you can try again.</Alert>
            <div>
              <Button variant="primary" busy={busy} onClick={() => { setBusy(true); payOnline(order.id).catch((e) => { setError(describeError(e)); setBusy(false); }); }}>
                Pay {rupees(order.amountPaise)} again
              </Button>
            </div>
          </div>
        )}
        {order && !paid && !failed && <Loading label={result === 'success' ? 'Waiting for the gateway to confirm…' : 'Checking the payment…'} />}
      </Card>
    </PortalLayout>
  );
}
