import { useEffect, useState } from "react";
import "./AdminPage.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const MAX_FAQ_LENGTH = 20000; // same cap as the backend
const NEW = "__new__";
const EMPTY = { id: "", name: "", color: "#0f766e", faq_text: "" };
const PW_KEY = "faq-admin-password"; // sessionStorage: cleared when the tab closes

function readPassword() {
  try {
    return sessionStorage.getItem(PW_KEY) || "";
  } catch {
    return "";
  }
}

function writePassword(pw) {
  try {
    if (pw) sessionStorage.setItem(PW_KEY, pw);
    else sessionStorage.removeItem(PW_KEY);
  } catch {
    // storage blocked: the admin just has to log in again on reload
  }
}

async function api(path, password, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", "X-Admin-Password": password },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function slugify(text) {
  return text.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [businesses, setBusinesses] = useState(null); // null = not logged in

  async function login(pw) {
    const list = await api("/api/admin/businesses", pw);
    writePassword(pw);
    setPassword(pw);
    setBusinesses(list);
  }

  function logout() {
    writePassword("");
    setPassword("");
    setBusinesses(null);
  }

  // Stay logged in across reloads within the same tab
  useEffect(() => {
    const saved = readPassword();
    if (saved) login(saved).catch(() => writePassword(""));
  }, []);

  if (!businesses) return <Login onLogin={login} />;
  return <Editor password={password} businesses={businesses} setBusinesses={setBusinesses} onLogout={logout} />;
}

function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onLogin(pw);
    } catch (err) {
      setError(err instanceof TypeError ? "Can't reach the server." : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="ad-page ad-narrow">
      <h1>FAQ Chat admin</h1>
      <form onSubmit={submit} className="ad-card">
        <label>
          Admin password
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus required />
        </label>
        {error && <p className="ad-error">{error}</p>}
        <button disabled={busy || !pw}>{busy ? "Checking…" : "Log in"}</button>
      </form>
    </main>
  );
}

function Editor({ password, businesses, setBusinesses, onLogout }) {
  const [selectedId, setSelectedId] = useState(businesses[0]?.id || NEW);
  const [form, setForm] = useState(EMPTY);
  const [idEdited, setIdEdited] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const isNew = selectedId === NEW;

  // Load the full business (including FAQ) when the selection changes
  useEffect(() => {
    setCopied(false);
    if (isNew) {
      setForm(EMPTY);
      setIdEdited(false);
      return;
    }
    api(`/api/admin/businesses/${encodeURIComponent(selectedId)}`, password)
      .then(setForm)
      .catch(handleError);
  }, [selectedId]);

  function handleError(err) {
    if (err.status === 401) return onLogout(); // password changed on the server
    setStatus({ type: "error", text: err instanceof TypeError ? "Can't reach the server." : err.message });
  }

  function update(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (isNew && field === "name" && !idEdited) next.id = slugify(value);
      return next;
    });
    setStatus({ type: "", text: "" });
  }

  async function save(e) {
    e.preventDefault();
    if (isNew && businesses.some((b) => b.id === form.id)) {
      return setStatus({ type: "error", text: `The ID "${form.id}" is already used. Pick another.` });
    }
    setSaving(true);
    try {
      const saved = await api(`/api/admin/businesses/${encodeURIComponent(form.id)}`, password, {
        method: "PUT",
        body: JSON.stringify({ name: form.name, faq_text: form.faq_text, color: form.color }),
      });
      setBusinesses(await api("/api/admin/businesses", password));
      setForm(saved);
      setSelectedId(saved.id);
      setStatus({ type: "ok", text: "Saved. The chat uses the new FAQ right away." });
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  const embedCode = `<script src="${window.location.origin}/widget.js" data-business="${form.id}" data-color="${form.color}"></script>`;

  async function copyEmbed() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
    } catch {
      setStatus({ type: "error", text: "Couldn't copy. Select the code and copy it by hand." });
    }
  }

  return (
    <main className="ad-page">
      <header className="ad-top">
        <h1>FAQ Chat admin</h1>
        <button className="ad-link" onClick={onLogout}>Log out</button>
      </header>

      <label className="ad-picker">
        Business
        <select
          value={selectedId}
          onChange={(e) => {
            setStatus({ type: "", text: "" });
            setSelectedId(e.target.value);
          }}
        >
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
          <option value={NEW}>+ New business</option>
        </select>
      </label>

      <form onSubmit={save} className="ad-card">
        <label>
          Business name
          <input value={form.name} onChange={(e) => update("name", e.target.value)} maxLength={100} required />
        </label>

        <label>
          ID <span className="ad-hint">used in the embed code; can't be changed later</span>
          <input
            value={form.id}
            onChange={(e) => {
              setIdEdited(true);
              update("id", e.target.value);
            }}
            disabled={!isNew}
            pattern="[a-z0-9\-]{3,50}"
            title="3-50 characters: lowercase letters, numbers and dashes"
            required
          />
        </label>

        <label>
          Brand color
          <input type="color" value={form.color} onChange={(e) => update("color", e.target.value)} />
        </label>

        <label>
          FAQ <span className="ad-hint">the chat answers only from this text</span>
          <textarea
            value={form.faq_text}
            onChange={(e) => update("faq_text", e.target.value)}
            rows={14}
            maxLength={MAX_FAQ_LENGTH}
            placeholder={"Hours: Monday-Friday 9am-5pm.\nPhone: (555) 010-0000.\nParking: Free parking behind the building."}
            required
          />
          <span className="ad-hint ad-count">{form.faq_text.length} / {MAX_FAQ_LENGTH}</span>
        </label>

        {status.text && <p className={status.type === "ok" ? "ad-ok" : "ad-error"}>{status.text}</p>}
        <button disabled={saving}>{saving ? "Saving…" : isNew ? "Create business" : "Save changes"}</button>
      </form>

      {!isNew && (
        <section className="ad-card">
          <h2>Embed code</h2>
          <p className="ad-hint">Paste this just before &lt;/body&gt; on the business's website.</p>
          <pre className="ad-code">{embedCode}</pre>
          <div className="ad-row">
            <button type="button" onClick={copyEmbed}>{copied ? "Copied" : "Copy code"}</button>
            <a href={`/?business=${encodeURIComponent(form.id)}`} target="_blank" rel="noreferrer">
              Preview the chat
            </a>
          </div>
        </section>
      )}
    </main>
  );
}
