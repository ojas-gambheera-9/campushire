// All API calls go through /api (CloudFront forwards /api/* to the ALB).
export function makeApi(getToken) {
  async function call(path, { method = 'GET', body, raw } = {}) {
    const res = await fetch(`/api${path}`, {
      method,
      headers: { Authorization: `Bearer ${await getToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (raw) return res;
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  return {
    listJobs: (params) => call(`/jobs?${new URLSearchParams(Object.entries(params).filter(([, v]) => v))}`),
    getJob: (id) => call(`/jobs/${id}`),
    createJob: (b) => call('/jobs', { method: 'POST', body: b }),
    deleteJob: (id) => call(`/jobs/${id}`, { method: 'DELETE' }),
    myJobs: () => call('/jobs/mine/list'),
    myApplications: () => call('/applications/mine'),
    jobApplications: (id) => call(`/jobs/${id}/applications`),
    setStatus: (id, status) => call(`/applications/${id}/status`, { method: 'PATCH', body: { status } }),
    async apply(jobId, file, coverNote) {
      const { key, uploadUrl } = await call('/uploads/resume-url', { method: 'POST', body: { contentType: 'application/pdf', size: file.size } });
      const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file });
      if (!put.ok) throw new Error('Resume upload failed');
      return call(`/jobs/${jobId}/apply`, { method: 'POST', body: { resumeKey: key, coverNote } });
    },
    async downloadResumesZip(jobId) {
      const res = await call(`/jobs/${jobId}/resumes.zip`, { raw: true });
      if (!res.ok) throw new Error('Export failed');
      const url = URL.createObjectURL(await res.blob());
      Object.assign(document.createElement('a'), { href: url, download: `resumes-${jobId}.zip` }).click();
      URL.revokeObjectURL(url);
    },
  };
}
