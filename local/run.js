#!/usr/bin/env node
/**
 * Runs the Apps Script code locally in Node, with stand-ins for the Google services.
 *
 *   yarn local            # runs test()
 *   yarn local main       # runs main()
 *
 * - Script Properties are read from secrets.local.json; values written at runtime
 *   (e.g. upcomingBookings) are saved in local/.state.json.
 * - User Properties are saved in local/.state.json.
 * - Emails are written as HTML files to local/outbox/ instead of being sent.
 * - UrlFetchApp makes real HTTP requests.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SECRETS_FILE = path.join(ROOT, 'secrets.local.json');
const STATE_FILE = path.join(__dirname, '.state.json');
const OUTBOX_DIR = path.join(__dirname, 'outbox');
const HTTP_HELPER = path.join(__dirname, 'http-request.js');

// ---------- Properties ----------

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
}

function makeProperties(load, save) {
  return {
    getProperty: (key) => (key in load() ? String(load()[key]) : null),
    getProperties: () => ({ ...load() }),
    setProperty(key, value) {
      const data = load();
      data[key] = String(value);
      save(data);
      return this;
    },
    deleteProperty(key) {
      const data = load();
      delete data[key];
      save(data);
      return this;
    },
  };
}

if (!fs.existsSync(SECRETS_FILE)) {
  console.error('Missing secrets.local.json – copy secrets.example.json and fill in the values.');
  process.exit(1);
}

// local/.state.json holds values written at runtime: { scriptProperties: {...}, userProperties: {...} }.
// Script Properties = secrets.local.json overlaid with the written values, so secrets.local.json is never modified.
function readState() {
  const state = readJson(STATE_FILE, {});
  return { scriptProperties: state.scriptProperties || {}, userProperties: state.userProperties || {} };
}

function writeState(section, data) {
  const state = readState();
  state[section] = data;
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

const scriptProperties = makeProperties(
  () => ({ ...readJson(SECRETS_FILE, {}), ...readState().scriptProperties }),
  (data) => {
    const secrets = readJson(SECRETS_FILE, {});
    const written = {};
    for (const [key, value] of Object.entries(data)) {
      if (secrets[key] !== value) written[key] = value;
    }
    writeState('scriptProperties', written);
  },
);
const userProperties = makeProperties(
  () => readState().userProperties,
  (data) => writeState('userProperties', data),
);

const PropertiesService = {
  getScriptProperties: () => scriptProperties,
  getUserProperties: () => userProperties,
  getDocumentProperties: () => userProperties,
};

// ---------- Logger ----------

const Logger = {
  log: (...args) => console.log(...args),
};

// ---------- UrlFetchApp ----------

function encodePayload(payload) {
  if (payload == null) return undefined;
  if (typeof payload === 'string') return payload;
  return new URLSearchParams(payload).toString();
}

const UrlFetchApp = {
  fetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    for (const [k, v] of Object.entries(headers)) {
      if (Array.isArray(v)) headers[k] = v.join('; ');
    }
    const body = encodePayload(options.payload);
    if (body !== undefined && typeof options.payload !== 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = options.contentType || 'application/x-www-form-urlencoded';
    }

    // UrlFetchApp is synchronous, so the request runs in a child process.
    const raw = execFileSync(process.execPath, [HTTP_HELPER], {
      input: JSON.stringify({
        url,
        method: (options.method || 'get').toUpperCase(),
        headers,
        body,
        followRedirects: options.followRedirects !== false,
      }),
      maxBuffer: 50 * 1024 * 1024,
    });
    const res = JSON.parse(raw.toString('utf8'));
    if (res.error) throw new Error(`Request to ${url} failed: ${res.error}`);

    if (res.status >= 400 && !options.muteHttpExceptions) {
      throw new Error(`Request failed for ${url} returned code ${res.status}`);
    }

    const bytes = Buffer.from(res.bodyBase64, 'base64');
    return {
      getResponseCode: () => res.status,
      getAllHeaders: () => res.headers,
      getHeaders: () => res.headers,
      getContent: () => [...bytes],
      getContentText: (charset = 'utf-8') => new TextDecoder(charset).decode(bytes),
    };
  },
};

// ---------- MailApp ----------

let mailCounter = 0;
const MailApp = {
  sendEmail(message) {
    const { to, subject, htmlBody, body } = message;
    fs.mkdirSync(OUTBOX_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(OUTBOX_DIR, `${stamp}-${++mailCounter}.html`);
    const header = `<!-- To: ${to}\n     Subject: ${subject} -->\n`
      + `<p style="font-family:monospace;color:#666">To: ${to}<br>Subject: ${subject}</p><hr>\n`;
    fs.writeFileSync(file, `<!DOCTYPE html><meta charset="utf-8">\n${header}${htmlBody || body || ''}`);
    console.log(`[MailApp] Email to ${to} saved to ${path.relative(ROOT, file)}`);
  },
};

// ---------- Load the Apps Script files into one shared global scope ----------

const context = vm.createContext({
  console,
  Logger,
  PropertiesService,
  UrlFetchApp,
  MailApp,
});

const sourceFiles = fs.readdirSync(ROOT)
  .filter((f) => /\.(js|gs)$/.test(f))
  .sort();

// Apps Script keeps top-level `const`/`let` shared between files, so run them all as one script.
const combined = sourceFiles
  .map((f) => `// ---- ${f} ----\n${fs.readFileSync(path.join(ROOT, f), 'utf8')}`)
  .join('\n');
vm.runInContext(combined, context, { filename: 'apps-script-bundle.js' });

// ---------- Run the requested function ----------

const fnName = process.argv[2] || 'test';
const fn = vm.runInContext(`typeof ${fnName} === 'function' ? ${fnName} : undefined`, context);
if (!fn) {
  console.error(`No function named "${fnName}" found in: ${sourceFiles.join(', ')}`);
  process.exit(1);
}

console.log(`Running ${fnName}() locally…\n`);
const result = fn();
if (result !== undefined) console.log('\nReturned:', result);
