import { FormEvent, useState } from 'react';
import { describeError } from '../api';
import { useAuth } from '../auth';
import { Alert, Button, Field, Input } from '../ui';

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <form className="login-card stack" onSubmit={submit}>
        <div className="row gap">
          <span className="brand-mark" style={{ background: '#1e3a8a', color: '#fff' }}>
            HSRP
          </span>
          <h1>Dealer Management</h1>
        </div>
        <p className="muted">Staff and dealer sign-in. Prototype with fictional data.</p>
        {error && <Alert tone="bad">{error}</Alert>}
        <Field label="Username">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        <Button variant="primary" busy={busy} type="submit" style={{ width: '100%', justifyContent: 'center' }}>
          Sign in
        </Button>
        <p className="small muted">
          Demo users: admin, ops, station.kol, station.bbs, dealer.wb01, dealer.od02. The password is SEED_PASSWORD in your .env. Customers use the{' '}
          <a href="/portal">customer portal</a>.
        </p>
      </form>
    </div>
  );
}
