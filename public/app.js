const $ = (selector) => document.querySelector(selector);
const textTab = $("#text-tab");
const fileTab = $("#file-tab");
const textPanel = $("#text-panel");
const filePanel = $("#file-panel");
const input = $("#text-input");
const fileInput = $("#file-input");
const operation = $("#operation");
const processBtn = $("#process-btn");
const resultPanel = $("#result-panel");
const resultContent = $("#result-content");
const errorBox = $("#error-box");
const statsRow = $("#stats-row");
const extractedWrap = $("#extracted-wrap");
const extractedContent = $("#extracted-content");
let mode = "text";
let latestResult = "";

function setMode(next) {
  mode = next;
  textTab.classList.toggle("active", mode === "text");
  fileTab.classList.toggle("active", mode === "file");
  textTab.setAttribute("aria-selected", String(mode === "text"));
  fileTab.setAttribute("aria-selected", String(mode === "file"));
  textPanel.classList.toggle("hidden", mode !== "text");
  filePanel.classList.toggle("hidden", mode !== "file");
  $("#tool-title").textContent = mode === "text" ? "Give your text a little polish" : "Let’s make that file easier";
  $("#tool-subtitle").textContent = mode === "text" ? "Paste your paragraph below and choose what you'd like done." : "Upload a supported file and we’ll extract its text, then process it.";
  hideError();
  resultPanel.classList.add("hidden");
}
textTab.addEventListener("click", () => setMode("text"));
fileTab.addEventListener("click", () => setMode("file"));

input.addEventListener("input", () => {
  $("#input-count").textContent = `${input.value.length.toLocaleString()} characters`;
});
$("#sample-btn").addEventListener("click", () => {
  input.value = "  Good ideas often start as messy notes.\n\nThis little workspace helps you organise your writing, find the main points, and make information easier to use. A clear draft makes the next step feel much simpler.  ";
  input.dispatchEvent(new Event("input"));
  input.focus();
});
fileInput.addEventListener("change", () => showSelectedFile(fileInput.files[0]));
function showSelectedFile(file) {
  const selected = $("#selected-file");
  if (!file) { selected.classList.add("hidden"); selected.textContent = ""; return; }
  selected.textContent = `✓ ${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
  selected.classList.remove("hidden");
}
const dropzone = $("#dropzone");
["dragenter", "dragover"].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add("dragover"); }));
["dragleave", "drop"].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove("dragover"); }));
dropzone.addEventListener("drop", e => {
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  fileInput.files = transfer.files;
  showSelectedFile(file);
});

function hideError() { errorBox.classList.add("hidden"); errorBox.textContent = ""; }
function showError(message) { errorBox.textContent = message; errorBox.classList.remove("hidden"); }
function showStats(stats) {
  const items = [
    ["Words", stats.words], ["Characters", stats.characters],
    ["No spaces", stats.charactersNoSpaces], ["Sentences", stats.sentences],
    ["Paragraphs", stats.paragraphs], ["Read time", `${stats.readingMinutes} min`]
  ];
  statsRow.innerHTML = "";
  items.forEach(([label, value]) => {
    const chip = document.createElement("div");
    chip.className = "stat-chip";
    const strong = document.createElement("strong");
    strong.textContent = Number(value).toLocaleString();
    const caption = document.createElement("span");
    caption.textContent = label;
    chip.append(strong, caption);
    statsRow.append(chip);
  });
}
processBtn.addEventListener("click", async () => {
  hideError();
  const selectedOperation = operation.value;
  let body;
  let url;
  if (mode === "text") {
    if (!input.value.trim()) { showError("Pop a little text into the box first."); return; }
    body = JSON.stringify({ text: input.value, operation: selectedOperation });
    url = "/api/process-text";
  } else {
    if (!fileInput.files[0]) { showError("Choose a file first, lovely."); return; }
    body = new FormData();
    body.append("file", fileInput.files[0]);
    body.append("operation", selectedOperation);
    url = "/api/process-file";
  }
  processBtn.disabled = true;
  processBtn.innerHTML = "<span>✧</span> Working on it…";
  try {
    const response = await fetch(url, { method: "POST", headers: mode === "text" ? { "Content-Type": "application/json" } : undefined, body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Something went a little wrong.");
    latestResult = typeof data.result === "string" ? data.result : JSON.stringify(data.result, null, 2);
    resultContent.textContent = latestResult;
    showStats(data.stats);
    if (data.fileName) {
      extractedWrap.classList.remove("hidden");
      extractedContent.textContent = data.extractedText || "";
    } else extractedWrap.classList.add("hidden");
    resultPanel.classList.remove("hidden");
    resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    showError(error.message || "Could not reach the server. Is it running?");
  } finally {
    processBtn.disabled = false;
    processBtn.innerHTML = "<span>✨</span> Make it happen <span class=\"btn-arrow\">→</span>";
  }
});
$("#copy-btn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(latestResult);
    $("#copy-btn").textContent = "Copied ✓";
    setTimeout(() => { $("#copy-btn").textContent = "Copy result"; }, 1500);
  } catch { showError("Clipboard access was blocked. You can select and copy the result manually."); }
});
$("#download-btn").addEventListener("click", () => {
  const blob = new Blob([latestResult], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "hello-didi-result.txt";
  anchor.click();
  URL.revokeObjectURL(url);
});
fetch("/api/health").then(r => r.ok && r.json()).then(data => {
  if (!data || !data.ok) showError("The backend health check did not pass. Please restart the server.");
}).catch(() => showError("Can't reach the backend yet. Run npm start in your terminal."));
