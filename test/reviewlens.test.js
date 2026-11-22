import test from "node:test";
import assert from "node:assert/strict";
import { cleanReviews, parseCsv, validateAnalysis, withBackoff } from "../server.js";

test("CSV parser handles commas, escaped quotes, and line breaks inside quoted reviews", () => {
  const rows = parseCsv('review_id,product,rating,date,review_text\nR1,Desk,5,2026-01-01,"Nice, sturdy desk.\nSecond line says ""great""."');
  assert.equal(rows[0].review_text, 'Nice, sturdy desk.\nSecond line says "great".');
});

test("cleaning skips empty text, normalizes missing or invalid ratings, and removes duplicate text", () => {
  const rows = parseCsv([
    "review_id,product,rating,date,review_text",
    'R1,Desk,5,2026-01-01,"Solid wood"',
    'R2,Desk,,2026-01-02,"  solid   wood  "',
    'R3,Desk,five,2026-01-03,"Good finish"',
    'R4,Desk,3,2026-01-04,""',
  ].join("\n"));
  const result = cleanReviews(rows);
  assert.equal(result.reviews.length, 2);
  assert.equal(result.duplicates, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.reviews[0].rating, 5);
  assert.equal(result.reviews[1].rating, null);
});

test("analysis validator accepts only the four required fields and allowed values", () => {
  const valid = { sentiment: "negative", topics: ["quality", "support"], summary: "The item failed quickly and support did not resolve it.", needs_reply: true };
  assert.equal(validateAnalysis(valid), true);
  assert.equal(validateAnalysis({ ...valid, score: 5 }), false);
  assert.equal(validateAnalysis({ ...valid, sentiment: "mixed" }), false);
  assert.equal(validateAnalysis({ ...valid, topics: [] }), false);
  assert.equal(validateAnalysis({ ...valid, summary: "two\nlines" }), false);
});

test("retry helper retries a transient server error with exponential backoff", async () => {
  let attempts = 0;
  const value = await withBackoff(async () => {
    attempts++;
    if (attempts < 3) throw Object.assign(new Error("temporary"), { status: 503 });
    return "recovered";
  });
  assert.equal(value, "recovered");
  assert.equal(attempts, 3);
});

