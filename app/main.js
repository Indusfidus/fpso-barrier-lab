import { lopa } from "../engine/risk.js";
import { createScene } from "./scene.js";

const get = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(`Could not load ${p}`); return r.json(); });
const panel = document.getElementById("panel");

const SHORT = { SEP: "Separation", CMP: "Compression", TEG: "TEG dehydration", INJ: "Gas reinjection", FG: "Fuel gas", PW: "Produced water", WI: "Water injection", HO: "Hot oil", PWR: "Power", FLR: "Flare", CT: "Cargo tanks", RSR: "Risers", ACC: "Accommodation" };
const CAT = { SEP: "oil", CT: "oil", RSR: "oil", CMP: "gas", TEG: "gas", INJ: "gas", FG: "gas", FLR: "gas", PW: "water", WI: "water", HO: "util", PWR: "util", ACC: "life" };
const TASK_SYS = ["SEP", "CT", "CMP", "CT"];

// ---------- formatting ----------
const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
function sci(x) {
  if (x == null || !isFinite(x)) return "–";
  if (x >= 0.01 && x < 1000) return String(Number(x.toPrecision(3)));
  const [m, e] = x.toExponential(1).split("e");
  return `${m.replace(/\.0$/, "")} × 10${String(Number(e)).split("").map((c) => SUP[c]).join("")}`;
}
const times = (f) => `${Number(f.toPrecision(f >= 10 ? 3 : 2)).toLocaleString("en-GB")}×`;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const chip = (r, label) => r.meets ? `<span class="chip pass">${label ? label + " passes" : "Passes"}</span>` : `<span class="chip fail">${label ? label + " fails" : "Fails"}</span>`;

// ---------- data ----------
const [proc, fpsoLopa, cw] = await Promise.all([
  get("data/fpso-process.json"), get("data/case-fpso/lopa-fpso.json"), get("data/case-gas-sweetening/lopa-01.json"),
]);
const targets = Object.fromEntries(proc.riskCriteria.bySeverity.map((s) => [s.severity, s.tolerablePerYear]));
const systems = proc.systems.map((s) => ({ ...s, short: SHORT[s.id] || s.name }));
const sysById = Object.fromEntries(systems.map((s) => [s.id, s]));

const scenarios = [
  ...fpsoLopa.scenarios.map((s) => ({ ...s, tolerable: targets[s.severity], origin: "FPSO case" })),
  {
    id: cw.id, system: "TEG", origin: "Your MSc coursework (amine regenerator)",
    title: "Amine regenerator overpressure, toxic H2S (coursework LOPA-01)",
    cause: "Total failure of the reflux condenser, or loss of cooling.",
    consequence: cw.consequence, severity: cw.severity, tolerable: cw.tolerableFrequency,
    cases: cw.cases.map((c) => ({ ...c, layers: c.layers.map((l) => ({ ...l, kind: l.id === "ALM" ? "human" : l.id === "PSV" ? "relief" : l.id === "BPCS" ? "bpcs" : "sif" })) })),
    lessons: cw.lessons,
  },
];
const scenById = Object.fromEntries(scenarios.map((s) => [s.id, s]));

// Editable working copies of each case
const work = {};
const key = (s, c) => `${s}:${c}`;
const getCase = (s, c) => (work[key(s.id, c.id)] ||= structuredClone(c));
const run = (s, c) => ({ naive: lopa(c, s.tolerable, { mode: "naive" }), strict: lopa(c, s.tolerable, { mode: "strict" }) });

// ---------- 3D ----------
const view = createScene(document.getElementById("scene"), systems, (id) => go(`sys=${id}`));

function refreshLabels() {
  for (const s of systems) {
    const own = scenarios.filter((x) => x.system === s.id && x.origin === "FPSO case");
    const chips = own.map((x) => chip(run(x, getCase(x, x.cases[0])).strict, x.id)).join("");
    view.setLabel(s.id, `${esc(s.short)}${chips}`);
  }
}

// ---------- routing ----------
function go(hash) { if (location.hash.slice(1) === hash) render(); else location.hash = hash; }
window.addEventListener("hashchange", render);

function render() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get("lab") && scenById[p.get("lab")]) return renderLab(scenById[p.get("lab")], p.get("case"));
  if (p.get("sys") && sysById[p.get("sys")]) return renderSystem(sysById[p.get("sys")]);
  renderHome();
}

// ---------- home ----------
function renderHome() {
  view.select(null);
  const rows = scenarios.map((s) => {
    const c = getCase(s, s.cases[0]); const r = run(s, c);
    return `<tr><td class="tag"><a href="#lab=${s.id}">${esc(s.id)}</a></td><td>${esc(s.title)}</td><td>${r.naive.meets ? '<span class="chip pass">Passes</span>' : '<span class="chip fail">Fails</span>'}</td><td>${chip(r.strict)}</td></tr>`;
  }).join("");
  panel.innerHTML = `
    <h2>Are these barriers really independent?</h2>
    <p class="lead">A LOPA multiplies the probability that each safety layer fails. That only works if the layers fail independently. This tool checks that, layer by layer, on a generic oil FPSO with gas reinjection.</p>
    <h3>Start with a scenario</h3>
    <table><thead><tr><th>ID</th><th>Scenario (as found)</th><th>Simple LOPA</th><th>Independence checked</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="note" style="margin-top:8px">Simple LOPA multiplies every claimed layer. Independence checked rejects layers that share a sensor with the cause, give an operator too little time, or use a relief valve not sized for the case.</p>
    <h3>Or pick a system</h3>
    <ul class="syslist">${systems.map((s) => `<li><button type="button" data-sys="${s.id}" style="border-left-color:var(--${CAT[s.id]})">${esc(s.short)}</button></li>`).join("")}</ul>
    <h3>About this FPSO</h3>
    <dl class="facts">
      <dt>Oil</dt><dd>${proc.basisOfDesign.oilBpd.toLocaleString("en-GB")} bbl/d</dd>
      <dt>Gas reinjection</dt><dd>${proc.basisOfDesign.gasReinjectionMmscfd} MMscf/d</dd>
      <dt>Water injection</dt><dd>${proc.basisOfDesign.waterInjectionBpd.toLocaleString("en-GB")} bbl/d</dd>
      <dt>Storage</dt><dd>${(proc.basisOfDesign.storageBbl / 1e6).toFixed(1)} million bbl</dd>
      <dt>Hull</dt><dd>${proc.basisOfDesign.hullLengthM} m × ${proc.basisOfDesign.hullBreadthM} m, spread-moored in ${proc.basisOfDesign.waterDepthM.toLocaleString("en-GB")} m of water</dd>
    </dl>
    <p class="note">Capacities follow a public Erha-class FPSO. Operating conditions are typical values for learning. <a href="https://github.com/Indusfidus/fpso-barrier-lab/blob/main/docs/fpso-scenario.md">Read the full case</a> or <a href="https://github.com/Indusfidus/fpso-barrier-lab">view the code</a>.</p>`;
  panel.querySelectorAll("[data-sys]").forEach((b) => b.addEventListener("click", () => go(`sys=${b.dataset.sys}`)));
  panel.scrollTop = 0;
}

// ---------- system ----------
function renderSystem(s) {
  view.select(s.id);
  const own = scenarios.filter((x) => x.system === s.id);
  const tasks = proc.personnelSafetyTasks.filter((_, i) => TASK_SYS[i] === s.id);
  const hasCw = s.equipment.some((e) => e.coursework);
  panel.innerHTML = `
    <button class="back" type="button" data-home>All systems</button>
    <h2>${esc(s.name)}</h2>
    <p class="lead">${esc(s.description)}</p>
    ${own.length ? `<h3>Barrier scenarios</h3>${own.map((x) => {
      const r = run(x, getCase(x, x.cases[0]));
      return `<button class="scen" type="button" data-lab="${x.id}"><span><strong>${esc(x.id)}</strong> ${esc(x.title)}<br><span class="note">${esc(x.origin)}. ${esc(x.severity)}, target ${sci(x.tolerable)} per year</span></span>${chip(r.strict)}</button>`;
    }).join("")}` : ""}
    <h3>Major hazards</h3>
    <ul class="plain">${s.majorHazards.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
    ${s.equipment.length ? `<h3>Equipment</h3>
    <table><thead><tr><th>Tag</th><th>Equipment</th><th>Conditions</th>${hasCw ? "<th>In your coursework</th>" : ""}</tr></thead><tbody>
    ${s.equipment.map((e) => `<tr><td class="tag">${esc(e.tag)}</td><td>${esc(e.name)}${e.note ? `<br><span class="note">${esc(e.note)}</span>` : ""}</td><td>${esc([e.op, e.design && "design " + e.design].filter(Boolean).join(", ")) || "–"}</td>${hasCw ? `<td>${esc(e.coursework || "–")}</td>` : ""}</tr>`).join("")}
    </tbody></table><p class="note" style="margin-top:6px">Conditions are typical values, not from a real facility.</p>` : ""}
    ${tasks.length ? `<h3>Permit tasks here</h3>${tasks.map((t) => `<p><strong>${esc(t.task)}</strong><br><span class="note">${esc(t.permit)}</span></p><ul class="plain">${t.key.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>`).join("")}` : ""}`;
  panel.querySelector("[data-home]").addEventListener("click", () => go(""));
  panel.querySelectorAll("[data-lab]").forEach((b) => b.addEventListener("click", () => go(`lab=${b.dataset.lab}`)));
  panel.scrollTop = 0;
}

// ---------- risk staircase ----------
function staircase(s, c, res) {
  const W = 440, H = 262, padL = 52, padR = 64, padT = 26, padB = 34;
  const ie = c.initiatingEvent.frequency * (c.enablingProbability ?? 1);
  const vals = [ie, s.tolerable, res.strict.mitigated, res.naive.mitigated].filter((v) => v > 0);
  const hi = Math.ceil(Math.log10(Math.max(...vals))) , lo = Math.floor(Math.log10(Math.min(...vals))) - 1;
  const y = (v) => padT + ((hi - Math.log10(v)) / (hi - lo)) * (H - padT - padB);
  const steps = c.layers.length + 1;
  const x = (i) => padL + (i / steps) * (W - padL - padR);

  // Strict running value: rejected layers and duplicate members of a dependent group give no credit
  const rejected = new Set(res.strict.rejected.map((r) => r.id));
  const creditedInGroup = new Set(res.strict.groups.map((g) => {
    if (g.layers.length === 1) return g.layers[0];
    const ls = c.layers.filter((l) => g.layers.includes(l.id));
    return ls.reduce((a, b) => (b.pfd < a.pfd ? b : a)).id;
  }));
  let vs = ie, vn = ie;
  const ptsS = [[x(0), y(ie)]], ptsN = [[x(0), y(ie)]];
  const marks = [];
  c.layers.forEach((l, i) => {
    const okS = l.credited && !rejected.has(l.id) && creditedInGroup.has(l.id);
    const okN = l.credited;
    ptsS.push([x(i + 1), y(vs)]); if (okS) vs *= l.pfd; ptsS.push([x(i + 1), y(vs)]);
    ptsN.push([x(i + 1), y(vn)]); if (okN) vn *= l.pfd; ptsN.push([x(i + 1), y(vn)]);
    const state = !l.credited ? "not claimed" : rejected.has(l.id) ? "rejected" : !creditedInGroup.has(l.id) ? "counted once" : "";
    marks.push(`<text x="${x(i + 1)}" y="${H - padB + 14}" text-anchor="middle" class="lbl">${esc(l.id)}</text>${state ? `<text x="${x(i + 1)}" y="${H - padB + 27}" text-anchor="middle" fill="${state === "rejected" ? "#8e231b" : "#7a5413"}">${state}</text>` : ""}`);
  });
  ptsS.push([W - padR + 8, y(vs)]); ptsN.push([W - padR + 8, y(vn)]);
  const path = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  let grid = "";
  for (let e = hi; e >= lo; e--) grid += `<line x1="${padL}" x2="${W - padR + 8}" y1="${y(10 ** e)}" y2="${y(10 ** e)}" stroke="#e3e7e9"/><text x="${padL - 6}" y="${y(10 ** e) + 4}" text-anchor="end">${sci(10 ** e)}</text>`;
  const pass = res.strict.meets;
  return `<svg class="stair" viewBox="0 0 ${W} ${H}" role="img" aria-label="Risk staircase: frequency falls from ${sci(ie)} per year as each valid layer is applied, ending at ${sci(vs)} against a target of ${sci(s.tolerable)}.">
    ${grid}
    <text x="${x(0)}" y="${H - padB + 14}" text-anchor="middle" class="lbl">Cause</text>
    ${marks.join("")}
    <line x1="${padL}" x2="${W - padR + 8}" y1="${y(s.tolerable)}" y2="${y(s.tolerable)}" stroke="#1d252b" stroke-dasharray="5 4"/>
    <text x="${padL + 4}" y="${y(s.tolerable) - 5}" class="lbl">Target ${sci(s.tolerable)}</text>
    <path d="${path(ptsN)}" fill="none" stroke="#9aa5ab" stroke-width="1.5" stroke-dasharray="3 3"/>
    <path d="${path(ptsS)}" fill="none" stroke="#1d252b" stroke-width="2.5"/>
    <circle cx="${W - padR + 8}" cy="${y(vs)}" r="5" fill="${pass ? "#2e7a57" : "#c4372c"}"/>
    <text x="${W - padR + 4}" y="${y(vs) + (y(vs) >= y(s.tolerable) ? 18 : -9)}" class="lbl" text-anchor="middle">${sci(vs)}</text>
    <text x="${padL - 6}" y="${padT - 12}" text-anchor="end">per year</text>
  </svg>
  <p class="note">Solid line: independence checked. Dashed grey: simple LOPA. Each step down is a layer that earns credit.</p>`;
}

// ---------- LOPA lab ----------
function renderLab(s, caseId) {
  view.select(s.system);
  const base = s.cases.find((c) => c.id === caseId) || s.cases[0];
  const c = getCase(s, base);
  const res = run(s, c);
  const sensors = [...new Set([c.initiatingEvent.sensor, ...s.cases.flatMap((k) => k.layers.map((l) => l.sensor))].filter(Boolean))];
  const rej = Object.fromEntries(res.strict.rejected.map((r) => [r.id, r.reasons]));
  const grpOf = (id) => res.strict.groups.find((g) => g.dependent && g.layers.includes(id));
  const edited = JSON.stringify(c) !== JSON.stringify(base);

  panel.innerHTML = `
    <button class="back" type="button" data-sys="${s.system}">${esc(sysById[s.system]?.short || "System")}</button>
    <h2>${esc(s.id)}. ${esc(s.title)}</h2>
    <dl class="facts">
      <dt>Cause</dt><dd>${esc(s.cause)}</dd>
      <dt>Consequence</dt><dd>${esc(s.consequence)}</dd>
      <dt>Severity</dt><dd>${esc(s.severity)}. Target ${sci(s.tolerable)} per year</dd>
      <dt>Source</dt><dd>${esc(s.origin)}</dd>
    </dl>
    <div class="cases" role="group" aria-label="Design case">${s.cases.map((k) => `<button type="button" data-case="${k.id}" aria-pressed="${k.id === base.id}">${esc(s.cases.length > 2 ? k.id : k.label)}</button>`).join("")}</div>
    ${s.cases.length > 2 ? `<p class="note">${esc(base.label)}</p>` : ""}

    <div class="verdict">
      <div><div class="k">Simple LOPA</div><div class="v">${sci(res.naive.mitigated)}</div>${chip(res.naive)}</div>
      <div class="strict ${res.strict.meets ? "pass" : "fail"}"><div class="k">Independence checked</div><div class="v">${sci(res.strict.mitigated)}</div>${chip(res.strict)} <span class="note">${res.strict.meets ? times(1 / res.strict.gapFactor) + " margin" : times(res.strict.gapFactor) + " over target"}</span></div>
    </div>
    ${staircase(s, c, res)}

    <h3>Initiating event</h3>
    <div class="layer">
      <div class="layer-head"><span>${esc(c.initiatingEvent.description)}</span></div>
      <div class="layer-controls">
        <label>Frequency per year <input type="number" step="any" min="0" data-ie="frequency" value="${c.initiatingEvent.frequency}"></label>
        <label>Sensor <input type="text" list="sensors" data-ie="sensor" value="${esc(c.initiatingEvent.sensor || "")}" placeholder="none"></label>
      </div>
      ${c.initiatingEvent.basis ? `<p class="note" style="margin:6px 0 0">${esc(c.initiatingEvent.basis)}</p>` : ""}
    </div>

    <h3>Protection layers</h3>
    <p class="note">Change a sensor to make two layers share it, or untick a layer, and watch the verdict move.</p>
    ${c.layers.map((l, i) => {
      const g = grpOf(l.id);
      const cls = !l.credited ? "" : rej[l.id] ? "rejected" : g ? "grouped" : "";
      return `<div class="layer ${cls}">
        <div class="layer-head"><label><input type="checkbox" data-i="${i}" data-f="credited" ${l.credited ? "checked" : ""}> ${esc(l.name)}</label><span class="note">${esc(l.id)}</span></div>
        <div class="layer-controls">
          <label>PFD <input type="number" step="any" min="0" max="1" data-i="${i}" data-f="pfd" value="${l.pfd}"></label>
          <label>Sensor <input type="text" list="sensors" data-i="${i}" data-f="sensor" value="${esc(l.sensor || "")}" placeholder="none"></label>
          ${l.kind === "human" ? `<label>Minutes to respond <input type="number" min="0" step="1" data-i="${i}" data-f="responseTimeMin" value="${l.responseTimeMin ?? ""}"></label>` : ""}
          ${l.kind === "relief" || l.sizedForScenario !== undefined ? `<label><input type="checkbox" data-i="${i}" data-f="sizedForScenario" ${l.sizedForScenario !== false ? "checked" : ""}> Sized for this case</label>` : ""}
        </div>
        ${l.credited && rej[l.id] ? `<p class="why">Rejected: ${esc(rej[l.id].join(". "))}.</p>` : ""}
        ${l.credited && !rej[l.id] && g ? `<p class="why group">Shares a sensor with ${esc(g.layers.filter((x) => x !== l.id).join(", "))}. The group counts once, at PFD ${sci(g.pfd)}.</p>` : ""}
        ${l.note ? `<p class="note" style="margin:6px 0 0">${esc(l.note)}</p>` : ""}
      </div>`;
    }).join("")}
    <datalist id="sensors">${sensors.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>
    ${edited ? `<button class="reset" type="button" data-reset>Reset this case</button>` : ""}

    ${s.lessons ? `<h3>What this teaches</h3><ul class="plain">${s.lessons.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    <h3>How the check works</h3>
    <ul class="plain">
      <li>A layer that reads the same sensor as the cause fails with the cause, so it earns no credit.</li>
      <li>An alarm needs at least 10 minutes for the operator to act.</li>
      <li>A relief valve counts only if it is sized for this scenario.</li>
      <li>Layers sharing a sensor count once, at the best PFD in the group.</li>
    </ul>`;

  panel.querySelector("[data-sys]").addEventListener("click", (e) => go(`sys=${e.currentTarget.dataset.sys}`));
  panel.querySelectorAll("[data-case]").forEach((b) => b.addEventListener("click", () => go(`lab=${s.id}&case=${b.dataset.case}`)));
  panel.querySelector("[data-reset]")?.addEventListener("click", () => { delete work[key(s.id, base.id)]; update(); });
  panel.querySelectorAll("[data-ie]").forEach((inp) => inp.addEventListener("change", () => {
    const f = inp.dataset.ie;
    c.initiatingEvent[f] = f === "frequency" ? Math.max(0, Number(inp.value) || 0) : inp.value.trim() || null;
    update();
  }));
  panel.querySelectorAll("[data-i]").forEach((inp) => inp.addEventListener("change", () => {
    const l = c.layers[Number(inp.dataset.i)], f = inp.dataset.f;
    if (inp.type === "checkbox") l[f] = inp.checked;
    else if (f === "sensor") l[f] = inp.value.trim() || null;
    else if (f === "pfd") l[f] = Math.min(1, Math.max(0, Number(inp.value) || 0));
    else l[f] = inp.value === "" ? null : Number(inp.value);
    update();
  }));

  function update() {
    const top = panel.scrollTop;
    renderLab(s, base.id);
    panel.scrollTop = top;
    refreshLabels();
  }
}

refreshLabels();
render();
