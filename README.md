# hello_didi

A beginner-friendly full-stack text and file processing website with a soft, warm-yellow pastel UI.

## Features

- Clean up extra whitespace and blank lines
- Make a short extractive summary (rule-based; not an AI-generated summary)
- Extract frequent keywords
- Count words, characters, sentences, paragraphs, and estimated reading time
- Convert text to uppercase, lowercase, or title case
- Upload TXT, MD, CSV, JSON, text-based PDF, and DOCX files
- Copy results or download them as `.txt`
- Files are held in server memory for processing; the app does not save uploads to disk or a database

## Requirements

Install **Node.js 20 or newer** (the LTS version is recommended) and VS Code.

## Run on Windows

1. Extract the `hello_didi.zip` folder.
2. Open VS Code → **File → Open Folder** → choose `hello_didi`.
3. In VS Code, open **Terminal → New Terminal**.
4. Check Node/npm:
   ```powershell
   node -v
   npm -v
   ```
   If either command is not found, install Node.js LTS from https://nodejs.org and restart VS Code.
5. Install dependencies:
   ```powershell
   npm install
   ```
6. Optional local configuration: copy `.env.example` to `.env` and edit it if needed. This starter app does not load `.env` automatically; environment variables in the Windows terminal can be set for the current session as shown below. The default port is 3000 and max file size is 10 MB.
7. Start:
   ```powershell
   npm start
   ```
8. Open http://localhost:3000 in your browser. Keep the terminal open while using the site. Stop the server with `Ctrl+C`.

### Optional environment variables in PowerShell

For the current terminal session:
```powershell
$env:PORT="3000"
$env:MAX_FILE_MB="10"
npm start
```

To make a `.env` file work locally, install dotenv (`npm install dotenv`), add `require("dotenv").config();` as the very first line of `server.js`, then create `.env` from `.env.example`. This is optional; do not commit `.env` to Git.

## Text and file operations

- **Clean up spacing:** trims line edges, normalizes line breaks, and reduces excess blank lines.
- **Short summary:** selects a few important sentences using word frequency. It is a simple heuristic, not an LLM.
- **Keywords:** lists up to 10 frequently occurring words, with common stop words excluded.
- **Word count:** returns JSON stats as the result; summary chips also show counts for every operation.
- **File formats:** PDF extraction requires selectable text. Scanned PDFs need OCR, which is not included.

## Deploy free on Render

This project includes `render.yaml` as a starting point. Free-plan terms and availability can change, and free services may sleep after inactivity. Do not expect a custom domain or persistent storage by default.

1. Create a GitHub account if you don't have one, then create a **new empty repository** named `hello_didi`.
2. In VS Code, open the extracted project folder. Initialize Git and push it:
   ```powershell
   git init
   git add .
   git commit -m "Build hello_didi"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/hello_didi.git
   git push -u origin main
   ```
   Replace `YOUR-USERNAME` with your GitHub username. If Git asks you to authenticate, complete the browser sign-in flow.
3. Sign in to https://render.com and choose **New → Web Service**.
4. Connect GitHub and select the `hello_didi` repository.
5. Configure:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Plan:** Free, if offered for your account/region
6. In Render's environment settings add:
   - `NODE_ENV` = `production`
   - `MAX_FILE_MB` = `10`
   - Do not set `PORT` manually; Render supplies it.
7. Deploy. Wait for the build and health check to finish. Then open the `onrender.com` URL Render displays and test a text operation and a file upload. Only call it live after those tests pass.

### Deploy using the included Blueprint (optional)

In Render, use **New → Blueprint** and connect the repository. Render reads `render.yaml`; review the proposed service settings before applying them. If the free plan is unavailable, choose another plan or use the manual Web Service steps above.

## Before making it public

This is a starter app, not a secure document-management platform. For a public deployment:
- Add rate limiting and stricter abuse protection if you expect public traffic.
- Keep upload limits low and review provider limits.
- Do not upload sensitive, confidential, or regulated documents.
- Consider adding authentication if you need private user workspaces.
- The current app has no database, accounts, history, or AI API integration.
- The summary and keyword tools are rule-based, not powered by an AI service.
- Google Fonts are loaded from Google; the rest of the frontend assets are local.

## Troubleshooting

- **`node` or `npm` not recognized:** install Node.js LTS and restart VS Code.
- **Port 3000 already in use:** run `$env:PORT="3001"` then `npm start`, and open http://localhost:3001.
- **Cannot upload:** check file type and size. Default maximum is 10 MB.
- **PDF output is empty:** likely a scanned/image-only PDF; OCR is not included.
- **Deploy fails:** check the Render build logs, ensure the GitHub repository includes `package.json` and `server.js`, and confirm the start command is `npm start`.

## Project structure

```text
hello_didi/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .env.example
├── .gitignore
├── package.json
├── render.yaml
├── server.js
└── README.md
```
