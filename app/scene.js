// 3D model of a generic spread-moored FPSO. 1 unit = 1 m. Not to scale in detail.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

const L = 285, B = 63, DECK = 20, KEEL = -12, X0 = L / 2;
const wx = (x) => x - X0; // deck position from stern -> world x

const COLORS = {
  oil: 0x4f7d4a, gas: 0xa8473a, water: 0x3d6f96, util: 0xc27a2c, life: 0xe6e1d6,
  hullLow: 0x8b3a2b, hullHigh: 0x6f7a80, deck: 0x9aa3a8, steel: 0x8d979c, sea: 0x24404f, signal: 0xf2c230,
};

const CATEGORY = { SEP: "oil", CT: "oil", RSR: "oil", CMP: "gas", TEG: "gas", INJ: "gas", FG: "gas", FLR: "gas", PW: "water", WI: "water", HO: "util", PWR: "util", ACC: "life" };

// Module footprints on deck: [x0, x1, z0, z1, height]
const PLACE = {
  ACC: [3, 30, -24, 24, 30], PWR: [36, 58, -26, 26, 16], HO: [62, 78, -26, 26, 12], WI: [82, 103, -26, 26, 14],
  PW: [107, 123, -26, 26, 12], SEP: [127, 160, -26, 26, 14], CMP: [163, 186, -26, 8, 18], FG: [176, 186, 12, 26, 9],
  TEG: [190, 210, -26, 26, 12], INJ: [213, 236, -26, 26, 18],
};

export function createScene(container, systems, onPick) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xc9d4da, 600, 1600);

  const camera = new THREE.PerspectiveCamera(40, 1, 1, 5000);
  camera.position.set(-40, 230, 360);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const labels = new CSS2DRenderer();
  labels.domElement.style.position = "absolute";
  labels.domElement.style.inset = "0";
  labels.domElement.style.pointerEvents = "none";
  container.appendChild(labels.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(10, 15, 0);
  controls.enableDamping = true;
  controls.minDistance = 80;
  controls.maxDistance = 900;
  controls.maxPolarAngle = Math.PI * 0.47;

  scene.add(new THREE.HemisphereLight(0xeef3f6, 0x3b4a52, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-200, 300, 150);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, far: 800 });
  scene.add(sun);

  // Sea
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: COLORS.sea, transparent: true, opacity: 0.88, roughness: 0.6 }));
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = true;
  scene.add(sea);

  let flameMesh = null;
  const groups = {};
  const pickables = [];
  const mats = {};

  const mat = (sysId, color) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.15 });
    (mats[sysId] ||= []).push(m);
    return m;
  };
  const add = (sysId, mesh) => {
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.systemId = sysId;
    groups[sysId].add(mesh);
    pickables.push(mesh);
    return mesh;
  };
  const box = (sysId, color, x0, x1, z0, z1, y0, h) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), mat(sysId, color));
    m.position.set(wx((x0 + x1) / 2), y0 + h / 2, (z0 + z1) / 2);
    return add(sysId, m);
  };
  const vCyl = (sysId, color, x, z, y0, r, h) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), mat(sysId, color));
    m.position.set(wx(x), y0 + h / 2, z);
    return add(sysId, m);
  };
  const hCyl = (sysId, color, x, z, y, r, len) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20), mat(sysId, color));
    m.rotation.z = Math.PI / 2;
    m.position.set(wx(x), y, z);
    return add(sysId, m);
  };

  for (const s of systems) { groups[s.id] = new THREE.Group(); groups[s.id].userData.systemId = s.id; scene.add(groups[s.id]); }

  // Hull = cargo tanks system (CT)
  const shape = new THREE.Shape();
  shape.moveTo(0, -B / 2 + 4); shape.quadraticCurveTo(0, -B / 2, 4, -B / 2);
  shape.lineTo(245, -B / 2); shape.bezierCurveTo(272, -B / 2, L, -14, L, 0);
  shape.bezierCurveTo(L, 14, 272, B / 2, 245, B / 2);
  shape.lineTo(4, B / 2); shape.quadraticCurveTo(0, B / 2, 0, B / 2 - 4); shape.closePath();
  const hullPart = (y0, h, sideColor, topColor) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, [mat("CT", topColor), mat("CT", sideColor)]);
    m.position.set(-X0, y0, 0);
    return add("CT", m);
  };
  hullPart(KEEL, 16, COLORS.hullLow, COLORS.hullLow);
  hullPart(4, DECK - 4, COLORS.hullHigh, COLORS.deck);
  // Cargo hatches along the centreline
  for (let x = 45; x <= 250; x += 18.6) box("CT", 0x7d878c, x - 3, x + 3, -3, 3, DECK, 1.2);
  // Offloading hose reel, starboard quarter
  hCyl("CT", COLORS.signal, 14, 27, DECK + 4, 4, 10).rotation.set(0, 0, 0);

  const cat = (id) => COLORS[CATEGORY[id]];

  // Generic modules
  for (const [id, [x0, x1, z0, z1, h]] of Object.entries(PLACE)) {
    if (!groups[id]) continue;
    box(id, cat(id), x0, x1, z0, z1, DECK, id === "ACC" ? h : 3); // skid base
    if (id === "ACC") continue;
    // open frame: corner columns + top deck
    const c = 0x7f898e;
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) box(id, c, px - 0.6, px + 0.6, pz - 0.6, pz + 0.6, DECK + 3, h - 3);
    box(id, cat(id), x0, x1, z0, z1, DECK + h - 1, 1);
  }

  // Equipment detail
  const lift = DECK + 3;
  const P = PLACE;
  // Separation: three horizontal vessels
  hCyl("SEP", 0xdfe3e5, 143, -14, lift + 4, 4, 26); hCyl("SEP", 0xdfe3e5, 143, 0, lift + 3.5, 3.5, 22); hCyl("SEP", 0xdfe3e5, 143, 13, lift + 3, 3, 18);
  // Compression: packages and scrubbers
  box("CMP", 0xcfd4d6, 166, 176, -22, -10, lift, 7); box("CMP", 0xcfd4d6, 166, 178, -6, 5, lift, 8); vCyl("CMP", 0xdfe3e5, 182, -16, lift, 2, 12);
  box("FG", 0xcfd4d6, 178, 184, 15, 23, lift, 4);
  // TEG: contactor (tall) and regenerator
  vCyl("TEG", 0xdfe3e5, 196, -12, lift, 3, 30); vCyl("TEG", 0xe9d7d3, 205, 10, lift, 2.2, 18); hCyl("TEG", 0xdfe3e5, 203, -8, lift + 3, 2.5, 10);
  // Reinjection compressors
  box("INJ", 0xcfd4d6, 216, 232, -22, -6, lift, 9); box("INJ", 0xcfd4d6, 216, 232, 4, 20, lift, 9);
  // Power: four turbine enclosures with stacks
  for (let i = 0; i < 4; i++) { box("PWR", 0xd9dcde, 38, 56, -24 + i * 12.5, -15 + i * 12.5, lift, 6); vCyl("PWR", 0x6d767b, 52, -19.5 + i * 12.5, lift + 6, 1.4, 14); }
  // Hot oil, water injection, produced water
  hCyl("HO", 0xdfe3e5, 70, -12, lift + 3, 3, 12); vCyl("HO", 0xdfe3e5, 70, 12, lift, 2.5, 8);
  for (let i = 0; i < 3; i++) vCyl("WI", 0xdfe3e5, 87 + i * 6, -14, lift, 2.2, 9);
  hCyl("WI", 0xdfe3e5, 95, 12, lift + 3, 3, 14);
  for (let i = 0; i < 4; i++) vCyl("PW", 0xdfe3e5, 110 + i * 3.5, -12, lift, 1, 6);
  hCyl("PW", 0xdfe3e5, 117, 12, lift + 3, 3, 10);

  // Accommodation: helideck and lifeboats
  vCyl("ACC", 0x5d676c, 16, 0, DECK + 30, 13, 1);
  for (const z of [-B / 2 - 1.5, B / 2 + 1.5]) for (const x of [12, 22]) {
    const lb = new THREE.Mesh(new THREE.CapsuleGeometry(1.6, 6, 6, 12), mat("ACC", 0xe56b1f));
    lb.rotation.z = Math.PI / 2; lb.position.set(wx(x), DECK + 8, z); add("ACC", lb);
  }

  // Flare tower near the bow
  if (groups.FLR) {
    const fx = 262;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 4.5, 95, 4, 1, true), mat("FLR", 0x9aa3a8));
    tower.position.set(wx(fx), DECK + 47.5, 0); add("FLR", tower);
    tower.material.wireframe = true;
    vCyl("FLR", 0x7f898e, fx, 0, DECK, 1, 95);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(2.4, 9, 12), new THREE.MeshStandardMaterial({ color: 0xffa233, emissive: 0xff7a00, emissiveIntensity: 1.2 }));
    flame.position.set(wx(fx), DECK + 100, 0); flameMesh = flame; flame.userData.systemId = "FLR"; groups.FLR.add(flame); pickables.push(flame);
    box("FLR", 0xdfe3e5, 250, 258, -6, 6, DECK, 6); // KO drums
  }

  // Riser balcony, port side, and risers going down
  if (groups.RSR) {
    box("RSR", 0x7f898e, 125, 205, -B / 2 - 5, -B / 2, DECK - 6, 2);
    for (let x = 130; x <= 200; x += 7) vCyl("RSR", 0xd5d9db, x, -B / 2 - 2.5, -70, 0.7, DECK - 6 + 70);
  }

  // Labels
  const labelEls = {};
  for (const s of systems) {
    const g = groups[s.id];
    const bb = new THREE.Box3().setFromObject(g);
    if (bb.isEmpty()) continue;
    const el = document.createElement("button");
    el.type = "button";
    el.className = "tag3d";
    el.textContent = s.short || s.name;
    el.addEventListener("click", (e) => { e.stopPropagation(); onPick(s.id); });
    const obj = new CSS2DObject(el);
    const c = bb.getCenter(new THREE.Vector3());
    const yTop = s.id === "CT" ? DECK + 2 : s.id === "RSR" ? DECK - 2 : bb.max.y + 4;
    const pos = s.id === "CT" ? new THREE.Vector3(wx(60), yTop, 0) : s.id === "RSR" ? new THREE.Vector3(wx(215), DECK - 14, -B / 2 - 10) : new THREE.Vector3(c.x, yTop, c.z);
    obj.position.copy(pos);
    scene.add(obj);
    labelEls[s.id] = el;
  }

  // Picking
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (hit) onPick(hit.object.userData.systemId);
  });
  let hovered = null;
  renderer.domElement.addEventListener("pointermove", (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    const id = hit ? hit.object.userData.systemId : null;
    renderer.domElement.style.cursor = id ? "pointer" : "grab";
    if (id !== hovered) { hovered = id; paint(); }
  });

  let selected = null;
  function paint() {
    for (const [id, list] of Object.entries(mats)) {
      const on = id === selected, hov = id === hovered && !on;
      for (const m of list) {
        if (!m.emissive) continue;
        m.emissive.setHex(on ? COLORS.signal : hov ? 0xffffff : 0x000000);
        m.emissiveIntensity = on ? 0.35 : hov ? 0.12 : 0;
      }
    }
    for (const [id, el] of Object.entries(labelEls)) el.classList.toggle("active", id === selected);
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h); labels.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();
  // Narrow screens: pull the camera back so the whole hull fits
  if (camera.aspect < 1.2) camera.position.sub(controls.target).multiplyScalar(1.2 / camera.aspect).add(controls.target);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let t = 0;
  renderer.setAnimationLoop(() => {
    t += 0.016;
    if (flameMesh && !reduce) flameMesh.scale.set(1, 1 + 0.08 * Math.sin(t * 6), 1);
    controls.update();
    renderer.render(scene, camera);
    labels.render(scene, camera);
  });

  return {
    select(id) {
      selected = id; paint();
      if (!id || !groups[id]) return;
      const bb = new THREE.Box3().setFromObject(groups[id]);
      const c = bb.getCenter(new THREE.Vector3());
      controls.target.lerp(new THREE.Vector3(c.x, Math.min(c.y, 40), c.z), 0.6);
    },
    setLabel(id, html) { if (labelEls[id]) labelEls[id].innerHTML = html; },
  };
}
