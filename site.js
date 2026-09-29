async function bootTimeline() {
  const root = document.getElementById("tape");
  if (!root) return;
  try {
    const res = await fetch("/timeline.json", { cache: "no-store" });
    const data = await res.json();
    const entries = (data.entries || []).slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
    let year = "";
    root.innerHTML = "";
    const labels = { life: "Life", lesson: "Lesson", built: "Built", note: "Note", film: "Film", x: "X", mark: "Mark" };
    entries.forEach((e) => {
      const y = String(e.at || "").slice(0, 4);
      if (y && y !== year) {
        year = y;
        const lab = document.createElement("div");
        lab.className = "tape-year";
        lab.textContent = y;
        root.appendChild(lab);
      }
      const el = document.createElement(e.href ? "a" : "article");
      el.className = "tape-item kind-" + e.kind;
      if (e.href) {
        el.href = e.href;
        if (/^https?:/.test(e.href)) el.target = "_blank";
      }
      el.innerHTML = "<span class=\"k\"></span><strong></strong><p></p>";
      el.querySelector(".k").textContent = labels[e.kind] || e.kind;
      el.querySelector("strong").textContent = e.title;
      el.querySelector("p").textContent = e.body;
      root.appendChild(el);
    });
  } catch (err) {
    root.textContent = "The tape is empty until the file loads.";
  }
}
