async function loadSpine() {
  const res = await fetch("/spine.json");
  return res.json();
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function renderSpine() {
  loadSpine().then((data) => {
    const root = document.getElementById("spine-list");
    if (!root) return;
    let lastPart = "";
    let ol = null;
    data.chapters.forEach((ch) => {
      if (ch.part !== lastPart) {
        const lab = document.createElement("div");
        lab.className = "part";
        lab.textContent = ch.part;
        root.appendChild(lab);
        ol = document.createElement("ol");
        ol.className = "spine";
        root.appendChild(ol);
        lastPart = ch.part;
      }
      const li = document.createElement("li");
      li.innerHTML = `<a href="/${ch.slug}">
        <span class="n">${pad(ch.n)}</span>
        <span><span class="t">${ch.title}</span><span class="one">${ch.one}</span></span>
        <span class="st">${ch.status}</span>
      </a>`;
      ol.appendChild(li);
    });
  });
}

function slugFromPath() {
  const parts = location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  return parts[0] || new URLSearchParams(location.search).get("slug");
}

function setStatus(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

function drawComments(list) {
  const root = document.getElementById("comments");
  if (!root) return;
  root.innerHTML = "";
  if (!list.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No comments yet.";
    root.appendChild(li);
    return;
  }
  list.forEach((c) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong></strong><time></time><p></p>`;
    li.querySelector("strong").textContent = c.name;
    li.querySelector("time").textContent = formatWhen(c.at);
    li.querySelector("p").textContent = c.body;
    root.appendChild(li);
  });
}

async function loadComments(slug) {
  try {
    const res = await fetch(`/api/comment?slug=${encodeURIComponent(slug)}`);
    const data = await res.json();
    drawComments(data.comments || []);
  } catch {
    try {
      const res = await fetch(`/comments/${slug}.json`);
      const data = await res.json();
      drawComments(data.comments || []);
    } catch {
      drawComments([]);
    }
  }
}

function bindComments(slug) {
  const form = document.getElementById("comment-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    setStatus("comment-status", "Posting…");
    try {
      const res = await fetch("/api/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: fd.get("name"),
          body: fd.get("body"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not post");
      drawComments(data.comments || []);
      form.reset();
      setStatus("comment-status", "Posted. It will stay after the next deploy.");
    } catch (err) {
      setStatus("comment-status", err.message);
    }
  });
}

function getEditKey() {
  return sessionStorage.getItem("bohobond-edit-key") || "";
}

function askEditKey() {
  const existing = getEditKey();
  const key = window.prompt("Edit key", existing);
  if (!key) return "";
  sessionStorage.setItem("bohobond-edit-key", key);
  return key;
}

function bindEditor(slug) {
  const body = document.getElementById("article-body");
  const editBtn = document.getElementById("edit-btn");
  const saveBtn = document.getElementById("save-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  if (!body || !editBtn) return;

  let snapshot = "";

  function editing(on) {
    body.contentEditable = on ? "true" : "false";
    body.classList.toggle("editing", on);
    editBtn.classList.toggle("hide", on);
    saveBtn.classList.toggle("hide", !on);
    cancelBtn.classList.toggle("hide", !on);
    if (on) body.focus();
  }

  editBtn.addEventListener("click", () => {
    if (!getEditKey() && !askEditKey()) return;
    snapshot = body.innerHTML;
    editing(true);
    setStatus("edit-status", "Click into the text. Save writes to the live site.");
  });

  cancelBtn.addEventListener("click", () => {
    body.innerHTML = snapshot;
    editing(false);
    setStatus("edit-status", "");
  });

  saveBtn.addEventListener("click", async () => {
    const key = getEditKey() || askEditKey();
    if (!key) return;
    setStatus("edit-status", "Saving…");
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-edit-key": key },
        body: JSON.stringify({ slug, key, article: body.innerHTML }),
      });
      const data = await res.json();
      if (res.status === 401) {
        sessionStorage.removeItem("bohobond-edit-key");
        throw new Error("Wrong key");
      }
      if (!res.ok) throw new Error(data.error || "Save failed");
      editing(false);
      setStatus("edit-status", "Saved. Give Vercel a minute to rebuild.");
    } catch (err) {
      setStatus("edit-status", err.message);
    }
  });
}

async function loadArticle(slug) {
  const body = document.getElementById("article-body");
  if (!body) return;
  try {
    const res = await fetch(`/content/${slug}.json`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (data.article) body.innerHTML = data.article;
  } catch {
    /* keep the shelf copy */
  }
}

function renderChapter() {
  loadSpine().then((data) => {
    const slug = slugFromPath();
    const i = data.chapters.findIndex((c) => c.slug === slug);
    const ch = data.chapters[i];
    if (!ch) {
      document.getElementById("title").textContent = "Not a chapter";
      return;
    }
    document.title = `${pad(ch.n)} ${ch.title} — Bohobond`;
    document.getElementById("num").textContent = `Chapter ${pad(ch.n)}`;
    document.getElementById("title").textContent = ch.title;
    document.getElementById("one").textContent = ch.one;
    document.getElementById("part").textContent = ` / ${ch.part}`;
    const prev = data.chapters[i - 1];
    const next = data.chapters[i + 1];
    document.getElementById("pager").innerHTML = `
      <span>${prev ? `<a href="/${prev.slug}">← ${pad(prev.n)} ${prev.title}</a>` : "Start"}</span>
      <span>${next ? `<a href="/${next.slug}">${pad(next.n)} ${next.title} →</a>` : "End of spine"}</span>
    `;
    loadArticle(slug);
    bindEditor(slug);
    loadComments(slug);
    bindComments(slug);
  });
}
