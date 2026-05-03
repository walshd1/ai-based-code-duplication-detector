const core = require('@actions/core');
const fs = require('fs');
const PROMPT = `You are an AI-powered code duplication detector. Your task is to identify near-duplicate code snippets, even when they contain minor variations like changes in variable names, whitespace, comments, or reordering of independent statements.

Analyze the following code snippets for potential duplication. Consider semantic similarity and functional equivalence, not just exact text matching.

**Code Snippet 1:**
{code_snippet_1}

**Code Snippet 2:**
{code_snippet_2}

**Context (Optional):**
{context}

**Instructions:**

1.  **Analyze:** Compare 'Code Snippet 1' and 'Code Snippet 2' for near-duplicate code.
2.  **Similarity Score:** Assign a similarity score between 0 (no similarity) and 100 (identical) representing the degree of duplication.
3.  **Justification:** Provide a concise explanation of why you believe the snippets are (or are not) near-duplicates, highlighting the similarities and differences. Mention specific types of variations (e.g., variable renaming, whitespace changes, statement reordering).
4.  **Duplication Type (Optional):** If duplication is detected, classify the type of duplication (e.g., Exact, Near-Miss Type 1 (renamed variables), Near-Miss Type 2 (structural differences), Near-Miss Type 3 (added/removed statements)).
5.  **Output Format:** Return your analysis in the following format:

Similarity Score: {similarity_score}
Justification: {justification}
Duplication Type: {duplication_type} (Optional)`;
async function run() {
  try {
    const key = core.getInput('gemini_api_key');
    const token = core.getInput('service_token');
    const ctx = { repoName: process.env.GITHUB_REPOSITORY || '', event: process.env.GITHUB_EVENT_NAME || '' };
    try { Object.assign(ctx, JSON.parse(fs.readFileSync('package.json', 'utf8'))); } catch {}
    let prompt = PROMPT;
    for (const [k, v] of Object.entries(ctx)) prompt = prompt.replace(new RegExp('{' + k + '}', 'g'), String(v || ''));
    let result;
    if (key) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 2000 } })
      });
      result = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (token) {
      const r = await fetch('https://action-factory.walshd1.workers.dev/generate/ai-based-code-duplication-detector', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx)
      });
      result = (await r.json()).content || '';
    } else throw new Error('Need gemini_api_key or service_token');
    console.log(result);
    core.setOutput('result', result);
  } catch (e) { core.setFailed(e.message); }
}
run();
