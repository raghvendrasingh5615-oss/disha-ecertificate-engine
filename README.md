# DISHA E-Certificate Bulk Engine & Verification Module

An institutional-grade replacement for the [Disha College Portal](https://disha.mbm.ac.in/ecertificates) E-Certificate module, designed specifically for the **Department of Computer Science & Engineering, MBM University, Jodhpur**.

---

## 🚀 The Problem Solved

### The Previous Architecture (HTML/CSS Overlay Bug)
On the live portal (`https://disha.mbm.ac.in/ecertificates`), certificate text was injected via `dangerouslySetInnerHTML` using absolute CSS coordinates (e.g. `top: 352px; left: 250px; font-size: 40px;`) over a static `<img>` tag:
- **Responsive Breakdown**: As soon as the screen width changed or mobile devices rendered the page, the underlying image scaled down, but the absolute CSS text did not scale proportionately, causing names and certificate numbers to scatter outside the designated certificate lines.
- **Font-Swap Jitter**: Before web fonts loaded, system fallback fonts caused text bounding boxes to shift.
- **Server Storage Bloat**: Attempting to pre-render and save thousands of high-res image files on the server consumes gigabytes of storage and complicates backups.

### The Solution: Canvas Bitmap Flattening & Lightweight JSON Coordinates
1. **Canva-Style Interactive Mapper (`/admin`)**:
   - The admin uploads a blank template image (e.g., `template.png` at native 1563 × 1105 px).
   - An interactive HTML5 `<canvas>` provides drag-and-drop bounding boxes with 8 resize handles for each column (`{{name}}`, `{{cert_no}}`, `{{branch}}`, `{{year}}`, `{{event}}`, `{{date}}`, plus custom columns).
   - All positions are stored strictly relative to the image's **native pixel dimensions** (`naturalWidth × naturalHeight`).
   - The server stores **only** the lightweight template JSON config and student tabular records—**never bloating disk with thousands of static images**.
   - Admin can configure an **Auto Certificate Number Generator** (`Prefix + Starting Serial + Zero-Padding`, e.g. `24CVSCB001` to `24CVSCB013`).
   - A client-side **Bulk Download ZIP (PNGs)** button utilizes `JSZip` and an offscreen canvas to batch-generate high-res PNG certificates in the browser without putting any CPU or disk strain on the server.

2. **Student Verification Portal (`/ecertificates`)**:
   - Students input their certificate number (pre-tested with trial number `24CVSCB013`).
   - The client fetches the student record and template config, awaits `document.fonts.ready`, and draws the text fields directly onto the native template bitmap using HTML5 `<canvas>`.
   - **Auto-Font Shrinking**: If a long candidate name or department title exceeds `maxWidth`, `ctx.measureText` dynamically shrinks the font size until it fits into the bounding box.
   - The output is exported as a **single flat PNG image** (`canvas.toDataURL("image/png")`) embedded inside a responsive `<img>` element.
   - **Zero CSS Layout Shift**: Because the text is baked directly into the bitmap pixels, the certificate can be resized, zoomed, printed, or viewed on any mobile device without breaking alignment.
   - Includes one-click **Download High-Res PNG** and **Print-Ready PDF** (A4 Landscape at 300 DPI via `jsPDF`).

---

## 📁 Directory Structure

```
disha-ecertificate-engine/
├── server.js                      # Express server with REST APIs & static routes
├── db.js                          # Lightweight JSON database driver (no native compilation needed)
├── package.json                   # Dependencies: express, cors, multer, jszip, jspdf
├── template.png                   # Authentic blank 1563x1105 workshop certificate template
├── sample_students.csv            # 15 student records (including 24CVSCB001 - 24CVSCB013)
├── disha_ecertificate_engine.html # Standalone all-in-one portable engine file
├── data/
│   └── database.json              # Initial database with 24CVSCB013 & coordinate mapping
└── public/
    ├── template.png               # Static template asset
    ├── sample_students.csv        # Static CSV asset for 1-click loading
    ├── admin.html                 # Canva-style admin interactive canvas editor
    ├── ecertificates.html         # Student verification portal
    ├── css/
    │   ├── common.css             # Shared institutional design tokens & header
    │   ├── admin.css              # Canva toolbar, inspector, zoom & bottom drawer styles
    │   └── portal.css             # Verification hero, verified card, & print styles
    └── js/
        ├── admin.js               # Canvas dragging, 8 handles, CSV parser, JSZip bulk generator
        ├── portal.js              # Verification fetcher, fonts.ready, canvas flattener, PDF exporter
        ├── jszip.min.js           # Client-side zip generation
        └── jspdf.umd.min.js       # Client-side print-ready PDF creation
```

---

## 🛠️ How to Run Locally

1. **Install dependencies**:
   ```bash
   cd /Users/rahul/.gemini/antigravity-ide/scratch/disha-ecertificate-engine
   npm install
   ```

2. **Start the application**:
   ```bash
   npm start
   ```

3. **Access the routes**:
   - **Student Verification Portal**: [http://localhost:3000/ecertificates](http://localhost:3000/ecertificates)
     - Test with trial number: `24CVSCB013` (Mayank Aggarwal) or use direct link: [http://localhost:3000/ecertificates?cert=24CVSCB013](http://localhost:3000/ecertificates?cert=24CVSCB013)
   - **Admin Studio & Canva Mapper**: [http://localhost:3000/admin](http://localhost:3000/admin) or [http://localhost:3000/admin/certificates](http://localhost:3000/admin/certificates)

4. **Standalone Portable HTML**:
   - Alternatively, open `disha_ecertificate_engine.html` directly in any web browser without needing a Node server!

---

## 🌐 Deploy to Netlify in 1-Click

This repository is fully configured with `netlify.toml`, serverless API functions (`netlify/functions/api.js`), and static CDN fallbacks for immediate deployment on Netlify.

### Option A: Connect via GitHub (Zero-Config, Recommended)
1. Log in to [Netlify Dashboard](https://app.netlify.com).
2. Click **Add new site** > **Import an existing project**.
3. Select **GitHub** and choose the repository: [`raghvendrasingh5615-oss/disha-ecertificate-engine`](https://github.com/raghvendrasingh5615-oss/disha-ecertificate-engine).
4. Netlify will automatically detect settings from `netlify.toml`:
   - **Build command**: `npm run build` (or leave empty)
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`
5. Click **Deploy disha-ecertificate-engine**!

### Option B: Netlify CLI
Run directly from your terminal:
```bash
npx netlify deploy --prod
```

### Option C: Netlify Drag & Drop
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag and drop the `public` directory into the browser window.
3. Your portal is instantly live!

---

## 🔌 Easy Next.js / Disha Codebase Merging Guide

To merge this engine into Disha's existing Next.js application (`disha.mbm.ac.in`):

1. **Pages**:
   - Copy `public/ecertificates.html` logic into `pages/ecertificates.tsx` (or `app/ecertificates/page.tsx`).
   - Copy `public/admin.html` logic into `pages/admin/certificates.tsx`.

2. **API Routes**:
   - `pages/api/certificates/[certNo].ts`: Return the student's Directus/database row along with the event's `template_config` JSON.
   - `pages/api/templates.ts`: Save the coordinate JSON against the Event record in Directus (`EventID.CertificateConfig`).

3. **Client Canvas Flattener**:
   - Simply use the 20-line canvas flattening function from `public/js/portal.js`:
     ```javascript
     await document.fonts.ready;
     const canvas = document.createElement('canvas');
     canvas.width = templateImg.naturalWidth;
     canvas.height = templateImg.naturalHeight;
     const ctx = canvas.getContext('2d');
     ctx.drawImage(templateImg, 0, 0);

     // Draw text with auto font shrinking
     fields.forEach(f => {
       let fs = f.fontSize;
       ctx.font = `${f.fontWeight} ${fs}px "${f.fontFamily}", sans-serif`;
       while (ctx.measureText(text).width > f.maxWidth && fs > 8) {
         fs -= 1;
         ctx.font = `${f.fontWeight} ${fs}px "${f.fontFamily}", sans-serif`;
       }
       ctx.fillText(text, f.x, f.y);
     });

     // Render into single flat img
     imgElement.src = canvas.toDataURL('image/png');
     ```
