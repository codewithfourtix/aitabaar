const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    let detail = `${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch { /* keep status code */ }
    throw new Error(`API error: ${detail}`);
  }
  return response.json();
}

export function fetchApplications() {
  return request('/applications');
}

export function fetchApplication(id) {
  return request(`/applications/${id}`);
}

export function scoreApplication(id) {
  return request(`/applications/${id}/score`, { method: 'POST' });
}

export function submitDecision(id, officer, action, note = '', requested_doc_types = []) {
  return request(`/applications/${id}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officer, action, note, requested_doc_types }),
  });
}

export function demoReset() {
  return request('/demo/reset');
}
