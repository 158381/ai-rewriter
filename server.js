const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.SILICON_API_KEY || 'sk-cwsfjdykfghdydsclbpsdrxgkyuzsarhlqdvmfyoqwabdcsf';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MODEL = 'deepseek-ai/DeepSeek-V3';
const TEMPERATURE = 0.7;
const MAX_TOKENS = 2000;

// Call SiliconFlow API
async function callAI(systemPrompt, userPrompt) {
    const response = await axios.post(
        'https://api.siliconflow.cn/v1/chat/completions',
        { model: MODEL, messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], max_tokens: MAX_TOKENS, temperature: TEMPERATURE },
        { headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' } }
    );
    let result = response.data.choices[0].message.content;
    // Clean up AI commentary
    return result
        .replace(/^(Here'?s? (a|the|an) [^.]*?:\s*)/i, '')
        .replace(/^(Certainly\.?|Sure\.?|Of course\.?|Absolutely\.?)\s*/i, '')
        .replace(/\n*---*\n*$/g, '')
        .replace(/Let me know .*?$/s, '')
        .replace(/Feel free .*?$/s, '')
        .replace(/^(I (would|have|am) (be|ha)[^.]*?:\s*)/i, '')
        .trim();
}

// === 1. REWRITE: Various rewriting modes ===
app.post('/api/rewrite', async (req, res) => {
    const { text, style } = req.body;
    if (!text) return res.json({ success: false, error: 'No text provided' });

    const prompts = {
        general: 'Improve this English text: fix grammar, spelling, and fluency. Return ONLY the improved text.',
        professional: 'Rewrite in a professional, formal business English tone. Return ONLY the rewritten text.',
        academic: 'Rewrite in formal academic English suitable for essays or papers. Use sophisticated vocabulary. Return ONLY the rewritten text.',
        casual: 'Rewrite in a casual, friendly, conversational tone. Make it natural and easy to read. Return ONLY the rewritten text.',
        shorten: 'Rewrite to be MORE CONCISE. Keep all key information but make it much shorter and direct. Return ONLY the shortened text.',
        expand: 'Expand this text with more details and examples while keeping the same meaning. Make it richer and more descriptive. Return ONLY the expanded text.'
    };

    const stylePrompt = prompts[style] || prompts.general;
    try {
        const result = await callAI(
            'You are a professional English editor. Output ONLY the result, no explanations.',
            stylePrompt + '\n\nText: ' + text
        );
        res.json({ success: true, result });
    } catch (e) {
        res.json({ success: false, error: 'API call failed' });
    }
});

// === 2. GRAMMAR CHECK: Fix errors without rewriting ===
app.post('/api/grammar', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.json({ success: false, error: 'No text provided' });

    try {
        const result = await callAI(
            'You are a professional proofreader. Fix ONLY grammar, spelling, and punctuation errors. Keep the original wording and style as much as possible. Output ONLY the corrected text, no explanations or lists.',
            'Correct the grammar and spelling in this text, preserving the original style:\n\n' + text
        );
        res.json({ success: true, result });
    } catch (e) {
        res.json({ success: false, error: 'API call failed' });
    }
});

// === 3. TRANSLATE + POLISH: Write in your language, get natural English ===
app.post('/api/translate', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.json({ success: false, error: 'No text provided' });

    try {
        const result = await callAI(
            'You are a translator. Translate the given text to natural, fluent English.',
            'Translate this to English: ' + text
        );
        res.json({ success: true, result });
    } catch (e) {
        console.error('Translate Error:', e.response?.data || e.message);
        res.json({ success: false, error: 'Translation failed' });
    }
});

// === 4. GENERATE: Create text from scratch ===
app.post('/api/generate', async (req, res) => {
    const { template, details } = req.body;
    if (!template) return res.json({ success: false, error: 'No template selected' });

    const prompts = {
        email: 'Write a professional email. Details: ' + details + '. Write the full email including subject line and signature. Output ONLY the email.',
        linkedin: 'Write a LinkedIn message. Details: ' + details + '. Output ONLY the message.',
        reply: 'Write a polite email reply. Details: ' + details + '. Output ONLY the reply body.',
        complaint: 'Write a polite but firm complaint. Details: ' + details + '. Output ONLY the message.',
        apology: 'Write a sincere apology. Details: ' + details + '. Output ONLY the message.'
    };

    const prompt = prompts[template] || prompts.email;
    try {
        const result = await callAI(
            'You are a professional business writer. Write clear, natural, effective messages. Output ONLY the result.',
            prompt
        );
        res.json({ success: true, result });
    } catch (e) {
        res.json({ success: false, error: 'API call failed' });
    }
});

app.listen(PORT, () => {
    console.log('AI Writer Pro started at http://localhost:' + PORT);
});
