import { ReactNode, useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { OrderList } from './pages/orders/OrderList';
import { OrderDetail } from './pages/orders/OrderDetail';
import { NewOrder } from './pages/orders/NewOrder';
import { Approvals } from './pages/Approvals';
import { Imports } from './pages/Imports';
import { Issuance } from './pages/station/Issuance';
import { Qc } from './pages/station/Qc';
import { Stickers } from './pages/station/Stickers';
import { Dispatch } from './pages/station/Dispatch';
import { Rejections } from './pages/station/Rejections';
import { Inventory } from './pages/Inventory';
import { Wallets } from './pages/Wallets';
import { Complaints } from './pages/Complaints';
import { Reports } from './pages/Reports';
import { Masters } from './pages/Masters';
import { Users } from './pages/admin/Users';
import { Config } from './pages/admin/Config';
import { Audit } from './pages/admin/Audit';
import { Integration } from './pages/admin/Integration';
import { Simulator } from './pages/admin/Simulator';
import { DealerHome } from './pages/dealer/DealerHome';
import { DealerWallet } from './pages/dealer/DealerWallet';
import { Button, Loading } from './ui';

interface NavItem {
  to: string;
  label: string;
  perm?: string[];
  roles?: string[];
}
const NAV: Array<{ group?: string; items: NavItem[] }> = [
  {
    items: [
      { to: '/', label: 'Dashboard', perm: ['orders.read'], roles: ['ADMIN', 'OPERATIONS', 'STATION_USER'] },
      { to: '/dealer', label: 'Home', roles: ['DEALER'] },
      { to: '/orders', label: 'Orders', perm: ['orders.read'] },
      { to: '/orders/new', label: 'Place order', perm: ['orders.create'] },
      { to: '/dealer/wallet', label: 'My wallet', roles: ['DEALER'] },
    ],
  },
  {
    group: 'Operations',
    items: [
      { to: '/approvals', label: 'Approvals', roles: ['ADMIN', 'OPERATIONS'] },
      { to: '/imports', label: 'OEM files & uploads', perm: ['imports.run'] },
      { to: '/wallets', label: 'Wallets', perm: ['wallet.read'] },
      { to: '/complaints', label: 'Complaints', perm: ['tickets.manage'] },
      { to: '/reports', label: 'Reports', perm: ['reports.read'] },
    ],
  },
  {
    group: 'Embossing station',
    items: [
      { to: '/station/issuance', label: 'Issuance & job cards', perm: ['station.operate', 'station.read'] },
      { to: '/station/qc', label: 'Quality check', perm: ['station.operate', 'station.read'] },
      { to: '/station/stickers', label: 'Sticker printing', perm: ['station.operate', 'station.read'] },
      { to: '/station/dispatch', label: 'Delivery challans', perm: ['station.operate', 'station.read'] },
      { to: '/station/rejections', label: 'Rejection approval', perm: ['station.operate'] },
      { to: '/inventory', label: 'Inventory', perm: ['inventory.read'] },
    ],
  },
  {
    group: 'Setup',
    items: [
      { to: '/masters', label: 'Masters & prices', perm: ['masters.read'] },
      { to: '/admin/users', label: 'Users & roles', perm: ['iam.manage'] },
      { to: '/admin/config', label: 'Configuration', perm: ['config.read', 'config.manage'] },
      { to: '/admin/audit', label: 'Audit log', perm: ['audit.read'] },
      { to: '/admin/integration', label: 'Integration monitor', perm: ['integration.monitor'] },
      { to: '/admin/simulator', label: 'Simulator', perm: ['simulator.use'] },
    ],
  },
];

function Shell({ children }: { children: ReactNode }) {
  const { me, logout, can, hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  const visible = (i: NavItem) => (i.roles ? hasRole(...i.roles) && (!i.perm || can(...i.perm)) : !i.perm || can(...i.perm));
  return (
    <div className="shell">
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">HSRP</span> Dealer Management
        </div>
        <nav className="nav">
          {NAV.map((g, gi) => {
            const items = g.items.filter(visible);
            if (!items.length) return null;
            return (
              <div key={gi}>
                {g.group && <div className="nav-group">{g.group}</div>}
                {items.map((i) => (
                  <NavLink key={i.to} to={i.to} end={i.to === '/' || i.to === '/orders' || i.to === '/dealer'}>
                    {i.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
          <div className="nav-group">Links</div>
          <a href="/api/docs" target="_blank" rel="noreferrer">
            API docs ↗
          </a>
        </nav>
      </aside>
      <div className="main">
        <div className="topbar">
          <Button className="menu-toggle" small onClick={() => setOpen((o) => !o)}>
            Menu
          </Button>
          <div className="who">
            <b>{me?.displayName}</b>
            <span className="muted small">
              {me?.roles.join(', ')}
              {me?.org ? ` · ${me.org.name}` : ''}
            </span>
          </div>
          <Button small onClick={logout}>
            Sign out
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Home() {
  const { hasRole } = useAuth();
  return hasRole('DEALER') && !hasRole('ADMIN', 'OPERATIONS') ? <Navigate to="/dealer" replace /> : <Dashboard />;
}

export function App() {
  const { me, loading } = useAuth();
  if (loading) return <Loading />;
  if (!me) return <Login />;
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dealer" element={<DealerHome />} />
        <Route path="/dealer/wallet" element={<DealerWallet />} />
        <Route path="/orders" element={<OrderList />} />
        <Route path="/orders/new" element={<NewOrder />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/imports" element={<Imports />} />
        <Route path="/station/issuance" element={<Issuance />} />
        <Route path="/station/qc" element={<Qc />} />
        <Route path="/station/stickers" element={<Stickers />} />
        <Route path="/station/dispatch" element={<Dispatch />} />
        <Route path="/station/rejections" element={<Rejections />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/wallets" element={<Wallets />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/masters" element={<Masters />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/config" element={<Config />} />
        <Route path="/admin/audit" element={<Audit />} />
        <Route path="/admin/integration" element={<Integration />} />
        <Route path="/admin/simulator" element={<Simulator />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
