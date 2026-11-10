import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Jobs({ api }) {
  const [f, setF] = useState({ q: '', type: '', location: '', minCtc: '', deadlineBefore: '' });
  const [jobs, setJobs] = useState(null);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const t = setTimeout(() => api.listJobs(f).then(setJobs).catch((e) => setErr(e.message)), 250);
    return () => clearTimeout(t);
  }, [f, api]);

  return (
    <>
      <h1>Open opportunities</h1>
      <div className="filters card">
        <input placeholder="Search role or company" value={f.q} onChange={set('q')} />
        <select value={f.type} onChange={set('type')}>
          <option value="">Jobs &amp; internships</option>
          <option value="job">Jobs</option>
          <option value="internship">Internships</option>
        </select>
        <input placeholder="Location" value={f.location} onChange={set('location')} />
        <input type="number" min="0" placeholder="Min CTC (LPA)" value={f.minCtc} onChange={set('minCtc')} />
        <label className="inline">Apply before<input type="date" value={f.deadlineBefore} onChange={set('deadlineBefore')} /></label>
      </div>
      {err && <p className="error">{err}</p>}
      {!jobs ? <p className="muted">Loading…</p> : jobs.length === 0 ? <p className="muted">No matching postings.</p> : (
        <div className="grid">
          {jobs.map((j) => (
            <Link key={j._id} to={`/jobs/${j._id}`} className="card job">
              <span className={`tag ${j.type}`}>{j.type}</span>
              <h3>{j.title}</h3>
              <p>{j.company} · {j.location}</p>
              <p className="muted">{j.type === 'job' ? `${j.ctcLpa} LPA` : `₹${j.stipendPerMonth}/mo`} · closes {new Date(j.deadline).toLocaleDateString()}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
