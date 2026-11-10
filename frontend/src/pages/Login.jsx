import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await signIn(f.email.trim(), f.password); nav('/'); }
    catch (ex) { setErr(ex.message || 'Login failed'); }
    finally { setBusy(false); }
  };

  return (
    <form className="card narrow" onSubmit={submit}>
      <h2>Welcome back</h2>
      <label>Email<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <label>Password<input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
      {err && <p className="error">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
      <p className="muted">New here? <Link to="/signup">Create an account</Link></p>
    </form>
  );
}
