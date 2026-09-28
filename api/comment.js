const { json, readJsonFile, writeJsonFile, allowedSlug } = require("./_lib");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const slug = req.query.slug;
    if (!allowedSlug(slug)) return json(res, 400, { error: "Bad slug" });
    try {
      const file = await readJsonFile(`comments/${slug}.json`);
      return json(res, 200, { comments: file.json.comments || [] });
    } catch (err) {
      if (err.status === 404) return json(res, 200, { comments: [] });
      return json(res, 500, { error: err.message });
    }
  }

  if (req.method !== "POST") return json(res, 405, { error: "Use POST" });

  const slug = req.body?.slug;
  const name = String(req.body?.name || "").trim().slice(0, 60);
  const body = String(req.body?.body || "").trim().slice(0, 2000);
  if (!allowedSlug(slug)) return json(res, 400, { error: "Bad slug" });
  if (name.length < 2) return json(res, 400, { error: "Name is too short" });
  if (body.length < 4) return json(res, 400, { error: "Comment is too short" });

  const path = `comments/${slug}.json`;
  let sha;
  let doc = { slug, comments: [] };
  try {
    const file = await readJsonFile(path);
    sha = file.sha;
    doc = file.json;
    if (!Array.isArray(doc.comments)) doc.comments = [];
  } catch (err) {
    if (err.status !== 404) return json(res, 500, { error: err.message });
  }

  doc.comments.push({
    name,
    body,
    at: new Date().toISOString(),
  });

  try {
    await writeJsonFile(path, doc, `Comment on ${slug}`, sha);
    return json(res, 200, { ok: true, comments: doc.comments });
  } catch (err) {
    return json(res, 500, { error: err.message || "Could not save comment" });
  }
};
