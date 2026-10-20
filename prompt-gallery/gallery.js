const PROMPTS = [
  {
    id: "sketchnote-visual-summary",
    title: "Sketchnote visual summary",
    subtitle: "Hand-drawn graphic recording",
    date: "2026-10-20",
    media: "image",
    format: "A4",
    tags: ["sketchnote", "graphic recording", "visual thinking", "A4"],
    palette: [
      { name: "Teal", hex: "#14a3a3" },
      { name: "Orange", hex: "#ef8b2c" },
      { name: "Muted red", hex: "#d2564a" },
    ],
    image: "assets/the-secret.jpg",
    width: 1080,
    height: 764,
    alt: "Hand-drawn sketchnote of The Secret by Rhonda Byrne. A central 3D title box is surrounded by ten numbered sections, stick figures, icons, and arrows, drawn in black ink with teal, orange, and muted red accents on white paper.",
    prompt:
      "Create a hand-drawn sketchnote visual summary of these notes. Use a pristine white paper background (no lines). The art style should be 'graphic recording' or 'visual thinking' using black ink fine-liners for clear outlines and text. Use colored markers (specifically teal, orange, and muted red) for simple shading and accents. Center the main title in a 3D-style rectangular box. Surround the title with radially distributed simple doodles, business icons, stick figures, and graphs that explain the concepts. Use arrows to connect ideas. The text should be distinct, handwritten, all-caps printing, legible and organized like a professional brainstorming session. Layout should be A4.",
  },
];

const $ = (sel, root = document) => root.querySelector(sel);
const grid = $("#grid");
const tagsEl = $("#tags");
const countEl = $("#count");
const emptyEl = $("#empty");
const detail = $("#detail");
const lightbox = $("#lightbox");
const qInput = $("#q");

const state = {
  q: "",
  media: "all",
  tag: null,
  sort: "newest",
  view: readView(),
};

let current = null;
let toastTimer = 0;

PROMPTS.forEach((item, i) => {
  item.index = String(i + 1).padStart(2, "0");
});

function readView() {
  try {
    return sessionStorage.getItem("pg-view") || "grid";
  } catch {
    return "grid";
  }
}

function storeView(view) {
  try {
    sessionStorage.setItem("pg-view", view);
  } catch {
    /* private mode */
  }
}

function byId(id) {
  return PROMPTS.find((item) => item.id === id);
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function excerpt(text, max = 150) {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return flat.slice(0, max).trim() + "…";
}

function formatDate(iso) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function filtered() {
  const query = state.q.trim().toLowerCase();
  const list = PROMPTS.filter((item) => {
    if (state.media !== "all" && item.media !== state.media) return false;
    if (state.tag && !(item.tags || []).includes(state.tag)) return false;
    if (!query) return true;
    const hay = [item.title, item.subtitle, item.prompt, item.output, item.caption, ...(item.tags || [])]
      .join("\n")
      .toLowerCase();
    return hay.includes(query);
  });
  if (state.sort === "az") list.sort((a, b) => a.title.localeCompare(b.title));
  else list.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return list;
}

function allTags() {
  const tags = new Set();
  PROMPTS.forEach((item) => (item.tags || []).forEach((tag) => tags.add(tag)));
  return [...tags];
}

function renderTags() {
  tagsEl.replaceChildren();
  allTags().forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip" + (state.tag === tag ? " is-on" : "");
    button.dataset.tag = tag;
    button.textContent = tag;
    button.setAttribute("aria-pressed", state.tag === tag ? "true" : "false");
    tagsEl.appendChild(button);
  });
}

function cardHTML(item) {
  const thumb = item.media === "image"
    ? `<div class="thumb"><img src="${esc(item.image)}" alt="" width="${item.width || 800}" height="${item.height || 600}"></div>`
    : `<div class="thumb text-thumb"><p>${esc(excerpt(item.output || "", 180))}</p></div>`;
  const tags = (item.tags || [])
    .map((tag) => `<button type="button" class="chip${state.tag === tag ? " is-on" : ""}" data-tag="${esc(tag)}" aria-pressed="${state.tag === tag}">${esc(tag)}</button>`)
    .join("");
  return `<article class="card">
    <button type="button" class="card-hit" data-open="${esc(item.id)}">
      ${thumb}
      <div class="card-body">
        <div class="card-kicker">
          <span class="index">${esc(item.index)}</span>
          <span class="badge">${esc(item.media)}</span>
        </div>
        <h2>${esc(item.title)}</h2>
        <p class="sub">${esc(item.subtitle || "")}</p>
        <p class="excerpt">${esc(excerpt(item.prompt))}</p>
      </div>
    </button>
    <footer class="card-foot">
      <div class="chip-row">${tags}</div>
      <button type="button" class="btn ghost tiny" data-copy="${esc(item.id)}">Copy</button>
    </footer>
  </article>`;
}

function render() {
  const list = filtered();
  const solo = state.view === "grid" && list.length === 1;
  grid.className = "grid" + (state.view === "list" ? " list" : "") + (solo ? " solo" : "");
  grid.innerHTML = list.map(cardHTML).join("");
  emptyEl.hidden = list.length !== 0;
  grid.hidden = list.length === 0;

  const noun = list.length === 1 ? "piece" : "pieces";
  const scope = list.length === PROMPTS.length ? "" : ` of ${PROMPTS.length}`;
  countEl.textContent = list.length === 0 ? "No pieces" : `${list.length} ${noun}${scope}`;

  document.querySelectorAll("[data-media]").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.media === state.media ? "true" : "false");
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.view === state.view ? "true" : "false");
  });
  renderTags();
}

function setTab(name) {
  detail.dataset.tab = name;
  detail.querySelectorAll(".tab").forEach((tab) => {
    const on = tab.dataset.tab === name;
    tab.setAttribute("aria-selected", on ? "true" : "false");
  });
}

function fillSwatches(item) {
  const host = $("#d-swatches");
  host.replaceChildren();
  (item.palette || []).forEach((swatch) => {
    const row = document.createElement("span");
    row.className = "swatch";
    const dot = document.createElement("i");
    dot.style.background = swatch.hex;
    dot.setAttribute("aria-hidden", "true");
    row.append(dot, document.createTextNode(swatch.name));
    host.appendChild(row);
  });
}

function openDetail(id) {
  const item = byId(id);
  if (!item) return;
  current = item;
  $("#d-index").textContent = item.index;
  $("#d-kicker").textContent = item.format ? `${item.format} sheet` : "Archive piece";
  $("#d-title").textContent = item.title;
  $("#d-sub").textContent = item.subtitle || "";
  $("#d-meta").textContent = [`Filed ${formatDate(item.date)}`, item.media].filter(Boolean).join("  ·  ");
  $("#d-prompt").textContent = item.prompt;
  fillSwatches(item);

  const image = $("#d-img");
  const text = $("#d-text");
  const opener = $("#open-light");
  if (item.media === "image") {
    image.hidden = false;
    image.src = item.image;
    image.alt = item.alt || item.title;
    image.width = item.width || 800;
    image.height = item.height || 600;
    opener.hidden = false;
    text.hidden = true;
  } else {
    image.hidden = true;
    image.removeAttribute("src");
    opener.hidden = true;
    text.hidden = false;
    text.textContent = item.output || "";
  }
  const cap = $("#d-cap");
  cap.textContent = item.caption || "";
  cap.hidden = !item.caption;
  setTab("prompt");
  detail.showModal();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.dataset.show = "true";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.dataset.show = "false";
  }, 1600);
}

async function onCopy(id, button) {
  const item = byId(id);
  if (!item) return;
  await copyText(item.prompt);
  toast("Prompt copied");
  if (!button) return;
  const previous = button.textContent;
  button.textContent = "Copied";
  setTimeout(() => {
    button.textContent = previous;
  }, 1400);
}

function closeOnBackdrop(dialog) {
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });
}

qInput.addEventListener("input", () => {
  state.q = qInput.value;
  render();
});

qInput.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!qInput.value) return;
  qInput.value = "";
  state.q = "";
  render();
});

$("#sort").addEventListener("change", (event) => {
  state.sort = event.target.value;
  render();
});

document.querySelector(".seg").addEventListener("click", (event) => {
  const button = event.target.closest("[data-media]");
  if (!button) return;
  state.media = button.dataset.media;
  render();
});

document.querySelector(".view").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  state.view = button.dataset.view;
  storeView(state.view);
  render();
});

tagsEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tag]");
  if (!button) return;
  state.tag = state.tag === button.dataset.tag ? null : button.dataset.tag;
  render();
});

grid.addEventListener("click", (event) => {
  const tag = event.target.closest("[data-tag]");
  if (tag) {
    state.tag = state.tag === tag.dataset.tag ? null : tag.dataset.tag;
    render();
    return;
  }
  const copy = event.target.closest("[data-copy]");
  if (copy) {
    onCopy(copy.dataset.copy, copy);
    return;
  }
  const open = event.target.closest("[data-open]");
  if (open) openDetail(open.dataset.open);
});

$("#copy-prompt").addEventListener("click", () => {
  if (current) onCopy(current.id, $("#copy-prompt"));
});

$("#close-detail").addEventListener("click", () => detail.close());
$("#close-light").addEventListener("click", () => lightbox.close());

$("#open-light").addEventListener("click", () => {
  if (!current || current.media !== "image") return;
  const image = $("#light-img");
  image.src = current.image;
  image.alt = current.alt || current.title;
  lightbox.showModal();
});

detail.querySelector(".tabs").addEventListener("click", (event) => {
  const tab = event.target.closest("[data-tab]");
  if (!tab) return;
  setTab(tab.dataset.tab);
});

$("#clear").addEventListener("click", () => {
  state.q = "";
  state.media = "all";
  state.tag = null;
  qInput.value = "";
  render();
  qInput.focus();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
  if (detail.open || lightbox.open) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  event.preventDefault();
  qInput.focus();
});

closeOnBackdrop(detail);
closeOnBackdrop(lightbox);

document.querySelector(`[data-view="${state.view}"]`)?.setAttribute("aria-pressed", "true");
if (state.view === "list") {
  document.querySelector('[data-view="grid"]').setAttribute("aria-pressed", "false");
}

render();
