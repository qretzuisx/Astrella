import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const htmlPath = path.join(projectRoot, "Astrella_System_Notes.html");
const pdfPath = path.join(projectRoot, "Astrella_System_Notes.pdf");

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Astrella: Complete System Architecture, ML, and Codebase Learning Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

    :root {
      --primary: #162b69;
      --primary-dull: #0d1a40;
      --secondary: #ac2021;
      --accent: #ddaf29;
      --bg-light: #f8fafc;
      --text-main: #0f172a;
      --text-muted: #475569;
      --border: #e2e8f0;
      --shadow: rgba(0, 0, 0, 0.04);
      --code-bg: #0d1a40;
      --code-text: #f8fafc;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Geist', sans-serif;
      color: var(--text-main);
      line-height: 1.6;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: 'Outfit', sans-serif;
      color: var(--primary);
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 700;
    }

    p, li {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 1em;
    }

    code {
      font-family: 'Courier New', Courier, monospace;
      background-color: #f1f5f9;
      color: var(--secondary);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
    }

    pre {
      background-color: var(--code-bg);
      padding: 1.2rem;
      border-radius: 12px;
      overflow-x: auto;
      border: 1px solid var(--primary-dull);
      margin: 1.5em 0;
    }

    pre code {
      background-color: transparent;
      color: var(--code-text);
      padding: 0;
      font-size: 13px;
      line-height: 1.5;
      display: block;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
      font-size: 13px;
    }

    th, td {
      border: 1px solid var(--border);
      padding: 10px 12px;
      text-align: left;
    }

    th {
      background-color: var(--primary);
      color: #ffffff;
      font-weight: 600;
    }

    tr:nth-child(even) {
      background-color: var(--bg-light);
    }

    .cover-page {
      background-color: var(--primary-dull);
      color: #ffffff;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 4rem;
      text-align: center;
      page-break-after: always;
      position: relative;
    }

    .cover-brand {
      font-size: 3.5rem;
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      letter-spacing: -0.03em;
      margin: 0;
      color: #ffffff;
    }

    .cover-brand span {
      color: var(--accent);
    }

    .cover-title {
      font-size: 1.8rem;
      font-weight: 400;
      margin-top: 1rem;
      margin-bottom: 2rem;
      color: #f1f5f9;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      max-width: 800px;
      line-height: 1.4;
      font-family: 'Outfit', sans-serif;
    }

    .cover-divider {
      width: 120px;
      height: 4px;
      background-color: var(--accent);
      margin: 1rem 0;
      border-radius: 2px;
    }

    .cover-details {
      margin-top: 4rem;
      font-size: 0.95rem;
      color: #cbd5e1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      width: 100%;
      max-width: 600px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 2rem;
    }

    .cover-detail-col {
      text-align: left;
    }

    .cover-detail-col strong {
      color: #ffffff;
      display: block;
      margin-bottom: 4px;
    }

    .section {
      padding: 2.5rem 0;
      page-break-after: always;
    }

    .section:last-child {
      page-break-after: avoid;
    }

    .section-title {
      font-size: 2.2rem;
      font-family: 'Outfit', sans-serif;
      color: var(--primary);
      border-bottom: 3px solid var(--accent);
      padding-bottom: 8px;
      margin-bottom: 2rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .sub-section-title {
      font-size: 1.5rem;
      font-family: 'Outfit', sans-serif;
      color: var(--primary-dull);
      border-left: 4px solid var(--secondary);
      padding-left: 12px;
      margin-top: 2rem;
      margin-bottom: 1rem;
      font-weight: 700;
    }

    .diagram-container {
      background-color: var(--bg-light);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin: 1.5rem 0;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .diagram-container svg {
      max-width: 100%;
      height: auto;
    }

    .alert {
      background-color: #fef2f2;
      border-left: 4px solid var(--secondary);
      color: #991b1b;
      padding: 1rem;
      border-radius: 8px;
      margin: 1.5rem 0;
    }

    .alert-title {
      font-weight: 700;
      margin-bottom: 4px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .info-box {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      color: #1e3a8a;
      padding: 1rem;
      border-radius: 8px;
      margin: 1.5rem 0;
    }

    .info-box-title {
      font-weight: 700;
      margin-bottom: 4px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .api-card {
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 2rem;
      overflow: hidden;
      box-shadow: 0 4px 12px var(--shadow);
    }

    .api-header {
      background-color: var(--bg-light);
      padding: 12px 18px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .api-method-badge {
      font-size: 11px;
      font-weight: 800;
      color: #ffffff;
      padding: 4px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }

    .api-method-badge.post {
      background-color: #10b981;
    }

    .api-method-badge.get {
      background-color: #3b82f6;
    }

    .api-method-badge.put {
      background-color: #f59e0b;
    }

    .api-method-badge.delete {
      background-color: #ef4444;
    }

    .api-route {
      font-family: 'Courier New', Courier, monospace;
      font-weight: 700;
      color: var(--primary);
      font-size: 14px;
    }

    .api-body {
      padding: 18px;
    }

    .api-field-title {
      font-weight: 700;
      color: var(--primary-dull);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 12px;
      margin-bottom: 4px;
    }

    .analogy-box {
      background-color: #fdfaf2;
      border-left: 4px solid var(--accent);
      color: #78350f;
      padding: 1rem;
      border-radius: 8px;
      margin: 1.5rem 0;
      font-style: italic;
    }

    .analogy-title {
      font-weight: 800;
      font-style: normal;
      color: #78350f;
      margin-bottom: 4px;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
    }

    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }

    @media print {
      body {
        background-color: #ffffff;
      }
      .cover-page {
        height: 95vh; /* adjust for print boundaries */
      }
      .page-break {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <h1 class="cover-brand">ASTRELLA<span>.</span></h1>
    <h2 class="cover-title">Gown Rental Booking & AI Style Recommendation System<br><span style="font-size: 1.2rem; color: var(--accent); letter-spacing: 2px;">Comprehensive Learning Guide & Core Codebase Breakdown</span></h2>
    <div class="cover-divider"></div>
    <p style="color: #94a3b8; font-size: 1rem; max-width: 550px;">A master notes compilation detailing the full software architecture, database logic, hybrid AI stylist recommendation models, scheduling mechanics, and validation parameters.</p>
    
    <div class="cover-details">
      <div class="cover-detail-col">
        <strong>Prepared For:</strong>
        Academic Panelists / Code Examiners
      </div>
      <div class="cover-detail-col">
        <strong>Scope Covered:</strong>
        Frontend React UI &bull; Backend Node API &bull; MediaPipe & Mongoose Models
      </div>
      <div class="cover-detail-col" style="grid-column: span 2; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem; margin-top: 1rem;">
        <strong>Document Status:</strong>
        Complete Edition (2026)
      </div>
    </div>
  </div>

  <!-- SECTION A -->
  <div class="section" id="section-a">
    <h1 class="section-title">A. System Architecture Overview</h1>
    <p>Astrella is constructed using the modern <strong>MERN</strong> (MongoDB, Express, React, Node.js) tech stack, deploying a client-server architecture model. The application segregates user interface concerns from core transactional workflows, scheduling, and database access controls.</p>
    
    <div class="analogy-box">
      <div class="analogy-title">The Restaurant Analogy</div>
      <p>Think of the system architecture like a premium boutique restaurant:
      <ul>
        <li><strong>Frontend (React):</strong> The elegant dining room and menu. It's what the customer sees, interacts with, and makes selections from.</li>
        <li><strong>Backend (Express/Node):</strong> The kitchen. Cooks (controllers) take orders, parse them, make sure ingredients are fresh (validators), and cook the food.</li>
        <li><strong>Database (MongoDB):</strong> The pantry/fridge. It stores all data, organized into separate shelves (collections) like Gowns, Bookings, and Users.</li>
        <li><strong>ImageKit & Nodemailer:</strong> External contractors. ImageKit is the photographer framing the menu; Nodemailer is the delivery courier dropping off receipts.</li>
      </ul>
      </p>
    </div>

    <h2 class="sub-section-title">High-Level Architectural Stack</h2>
    <div class="diagram-container">
      <svg width="600" height="320" viewBox="0 0 600 320" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="320" rx="12" fill="#0d1a40" />
        
        <!-- Frontend -->
        <rect x="30" y="50" width="160" height="220" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="2" />
        <text x="110" y="80" text-anchor="middle" fill="#3b82f6" font-family="'Outfit'" font-weight="bold" font-size="14">FRONTEND CLIENT</text>
        <rect x="45" y="110" width="130" height="30" rx="4" fill="#0f172a" />
        <text x="110" y="130" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="11">React SPA (Vite)</text>
        <rect x="45" y="150" width="130" height="30" rx="4" fill="#0f172a" />
        <text x="110" y="170" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="11">MediaPipe / Face-API</text>
        <rect x="45" y="190" width="130" height="30" rx="4" fill="#0f172a" />
        <text x="110" y="210" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="11">Tailwind CSS v4</text>

        <!-- Communication Arrow -->
        <path d="M 200 160 L 230 160" stroke="#ddaf29" stroke-width="3" fill="none" />
        <polygon points="230,165 240,160 230,155" fill="#ddaf29" />
        <text x="215" y="145" text-anchor="middle" fill="#ddaf29" font-family="sans-serif" font-weight="bold" font-size="9">REST / JSON</text>

        <!-- Backend -->
        <rect x="250" y="50" width="160" height="220" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="2" />
        <text x="330" y="80" text-anchor="middle" fill="#10b981" font-family="'Outfit'" font-weight="bold" font-size="14">BACKEND API</text>
        <rect x="265" y="110" width="130" height="30" rx="4" fill="#0f172a" />
        <text x="330" y="130" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="11">Node / Express</text>
        <rect x="265" y="150" width="130" height="30" rx="4" fill="#0f172a" />
        <text x="330" y="170" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="11">ML recommendation</text>
        <rect x="265" y="190" width="130" height="30" rx="4" fill="#0f172a" />
        <text x="330" y="210" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="11">Middlewares / Auth</text>

        <!-- Mongoose Link -->
        <path d="M 420 160 L 450 160" stroke="#ef4444" stroke-width="3" fill="none" />
        <polygon points="450,165 460,160 450,155" fill="#ef4444" />
        
        <!-- Database -->
        <rect x="470" y="50" width="100" height="100" rx="8" fill="#1e293b" stroke="#ef4444" stroke-width="2" />
        <text x="520" y="80" text-anchor="middle" fill="#ef4444" font-family="'Outfit'" font-weight="bold" font-size="14">DATABASE</text>
        <text x="520" y="110" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="11">MongoDB</text>
        <text x="520" y="130" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="9">Mongoose ODM</text>

        <!-- External integrations -->
        <rect x="470" y="170" width="100" height="100" rx="8" fill="#1e293b" stroke="#ddaf29" stroke-width="2" />
        <text x="520" y="195" text-anchor="middle" fill="#ddaf29" font-family="'Outfit'" font-weight="bold" font-size="12">EXT SERVICES</text>
        <text x="520" y="225" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="10">ImageKit CDN</text>
        <text x="520" y="245" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="10">Nodemailer</text>
      </svg>
    </div>

    <h2 class="sub-section-title">Directory Structure & Responsibilities</h2>
    <table>
      <thead>
        <tr>
          <th>Component</th>
          <th>Location in Codebase</th>
          <th>Key Files</th>
          <th>Primary Responsibilities</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Routing Layer</strong></td>
          <td><code>backend/routes/</code></td>
          <td><code>userRoutes.js</code>, <code>bookingRoutes.js</code>, <code>ownerRoutes.js</code>, <code>mlRoutes.js</code></td>
          <td>Maps URL paths to controller handlers. Handles request pre-filtering using auth and verification middlewares.</td>
        </tr>
        <tr>
          <td><strong>Business Logic</strong></td>
          <td><code>backend/controllers/</code></td>
          <td><code>bookingController.js</code>, <code>ownerController.js</code>, <code>userController.js</code>, <code>mlRecommendationController.js</code></td>
          <td>Implements scheduling algebra, payment state verification, account deletions, and recommendation retrievals.</td>
        </tr>
        <tr>
          <td><strong>Data Models</strong></td>
          <td><code>backend/models/</code></td>
          <td><code>User.js</code>, <code>Gown.js</code>, <code>booking.js</code></td>
          <td>Defines strict Mongoose schemas with validation matrices, database indexes, and operational structures.</td>
        </tr>
        <tr>
          <td><strong>AI & Analytics</strong></td>
          <td><code>backend/ml/</code> &amp; <code>backend/utils/</code></td>
          <td><code>recommendationModel.js</code>, <code>recommendationUtils.js</code></td>
          <td>Implements hybrid recommendations, calculating user-user and item-item similarity maps.</td>
        </tr>
        <tr>
          <td><strong>Frontend Views</strong></td>
          <td><code>frontend/src/pages/</code></td>
          <td><code>GownDetails.jsx</code>, <code>Recommendations.jsx</code>, <code>MyBookings.jsx</code>, <code>ManageBookings.jsx</code></td>
          <td>Renders user interfaces, aggregates local states, coordinates calendar selections, and executes profile analysis.</td>
        </tr>
        <tr>
          <td><strong>Frontend Core Logic</strong></td>
          <td><code>frontend/src/utils/</code></td>
          <td><code>poseBodyAnalysis.js</code></td>
          <td>Leverages Google MediaPipe WebAssembly models to execute fast torso and waist dimensions classification.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION B -->
  <div class="section page-break" id="section-b">
    <h1 class="section-title">B. Detailed API Documentation & Usage</h1>
    <p>Astrella backend APIs are organized around REST principles. All requests are authenticated via JSON Web Tokens (JWT) inside HTTP Headers.</p>

    <!-- API 1 -->
    <div class="api-card">
      <div class="api-header">
        <span class="api-route">POST /api/bookings/create</span>
        <span class="api-method-badge post">POST</span>
      </div>
      <div class="api-body">
        <p><strong>WHAT:</strong> Creates a rental reservation booking record or a 24-hour trial hold, allocating resources and generating GCash links.</p>
        
        <div class="api-field-title">Parameters (Request Body)</div>
        <table>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Necessity</th>
            <th>Description</th>
          </tr>
          <tr>
            <td><code>gown</code></td>
            <td>ObjectId</td>
            <td>Required</td>
            <td>The MongoDB ID of the selected gown item.</td>
          </tr>
          <tr>
            <td><code>pickupDate</code></td>
            <td>String (Date)</td>
            <td>Required</td>
            <td>Start calendar date for rental or appointment.</td>
          </tr>
          <tr>
            <td><code>returnDate</code></td>
            <td>String (Date)</td>
            <td>Optional</td>
            <td>Required for reservations. Excluded for 30-min trials.</td>
          </tr>
          <tr>
            <td><code>pickupTime</code></td>
            <td>String (HH:MM)</td>
            <td>Required</td>
            <td>Handover slot within boutique operating hours.</td>
          </tr>
          <tr>
            <td><code>bookingType</code></td>
            <td>String</td>
            <td>Optional</td>
            <td>Either <code>"reservation"</code> (default) or <code>"trial"</code>.</td>
          </tr>
          <tr>
            <td><code>payment</code></td>
            <td>JSON / Object</td>
            <td>Required</td>
            <td>Payment choice (GCash or in-store) and deposit details.</td>
          </tr>
        </table>

        <div class="api-field-title">HOW (Implementation Flow)</div>
        <p>The controller combines the requested date and time string using <code>combineDateAndTime()</code>. It executes <code>checkAvailability()</code> to confirm there are no overlapping schedules or active laundry holds. For reservation bookings, it calls <code>computeReservationPricing()</code>, uploads the GCash screenshot via ImageKit, and creates a database record in <code>pending</code> status.</p>

        <div class="api-field-title">WHEN & WHERE</div>
        <p>Executed when the customer clicks "Confirm Booking" on <code>GownDetails.jsx</code>. Triggered interactively inside <code>PaymentModal.jsx</code> once GCash transaction refs are finalized.</p>

        <div class="api-field-title">WHY</div>
        <p>Protects boutique inventory. Double bookings would break shop trust, so it checks availability under db write locks before committing records.</p>
      </div>
    </div>

    <!-- API 2 -->
    <div class="api-card">
      <div class="api-header">
        <span class="api-route">POST /api/bookings/validate-window</span>
        <span class="api-method-badge post">POST</span>
      </div>
      <div class="api-body">
        <p><strong>WHAT:</strong> Interactively validates if a selected date and time window is open, returning conflict states and laundry hold details.</p>
        
        <div class="api-field-title">Parameters (Request Body)</div>
        <p>Includes <code>gownId</code>, <code>pickupDate</code>, <code>pickupTime</code>, <code>returnDate</code>, <code>returnTime</code>, and <code>bookingType</code>.</p>

        <div class="api-field-title">HOW (Implementation Flow)</div>
        <p>Queries the target Gown's owner and checks shop profile operating hours. Computes the requested dates. Queries all bookings for conflicts, checking both exact time-slot clashes and multi-day range blocks (including the gown's specific <code>laundryDays</code>). Returns <code>{ success: true, available: true }</code> or detailed conflicts.</p>

        <div class="api-field-title">WHEN & WHERE</div>
        <p>Called by <code>GownDetails.jsx</code>'s calendar widget. Triggers whenever the user selects or changes booking parameters.</p>

        <div class="api-field-title">WHY</div>
        <p>Provides dynamic feedback. Renter is warned instantly if a gown is unavailable, avoiding wasted checkout flows.</p>
      </div>
    </div>
  </div>

  <!-- SECTION C -->
  <div class="section page-break" id="section-c">
    <h1 class="section-title">C. Technologies, Frameworks & Libraries</h1>
    <p>Astrella balances client-side automation and server security using specific third-party integrations.</p>

    <h2 class="sub-section-title">Core Technologies</h2>
    <ul>
      <li><strong>React (v19) & React Router:</strong> Used to build the Single Page Application (SPA). Single-page routing allows seamless page updates without page reloads, providing a desktop-app feel.</li>
      <li><strong>Node.js & Express:</strong> The REST API framework. Handles routes, JWT validation, image buffers from Multer, and email dispatchers.</li>
      <li><strong>MongoDB & Mongoose:</strong> The NoSQL database. MongoDB's document architecture allows storing rich nested profiles (e.g. shop operating schedules and coordinates).</li>
      <li><strong>MediaPipe Tasks-Vision (Google):</strong> WebAssembly pose model. Runs body landmarks calculations on the client's device to protect privacy and reduce server computing load.</li>
      <li><strong>face-api.js:</strong> Detects facial features, nose anchors, and forehead coords to run skin-tone extraction and face shape classification.</li>
      <li><strong>ImageKit SDK:</strong> Automates image upload and transforms raw uploads into resized, auto-formatted, optimized WebP URLs.</li>
    </ul>

    <div class="analogy-box">
      <div class="analogy-title">WebAssembly & CDN Analogy</div>
      <p>Downloading the Google MediaPipe WebAssembly model is like downloading an interactive tool (a ruler and a shape analyzer) onto the user's browser:
      <ul>
        <li>Instead of sending a heavy, raw video file to the server and waiting for a computer to scan it, the browser downloads the tool once.</li>
        <li>It analyzes the body coordinates locally in milliseconds, returning clean measurements (e.g., hip-to-shoulder ratio) directly to our system.</li>
      </ul>
      </p>
    </div>
  </div>

  <!-- SECTION D -->
  <div class="section page-break" id="section-d">
    <h1 class="section-title">D. Database Logic & Data Management</h1>
    <p>Astrella utilizes MongoDB schemas. Relationships are modeled using ObjectId referencing, avoiding heavy SQL joins while maintaining structure.</p>

    <h2 class="sub-section-title">Entity Relationship Diagram (ERD)</h2>
    <div class="diagram-container">
      <svg width="600" height="260" viewBox="0 0 600 260" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="260" rx="12" fill="#0d1a40" />
        
        <!-- User Table -->
        <rect x="20" y="30" width="160" height="200" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="2" />
        <text x="100" y="55" text-anchor="middle" fill="#3b82f6" font-family="'Outfit'" font-weight="bold" font-size="14">USER SCHEMA</text>
        <text x="35" y="90" fill="#e2e8f0" font-family="sans-serif" font-size="11">_id : ObjectId</text>
        <text x="35" y="110" fill="#e2e8f0" font-family="sans-serif" font-size="11">email : String (unique)</text>
        <text x="35" y="130" fill="#e2e8f0" font-family="sans-serif" font-size="11">role : "user" | "owner"</text>
        <text x="35" y="150" fill="#e2e8f0" font-family="sans-serif" font-size="11">contactNumber : String</text>
        <text x="35" y="170" fill="#e2e8f0" font-family="sans-serif" font-size="11">shopProfile : Object</text>

        <!-- Gown Table -->
        <rect x="420" y="30" width="160" height="200" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="2" />
        <text x="500" y="55" text-anchor="middle" fill="#10b981" font-family="'Outfit'" font-weight="bold" font-size="14">GOWN SCHEMA</text>
        <text x="435" y="90" fill="#e2e8f0" font-family="sans-serif" font-size="11">_id : ObjectId</text>
        <text x="435" y="110" fill="#e2e8f0" font-family="sans-serif" font-size="11">owner : Ref (User)</text>
        <text x="435" y="130" fill="#e2e8f0" font-family="sans-serif" font-size="11">price : Number</text>
        <text x="435" y="150" fill="#e2e8f0" font-family="sans-serif" font-size="11">laundryDays : Number</text>
        <text x="435" y="170" fill="#e2e8f0" font-family="sans-serif" font-size="11">silhouette : String</text>

        <!-- Booking Table -->
        <rect x="210" y="60" width="180" height="150" rx="8" fill="#1e293b" stroke="#ddaf29" stroke-width="2" />
        <text x="300" y="85" text-anchor="middle" fill="#ddaf29" font-family="'Outfit'" font-weight="bold" font-size="14">BOOKING SCHEMA</text>
        <text x="225" y="115" fill="#e2e8f0" font-family="sans-serif" font-size="11">gown : Ref (Gown)</text>
        <text x="225" y="135" fill="#e2e8f0" font-family="sans-serif" font-size="11">user : Ref (User)</text>
        <text x="225" y="155" fill="#e2e8f0" font-family="sans-serif" font-size="11">pickupDate : Date</text>
        <text x="225" y="175" fill="#e2e8f0" font-family="sans-serif" font-size="11">status : String</text>

        <!-- Connectors -->
        <path d="M 180 110 L 210 110" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4" />
        <path d="M 390 135 L 420 135" stroke="#10b981" stroke-width="1.5" stroke-dasharray="4" />
      </svg>
    </div>

    <h2 class="sub-section-title">Primary Models</h2>
    <p>
      1. <strong>User Model:</strong> Contains nested <code>shopProfile</code> objects. If the user registration contains <code>role = "owner"</code>, business registration attachments (DTI certificates, permits) are stored inside the database, alongside shop name, address, and operating hours.<br>
      2. <strong>Gown Model:</strong> Focuses on characteristics like event style (prom, themed, wedding, formal), fabric weight, color hue, silhouette tag, status override switches, and popularity stats.<br>
      3. <strong>Booking Model:</strong> Manages rental schedules, physical pickup/return confirmations, balance allocations, and measurement values (bust, hip, unit of measurement).
    </p>

    <h2 class="sub-section-title">Booking Lifecycle States</h2>
    <p>Bookings progress through the following statuses:
      <ul>
        <li><code>trial</code>: 24-hour temporary hold for try-ons. Expired holds are marked as <code>expired</code>.</li>
        <li><code>pending</code>: Initial state for reservations, waiting for owner verification.</li>
        <li><code>confirmed</code>: Owner has approved the payment details and the booking is locked.</li>
        <li><code>completed</code>: Renter has returned the apparel to the boutique.</li>
        <li><code>canceled</code>: Canceled by renter/owner, freeing up the inventory slot.</li>
      </ul>
    </p>
  </div>

  <!-- SECTION E -->
  <div class="section page-break" id="section-e">
    <h1 class="section-title">E. Core Logic & Methods Breakdown</h1>
    <p>Astrella's inventory scheduling runs on three core backend logical methods inside <code>bookingController.js</code>.</p>

    <h2 class="sub-section-title">1. checkAvailability()</h2>
    <p>Determines if a gown is open for a booking window. It handles overlaps using date arithmetic and respects laundry days.</p>
    <pre><code>export const checkAvailability = async (gown, pickupDate, returnDate, options = {}) => {
    const start = pickupDate instanceof Date ? pickupDate : new Date(pickupDate);
    const end = returnDate instanceof Date ? returnDate : new Date(returnDate);
    const isTrial = options.isTrial || false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const Bookings = await Booking.find({
        gown,
        status: { $ne: "canceled" },
        returnDate: { $gte: today },
        $or: [
            { status: { $ne: 'trial' } },
            { status: 'trial', trialExpiresAt: { $gt: now } },
            { status: 'trial', trialExpiresAt: { $exists: false } },
        ]
    });

    const gownData = options.gownData || await Gown.findById(gown).select('laundryDays statusOverride');
    if (gownData?.statusOverride && gownData.statusOverride !== 'Available') {
      return false; // Manual blocks take priority
    }

    const laundryBuffer = Number(gownData?.laundryDays || 0);

    for (const existingBooking of Bookings) {
        const isExistingTrial = existingBooking.status === 'trial' || existingBooking.bookingType === 'trial';
        const existingStart = new Date(existingBooking.pickupDate);
        const existingEnd = new Date(existingBooking.returnDate);

        // 1. Time-slot overlap check
        if (doTimeSlotsOverlap(start, end, existingStart, existingEnd)) return false;

        // 2. Multi-day range overlap check
        if (!isTrial || !isExistingTrial) {
            const reqLaundry = isTrial ? 0 : laundryBuffer;
            const reqStartStr = toLocalDateString(start);
            const reqEndWithLaundry = new Date(end);
            reqEndWithLaundry.setDate(reqEndWithLaundry.getDate() + reqLaundry);
            const reqEndStr = toLocalDateString(reqEndWithLaundry);

            const existingLaundry = isExistingTrial ? 0 : laundryBuffer;
            const bStartStr = toLocalDateString(existingStart);
            const bEndWithLaundry = new Date(existingEnd);
            bEndWithLaundry.setDate(bEndWithLaundry.getDate() + existingLaundry);
            const bEndStr = toLocalDateString(bEndWithLaundry);

            if (reqStartStr <= bEndStr && reqEndStr >= bStartStr) return false;
        }
    }
    return true;
};</code></pre>

    <h2 class="sub-section-title">2. Reschedule & Extension Rules inside updateBooking()</h2>
    <p>Rescheduling is only allowed for <code>pending</code> or <code>trial</code> bookings. Rescheduling triggers a fresh conflict check. Extensions follow strict rules depending on duration:</p>
    <ul>
      <li><strong>Same-day extension:</strong> Return time cannot be earlier than the original return time. The extension is capped at a maximum of 1 hour.</li>
      <li><strong>Next-day extension:</strong> Return time can be earlier on the new return day, but it cannot exceed 1 hour past the original pickup time to prevent unreturned items blocking new pickups.</li>
    </ul>
    <pre><code>// Same-day check
if (originalReturnDay === newReturnDay) {
  if (newReturnMinutes < originalReturnMinutes) {
    return res.status(400).json({ success: false, message: 'Return time cannot be earlier than original return time.' });
  }
  const extensionMinutes = newReturnMinutes - originalReturnMinutes;
  if (extensionMinutes > 60) {
    return res.status(400).json({ success: false, message: 'Maximum 1 hour extension allowed for same-day bookings.' });
  }
}
// Next-day check
else if (newReturnDate > originalReturnDate) {
  const timeDiffMinutes = newReturnMinutes - originalPickupMinutes;
  if (timeDiffMinutes > 60) {
    return res.status(400).json({ success: false, message: 'Return time cannot be more than 1 hour later than the pickup time.' });
  }
}</code></pre>
  </div>

  <!-- SECTION F -->
  <div class="section page-break" id="section-f">
    <h1 class="section-title">F. Third-Party Integrations</h1>
    <p>Astrella integrates with external services to handle media assets and customer transactional messages.</p>

    <h2 class="sub-section-title">1. ImageKit Integration</h2>
    <p>Handles images for gown details and GCash screenshots. Since Mongoose limits document payload size, storing raw binary image data (base64) inside MongoDB would slow down database queries. Instead, Astrella uploads files to ImageKit and stores the returned URLs in the database.</p>
    <pre><code>import ImageKit from "imagekit";

const imageKit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});</code></pre>

    <h2 class="sub-section-title">2. Nodemailer Integration</h2>
    <p>Generates SMTP email notifications. Confirmed bookings trigger transactional receipt dispatches, which include pickup details, return slots, contact details, and shop maps.</p>
  </div>

  <!-- SECTION G -->
  <div class="section page-break" id="section-g">
    <h1 class="section-title">G. AI & Recommendation Features</h1>
    <p>Astrella implements a hybrid AI recommendation engine that combines Collaborative Filtering and Content-Based Filtering.</p>

    <div class="diagram-container">
      <svg width="600" height="280" viewBox="0 0 600 280" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="280" rx="12" fill="#0d1a40" />
        
        <!-- Input Layer -->
        <rect x="20" y="80" width="130" height="120" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="2" />
        <text x="85" y="105" text-anchor="middle" fill="#3b82f6" font-family="'Outfit'" font-weight="bold" font-size="11">USER PREFERENCES</text>
        <text x="35" y="130" fill="#e2e8f0" font-family="sans-serif" font-size="9">&bull; Body Type</text>
        <text x="35" y="150" fill="#e2e8f0" font-family="sans-serif" font-size="9">&bull; Skin Tone</text>
        <text x="35" y="170" fill="#e2e8f0" font-family="sans-serif" font-size="9">&bull; Event / Sex</text>

        <!-- CB Pipeline -->
        <rect x="200" y="40" width="180" height="80" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
        <text x="290" y="65" text-anchor="middle" fill="#10b981" font-family="'Outfit'" font-weight="bold" font-size="12">CONTENT-BASED RULES</text>
        <text x="215" y="90" fill="#94a3b8" font-family="sans-serif" font-size="9">Evaluates color, fabric, and silhouette</text>
        <text x="215" y="105" fill="#94a3b8" font-family="sans-serif" font-size="9">compatibility logic (max 100 pts)</text>

        <!-- CF Pipeline -->
        <rect x="200" y="160" width="180" height="80" rx="8" fill="#1e293b" stroke="#ddaf29" stroke-width="1.5" />
        <text x="290" y="185" text-anchor="middle" fill="#ddaf29" font-family="'Outfit'" font-weight="bold" font-size="12">COLLABORATIVE MODEL</text>
        <text x="215" y="210" fill="#94a3b8" font-family="sans-serif" font-size="9">Cosine User/Item Matrices</text>
        <text x="215" y="225" fill="#94a3b8" font-family="sans-serif" font-size="9">using completed booking history</text>

        <!-- Scoring Hybrid -->
        <rect x="440" y="100" width="140" height="80" rx="8" fill="#1e293b" stroke="#ef4444" stroke-width="2" />
        <text x="510" y="125" text-anchor="middle" fill="#ef4444" font-family="'Outfit'" font-weight="bold" font-size="12">HYBRID WEIGHTS</text>
        <text x="455" y="150" fill="#e2e8f0" font-family="sans-serif" font-size="9">If history: 50% CF, 40% CB</text>
        <text x="455" y="165" fill="#e2e8f0" font-family="sans-serif" font-size="9">New User: 80% CB, 20% Pop</text>

        <!-- Connectors -->
        <path d="M 150 120 L 190 80" stroke="#3b82f6" stroke-dasharray="3" />
        <path d="M 150 160 L 190 200" stroke="#3b82f6" stroke-dasharray="3" />
        <path d="M 380 80 L 430 120" stroke="#10b981" />
        <path d="M 380 200 L 430 160" stroke="#ddaf29" />
      </svg>
    </div>

    <h2 class="sub-section-title">1. Content-Based Matching Model</h2>
    <p>Uses hardcoded styling rules matching physical parameters (body type, skin warmth, height, facial shape) with gown attributes. Scoring is based on the following breakdown:</p>
    <ul>
      <li><strong>Event Type Match (30 points):</strong> Highest priority. Gowns must match the user's selected event (e.g. Wedding, Prom, Traditional).</li>
      <li><strong>Body Type Recommendations (25 points):</strong> Checks color families and fabric structures against recommendations (e.g. Hourglass matches Mermaid silhouettes, Pear matches A-line).</li>
      <li><strong>Skin Tone Warmth (20 points):</strong> Matches skin warmth (Cool, Warm, Neutral) with color warmths. Neutrals get a safety boost (15-20 points).</li>
      <li><strong>Height Fit (15 points):</strong> Small height scores light fabrics (chiffon/lace) higher; Tall height scores structured/heavy fabrics higher.</li>
      <li><strong>Face Shape &amp; Neckline (10 points):</strong> Extracts keyword matches (e.g. round face matches V-neck or sweetheart necklines) from descriptions.</li>
    </ul>

    <h2 class="sub-section-title">2. Collaborative Filtering Model</h2>
    <p>Builds a <strong>User-Item Matrix</strong> mapping completed bookings to scores: <code>completed = 5</code>, <code>confirmed = 3</code>. It calculates gown similarity and user similarity using Cosine Similarity, which groups users with matching rental behaviors.</p>

    <h2 class="sub-section-title">3. Image Analysis Body Profiler Pipeline</h2>
    <div class="diagram-container">
      <svg width="600" height="240" viewBox="0 0 600 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="240" rx="12" fill="#0d1a40" />
        
        <!-- User upload -->
        <rect x="20" y="70" width="100" height="100" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5" />
        <text x="70" y="115" text-anchor="middle" fill="#e2e8f0" font-family="'Outfit'" font-size="11">Renter Photo</text>
        
        <!-- face-api -->
        <rect x="160" y="40" width="180" height="70" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
        <text x="250" y="65" text-anchor="middle" fill="#10b981" font-family="'Outfit'" font-weight="bold" font-size="12">FACE-API WORKER</text>
        <text x="175" y="90" fill="#94a3b8" font-family="sans-serif" font-size="10">Detects landmarks, face ratio, skin tone</text>
        
        <!-- mediapipe -->
        <rect x="160" y="130" width="180" height="70" rx="8" fill="#1e293b" stroke="#ddaf29" stroke-width="1.5" />
        <text x="250" y="155" text-anchor="middle" fill="#ddaf29" font-family="'Outfit'" font-weight="bold" font-size="12">MEDIAPIPE POSE</text>
        <text x="175" y="180" fill="#94a3b8" font-family="sans-serif" font-size="10">Torso skeleton &amp; waist scanner</text>

        <!-- Final profiles -->
        <rect x="380" y="70" width="200" height="100" rx="8" fill="#1e293b" stroke="#ef4444" stroke-width="2" />
        <text x="480" y="95" text-anchor="middle" fill="#ef4444" font-family="'Outfit'" font-weight="bold" font-size="14">AI STYLE PROFILE</text>
        <text x="395" y="125" fill="#e2e8f0" font-family="sans-serif" font-size="10">Determines Face Shape (Heart/Oval/...)</text>
        <text x="395" y="145" fill="#e2e8f0" font-family="sans-serif" font-size="10">Determines Body Type (Hourglass/...)</text>

        <!-- Connectors -->
        <path d="M 120 120 L 150 75" stroke="#3b82f6" />
        <path d="M 120 120 L 150 165" stroke="#3b82f6" />
        <path d="M 340 75 L 370 120" stroke="#10b981" />
        <path d="M 340 165 L 370 120" stroke="#ddaf29" />
      </svg>
    </div>

    <p>Astrella's frontend <code>ImageAnalysis.jsx</code> leverages client-side models to scan body contours from user photos:
      <ol>
        <li><strong>MediaPipe Pose Detection:</strong> Locates shoulder joints (11/12) and hip joints (23/24).</li>
        <li><strong>Anatomical Correction:</strong> Since skeleton landmarks sit inside joint bones and underestimate skin contours, a correction factor is applied to hip measurements (<code>hipWidth * 1.30</code>).</li>
        <li><strong>Waist Scanning algorithm:</strong> Identifies the torso center-line. It scans outward horizontally at multiple row levels (between 30% and 55% of torso height) using Euclidean color distance to locate body-to-background transitions (looking for 4 consecutive pixels of difference). It returns the narrowest width.</li>
        <li><strong>Classification:</strong> Calculates ratios to determine body shape (Hourglass, Inverted Triangle, Pear, Trapezoid, Oval, Diamond, or Rectangle).</li>
      </ol>
    </p>
  </div>

  <!-- SECTION H -->
  <div class="section page-break" id="section-h">
    <h1 class="section-title">H. User Workflows &amp; Interactions</h1>
    <p>Astrella coordinates components and database states to handle booking and profiling flows.</p>

    <h2 class="sub-section-title">1. Gown Rental Booking Flow</h2>
    <div class="diagram-container">
      <svg width="600" height="240" viewBox="0 0 600 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="240" rx="12" fill="#0d1a40" />
        
        <!-- Step 1 -->
        <rect x="20" y="80" width="90" height="80" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5" />
        <text x="65" y="110" text-anchor="middle" fill="#3b82f6" font-family="'Outfit'" font-weight="bold" font-size="11">STEP 1</text>
        <text x="65" y="130" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="9">Select Dates</text>
        <text x="65" y="145" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="8">Runs window API</text>

        <!-- Arrow 1 -->
        <path d="M 110 120 L 130 120" stroke="#ddaf29" stroke-width="2" />
        <polygon points="130,123 136,120 130,117" fill="#ddaf29" />

        <!-- Step 2 -->
        <rect x="140" y="80" width="90" height="80" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5" />
        <text x="185" y="110" text-anchor="middle" fill="#3b82f6" font-family="'Outfit'" font-weight="bold" font-size="11">STEP 2</text>
        <text x="185" y="130" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="9">GCash Deposit</text>
        <text x="185" y="145" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="8">Upload proof (IK)</text>

        <!-- Arrow 2 -->
        <path d="M 230 120 L 250 120" stroke="#ddaf29" stroke-width="2" />
        <polygon points="250,123 256,120 250,117" fill="#ddaf29" />

        <!-- Step 3 -->
        <rect x="260" y="80" width="90" height="80" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5" />
        <text x="305" y="110" text-anchor="middle" fill="#3b82f6" font-family="'Outfit'" font-weight="bold" font-size="11">STEP 3</text>
        <text x="305" y="130" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="9">Owner approves</text>
        <text x="305" y="145" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="8">Locks schedule</text>

        <!-- Arrow 3 -->
        <path d="M 350 120 L 370 120" stroke="#ddaf29" stroke-width="2" />
        <polygon points="370,123 376,120 370,117" fill="#ddaf29" />

        <!-- Step 4 -->
        <rect x="380" y="80" width="90" height="80" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5" />
        <text x="425" y="110" text-anchor="middle" fill="#3b82f6" font-family="'Outfit'" font-weight="bold" font-size="11">STEP 4</text>
        <text x="425" y="130" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="9">Pickup / Use</text>
        <text x="425" y="145" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="8">Status: In-Use</text>

        <!-- Arrow 4 -->
        <path d="M 470 120 L 490 120" stroke="#ddaf29" stroke-width="2" />
        <polygon points="490,123 496,120 490,117" fill="#ddaf29" />

        <!-- Step 5 -->
        <rect x="500" y="80" width="80" height="80" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="2" />
        <text x="540" y="110" text-anchor="middle" fill="#10b981" font-family="'Outfit'" font-weight="bold" font-size="11">STEP 5</text>
        <text x="540" y="130" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="9">Laundry Hold</text>
        <text x="540" y="145" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="8">Auto blocked</text>
      </svg>
    </div>

    <ul>
      <li><strong>Happy Path:</strong> User selects a gown, reviews availability calendar, picks dates, uploads GCash payment proof, and hits checkout. Owner reviews payment, confirms receipt, and prepares the gown. Renter picks up gown (status: <code>In-Use</code>) and returns it on date (status: <code>completed</code>). Gown is automatically put on a laundry hold (status: <code>In-Laundry</code>) for a set number of days before returning to <code>Available</code> status.</li>
      <li><strong>Error Recoveries:</strong> If payment is rejected, the booking status is changed to <code>canceled</code> and the calendar slot is instantly released. If a trial booking expires after 24 hours, the scheduler changes status to <code>expired</code>, making the gown available again.</li>
    </ul>

    <h2 class="sub-section-title">2. AI Style Profiling Flow</h2>
    <ul>
      <li>User uploads a full-body photo.</li>
      <li>The client-side scripts run landmark detection on the browser.</li>
      <li>The system identifies skin, face, and torso ratios (e.g. <code>Pear</code> shape and <code>Warm</code> skin tone).</li>
      <li>These measurements are stored in the user session. The system calls <code>/api/ml/recommendations</code>, returning gowns matching the calculated features.</li>
    </ul>
  </div>

  <!-- SECTION I TO L -->
  <div class="section page-break" id="section-i-l">
    <h1 class="section-title">I-L. Front-End, Back-End &amp; Security Measures</h1>
    
    <h2 class="sub-section-title">Frontend Design System</h2>
    <p>Astrella's UI is designed with layouts matching a premium dark theme. Dynamic transitions are built using tailwind utility animations, providing smooth visual updates as pages load.</p>

    <h2 class="sub-section-title">Security &amp; Input Validation</h2>
    <p>To secure operations and protect database integrity, the application implements double-sided checks:
      <ul>
        <li><strong>Password Hashing:</strong> Passwords are hashed using <code>bcrypt</code> (10 salt rounds) before database storage.</li>
        <li><strong>Token Authentication:</strong> Protected endpoints require a valid header token structure: <code>Authorization: Bearer &lt;JWT&gt;</code>.</li>
        <li><strong>Role-Based Access:</strong> Sensitive routes (like inventory modifications) are protected using the <code>verifyOwner</code> middleware.</li>
        <li><strong>Phone Number Validation:</strong> Contact fields are validated against strict 11-digit Philippine mobile formats (<code>/^\d{11}$/</code>) using Mongoose built-in validators.</li>
      </ul>
    </p>

    <h2 class="sub-section-title">Testing &amp; Debugging Checklist</h2>
    <table>
      <thead>
        <tr>
          <th>Flow Component</th>
          <th>Checklist Item</th>
          <th>Expected Outcome</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Calendars</strong></td>
          <td>Attempt double-booking a gown.</td>
          <td>The API rejects the request, returning an overlap warning.</td>
        </tr>
        <tr>
          <td><strong>Laundry hold</strong></td>
          <td>Attempt booking a gown during its laundry buffer.</td>
          <td>The schedule blocks the days, showing the gown is in laundry maintenance.</td>
        </tr>
        <tr>
          <td><strong>GCash Uploads</strong></td>
          <td>Submit a booking with a large image file.</td>
          <td>ImageKit optimizes the size and returns an optimized WebP URL.</td>
        </tr>
        <tr>
          <td><strong>Extensions</strong></td>
          <td>Attempt same-day extension over 1 hour.</td>
          <td>The update fails, warning of the 1-hour limit.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION M-N -->
  <div class="section page-break" id="section-m-n">
    <h1 class="section-title">M-N. Complete System Walkthrough Scenario</h1>
    <p>Let's walk through an end-to-end user scenario: <strong>Renting a wedding gown for a wedding on March 15.</strong></p>

    <h2 class="sub-section-title">Full Process Walkthrough</h2>
    <table>
      <thead>
        <tr>
          <th>Step</th>
          <th>User Action</th>
          <th>Frontend Controller</th>
          <th>Backend Router &amp; API Action</th>
          <th>Database &amp; Storage Change</th>
          <th>Next Visual Screen</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1</strong></td>
          <td>Visits recommendations page, uploads full-body photo.</td>
          <td>Triggers face-api and MediaPipe pose models to scan photo.</td>
          <td>Sends calculated profile tags as query params to backend recommendations API.</td>
          <td>Saves user profile measurements in browser local state.</td>
          <td>Shows Gowns grid matching physical attributes.</td>
        </tr>
        <tr>
          <td><strong>2</strong></td>
          <td>Selects gown, picks pickup date (Mar 15) and return date (Mar 17).</td>
          <td>Validates hours. Calls backend window API on input changes.</td>
          <td>Checks <code>validateBookingWindow()</code>. Checks for conflicts and laundry holds.</td>
          <td>None. Reads from Booking and Gown db collections.</td>
          <td>Interactive calendar highlights selected dates. Shows pricing breakdown.</td>
        </tr>
        <tr>
          <td><strong>3</strong></td>
          <td>Confirms selection. Enters GCash reference, uploads receipt screenshot.</td>
          <td>Submits checkout form payload to backend bookings API.</td>
          <td>ImageKit parses image buffer. backend creates booking record in <code>pending</code> status.</td>
          <td>ImageKit saves receipt. MongoDB inserts a new Booking document.</td>
          <td>Redirects user to "My Bookings" page. Shows pending approval badge.</td>
        </tr>
        <tr>
          <td><strong>4</strong></td>
          <td>Boutique owner reviews pending request, clicks Approve.</td>
          <td>Owner dashboard triggers update API for booking status.</td>
          <td>Verifies payment and updates status to <code>confirmed</code>. Calls nodemailer trigger.</td>
          <td>MongoDB updates Booking document status. Nodemailer dispatches mail confirmation.</td>
          <td>Owner dashboard shows booking is confirmed. User receives receipt email.</td>
        </tr>
        <tr>
          <td><strong>5</strong></td>
          <td>Customer returns gown after the wedding.</td>
          <td>Owner clicks "Confirm Return" in bookings manager.</td>
          <td>Updates status to <code>completed</code>. Gown enters laundry status.</td>
          <td>Sets booking status to <code>completed</code>. Gown enters dynamic <code>In-Laundry</code> state.</td>
          <td>Gown is shown as "In-Laundry" in inventory searches until the hold period ends.</td>
        </tr>
      </tbody>
    </table>
  </div>

</body>
</html>
`;

fs.writeFileSync(htmlPath, htmlContent);
console.log("✔ Created Astrella_System_Notes.html");

const edgePath = "C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe";

// Execute MS Edge headless to convert HTML to PDF
const command = `"${edgePath}" --headless --disable-gpu --print-to-pdf-no-header --print-to-pdf="${pdfPath}" "${htmlPath}"`;

console.log("⏳ Rendering PDF via Microsoft Edge...");
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error("❌ PDF compilation failed:", error);
    console.error("Stderr:", stderr);
    process.exit(1);
  }
  
  // Clean up temporary HTML
  try {
    fs.unlinkSync(htmlPath);
    console.log("✔ Cleaned up temporary HTML");
  } catch (err) {
    console.warn("⚠ Warning: Failed to delete temporary HTML file", err.message);
  }
  
  console.log("✔ PDF Generated successfully at: " + pdfPath);
});
