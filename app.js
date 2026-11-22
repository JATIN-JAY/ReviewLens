let report = null;
let activeReviewId = null;
let toastTimer;
const $ = (query) => document.querySelector(query);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const topicLabel = (topic) => ({ size_fit: "Size & fit" })[topic] || topic?.replaceAll("_", " ") || "Other";
const toast = (message) => { const item = $("#toast"); item.textContent = message; item.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => item.classList.remove("show"), 2800); };

function filteredReviews() {
  if (!report) return [];
  const query = $("#searchInput").value.trim().toLocaleLowerCase();
  const product = $("#productFilter").value;
  const sentiment = $("#sentimentFilter").value;
  const topic = $("#topicFilter").value;
  return report.reviews.filter((review) => {
    const analysis = review.analysis;
    if (product !== "all" && review.product !== product) return false;
    if (sentiment === "failed" ? !review.analysis_failed : sentiment !== "all" && analysis?.sentiment !== sentiment) return false;
    if (topic !== "all" && !analysis?.topics?.includes(topic)) return false;
    if (query && !`${review.review_id} ${review.product} ${review.review_text} ${analysis?.summary || ""}`.toLocaleLowerCase().includes(query)) return false;
    return true;
  });
}

function renderReport() {
  if (!report) return;
  const summary = report.summary;
  $("#workspace").classList.remove("hidden");
  $("#welcomeState").classList.add("hidden");
  $("#downloadCsv").disabled = false;
  $("#fileLabel").textContent = report.filename;
  $("#importTitle").textContent = report.filename;
  $("#importHint").textContent = `${summary.total} unique reviews analyzed · ${report.duplicates} duplicate${report.duplicates === 1 ? "" : "s"} skipped`;
  $("#runNote").textContent = report.preview ? "Sample preview · illustrative analysis" : `${report.model} · ${report.metrics.processingMs} ms`;
  $("#totalCount").textContent = summary.total;
  $("#replyCount").textContent = summary.needsReply;
  ["positive", "neutral", "negative"].forEach((sentiment) => {
    const count = summary.counts[sentiment] || 0;
    const percent = summary.total ? Math.round(count / summary.total * 100) : 0;
    $(`#${sentiment}Pct`).textContent = `${percent}%`;
    $(`#${sentiment}Count`).textContent = count;
    $(`#${sentiment}Bar`).style.width = `${percent}%`;
  });
  const quality = $("#qualityStrip");
  const parts = [];
  if (report.preview) parts.push("Preview only · not model output");
  if (report.skipped) parts.push(`${report.skipped} empty row${report.skipped === 1 ? "" : "s"} skipped`);
  if (report.duplicates) parts.push(`${report.duplicates} duplicate${report.duplicates === 1 ? "" : "s"} detected and analyzed once`);
  if (summary.ratingAgreement !== null) parts.push(`${summary.ratingAgreement}% rating/sentiment agreement`);
  if (!report.preview) parts.push(`${report.metrics.aiCalls} AI batch call${report.metrics.aiCalls === 1 ? "" : "s"}`, `${report.metrics.cacheHits} cached result${report.metrics.cacheHits === 1 ? "" : "s"}`);
  quality.textContent = parts.join(" · "); quality.hidden = false;
  renderTopics("complaintList", summary.topComplaints, "negative");
  renderTopics("praiseList", summary.topPraises, "positive");
  renderProducts(summary.products);
  const productSelect = $("#productFilter");
  const selectedProduct = productSelect.value;
  productSelect.innerHTML = `<option value="all">All products</option>${summary.products.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join("")}`;
  productSelect.value = summary.products.includes(selectedProduct) ? selectedProduct : "all";
  renderTable();
  $("#clearFilters").hidden = !hasFilters();
  $("#reviewDetail").classList.add("hidden");
  activeReviewId = null;
}

function renderTopics(id, topics, mood) {
  const list = $(`#${id}`);
  if (!topics?.length) { list.innerHTML = `<li class="topic-empty">No ${mood === "negative" ? "complaints" : "praises"} surfaced in this set.</li>`; return; }
  const max = Math.max(...topics.map((item) => item.count), 1);
  list.innerHTML = topics.map((item, index) => `<li><span class="topic-rank">${String(index + 1).padStart(2, "0")}</span><span class="topic-name">${esc(topicLabel(item.topic))}</span><span class="topic-track"><i style="width:${Math.round(item.count / max * 100)}%"></i></span><span class="topic-count">${item.count} mention${item.count === 1 ? "" : "s"}</span></li>`).join("");
}

function renderProducts(products) {
  $("#productCount").textContent = products.length;
  $("#productList").innerHTML = products.map((product) => {
    const rows = report.reviews.filter((review) => review.product === product && review.analysis);
    const count = rows.length || 1;
    const positive = rows.filter((review) => review.analysis.sentiment === "positive").length;
    const neutral = rows.filter((review) => review.analysis.sentiment === "neutral").length;
    const negative = rows.filter((review) => review.analysis.sentiment === "negative").length;
    return `<button class="product-row" data-product="${esc(product)}" aria-label="Filter by ${esc(product)}"><span class="product-name">${esc(product)}</span><span class="product-mini"><i style="width:${positive/count*100}%"></i><i class="neutral" style="width:${neutral/count*100}%"></i><i class="negative" style="width:${negative/count*100}%"></i></span><span class="product-total">${rows.length}</span></button>`;
  }).join("");
  document.querySelectorAll(".product-row").forEach((button) => button.addEventListener("click", () => { $("#productFilter").value = button.dataset.product; renderTable(); $("#clearFilters").hidden = !hasFilters(); document.querySelector(".reviews-section").scrollIntoView({ behavior: "smooth", block: "start" }); }));
}

function renderTable() {
  const rows = filteredReviews();
  $("#reviewRows").innerHTML = rows.map((review) => {
    const analysis = review.analysis;
    const sentiment = analysis?.sentiment || "failed";
    const tags = analysis?.topics?.map((topic) => `<span class="topic-tag">${esc(topicLabel(topic))}</span>`).join("") || "—";
    const rating = review.rating ? `<span class="stars" aria-label="${review.rating} out of 5 stars">${"★".repeat(review.rating)}${"☆".repeat(5-review.rating)}</span>` : `<span class="unknown-rating">Unknown</span>`;
    return `<tr data-id="${esc(review.review_id)}" class="${activeReviewId === review.review_id ? "selected" : ""}"><td class="review-cell"><div class="review-snippet">${esc(review.review_text)}</div><div class="row-id">${esc(review.review_id)}${review.cached ? " · cached" : ""}</div></td><td class="product-cell" title="${esc(review.product)}">${esc(review.product)}</td><td>${rating}</td><td><span class="sentiment-pill ${sentiment}">${analysis ? esc(analysis.sentiment) : "analysis failed"}</span></td><td><div class="topic-tags">${tags}</div></td><td>${analysis?.needs_reply ? `<span class="reply-pill">Reply</span>` : `<span class="no-reply">—</span>`}</td><td><button class="row-open" aria-label="View review">↗</button></td></tr>`;
  }).join("");
  $("#emptyTable").hidden = rows.length > 0;
  $("#resultCount").textContent = `${rows.length} review${rows.length === 1 ? "" : "s"}`;
  $("#tableCaption").textContent = rows.length ? "Select a review to see its analysis and suggested reply." : "Try changing a filter or search term.";
  document.querySelectorAll("#reviewRows tr").forEach((row) => row.addEventListener("click", () => openReview(row.dataset.id)));
}

function hasFilters() { return $("#productFilter").value !== "all" || $("#sentimentFilter").value !== "all" || $("#topicFilter").value !== "all" || Boolean($("#searchInput").value.trim()); }

function openReview(id) {
  const review = report.reviews.find((item) => item.review_id === id);
  if (!review) return;
  activeReviewId = id;
  const analysis = review.analysis;
  const detail = $("#reviewDetail"); detail.classList.remove("hidden");
  if (!analysis) {
    detail.innerHTML = `<div class="detail-main"><p class="eyebrow">ANALYSIS NEEDS A SECOND LOOK</p><h3 class="detail-heading">${esc(review.product)}</h3><p class="detail-meta">${esc(review.review_id)} · ${review.rating ? `${review.rating} star${review.rating===1?"":"s"}` : "Rating unknown"}</p><blockquote class="detail-quote">“${esc(review.review_text)}”</blockquote></div><div class="detail-side"><h4>Could not validate this result</h4><p class="detail-summary">The AI response did not match the required format after one retry. This review is marked failed instead of being guessed.</p></div>`;
  } else {
    detail.innerHTML = `<div class="detail-main"><p class="eyebrow">CUSTOMER REVIEW</p><div class="detail-heading"><h3>${esc(review.product)}</h3><span class="sentiment-pill ${esc(analysis.sentiment)}">${esc(analysis.sentiment)}</span></div><p class="detail-meta">${esc(review.review_id)} · ${review.rating ? `${review.rating} star${review.rating===1?"":"s"}` : "Rating unknown"}${review.date ? ` · ${esc(review.date)}` : ""}</p><blockquote class="detail-quote">“${esc(review.review_text)}”</blockquote><p class="detail-summary">${esc(analysis.summary)}</p></div><div class="detail-side"><h4>What the review is about</h4><div class="detail-topics">${analysis.topics.map((topic) => `<span class="topic-tag">${esc(topicLabel(topic))}</span>`).join("")}</div>${analysis.needs_reply ? `<div class="reply-box"><h4>Suggested reply</h4><p>Generate a draft when you’re ready. It won’t be sent automatically.</p><button class="reply-button" id="makeReply">Draft a reply</button><div id="replyResult"></div></div>` : `<div class="reply-box"><p>No response flag for this review.</p></div>`}</div>`;
    $("#makeReply")?.addEventListener("click", () => generateReply(review, analysis));
  }
  renderTable(); detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function generateReply(review, analysis) {
  const button = $("#makeReply"); const result = $("#replyResult"); button.disabled = true; button.textContent = "Writing a draft…"; result.innerHTML = `<span class="reply-loading">Preparing a reply based on this review…</span>`;
  try {
    const response = await fetch("/api/reply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ review_text: review.review_text, product: review.product, analysis }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not generate a reply.");
    result.innerHTML = `<p class="reply-text">${esc(data.reply)}</p><button class="reply-button" id="copyReply">Copy reply</button>`;
    $("#copyReply").addEventListener("click", async () => { await navigator.clipboard.writeText(data.reply); toast("Reply copied"); });
    button.textContent = "Draft again";
  } catch (error) { result.innerHTML = `<span class="reply-loading">${esc(error.message)}</span>`; button.textContent = "Try again"; }
  finally { button.disabled = false; }
}

async function analyzeFile(file) {
  if (!file) return;
  if (!file.name.toLocaleLowerCase().endsWith(".csv")) return toast("Choose a CSV file to continue.");
  if (file.size > 5 * 1024 * 1024) return toast("CSV files must be smaller than 5 MB.");
  const button = $("#chooseFile"); button.disabled = true; button.textContent = "Analyzing…";
  $("#importTitle").textContent = "Reading and cleaning your reviews";
  $("#importHint").textContent = "Duplicate reviews are removed before analysis. This may take a moment.";
  $("#footerStatus").textContent = "Preparing analysis…";
  const body = new FormData(); body.append("reviews", file);
  try {
    const response = await fetch("/api/analyze", { method: "POST", body }); const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The review analysis did not finish.");
    report = data; renderReport(); toast(`${data.summary.total} unique reviews analyzed`);
    $("#footerStatus").textContent = `Finished in ${data.metrics.processingMs} ms`;
  } catch (error) {
    $("#importTitle").textContent = "We couldn’t analyze that file";
    $("#importHint").textContent = error.message;
    $("#footerStatus").textContent = "Review file or AI configuration and try again";
    toast(error.message);
  } finally { button.disabled = false; button.textContent = "Upload reviews"; $("#fileInput").value = ""; }
}

async function loadSample() {
  try {
    const status = await fetch("/api/status").then((response) => response.json());
    if (!status.ready) return loadSamplePreview();
    const response = await fetch("/reviews.csv"); if (!response.ok) throw new Error("Sample file could not be loaded."); const blob = await response.blob(); const file = new File([blob], "reviews.csv", { type: "text/csv" }); await analyzeFile(file);
  } catch { loadSamplePreview(); }
}

function loadSamplePreview() {
  if (!window.REVIEWLENS_PREVIEW) return toast("Start the ReviewLens server to analyze a CSV.");
  report = structuredClone(window.REVIEWLENS_PREVIEW);
  renderReport();
  $("#footerStatus").textContent = "Sample preview · no AI request was made";
  toast("Loaded the sample dashboard preview");
}

function exportReport() {
  if (!report) return;
  const header = ["review_id","product","rating","date","review_text","sentiment","topics","summary","needs_reply","analysis_failed"];
  const quote = (value) => `"${String(value ?? "").replaceAll('"','""')}"`;
  const records = report.reviews.map((review) => [review.review_id,review.product,review.rating ?? "",review.date,review.review_text,review.analysis?.sentiment || "",review.analysis?.topics.join("|") || "",review.analysis?.summary || "",review.analysis?.needs_reply ?? "",review.analysis_failed]);
  const csv = [header, ...records].map((record) => record.map(quote).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "reviewlens-analysis.csv"; anchor.click(); URL.revokeObjectURL(url);
}

$("#chooseFile").addEventListener("click", () => $("#fileInput").click());
$("#browseFile").addEventListener("click", () => $("#fileInput").click());
$("#fileInput").addEventListener("change", (event) => analyzeFile(event.target.files[0]));
$("#sampleButton").addEventListener("click", loadSample);
$("#welcomeSample").addEventListener("click", loadSample);
$("#downloadCsv").addEventListener("click", exportReport);
["#searchInput", "#productFilter", "#sentimentFilter", "#topicFilter"].forEach((selector) => $(selector).addEventListener("input", () => { renderTable(); $("#clearFilters").hidden = !hasFilters(); }));
$("#clearFilters").addEventListener("click", () => { $("#searchInput").value = ""; $("#productFilter").value = "all"; $("#sentimentFilter").value = "all"; $("#topicFilter").value = "all"; renderTable(); $("#clearFilters").hidden = true; });
const importPanel = $("#importPanel");
for (const eventName of ["dragenter", "dragover"]) importPanel.addEventListener(eventName, (event) => { event.preventDefault(); importPanel.classList.add("dragging"); });
for (const eventName of ["dragleave", "drop"]) importPanel.addEventListener(eventName, (event) => { event.preventDefault(); importPanel.classList.remove("dragging"); });
importPanel.addEventListener("drop", (event) => analyzeFile(event.dataTransfer.files[0]));
fetch("/api/status").then((response) => response.json()).then((status) => {
  $("#footerStatus").textContent = status.ready ? `Gemini ready · ${status.model}` : "Add GEMINI_API_KEY to enable analysis";
  if (!status.ready) $("#connectionLabel").textContent = "AI key needed";
}).catch(() => { $("#footerStatus").textContent = "Start the server to analyze reviews"; });

