// Backend REST client — the bot's ONLY way to touch application data.
// Contract: docs/api.md + backend/app/models/schemas.py

const axios = require('axios');
const FormData = require('form-data');

const BASE = (process.env.BACKEND_API_URL || 'http://localhost:8000').replace(/\/$/, '');

const http = axios.create({ baseURL: BASE, timeout: 30000 });

async function createApplication({ phone, name, businessName, businessType, language, amountPkr }) {
  const { data } = await http.post('/applications', {
    channel: 'whatsapp',
    applicant: {
      name,
      cnic_number: null,
      phone,
      business_name: businessName,
      business_type: businessType,
      city: null,
      language,
      consent_given: true,
    },
    requested_amount_pkr: amountPkr,
  });
  return data;
}

async function uploadDocument(appId, type, buffer, filename, mimetype) {
  const form = new FormData();
  form.append('type', type);
  form.append('file', buffer, { filename, contentType: mimetype });
  const { data } = await http.post(`/applications/${appId}/documents`, form, {
    headers: form.getHeaders(),
  });
  return data;
}

async function submitApplication(appId) {
  const { data } = await http.post(`/applications/${appId}/submit`);
  return data;
}

async function getApplication(appId) {
  const { data } = await http.get(`/applications/${appId}`);
  return data;
}

async function findByPhone(phone) {
  const { data } = await http.get('/applications', { params: { phone } });
  return data.length ? data[0] : null;
}

module.exports = { createApplication, uploadDocument, submitApplication, getApplication, findByPhone };
