import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function JobDetail({ api }) {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.getJob(id).then(setJob).catch((e) => setMsg({ type: 'error', text: e.message })); }, [id, api]);

  const apply = async (e) => {
    e.preventDefault();
    if (!file) return setMsg({ type: 'error', text: 'Attach your resume (PDF)' });
    if (file.type !== 'application/pdf' || file.size > 5 * 1024 * 1024) return setMsg({ type: 'error', text: 'Resume must be a PDF up to 5 MB' });
    setBusy(true); setMsg({ type: '', text: '' });
    try { await api.apply(id, file, note); setMsg({ type: 'ok', text: 'Application submitted! Track it under My applications.' }); }
    catch (ex) { setMsg({ type: 'error', text: ex.message }); }
    finally { setBusy(false); }
  };

  if (!job) return <p className={msg.type === 'error' ? 'error' : 'muted'}>{msg.text || 'Loading…'}</p>;
  return (
    <div className="card">
      <span className={`tag ${job.type}`}>{job.type}</span>
      <h1>{job.title}</h1>
      <p><strong>{job.company}</strong> · {job.location}</p>
      <p className="muted">{job.type === 'job' ? `${job.ctcLpa} LPA` : `₹${job.stipendPerMonth}/month`} · Min CGPA {job.minCgpa || 'n/a'} · Closes {new Date(job.deadline).toLocaleDateString()}</p>
      {job.eligibility && <><h3>Eligibility</h3><p className="pre">{job.eligibility}</p></>}
      {job.description && <><h3>About the role</h3><p className="pre">{job.description}</p></>}
      {user.role === 'student' && (
        <form onSubmit={apply} className="apply">
          <h3>Apply</h3>
          <label>Resume (PDF, max 5 MB)<input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} /></label>
          <label>Cover note (optional)<textarea rows="3" maxLength="2000" value={note} onChange={(e) => setNote(e.target.value)} /></label>
          {msg.text && <p className={msg.type === 'ok' ? 'ok' : 'error'}>{msg.text}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Uploading…' : 'Submit application'}</button>
        </form>
      )}
    </div>
  );
}
