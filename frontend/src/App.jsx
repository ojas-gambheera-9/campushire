import React, { useMemo } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { makeApi } from './api.js';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Jobs from './pages/Jobs.jsx';
import JobDetail from './pages/JobDetail.jsx';
import MyApplications from './pages/MyApplications.jsx';
import Dashboard from './pages/Dashboard.jsx';

function Guard({ role, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, signOut, getToken } = useAuth();
  const api = useMemo(() => makeApi(getToken), [getToken]);

  return (
    <>
      <header className="nav">
        <Link to="/" className="brand">Campus<span>Hire</span></Link>
        <nav>
          {user?.role === 'student' && <Link to="/applications">My applications</Link>}
          {user?.role === 'recruiter' && <Link to="/dashboard">Recruiter dashboard</Link>}
          {user ? (
            <>
              <span className="pill">{user.role}</span>
              <button className="link" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/signup" className="btn small">Sign up</Link>
            </>
          )}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Guard><Jobs api={api} /></Guard>} />
          <Route path="/jobs/:id" element={<Guard><JobDetail api={api} /></Guard>} />
          <Route path="/applications" element={<Guard role="student"><MyApplications api={api} /></Guard>} />
          <Route path="/dashboard" element={<Guard role="recruiter"><Dashboard api={api} /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
