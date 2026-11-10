import React, { useEffect, useState } from 'react';

const NEXT = { applied: ['shortlisted', 'rejected'], shortlisted: ['selected', 'rejected'], selected: [], rejected: [] };
const EMPTY = { title: '', company: '', type: 'job', location: '', ctcLpa: '', stipendPerMonth: '', minCgpa: '', eligibility: '', description: '', deadline: '' };

export default function Dashboard({ api }) {
  const [jobs, setJobs] = useState([]);
  const [open, setOpen] = useState(null);
  const [apps, setApps] = useState([]);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');
  const load = () => api.myJobs().then(setJobs).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line

  const show = async (id) => { setOpen(id); setApps(await api.jobApplications(id)); };
  const save = async (e) => {
    e.preventDefault(); setErr('');
    try { await api.createJob(form); setForm(null); load(); } catch (ex) { setErr(ex.message); }
  };
  const move = async (appId, status) => {
    try { await api.setStatus(appId, status); setApps(await api.jobApplications(open)); } catch (ex) { setErr(ex.message); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="row"><h1>Your postings</h1><button className="btn" onClick={() => setForm(EMPTY)}>+ New posting</button></div>
      {err && <p className="error">{err}</p>}
      {form && (
        <form className="card" onSubmit={save}>
          <h3>New posting</h3>
          <div className="two">
            <label>Title<input required value={form.title} onChange={set('title')} /></label>
            <label>Company<input required value={form.company} onChange={set('company')} /></label>
            <label>Type<select value={form.type} onChange={set('type')}><option value="job">Job</option><option value="internship">Internship</option></select></label>
            <label>Location<input required value={form.location} onChange={set('location')} /></label>
            <label>CTC (LPA)<input type="number" min="0" step="0.1" value={form.ctcLpa} onChange={set('ctcLpa')} /></label>
            <label>Stipend (₹/month)<input type="number" min="0" value={form.stipendPerMonth} onChange={set('stipendPerMonth')} /></label>
            <label>Min CGPA<input type="number" min="0" max="10" step="0.1" value={form.minCgpa} onChange={set('minCgpa')} /></label>
            <label>Deadline<input type="date" required value={form.deadline} onChange={set('deadline')} /></label>
          </div>
          <label>Eligibility<textarea rows="2" value={form.eligibility} onChange={set('eligibility')} /></label>
          <label>Description<textarea rows="4" value={form.description} onChange={set('description')} /></label>
          <div className="row"><button className="btn">Publish</button><button type="button" className="link" onClick={() => setForm(null)}>Cancel</button></div>
        </form>
      )}
      {jobs.map((j) => (
        <div key={j._id} className="card">
          <div className="row">
            <div><h3>{j.title} <span className={`tag ${j.type}`}>{j.type}</span></h3><p className="muted">{j.applicants} applicant(s) · closes {new Date(j.deadline).toLocaleDateString()}</p></div>
            <div className="row">
              <button className="btn small" onClick={() => (open === j._id ? setOpen(null) : show(j._id))}>{open === j._id ? 'Hide' : 'Applicants'}</button>
              <button className="link danger" onClick={async () => { if (confirm('Delete this posting and its applications?')) { await api.deleteJob(j._id); load(); } }}>Delete</button>
            </div>
          </div>
          {open === j._id && (
            <div className="applicants">
              {apps.length > 0 && <button className="btn small" onClick={() => api.downloadResumesZip(j._id).catch((e) => setErr(e.message))}>Export all resumes (.zip)</button>}
              {apps.length === 0 && <p className="muted">No applications yet.</p>}
              {apps.map((a) => (
                <div key={a._id} className="row applicant">
                  <div><strong>{a.studentName || a.studentEmail}</strong><br /><small className="muted">{a.studentEmail}</small>{a.coverNote && <p className="pre">{a.coverNote}</p>}</div>
                  <div className="row">
                    <a href={a.resumeUrl} target="_blank" rel="noreferrer">Resume</a>
                    <span className={`pill s-${a.status}`}>{a.status}</span>
                    {NEXT[a.status].map((s) => <button key={s} className="btn small ghost" onClick={() => move(a._id, s)}>{s}</button>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
