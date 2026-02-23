# A4 Photo Print — Newspaper Templates (frontend-only)

Files in this folder:

- `index.html` — main UI
- `styles.css` — styling
- `script.js` — app logic (canvas preview + export)
- `templates/` — place your template PNGs here (see below)

How it works
- The app uses a fixed A4 resolution: 2480 x 3508 px (300 DPI).
- The preview canvas is scaled to 25% (620×877 px) for quick preview.
- Templates are configured in `script.js` in the `FRAME_CONFIG` object.
- Each frame has a `photoArea` with full-resolution coordinates { x, y, width, height }.
- When a photo is uploaded the app computes:
  scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight)
  and centers the scaled photo in the frame using clipping (object-fit: cover behavior).

Adding new frames
1. Add your A4 template image file into `templates/`, e.g. `templates/frame4.png`.
2. Open `script.js` and add a new entry in `FRAME_CONFIG`:

  frame4: {
    name: 'Frame 4 description',
    template: 'templates/frame4.png',
    photoArea: { x: 300, y: 400, width: 1200, height: 1600 }
  }

3. The `photoArea` coordinates must be specified in FULL RES (2480×3508).

Notes and limitations
- This is frontend-only. WhatsApp sharing uses prefilled text with a data URL. WhatsApp may block very long URLs — to reliably share images you should host the exported PNG somewhere and share the link.
- If a template image file is missing the app generates a clear placeholder template so you can preview the photo placement.
- Images are rendered in canvas: users cannot drag/resize the uploaded photo inside the frame.
 - You can upload a newspaper template image manually from the UI: use the "Upload template" control to replace the currently selected frame's template for this session. The app will use the uploaded image for preview and export. Uploaded templates are stored as session blob URLs and will not persist after a page reload.

Usage
Open `a4-photo-app/index.html` in a browser, choose a frame, upload an image, then Download/Print/Share.
