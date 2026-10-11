async function request(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(path, opts);
  } catch {
    throw new Error('Cannot reach the server. Is it still running?');
  }

  let data = null;
  try { data = await res.json(); } catch { /* non-JSON response */ }
  if (!res.ok) throw new Error(data?.error || `Server error (${res.status})`);
  return data;
}

export const API = {
  getConfig:   ()        => request('GET', '/config'),
  saveConfig:  payload   => request('PUT', '/config', payload),

  getSubjects:     ()              => request('GET', '/subjects'),
  addSubject:      (name, params)  => request('POST', '/subjects', { name, params }),
  editSubject:     (id, payload)   => request('PUT', `/subjects/${id}`, payload),
  deleteSubject:   id              => request('DELETE', `/subjects/${id}`),
  reorderSubjects: ids             => request('PUT', '/subjects/order', { ids }),

  addChapter:      (sId, name)       => request('POST', `/subjects/${sId}/chapters`, { name }),
  updateChapter:   (sId, cId, data)  => request('PUT', `/subjects/${sId}/chapters/${cId}`, data),
  deleteChapter:   (sId, cId)        => request('DELETE', `/subjects/${sId}/chapters/${cId}`),
  reorderChapters: (sId, ids)        => request('PUT', `/subjects/${sId}/chapters/order`, { ids }),
};
