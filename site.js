const LABELS = {
  life: "Life",
  lesson: "Lesson",
  built: "Built",
  note: "Note",
  film: "Film",
  x: "X",
  mark: "Mark",
};

function getEditKey() {
  return sessionStorage.getItem("bohobond-edit-key") || "";
}

function askEditKey() {
  const key = window.prompt("Edit key", getEditKey());
  if (!key) return "";
  sessionStorage.setItem("bohobond-edit-key", key);
  return key;
}

function setStatus(text) {
  const el = document.getElementById("tape-status");
  if (el) el.textContent = text || "";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ownerOn() {
  return document.body.classList.contains("tending");
}

async function saveTape(payload) {
  const res = await fetch("/api/tape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-edit-key": getEditKey(),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    sessionStorage.removeItem("bohobond-edit-key");
    throw new Error("Wrong key");
  }
  if (!res.ok) throw new Error(data.error || "Could not save");
  return data.entries || [];
}

function fillOwnerForm(entry) {
  const form = document.getElementById("owner-form");
  if (!form) return;
  form.id.value = entry?.id || "";
  form.kind.value = entry?.kind && entry.kind !== "mark" ? entry.kind : "note";
  form.at.value = entry?.at || today();
  form.title.value = entry?.title || "";
  form.body.value = entry?.body || "";
  form.href.value = entry?.href || "";
  form.querySelector("[type=submit]").textContent = entry?.id ? "Save entry" : "Add to tape";
}

function renderTape(entries) {
  const root = document.getElementById("tape");
  if (!root) return;
  const sorted = [...entries].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  root.innerHTML = "";
  let year = "";
  sorted.forEach((e) => {
    const y = String(e.at || "").slice(0, 4);
    if (y && y !== year) {
      year = y;
      const lab = document.createElement("div");
      lab.className = "tape-year";
      lab.textContent = y;
      root.appendChild(lab);
    }
    const el = document.createElement("article");
    el.className = "tape-item kind-" + e.kind;
    el.dataset.id = e.id;
    const open = e.href
      ? `<a class="tape-open" href="${e.href}" ${/^https?:/.test(e.href) ? "target=\"_blank\" rel=\"noreferrer\"" : ""}>Open</a>`
      : "";
    el.innerHTML = `<span class="k"></span><strong></strong><p></p><div class="tape-meta">${open}<button type="button" class="text-btn tape-edit hide">Edit</button><button type="button" class="text-btn tape-remove hide">Remove</button></div>`;
    el.querySelector(".k").textContent = LABELS[e.kind] || e.kind;
    el.querySelector("strong").textContent = e.title;
    el.querySelector("p").textContent = e.body;
    const editBtn = el.querySelector(".tape-edit");
    const removeBtn = el.querySelector(".tape-remove");
    if (ownerOn()) {
      editBtn.classList.remove("hide");
      removeBtn.classList.remove("hide");
    }
    editBtn.addEventListener("click", () => {
      fillOwnerForm(e);
      document.getElementById("owner-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    removeBtn.addEventListener("click", async () => {
      if (!getEditKey() && !askEditKey()) return;
      if (!window.confirm("Take this off the tape?")) return;
      setStatus("Removing…");
      try {
        const next = await saveTape({ action: "remove", id: e.id, key: getEditKey() });
        renderTape(next);
        setStatus("Removed. Give Vercel a minute if the row comes back on refresh.");
      } catch (err) {
        setStatus(err.message);
      }
    });
    root.appendChild(el);
  });
}

function bindOwner() {
  const tend = document.getElementById("tend-tape");
  const form = document.getElementById("owner-form");
  if (!tend || !form) return;

  tend.addEventListener("click", () => {
    if (!getEditKey() && !askEditKey()) return;
    document.body.classList.add("tending");
    form.classList.remove("hide");
    tend.classList.add("hide");
    fillOwnerForm(null);
    document.querySelectorAll(".tape-edit, .tape-remove").forEach((b) => b.classList.remove("hide"));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!getEditKey() && !askEditKey()) return;
    const fd = new FormData(form);
    const payload = {
      action: fd.get("id") ? "update" : "add",
      id: fd.get("id"),
      kind: fd.get("kind"),
      at: fd.get("at"),
      title: fd.get("title"),
      body: fd.get("body"),
      href: fd.get("href"),
      key: getEditKey(),
    };
    setStatus("Saving…");
    try {
      const entries = await saveTape(payload);
      renderTape(entries);
      fillOwnerForm(null);
      setStatus("On the tape. Live after the next deploy.");
    } catch (err) {
      setStatus(err.message);
    }
  });

  document.getElementById("owner-clear")?.addEventListener("click", () => fillOwnerForm(null));
}

function bindMark() {
  const form = document.getElementById("mark-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    setStatus("Posting mark…");
    try {
      const res = await fetch("/api/tape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark",
          title: fd.get("name"),
          body: fd.get("body"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not post");
      renderTape(data.entries || []);
      form.reset();
      setStatus("Mark left. It stays after the next deploy.");
    } catch (err) {
      setStatus(err.message);
    }
  });
}

async function bootTimeline() {
  const root = document.getElementById("tape");
  if (!root) return;
  try {
    const res = await fetch("/timeline.json", { cache: "no-store" });
    const data = await res.json();
    renderTape(data.entries || []);
  } catch {
    root.textContent = "The tape is empty until the file loads.";
  }
  bindOwner();
  bindMark();
}
