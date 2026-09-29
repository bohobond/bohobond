const { json, readJsonFile, writeJsonFile } = require("./_lib");

const PATH = "timeline.json";
const OWNER_KINDS = ["life", "lesson", "built", "note", "film", "x"];
const ALL_KINDS = OWNER_KINDS.concat("mark");

function cleanText(value, max) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanHref(value) {
  const href = String(value || "").trim().slice(0, 300);
  if (!href) return "";
  if (/^https?:\/\//i.test(href) || href.startsWith("/")) return href;
  return "";
}

function cleanDate(value) {
  const at = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(at)) return at;
  return new Date().toISOString().slice(0, 10);
}

function makeId(kind, title) {
  const base = String(title || kind)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return `${base || kind}-${Date.now().toString(36)}`;
}

function requireOwner(req) {
  const secret = process.env.EDIT_SECRET;
  if (!secret) {
    const err = new Error("EDIT_SECRET is not set on Vercel");
    err.status = 500;
    throw err;
  }
  const key = req.headers["x-edit-key"] || req.body?.key;
  if (key !== secret) {
    const err = new Error("Wrong key");
    err.status = 401;
    throw err;
  }
}

function ownerEntry(raw, existing) {
  const title = cleanText(raw.title, 120);
  const body = cleanText(raw.body, 600);
  if (title.length < 2) {
    const err = new Error("Title is too short");
    err.status = 400;
    throw err;
  }
  if (body.length < 4) {
    const err = new Error("Body is too short");
    err.status = 400;
    throw err;
  }
  const kind = ALL_KINDS.includes(raw.kind) ? raw.kind : "note";
  const href = cleanHref(raw.href);
  const entry = {
    id: existing?.id || makeId(kind, title),
    at: cleanDate(raw.at || existing?.at),
    kind: OWNER_KINDS.includes(kind) ? kind : existing?.kind || "note",
    title,
    body,
  };
  if (href) entry.href = href;
  return entry;
}

function markEntry(raw) {
  const title = cleanText(raw.title || raw.name, 60);
  const body = cleanText(raw.body, 400);
  if (title.length < 2) {
    const err = new Error("Name is too short");
    err.status = 400;
    throw err;
  }
  if (body.length < 4) {
    const err = new Error("Mark is too short");
    err.status = 400;
    throw err;
  }
  return {
    id: makeId("mark", title),
    at: new Date().toISOString().slice(0, 10),
    kind: "mark",
    title,
    body,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Use POST" });

  const action = req.body?.action || "add";
  try {
    if (action !== "mark") requireOwner(req);

    const file = await readJsonFile(PATH);
    const doc = file.json && Array.isArray(file.json.entries) ? file.json : { entries: [] };
    let entries = doc.entries;

    if (action === "add") {
      entries.push(ownerEntry(req.body));
    } else if (action === "mark") {
      entries.push(markEntry(req.body));
    } else if (action === "update") {
      const id = String(req.body.id || "");
      const i = entries.findIndex((e) => e.id === id);
      if (i < 0) return json(res, 404, { error: "Not on the tape" });
      entries[i] = ownerEntry(req.body, entries[i]);
    } else if (action === "remove") {
      const id = String(req.body.id || "");
      const before = entries.length;
      entries = entries.filter((e) => e.id !== id);
      if (entries.length === before) return json(res, 404, { error: "Not on the tape" });
    } else {
      return json(res, 400, { error: "Unknown action" });
    }

    doc.entries = entries;
    await writeJsonFile(PATH, doc, "Update the tape", file.sha);
    return json(res, 200, { ok: true, entries });
  } catch (err) {
    return json(res, err.status || 500, { error: err.message || "Could not save" });
  }
};
