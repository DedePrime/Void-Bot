'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LICENSES_FILE = path.join(DATA_DIR, 'licenses.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('[API] Errore creazione cartella data:', e.message);
  }
}

function loadLicenses() {
  ensureDataDir();
  try {
    if (fs.existsSync(LICENSES_FILE)) {
      return JSON.parse(fs.readFileSync(LICENSES_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[API] Errore lettura licenze:', e.message);
  }
  return { licenses: [], history: [] };
}

function saveLicenses(data) {
  ensureDataDir();
  try {
    fs.writeFileSync(LICENSES_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[API] Errore scrittura licenze:', e.message);
  }
}

function generateKey() {
  const segment = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `VOID-${segment()}-${segment()}-${segment()}-${segment()}`;
}

function createLicense({ userId, username, durationDays = 30, tier = 'standard' }) {
  const data = loadLicenses();

  const existing = data.licenses.find(l =>
    l.userId === userId && l.active && l.expiresAt > Date.now()
  );
  if (existing) {
    return { ok: false, msg: 'Hai già una licenza attiva', license: existing };
  }

  const key = generateKey();
  const now = Date.now();
  const expiresAt = now + (durationDays * 24 * 60 * 60 * 1000);

  const license = {
    id: crypto.randomUUID(),
    key,
    userId,
    username,
    tier,
    active: true,
    createdAt: now,
    expiresAt,
    durationDays,
    hwid: null,
    activatedAt: null,
    useCount: 0
  };

  data.licenses.push(license);
  data.history.push({ action: 'create', key, userId, username, ts: now });
  saveLicenses(data);

  return { ok: true, license };
}

function verifyLicense(key) {
  const data = loadLicenses();
  const license = data.licenses.find(l => l.key === key);
  if (!license) return { ok: false, msg: 'Licenza non trovata', code: 'NOT_FOUND' };
  if (!license.active) return { ok: false, msg: 'Licenza disattivata', code: 'INACTIVE', license };
  if (license.expiresAt < Date.now()) {
    license.active = false;
    saveLicenses(data);
    return { ok: false, msg: 'Licenza scaduta', code: 'EXPIRED', license };
  }
  return { ok: true, license };
}

function activateLicense(key, hwid, username) {
  const data = loadLicenses();
  const license = data.licenses.find(l => l.key === key);
  if (!license) return { ok: false, msg: 'Licenza non trovata' };
  if (!license.active) return { ok: false, msg: 'Licenza disattivata' };
  if (license.expiresAt < Date.now()) return { ok: false, msg: 'Licenza scaduta' };

  if (license.hwid && license.hwid !== hwid) {
    return { ok: false, msg: 'Licenza già attiva su un altro PC' };
  }

  license.hwid = hwid;
  license.activatedAt = Date.now();
  license.useCount = (license.useCount || 0) + 1;
  if (username) license.username = username;

  data.history.push({ action: 'activate', key, hwid, ts: Date.now() });
  saveLicenses(data);

  return { ok: true, license };
}

function resetHwid(key) {
  const data = loadLicenses();
  const license = data.licenses.find(l => l.key === key);
  if (!license) return { ok: false, msg: 'Licenza non trovata' };

  license.hwid = null;
  license.activatedAt = null;
  data.history.push({ action: 'reset_hwid', key, ts: Date.now() });
  saveLicenses(data);

  return { ok: true, license };
}

function revokeLicense(key) {
  const data = loadLicenses();
  const license = data.licenses.find(l => l.key === key);
  if (!license) return { ok: false, msg: 'Licenza non trovata' };

  license.active = false;
  data.history.push({ action: 'revoke', key, ts: Date.now() });
  saveLicenses(data);

  return { ok: true, license };
}

function getStats() {
  const data = loadLicenses();
  const now = Date.now();

  const total = data.licenses.length;
  const active = data.licenses.filter(l => l.active && l.expiresAt > now).length;
  const expired = data.licenses.filter(l => l.expiresAt < now).length;
  const revoked = data.licenses.filter(l => !l.active).length;
  const bound = data.licenses.filter(l => l.hwid).length;

  return {
    total, active, expired, revoked, bound,
    free: total - bound,
    history: data.history.slice(-10).reverse()
  };
}

function getUserLicense(userId) {
  const data = loadLicenses();
  return data.licenses
    .filter(l => l.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

module.exports = {
  generateKey,
  createLicense,
  verifyLicense,
  activateLicense,
  resetHwid,
  revokeLicense,
  getStats,
  getUserLicense,
  loadLicenses
};