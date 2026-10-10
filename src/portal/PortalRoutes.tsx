import { ReactNode, useEffect } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Apply } from './Apply';
import { PaymentReturn } from './PaymentReturn';
import { Status } from './Status';
import { Support } from './Support';

export function PortalLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.title = 'HSRP online · book your plates';
  }, []);
  return (
    <div className="portal">
      <header className="portal-head">
        <div className="inner">
          <Link to="/portal" style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>
            <span className="brand-mark" style={{ marginRight: 8 }}>HSRP</span>High Security Registration Plates
          </Link>
          <nav className="row gap-lg">
            <Link to="/portal/apply">Apply HSRP</Link>
            <Link to="/portal/status">HSRP Status</Link>
            <Link to="/portal/support">HSRP Support</Link>
          </nav>
        </div>
      </header>
      <main className="portal-body">{children}</main>
      <footer className="portal-body small muted" style={{ paddingTop: 0 }}>
        Prototype. All vehicles, people and payments here are fictional; no real VAHAN, payment or SMS system is contacted.
      </footer>
    </div>
  );
}

function Home() {
  return (
    <PortalLayout>
      <h1 style={{ marginBottom: 6 }}>Book High Security Registration Plates</h1>
      <p className="muted" style={{ marginTop: 0 }}>For vehicles registered before 1 April 2019, and replacements for damaged or stolen plates. New vehicles get their plates through the dealer.</p>
      <div className="tiles" style={{ marginTop: 18 }}>
        <Link className="tile" to="/portal/apply">
          <h2>Apply HSRP</h2>
          <p className="muted">Check your vehicle, choose a fitment centre and slot, confirm by OTP and pay online.</p>
        </Link>
        <Link className="tile" to="/portal/status">
          <h2>HSRP Status</h2>
          <p className="muted">Track your order with the registration number and the last five characters of the chassis number.</p>
        </Link>
        <Link className="tile" to="/portal/support">
          <h2>HSRP Support</h2>
          <p className="muted">Raise a complaint and follow it. Complaints are answered within 15 days.</p>
        </Link>
      </div>
    </PortalLayout>
  );
}

export function PortalRoutes() {
  return (
    <Routes>
      <Route path="/portal" element={<Home />} />
      <Route path="/portal/apply" element={<Apply />} />
      <Route path="/portal/payment-return" element={<PaymentReturn />} />
      <Route path="/portal/status" element={<Status />} />
      <Route path="/portal/support" element={<Support />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
