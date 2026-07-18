const API_BASE_URL = 'http://localhost:8000';

export async function fetchApplications() {
  const response = await fetch(`${API_BASE_URL}/applications`);
  if (!response.ok) {
    throw new Error('Failed to fetch applications');
  }
  return response.json();
}

export async function fetchApplication(id) {
  const response = await fetch(`${API_BASE_URL}/applications/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch application');
  }
  return response.json();
}

export async function submitDecision(id, officer, action, note = '', requested_doc_types = []) {
  const response = await fetch(`${API_BASE_URL}/applications/${id}/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      officer,
      action,
      note,
      requested_doc_types,
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to submit decision');
  }
  return response.json();
}
