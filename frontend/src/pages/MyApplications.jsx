import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STEPS = ['applied', 'shortlisted', 'selected'];

export default function MyApplications({ api }) {
  const [apps, setApps] = useState(null);
  useEffect(() => { api.myApplications().then(setApps).catch(() => setApps([])); }, [api]);
  if (!apps) return <p className="muted">Loading…</p>;
  return (
    <>
      <h1>My applications</h1>
      {apps.length === 0 && <p className="muted">Nothing yet — <Link to="/">browse openings</Link>.</p>}
      {apps.map((a) => (
        <div key={a._id} className="card">
          <h3>{a.job?.title || 'Removed posting'} <small className="muted">{a.job?.company}</small></h3>
          {a.status === 'rejected' ? <p className="error">Not selected</p> : (
            <ol className="steps">
              {STEPS.map((s, i) => <li key={s} className={STEPS.indexOf(a.status) >= i ? 'done' : ''}>{s}</li>)}
            </ol>
          )}
        </div>
      ))}
    </>
  );
}
