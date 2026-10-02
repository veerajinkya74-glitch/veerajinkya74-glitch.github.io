const DEF = window.PORTFOLIO_DEFAULT, KEY = "pf_data_v1";
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let data = null;
try { data = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
if (!data || !Array.isArray(data.skills) || !Array.isArray(data.projects)) data = clone(DEF);
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
const $ = id => document.getElementById(id);
const skillList = $("skillList"), projectList = $("projectList");

// Reveal helper: staggered scroll-in, then clean up so hover/tilt stay snappy
let booted = false;
function show(el) {
  el.classList.add("in");
  el.querySelectorAll("i[data-w]").forEach(b => b.style.width = b.dataset.w + "%");
  setTimeout(() => el.classList.remove("reveal", "up", "left", "right", "zoom", "in"), 1100);
}
const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { show(e.target); rio.unobserve(e.target); } }), {threshold: .15});
function prep(el, dir, i) {
  el.classList.add("reveal", dir); el.style.setProperty("--d", (i % 4) * 120 + "ms");
  if (booted) requestAnimationFrame(() => show(el)); else rio.observe(el);
}

function renderSkills() {
  const g = {};
  data.skills.forEach((s, i) => (g[s.group] = g[s.group] || []).push([s, i]));
  skillList.innerHTML = Object.entries(g).map(([n, items]) => `<div class="skill-group"><h3>${esc(n)}</h3>` +
    items.map(([s, i]) => `<div class="skill"><span>${esc(s.name)}<b class="tools edit-only"><button data-act="eskill" data-i="${i}" aria-label="Edit skill">✎</button><button data-act="dskill" data-i="${i}" aria-label="Delete skill">✕</button></b><em>${s.level}/5</em></span><div class="meter"><i data-w="${s.level * 20}"></i></div></div>`).join("") + "</div>").join("")
    || '<p class="mute">No skills yet.</p>';
  skillList.querySelectorAll(".skill-group").forEach((el, i) => prep(el, "zoom", i));
}
function renderProjects() {
  projectList.innerHTML = data.projects.map((p, i) => `<article class="card" tabindex="0"><h3>${esc(p.title)}</h3><p class="tags">${esc(p.tags)}</p><p>${esc(p.desc)}</p><ul class="more">${p.points.map(x => `<li>${esc(x)}</li>`).join("")}</ul>${p.link ? `<a class="link" href="${esc(p.link)}" target="_blank" rel="noopener">View project</a>` : ""}<span class="hint">Tap to see details</span><div class="card-tools edit-only"><button data-act="eproj" data-i="${i}">Edit</button><button data-act="dproj" data-i="${i}">Delete</button></div></article>`).join("")
    || '<p class="mute">No projects yet.</p>';
  projectList.querySelectorAll(".card").forEach((el, i) => prep(el, "zoom", i));
}
const commit = () => { save(); renderSkills(); renderProjects(); };

// Pop-up form used for adding and updating
const dlg = $("dlg"), dform = $("dform");
function ask(title, fields, done) {
  $("dtitle").textContent = title;
  $("dfields").innerHTML = fields.map(f => `<label>${f.label}` + (f.type === "select"
    ? `<select name="${f.k}">${f.opts.map(o => `<option ${o == f.v ? "selected" : ""}>${o}</option>`).join("")}</select>`
    : f.type === "area" ? `<textarea name="${f.k}" rows="5">${esc(f.v)}</textarea>`
    : `<input name="${f.k}" value="${esc(f.v)}" ${f.list ? `list="${f.list}"` : ""} ${f.req ? "required" : ""}>`) + "</label>").join("");
  dform.onsubmit = e => { e.preventDefault(); done(Object.fromEntries(new FormData(dform))); dlg.close(); };
  dlg.showModal();
}
$("dcancel").onclick = () => dlg.close();

function skillForm(i) {
  const s = i == null ? {group: "", name: "", level: 3} : data.skills[i];
  $("gl").innerHTML = [...new Set(data.skills.map(x => x.group))].map(g => `<option value="${esc(g)}">`).join("");
  ask(i == null ? "Add skill" : "Edit skill", [
    {k: "group", label: "Group (pick one or type a new one)", v: s.group, list: "gl", req: 1},
    {k: "name", label: "Skill name", v: s.name, req: 1},
    {k: "level", label: "Level (1 to 5)", type: "select", opts: [1, 2, 3, 4, 5], v: s.level}
  ], v => { const o = {group: v.group.trim(), name: v.name.trim(), level: +v.level}; if (i == null) data.skills.push(o); else data.skills[i] = o; commit(); });
}
function projForm(i) {
  const p = i == null ? {title: "", tags: "", desc: "", points: [], link: ""} : data.projects[i];
  ask(i == null ? "Add project" : "Edit project", [
    {k: "title", label: "Project title", v: p.title, req: 1},
    {k: "tags", label: "Tools (example: Python · Pandas)", v: p.tags},
    {k: "desc", label: "Short description", type: "area", v: p.desc},
    {k: "points", label: "Details (one per line)", type: "area", v: p.points.join("\n")},
    {k: "link", label: "Link (optional, starts with https://)", v: p.link || ""}
  ], v => {
    const o = {title: v.title.trim(), tags: v.tags.trim(), desc: v.desc.trim(), points: v.points.split("\n").map(x => x.trim()).filter(Boolean), link: /^https?:\/\//.test(v.link.trim()) ? v.link.trim() : ""};
    if (i == null) data.projects.push(o); else data.projects[i] = o; commit();
  });
}
function exportData() {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["window.PORTFOLIO_DEFAULT = " + JSON.stringify(data, null, 2) + ";\n"], {type: "text/javascript"}));
  a.download = "data.js"; a.click();
}
const setEdit = on => { document.body.classList.toggle("editing", on); $("editbar").hidden = !on; };
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const i = +b.dataset.i, a = b.dataset.act;
  if (a === "eskill") skillForm(i);
  else if (a === "dskill") { if (confirm("Delete this skill?")) { data.skills.splice(i, 1); commit(); } }
  else if (a === "eproj") projForm(i);
  else if (a === "dproj") { if (confirm("Delete this project?")) { data.projects.splice(i, 1); commit(); } }
  else if (a === "addskill") skillForm();
  else if (a === "addproj") projForm();
  else if (a === "export") exportData();
  else if (a === "reset") { if (confirm("Reset everything to the original content?")) { try { localStorage.removeItem(KEY); } catch (e) {} data = clone(DEF); commit(); } }
  else if (a === "exit") setEdit(false);
});
// Edit mode: press Ctrl+Shift+E, or open the page with #edit at the end of the address
addEventListener("keydown", e => { if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "e") { e.preventDefault(); setEdit(!document.body.classList.contains("editing")); } });
if (location.hash === "#edit") setEdit(true);

// Project cards: open details, plus 3D tilt (event delegation so new cards work too)
const toggleCard = e => { if (e.target.closest("a,button")) return; const c = e.target.closest(".card"); if (c) c.classList.toggle("open"); };
projectList.addEventListener("click", toggleCard);
projectList.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCard(e); } });

// Static sections reveal
[[".block h2", "left"], [".block > p", "up"], [".stats li", "up"], [".timeline li", "right"], [".block .cta", "up"]].forEach(([sel, dir]) =>
  document.querySelectorAll(sel).forEach((el, i) => prep(el, dir, i)));

renderSkills(); renderProjects(); booted = true;

// Hero chart: bars + trend line, built with SVG
(function () {
  const svg = document.getElementById("heroChart"), ns = "http://www.w3.org/2000/svg";
  const vals = [38, 52, 47, 66, 74, 70, 92, 108, 121, 134];
  const W = 400, H = 260, pad = 24, max = 150, bw = (W - pad * 2) / vals.length;
  const mk = (t, a) => { const e = document.createElementNS(ns, t); for (const k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; };
  for (let i = 0; i <= 3; i++) { const y = pad + i * (H - pad * 2) / 3; mk("line", {class: "grid", x1: pad, x2: W - pad, y1: y, y2: y}); }
  const pts = vals.map((v, i) => {
    const h = v / max * (H - pad * 2), x = pad + i * bw, y = H - pad - h;
    const r = mk("rect", {class: "bar", x: x + 4, y, width: bw - 8, height: h, rx: 3});
    r.style.animationDelay = i * 70 + "ms";
    return [x + bw / 2, y];
  });
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const line = mk("path", {class: "line", d});
  line.style.setProperty("--len", Math.ceil(line.getTotalLength()));
  mk("circle", {class: "dot", cx: pts.at(-1)[0], cy: pts.at(-1)[1], r: 6});
})();

/* ===== Animations ===== */
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

// 1. Typing effect
(function () {
  const words = ["Python and SQL", "Pandas and EDA", "Power BI dashboards", "machine learning models", "Streamlit apps"];
  const el = document.getElementById("typed");
  if (calm) { el.textContent = words[0]; return; }
  let w = 0, c = 0, del = false;
  (function tick() {
    const word = words[w];
    el.textContent = word.slice(0, c);
    if (!del && c === word.length) { del = true; return setTimeout(tick, 1400); }
    if (del && c === 0) { del = false; w = (w + 1) % words.length; }
    c += del ? -1 : 1;
    setTimeout(tick, del ? 40 : 85);
  })();
})();

// 3. Counting numbers
const cio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target, end = +el.dataset.count, t0 = performance.now();
  (function step(t) {
    const p = Math.min((t - t0) / 1400, 1);
    el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  })(t0);
  cio.unobserve(el);
}), {threshold: .6});
document.querySelectorAll("[data-count]").forEach(el => cio.observe(el));

// 4. Scroll progress bar + active nav link
const bar = document.getElementById("progress");
const links = [...document.querySelectorAll(".nav nav a")];
const secs = links.map(a => document.querySelector(a.getAttribute("href")));
addEventListener("scroll", () => {
  const h = document.documentElement;
  bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + "%";
  let cur = -1;
  secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * .4) cur = i; });
  links.forEach((a, i) => a.classList.toggle("active", i === cur));
}, {passive: true});

// 5. Cursor glow, hero chart tilt, card 3D tilt
const glow = document.getElementById("glow");
if (!calm) {
  addEventListener("mousemove", e => { glow.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; });
  projectList.addEventListener("mousemove", e => {
    const c = e.target.closest(".card"); if (!c || c.classList.contains("reveal")) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    c.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px)`;
  });
  projectList.addEventListener("mouseout", e => { const c = e.target.closest(".card"); if (c && !c.contains(e.relatedTarget)) c.style.transform = ""; });
}

// 6. Button ripple
document.querySelectorAll(".btn").forEach(b => b.addEventListener("click", e => {
  const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), d = document.createElement("span");
  d.className = "rip"; d.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
  b.appendChild(d); setTimeout(() => d.remove(), 650);
}));

// 7. Background: drifting data points that link up and react to the mouse
(function () {
  if (calm) return;
  const cv = document.getElementById("bg"), ctx = cv.getContext("2d");
  let W, H, pts = [], mx = -999, my = -999;
  const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; pts = Array.from({length: Math.min(70, W / 18 | 0)}, () => ({x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4})); };
  size(); addEventListener("resize", size);
  addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; });
  (function draw() {
    ctx.clearRect(0, 0, W, H);
    pts.forEach((p, i) => {
      p.x = (p.x + p.vx + W) % W; p.y = (p.y + p.vy + H) % H;
      const dx = p.x - mx, dy = p.y - my;
      if (dx * dx + dy * dy < 14000) { p.x += dx * .02; p.y += dy * .02; }
      ctx.fillStyle = "rgba(76,201,240,.55)"; ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, 7); ctx.fill();
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j], d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 120) { ctx.strokeStyle = `rgba(76,201,240,${.16 * (1 - d / 120)})`; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
      }
    });
    requestAnimationFrame(draw);
  })();
})();
