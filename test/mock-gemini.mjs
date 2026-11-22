// Local-only Gemini substitute for exercising the UI without sending review data externally.
// Start with NODE_OPTIONS="--import=./test/mock-gemini.mjs", GEMINI_API_KEY=local-preview,
// and GEMINI_MODEL=local-preview. Never configure these values on a public deployment.
if (process.env.REVIEWLENS_MOCK_AI === "1") {
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (resource, options = {}) => {
    if (!String(resource).includes("generativelanguage.googleapis.com")) return nativeFetch(resource, options);
    const request = JSON.parse(options.body || "{}");
    const prompt = request.contents?.[0]?.parts?.map((part) => part.text || "").join("\n") || "";
    let result;
    if (request.systemInstruction?.parts?.[0]?.text?.includes("Write one concise")) {
      const context = JSON.parse(prompt);
      result = { reply: `Thank you for sharing your experience with ${context.product}. We’re sorry this did not meet expectations. Please contact our support team with your order details so we can look into this for you.` };
    } else {
      const input = JSON.parse(prompt);
      result = { results: input.map(({ review, rating }) => analyze(review, rating)) };
    }
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(result) }] } }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
}

function analyze(text, rating) {
  const value = text.toLocaleLowerCase();
  const negativeWords = /broken|wrong|terrible|stopped working|stopped|drops|dropping|overpriced|bad|missing|never arrived|no refund|no response|rude|too tight|too small|smaller|kharab|phata|jaldi khatm|quickly|not mentioned|came off|used pair|mud on|misleading|confusing|cheap|issue|complaint|cannot hear|not great/;
  const positiveWords = /soft|worth the price|beautiful|loved|solid|comfortable|very happy|good|great|sturdy|love it|best|premium|accha|badhiya|nice|exactly like|neat|quality acchi|zero blisters/;
  const negative = negativeWords.test(value);
  const positive = positiveWords.test(value);
  let sentiment = negative ? "negative" : positive ? "positive" : rating === 3 || !rating ? "neutral" : rating >= 4 ? "positive" : "negative";
  if (rating === 3 && negativeWords.test(value)) sentiment = "negative";
  const topics = [];
  if (/fabric|quality|stopped working|battery|handle|broken|sound|mic|sole|grip|stitch|wood|mug|earbud|material|smell/.test(value)) topics.push("quality");
  if (/deliver|arriv|shipping|tracking|delivery boy|week/.test(value)) topics.push("delivery");
  if (/price|overpriced|cost|cheap|sale|expensive/.test(value)) topics.push("price");
  if (/packag|box|damage|phata/.test(value)) topics.push("packaging");
  if (/support|refund|ticket|reply|response|exchange|customer service/.test(value)) topics.push("support");
  if (/size|fit|tight|king|queen|pillow|small/.test(value)) topics.push("size_fit");
  if (!topics.length) topics.push("other");
  let summary = "The customer shares a general impression without a specific product concern.";
  if (/battery|बैटरी/.test(value)) summary = "The customer likes the product but says the battery runs out quickly.";
  else if (/packag|box|phata/.test(value)) summary = "The product is liked, but the package arrived damaged.";
  else if (/stopped working|broken|handles came off|mud on|never arrived/.test(value)) summary = "The product or delivery failed and needs the store to follow up.";
  else if (negative) summary = "The customer describes a product or service issue that falls short of expectations.";
  else if (positive) summary = "The customer is pleased with the product's quality or experience.";
  return { sentiment, topics, summary, needs_reply: negative };
}

