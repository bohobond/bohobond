const { json, readJsonFile, writeJsonFile, allowedSlug, strip } = require("./_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Use POST" });

  const secret = process.env.EDIT_SECRET;
  if (!secret) return json(res, 500, { error: "EDIT_SECRET is not set on Vercel" });

  const key = req.headers["x-edit-key"] || req.body?.key;
  if (key !== secret) return json(res, 401, { error: "Wrong key" });

  const slug = req.body?.slug;
  const article = req.body?.article;
  if (!allowedSlug(slug)) return json(res, 400, { error: "Bad slug" });
  if (typeof article !== "string" || article.length > 80000) {
    return json(res, 400, { error: "Article missing or too long" });
  }

  const path = `content/${slug}.json`;
  let sha;
  let current = { slug };
  try {
    const file = await readJsonFile(path);
    sha = file.sha;
    current = file.json;
  } catch (err) {
    if (err.status !== 404) return json(res, 500, { error: err.message });
  }

  current.slug = slug;
  current.article = strip(article);
  current.updatedAt = new Date().toISOString();

  await writeJsonFile(path, current, `Edit ${slug} on the site`, sha);
  return json(res, 200, { ok: true });
};
