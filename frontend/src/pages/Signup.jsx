import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Signup() {
  const { signUp, confirm } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'student', company: '' });
  const [code, setCode] = useState('');
  const [step, setStep] = useState('form');
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { await signUp(f.email.trim(), f.password, f.name, f.role, f.role === 'recruiter' ? f.company : ''); setStep('confirm'); }
    catch (ex) { setErr(ex.message); }
  };
  const verify = async (e) => {
    e.preventDefault(); setErr('');
    try { await confirm(f.email.trim(), code.trim()); nav('/login'); }
    catch (ex) { setErr(ex.message); }
  };

  if (step === 'confirm') {
    return (
      <form className="card narrow" onSubmit={verify}>
        <h2>Check your email</h2>
        <p className="muted">We sent a 6-digit code to {f.email}.</p>
        <label>Verification code<input required value={code} onChange={(e) => setCode(e.target.value)} /></label>
        {err && <p className="error">{err}</p>}
        <button className="btn">Confirm</button>
      </form>
    );
  }
  return (
    <form className="card narrow" onSubmit={submit}>
      <h2>Create your account</h2>
      <div className="seg">
        {['student', 'recruiter'].map((r) => (
          <button type="button" key={r} className={f.role === r ? 'on' : ''} onClick={() => setF({ ...f, role: r })}>
            I'm a {r}
          </button>
        ))}
      </div>
      <label>Full name<input required value={f.name} onChange={set('name')} /></label>
      <label>Email<input type="email" required value={f.email} onChange={set('email')} /></label>
      {f.role === 'recruiter' && <label>Company<input required value={f.company} onChange={set('company')} /></label>}
      <label>Password<input type="password" required minLength={8} value={f.password} onChange={set('password')} /><small className="muted">8+ chars, upper &amp; lower case, a number</small></label>
      {err && <p className="error">{err}</p>}
      <button className="btn">Sign up</button>
      <p className="muted">Have an account? <Link to="/login">Log in</Link></p>
    </form>
  );
}
