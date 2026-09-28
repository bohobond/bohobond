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
  });
}
