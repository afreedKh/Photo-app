
    // ==========================================
    // A4 Photo Print App — Dynamic Frames
    // ==========================================

    const A4 = { w: 2480, h: 3508 };
    const PREVIEW_SCALE = 0.25;

    let customMode = false;
    let startPos = null;
    let currentDragPos = null;

    const DEFAULT_FRAMES = {
      frame1: { name: "Frame 1", template: null, photoArea: { x: 100,  y: 1200, width: 1700, height: 1100 } },
      frame2: { name: "Frame 2", template: null, photoArea: { x: 1370, y: 300,  width: 900,  height: 1200 } },
      frame3: { name: "Frame 3", template: null, photoArea: { x: 200,  y: 2400, width: 2040, height: 600  } }
    };

    let FRAME_CONFIG = loadFramesFromStorage() || DEFAULT_FRAMES;
    let currentFrameKey = Object.keys(FRAME_CONFIG)[0];
    let templateImg = null;
    let photoImg = null;

    const photoInput    = document.getElementById("photoInput");
    const templateInput = document.getElementById("templateInput");
    const previewCanvas = document.getElementById("previewCanvas");
    const previewCtx    = previewCanvas.getContext("2d");
    const frameGrid     = document.getElementById("frameGrid");
    const canvasWrap    = document.getElementById("canvasWrap");
    const customHint    = document.getElementById("customHint");
    const customBadge   = document.getElementById("customBadge");

    previewCanvas.width  = A4.w * PREVIEW_SCALE;
    previewCanvas.height = A4.h * PREVIEW_SCALE;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width  = A4.w;
    exportCanvas.height = A4.h;
    const exportCtx = exportCanvas.getContext("2d");

    // ─── TOAST ───
    function showToast(message, type = 'success') {
      const container = document.getElementById('toastContainer');
      const t = document.createElement('div');
      t.className = `toast ${type}`;
      t.innerHTML = `
        <span class="toast-icon">
          ${type === 'success'
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
          }
        </span>
        ${message}
      `;
      container.appendChild(t);
      setTimeout(() => {
        t.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => t.remove(), 300);
      }, 3000);
    }

    // ─── INIT ───
    init();

    async function init() {
      buildFrameGrid();
      await loadTemplateForCurrentFrame();
      setupEvents();
      renderPreview();
    }

    // ─── EVENTS ───
    function setupEvents() {
      photoInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        photoImg = await fileToImage(file);
        document.getElementById("photoBadge").style.display = 'inline-flex';
        document.getElementById("photoBadgeText").textContent = truncate(file.name, 14);
        document.getElementById("photoZone").classList.add("has-file");
        renderPreview();
        showToast("Photo loaded successfully");
      });

      templateInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        templateImg = await fileToImage(file);
        FRAME_CONFIG[currentFrameKey].template = templateImg.src;
        document.getElementById("templateBadge").style.display = 'inline-flex';
        document.getElementById("templateBadgeText").textContent = truncate(file.name, 14);
        document.getElementById("templateZone").classList.add("has-file");
        renderPreview();
        showToast("Template loaded");
      });

      function activateCustomMode() {
        customMode = true;
        previewCanvas.style.cursor = "crosshair";
        canvasWrap.classList.add("custom-mode");
        customHint.classList.add("visible");
        customBadge.style.display = 'inline-flex';
        closeSheet();
      }

      document.getElementById("customBtn").addEventListener("click", activateCustomMode);
      document.getElementById("mCustom").addEventListener("click", activateCustomMode);

      function doSave() {
        const newKey = "frame_" + Date.now();
        const currentFrame = FRAME_CONFIG[currentFrameKey];
        const frameCount = Object.keys(FRAME_CONFIG).length;
        FRAME_CONFIG[newKey] = {
          name: `Frame ${frameCount + 1}`,
          template: currentFrame.template,
          photoArea: { ...currentFrame.photoArea }
        };
        currentFrameKey = newKey;
        saveFramesToStorage();
        buildFrameGrid();
        renderPreview();
        showToast("New frame saved!", "success");
        closeSheet();
      }

      document.getElementById("saveFrameBtn").addEventListener("click", doSave);
      document.getElementById("mSave").addEventListener("click", doSave);

      // Canvas draw events
      previewCanvas.addEventListener("mousedown", (e) => {
        if (!customMode) return;
        const rect = previewCanvas.getBoundingClientRect();
        const scaleX = previewCanvas.width / rect.width;
        const scaleY = previewCanvas.height / rect.height;
        startPos = {
          x: (e.clientX - rect.left) * scaleX / PREVIEW_SCALE,
          y: (e.clientY - rect.top) * scaleY / PREVIEW_SCALE
        };
        currentDragPos = { ...startPos };
      });

      previewCanvas.addEventListener("mousemove", (e) => {
        if (!customMode || !startPos) return;
        const rect = previewCanvas.getBoundingClientRect();
        const scaleX = previewCanvas.width / rect.width;
        const scaleY = previewCanvas.height / rect.height;
        currentDragPos = {
          x: (e.clientX - rect.left) * scaleX / PREVIEW_SCALE,
          y: (e.clientY - rect.top) * scaleY / PREVIEW_SCALE
        };
        renderPreview();
      });

      // Touch support
      previewCanvas.addEventListener("touchstart", (e) => {
        if (!customMode) return;
        e.preventDefault();
        const touch = e.touches[0];
        const rect = previewCanvas.getBoundingClientRect();
        const scaleX = previewCanvas.width / rect.width;
        const scaleY = previewCanvas.height / rect.height;
        startPos = {
          x: (touch.clientX - rect.left) * scaleX / PREVIEW_SCALE,
          y: (touch.clientY - rect.top) * scaleY / PREVIEW_SCALE
        };
        currentDragPos = { ...startPos };
      }, { passive: false });

      previewCanvas.addEventListener("touchmove", (e) => {
        if (!customMode || !startPos) return;
        e.preventDefault();
        const touch = e.touches[0];
        const rect = previewCanvas.getBoundingClientRect();
        const scaleX = previewCanvas.width / rect.width;
        const scaleY = previewCanvas.height / rect.height;
        currentDragPos = {
          x: (touch.clientX - rect.left) * scaleX / PREVIEW_SCALE,
          y: (touch.clientY - rect.top) * scaleY / PREVIEW_SCALE
        };
        renderPreview();
      }, { passive: false });

      function finishDraw() {
        if (!customMode || !startPos || !currentDragPos) return;
        FRAME_CONFIG[currentFrameKey].photoArea = {
          x: Math.min(startPos.x, currentDragPos.x),
          y: Math.min(startPos.y, currentDragPos.y),
          width:  Math.abs(currentDragPos.x - startPos.x),
          height: Math.abs(currentDragPos.y - startPos.y)
        };
        customMode = false;
        previewCanvas.style.cursor = "default";
        canvasWrap.classList.remove("custom-mode");
        customHint.classList.remove("visible");
        customBadge.style.display = 'none';
        startPos = null;
        currentDragPos = null;
        renderPreview();
        showToast("Frame area updated");
      }

      previewCanvas.addEventListener("mouseup", finishDraw);
      previewCanvas.addEventListener("touchend", finishDraw);

      // Download / Print / WhatsApp
      function doDownload() { downloadImage(); closeSheet(); }
      function doPrint()    { printImage();    closeSheet(); }
      function doWhatsApp() { shareWhatsApp(); closeSheet(); }

      document.getElementById("downloadBtn").addEventListener("click",   doDownload);
      document.getElementById("printBtn").addEventListener("click",      doPrint);
      document.getElementById("whatsappBtn").addEventListener("click",   doWhatsApp);
      document.getElementById("headerDownload").addEventListener("click", doDownload);
      document.getElementById("headerPrint").addEventListener("click",    doPrint);
      document.getElementById("mDownload").addEventListener("click",     doDownload);
      document.getElementById("mPrint").addEventListener("click",        doPrint);
      document.getElementById("mWhatsapp").addEventListener("click",     doWhatsApp);

      // FAB / bottom sheet
      document.getElementById("fabBtn").addEventListener("click", openSheet);
      document.getElementById("sheetOverlay").addEventListener("click", closeSheet);
    }

    function openSheet() {
      document.getElementById("sheetOverlay").classList.add("open");
      document.getElementById("bottomSheet").classList.add("open");
    }

    function closeSheet() {
      document.getElementById("sheetOverlay").classList.remove("open");
      document.getElementById("bottomSheet").classList.remove("open");
    }

    function truncate(str, n) {
      return str.length > n ? str.slice(0, n) + '…' : str;
    }

    // ─── STORAGE ───
    function saveFramesToStorage() {
      try { localStorage.setItem("A4_CUSTOM_FRAMES", JSON.stringify(FRAME_CONFIG)); } catch(e) {}
    }

    function loadFramesFromStorage() {
      try {
        const saved = localStorage.getItem("A4_CUSTOM_FRAMES");
        return saved ? JSON.parse(saved) : null;
      } catch(e) { return null; }
    }

    // ─── FRAME GRID ───
    function buildFrameGrid() {
      frameGrid.innerHTML = "";
      Object.keys(FRAME_CONFIG).forEach((key) => {
        const card = document.createElement("div");
        card.className = "frame-card" + (key === currentFrameKey ? " selected" : "");

        const dot = document.createElement("div");
        dot.className = "selected-dot";

        const thumb = document.createElement("div");
        thumb.className = "frame-thumb-placeholder";
        thumb.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`;

        const label = document.createElement("div");
        label.className = "frame-name";
        label.textContent = FRAME_CONFIG[key].name;

        card.appendChild(dot);
        card.appendChild(thumb);
        card.appendChild(label);
        card.onclick = () => selectFrame(key);
        frameGrid.appendChild(card);
      });
    }

    async function selectFrame(key) {
      currentFrameKey = key;
      document.querySelectorAll(".frame-card").forEach(c => c.classList.remove("selected"));
      frameGrid.children[Object.keys(FRAME_CONFIG).indexOf(key)].classList.add("selected");
      await loadTemplateForCurrentFrame();
      renderPreview();
    }

    // ─── IMAGE HELPERS ───
    function fileToImage(file) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = reject;
        img.src = url;
      });
    }

    function loadImage(url) {
      return new Promise((resolve) => {
        if (!url) { resolve(null); return; }
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    }

    async function loadTemplateForCurrentFrame() {
      templateImg = await loadImage(FRAME_CONFIG[currentFrameKey].template);
    }

    // ─── RENDER ───
    function renderPreview() {
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

      // White background
      previewCtx.fillStyle = "#ffffff";
      previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

      if (templateImg) {
        previewCtx.drawImage(templateImg, 0, 0, A4.w * PREVIEW_SCALE, A4.h * PREVIEW_SCALE);
      }

      const frame = FRAME_CONFIG[currentFrameKey].photoArea;

      if (photoImg) {
        drawPhotoClipped(previewCtx, photoImg, frame, PREVIEW_SCALE);
      }

      // Frame outline
      previewCtx.strokeStyle = customMode ? "rgba(245,200,66,0.9)" : "rgba(255,77,91,0.8)";
      previewCtx.lineWidth = customMode ? 2 : 1.5;
      if (customMode) {
        previewCtx.setLineDash([6, 3]);
      } else {
        previewCtx.setLineDash([]);
      }
      previewCtx.strokeRect(
        frame.x * PREVIEW_SCALE,
        frame.y * PREVIEW_SCALE,
        frame.width * PREVIEW_SCALE,
        frame.height * PREVIEW_SCALE
      );
      previewCtx.setLineDash([]);

      // Drag rectangle
      if (customMode && startPos && currentDragPos) {
        const x = Math.min(startPos.x, currentDragPos.x) * PREVIEW_SCALE;
        const y = Math.min(startPos.y, currentDragPos.y) * PREVIEW_SCALE;
        const w = Math.abs(currentDragPos.x - startPos.x) * PREVIEW_SCALE;
        const h = Math.abs(currentDragPos.y - startPos.y) * PREVIEW_SCALE;
        previewCtx.fillStyle = "rgba(245,200,66,0.06)";
        previewCtx.fillRect(x, y, w, h);
        previewCtx.strokeStyle = "rgba(245,200,66,1)";
        previewCtx.lineWidth = 2;
        previewCtx.setLineDash([6, 3]);
        previewCtx.strokeRect(x, y, w, h);
        previewCtx.setLineDash([]);
      }
    }

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

    // ─── EXPORT ───
    function renderExport() {
      exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
      exportCtx.fillStyle = "#ffffff";
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      if (templateImg) exportCtx.drawImage(templateImg, 0, 0, A4.w, A4.h);
      if (photoImg) drawPhotoClipped(exportCtx, photoImg, FRAME_CONFIG[currentFrameKey].photoArea, 1);
    }

    function downloadImage() {
      renderExport();
      const dataUrl = exportCanvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${currentFrameKey}-a4.png`;
      a.click();
      showToast("Download started!");
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
  