# Lucent — AI Review Lens

Lucent reviews PDF, DOCX, TXT, and Markdown documents, then anchors findings to exact excerpts from the uploaded text. It supports local Ollama, hosted Gemini, or OpenAI.

## Run it locally

1. Install Node.js 22.13 or newer (or Node.js 24+).
2. Open a terminal in this `outputs` folder and run `npm install`.
3. Run `npm start` and open `http://127.0.0.1:4173`.

In development, Lucent uses Ollama at `http://127.0.0.1:11434` with `llama3.2:3b` by default. Set `AI_PROVIDER=gemini` or `AI_PROVIDER=openai` to use a hosted API instead. `AI_MODEL` overrides the selected provider's default model.

## Deploy online

Deploy this folder as a Node.js 24 web service or build it with the included Dockerfile. Configure these environment variables in the host dashboard:

- `NODE_ENV=production`
- `AI_PROVIDER=gemini`
- `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/api-keys)
- `GEMINI_MODEL=gemini-3-flash-preview`
- `APP_PASSWORD` set to a unique password at least 12 characters long
- `PORT` supplied by the host

Production requires `APP_PASSWORD`; Lucent protects the site with browser basic authentication. The server binds to `0.0.0.0` in production. To use OpenAI instead, set `AI_PROVIDER=openai` and `OPENAI_API_KEY`.

## Documents

Upload one PDF, DOCX, TXT, or Markdown file up to 15 MB. PDF extraction preserves page numbers. DOCX, TXT, and Markdown are treated as one text page. Scanned PDFs need OCR before review. Documents are parsed in memory and are not saved by this app. When you start a review, extracted text is sent to the selected AI provider (Ollama, Gemini, or OpenAI). API keys stay on the server and are never sent to the browser.

Lucent does not independently fact-check sources. Findings are observations to help a person review the document. Add a source link in the evidence trail to keep provenance with a finding; attaching a link does not verify it.

The Gemini free tier has limited quotas. Google’s current pricing page says free-tier content may be used to improve its products. Do not upload confidential documents through that tier. Paid API terms differ. App hosting may also have separate costs or usage limits.

OpenAI API usage may incur charges on your OpenAI API account. A ChatGPT subscription does not include API usage.
