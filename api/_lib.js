const OWNER = "bohobond";
const REPO = "bohobond";
const BRANCH = "main";

function json(res, status, body) {
  return res.status(status).json(body);
}

async function github(path, method, body) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || "GitHub error");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function readJsonFile(path) {
  const file = await github(`${path}?ref=${BRANCH}`, "GET");
  const text = Buffer.from(file.content, "base64").toString("utf8");
  return { sha: file.sha, json: JSON.parse(text) };
}

async function writeJsonFile(path, jsonObj, message, sha) {
  const content = Buffer.from(JSON.stringify(jsonObj, null, 2) + "\n").toString("base64");
  return github(path, "PUT", { message, content, branch: BRANCH, sha });
}

function allowedSlug(slug) {
  return typeof slug === "string" && /^[a-z0-9-]{1,64}$/.test(slug);
}

function strip(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/javascript:/gi, "");
}

module.exports = { json, readJsonFile, writeJsonFile, allowedSlug, strip, github };
