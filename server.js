const express = require("express");
const multer = require("multer");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { parse: parseCsv } = require("csv-parse/sync");

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_FILE_MB = Math.max(1, Number(process.env.MAX_FILE_MB || 10));
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".txt", ".md", ".csv", ".json", ".pdf", ".docx"];
    if (!allowed.includes(ext)) return cb(new Error("Unsupported file type. Use TXT, MD, CSV, JSON, PDF, or DOCX."));
    cb(null, true);
  }
});

function wordsOf(text) {
  return (text.trim().match(/\b[\p{L}\p{N}'’-]+\b/gu) || []);
}
function stats(text) {
  const words = wordsOf(text);
  return {
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, "").length,
    words: words.length,
    sentences: (text.match(/[.!?]+(?=\s|$)/g) || []).length,
    paragraphs: text.trim() ? text.trim().split(/\n\s*\n/).length : 0,
    readingMinutes: Math.max(1, Math.ceil(words.length / 200))
  };
}
function cleanWhitespace(text) {
  return text.replace(/\r\n?/g, "\n")
    .split("\n")
    .map(line => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function makeSummary(text) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  const clean = sentences.map(s => s.trim()).filter(Boolean);
  if (clean.length <= 3) return clean.join(" ");
  const freq = new Map();
  const stop = new Set(("a an the and or but if then so of to in on at for from with by is are was were be been being it this that these those as into about over after before not no we you they he she i my our your their can could should would will just").split(" "));
  for (const word of wordsOf(text.toLowerCase())) {
    if (word.length > 2 && !stop.has(word)) freq.set(word, (freq.get(word) || 0) + 1);
  }
  const scored = clean.map((sentence, index) => {
    const tokens = wordsOf(sentence.toLowerCase());
    const score = tokens.reduce((sum, token) => sum + (freq.get(token) || 0), 0) / Math.max(tokens.length, 1);
    return { sentence, index, score };
  });
  const take = Math.min(3, Math.max(1, Math.ceil(clean.length * 0.3)));
  return scored.sort((a, b) => b.score - a.score).slice(0, take)
    .sort((a, b) => a.index - b.index).map(item => item.sentence).join(" ");
}
function keywords(text) {
  const stop = new Set(("a an the and or but if then so of to in on at for from with by is are was were be been being it this that these those as into about over after before not no we you they he she i my our your their can could should would will").split(" "));
  const counts = new Map();
  for (const word of wordsOf(text.toLowerCase())) {
    if (word.length >= 3 && !stop.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([word, count]) => ({ word, count }));
}
function runTextOperation(text, operation) {
  switch (operation) {
    case "clean": return cleanWhitespace(text);
    case "uppercase": return text.toLocaleUpperCase();
    case "lowercase": return text.toLocaleLowerCase();
    case "titlecase": return text.toLocaleLowerCase().replace(/(^|[\s.!?])([\p{L}\p{N}])/gu, (_, sep, ch) => sep + ch.toLocaleUpperCase());
    case "summary": return makeSummary(text);
    case "keywords": return keywords(text).map(k => `${k.word} (${k.count})`).join("\n") || "No keywords found.";
    case "stats": return JSON.stringify(stats(text), null, 2);
    default: throw new Error("Choose a valid text operation.");
  }
}
async function extractFileText(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const buffer = file.buffer;
  if ([".txt", ".md"].includes(ext)) return buffer.toString("utf8");
  if (ext === ".json") {
    const raw = buffer.toString("utf8");
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  }
  if (ext === ".csv") {
    const raw = buffer.toString("utf8");
    const rows = parseCsv(raw, { bom: true, skip_empty_lines: true, relax_column_count: true });
    return rows.map(row => row.join("  |  ")).join("\n");
  }
  if (ext === ".pdf") {
    const result = await pdfParse(buffer);
    if (!result.text.trim()) throw new Error("This PDF has no extractable text. Scanned/image-only PDFs need OCR, which this starter app does not include.");
    return result.text;
  }
  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  throw new Error("Unsupported file type.");
}

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "hello_didi" }));

app.post("/api/process-text", (req, res) => {
  try {
    const { text, operation } = req.body || {};
    if (typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "Please enter some text first." });
    if (text.length > 200000) return res.status(413).json({ error: "Text is too long. Please keep it under 200,000 characters." });
    const result = runTextOperation(text, operation || "clean");
    res.json({ result, stats: stats(text), operation: operation || "clean" });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not process this text." });
  }
});

app.post("/api/process-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Choose a file to upload." });
    const extracted = await extractFileText(req.file);
    const operation = req.body.operation || "clean";
    const result = runTextOperation(extracted, operation);
    res.json({
      fileName: req.file.originalname,
      extractedText: extracted,
      result,
      stats: stats(extracted),
      operation,
      note: path.extname(req.file.originalname).toLowerCase() === ".pdf"
        ? "PDF text extraction works for text-based PDFs, not scanned images."
        : undefined
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not process this file." });
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: `File is too large. Maximum size is ${MAX_FILE_MB} MB.` });
  }
  res.status(400).json({ error: err.message || "Something went wrong." });
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`hello_didi is running at http://localhost:${PORT}`));
