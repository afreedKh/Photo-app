// ==========================================
// A4 Photo Print App — frontend-only
// ==========================================

const A4 = { w: 2480, h: 3508 };
const PREVIEW_SCALE = 0.25;

let customMode = false;
let startPos = null;
let currentDragPos = null;

// ------------------------------------------
// Frame Config
// ------------------------------------------

const FRAME_CONFIG = {
  frame1: {
    name: "Frame 1",
    template: "templates/frame1.png",
    photoArea: { x: 100, y: 1200, width: 1700, height: 1100 }
  },
  frame2: {
    name: "Frame 2",
    template: "templates/frame2.png",
    photoArea: { x: 1370, y: 300, width: 900, height: 1200 }
  },
  frame3: {
    name: "Frame 3",
    template: "templates/frame3.png",
    photoArea: { x: 200, y: 2400, width: 2040, height: 600 }
  }
};

// ------------------------------------------
// State
// ------------------------------------------

let currentFrameKey = Object.keys(FRAME_CONFIG)[0];
let templateImg = null;
let photoImg = null;

// ------------------------------------------
// DOM
// ------------------------------------------

const photoInput = document.getElementById("photoInput");
const templateInput = document.getElementById("templateInput");
const previewCanvas = document.getElementById("previewCanvas");
const previewCtx = previewCanvas.getContext("2d");
const frameGrid = document.getElementById("frameGrid");
const downloadBtn = document.getElementById("downloadBtn");
const printBtn = document.getElementById("printBtn");
const whatsappBtn = document.getElementById("whatsappBtn");
const customBtn = document.getElementById("customBtn");

// preview size
previewCanvas.width = A4.w * PREVIEW_SCALE;
previewCanvas.height = A4.h * PREVIEW_SCALE;

// export canvas (full A4)
const exportCanvas = document.createElement("canvas");
exportCanvas.width = A4.w;
exportCanvas.height = A4.h;
const exportCtx = exportCanvas.getContext("2d");

// ==========================================
// INIT
// ==========================================

init();

async function init() {
  buildFrameGrid();
  await loadTemplateForCurrentFrame();
  setupEvents();
  renderPreview();
}

// ==========================================
// EVENTS
// ==========================================

function setupEvents() {

  photoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    photoImg = await fileToImage(file);
    renderPreview();
  });

  templateInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    templateImg = await fileToImage(file);
    FRAME_CONFIG[currentFrameKey].template = templateImg.src;
    renderPreview();
  });

  customBtn.addEventListener("click", () => {
    customMode = true;
    previewCanvas.style.cursor = "crosshair";
  });

  previewCanvas.addEventListener("mousedown", (e) => {
    if (!customMode) return;
    const rect = previewCanvas.getBoundingClientRect();

    startPos = {
      x: (e.clientX - rect.left) / PREVIEW_SCALE,
      y: (e.clientY - rect.top) / PREVIEW_SCALE
    };

    currentDragPos = startPos;
  });

  previewCanvas.addEventListener("mousemove", (e) => {
    if (!customMode || !startPos) return;

    const rect = previewCanvas.getBoundingClientRect();

    currentDragPos = {
      x: (e.clientX - rect.left) / PREVIEW_SCALE,
      y: (e.clientY - rect.top) / PREVIEW_SCALE
    };

    renderPreview(); // redraw live
  });

  previewCanvas.addEventListener("mouseup", () => {
    if (!customMode || !startPos || !currentDragPos) return;

    FRAME_CONFIG[currentFrameKey].photoArea = {
      x: Math.min(startPos.x, currentDragPos.x),
      y: Math.min(startPos.y, currentDragPos.y),
      width: Math.abs(currentDragPos.x - startPos.x),
      height: Math.abs(currentDragPos.y - startPos.y)
    };

    customMode = false;
    previewCanvas.style.cursor = "default";
    startPos = null;
    currentDragPos = null;

    renderPreview();
  });

  downloadBtn.addEventListener("click", downloadImage);
  printBtn.addEventListener("click", printImage);
  whatsappBtn.addEventListener("click", shareWhatsApp);
}

// ==========================================
// FRAME GRID
// ==========================================

function buildFrameGrid() {
  frameGrid.innerHTML = "";

  Object.keys(FRAME_CONFIG).forEach((key) => {
    const btn = document.createElement("button");
    btn.textContent = FRAME_CONFIG[key].name;
    btn.onclick = () => selectFrame(key);
    frameGrid.appendChild(btn);
  });
}

async function selectFrame(key) {
  currentFrameKey = key;
  await loadTemplateForCurrentFrame();
  renderPreview();
}

// ==========================================
// IMAGE HELPERS
// ==========================================

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function loadTemplateForCurrentFrame() {
  templateImg = await loadImage(FRAME_CONFIG[currentFrameKey].template);
}

// ==========================================
// PREVIEW RENDER
// ==========================================

function renderPreview() {

  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  if (templateImg) {
    previewCtx.drawImage(
      templateImg,
      0,
      0,
      A4.w * PREVIEW_SCALE,
      A4.h * PREVIEW_SCALE
    );
  }

  const frame = FRAME_CONFIG[currentFrameKey].photoArea;

  // Draw fixed red border
  previewCtx.strokeStyle = "red";
  previewCtx.lineWidth = 2;
  previewCtx.strokeRect(
    frame.x * PREVIEW_SCALE,
    frame.y * PREVIEW_SCALE,
    frame.width * PREVIEW_SCALE,
    frame.height * PREVIEW_SCALE
  );

  if (photoImg) {
    drawPhotoClipped(previewCtx, photoImg, frame, PREVIEW_SCALE);
  }

  // Live blue dashed drag rectangle
  if (customMode && startPos && currentDragPos) {
    const x = Math.min(startPos.x, currentDragPos.x) * PREVIEW_SCALE;
    const y = Math.min(startPos.y, currentDragPos.y) * PREVIEW_SCALE;
    const w = Math.abs(currentDragPos.x - startPos.x) * PREVIEW_SCALE;
    const h = Math.abs(currentDragPos.y - startPos.y) * PREVIEW_SCALE;

    previewCtx.strokeStyle = "blue";
    previewCtx.setLineDash([6]);
    previewCtx.strokeRect(x, y, w, h);
    previewCtx.setLineDash([]);
  }
}

// ==========================================
// DRAW PHOTO (COVER FIT)
// ==========================================

function drawPhotoClipped(ctx, img, photoArea, scale = 1) {

  const fx = photoArea.x * scale;
  const fy = photoArea.y * scale;
  const fw = photoArea.width * scale;
  const fh = photoArea.height * scale;

  const scaleFactor = Math.max(fw / img.width, fh / img.height);
  const drawW = img.width * scaleFactor;
  const drawH = img.height * scaleFactor;

  const drawX = fx + (fw - drawW) / 2;
  const drawY = fy + (fh - drawH) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(fx, fy, fw, fh);
  ctx.clip();
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
}

// ==========================================
// EXPORT
// ==========================================

function renderExport() {
  exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);

  if (templateImg) {
    exportCtx.drawImage(templateImg, 0, 0, A4.w, A4.h);
  }

  if (photoImg) {
    drawPhotoClipped(
      exportCtx,
      photoImg,
      FRAME_CONFIG[currentFrameKey].photoArea,
      1
    );
  }
}

function downloadImage() {
  renderExport();
  const dataUrl = exportCanvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${currentFrameKey}-a4.png`;
  a.click();
}

function printImage() {
  renderExport();
  const dataUrl = exportCanvas.toDataURL("image/png");
  const w = window.open("");
  w.document.write(`<img src="${dataUrl}" style="width:100%">`);
  w.print();
}

function shareWhatsApp() {
  const text = encodeURIComponent("Check my A4 photo print!");
  window.open(`https://wa.me/?text=${text}`, "_blank");
}