// src/lib/groq.js
// Groq SDK client (OpenAI-compatible interface)
const Groq = require('groq-sdk');

const hasApiKey = !!process.env.GROQ_API_KEY;
let groq;

if (hasApiKey) {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
} else {
  console.warn(
    '[Groq] GROQ_API_KEY is not set in .env — Using local mock AI generation fallbacks.'
  );
}

const MODEL = 'llama-3.3-70b-versatile';

/**
 * generateStudyPlan
 * Prompt: Ask Groq to produce up to 5 daily study blocks for a task.
 * Returns: Array of { date, topic } objects, or [] on failure.
 */
async function generateStudyPlan({ taskTitle, subject, daysRemaining }) {
  if (!hasApiKey) {
    // Generate high-quality mock study blocks locally
    const today = new Date();
    const plan = [];
    const totalBlocks = Math.min(5, Math.max(1, daysRemaining));

    for (let i = 0; i < totalBlocks; i++) {
      const dateObj = new Date(today);
      dateObj.setDate(today.getDate() + i);
      const dateStr = dateObj.toISOString().split('T')[0];

      let topic = '';
      if (i === 0) {
        topic = `Review course syllabus and outline the requirements for "${taskTitle}"`;
      } else if (i === totalBlocks - 1) {
        topic = `Finalize the task "${taskTitle}" and review all criteria before submission`;
      } else if (i === 1) {
        topic = `Research and gather primary reference materials for ${subject}`;
      } else if (i === 2) {
        topic = `Draft the main sections and solve practice exercises`;
      } else {
        topic = `Consolidate notes, refine drafts, and check for accuracy`;
      }

      plan.push({ date: dateStr, topic });
    }
    return plan;
  }

  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `You are an academic planning assistant. 
Your job is to create a concise, actionable daily study plan for a student.
Respond ONLY with a valid JSON array — no markdown, no explanation, no code fences.
Each element must be an object with exactly two keys: "date" (YYYY-MM-DD string) and "topic" (a short, specific study action).`;

  const userPrompt = `A student needs to complete the following task:
- Task: "${taskTitle}"
- Subject: "${subject}"
- Days remaining until deadline: ${daysRemaining}
- Today's date: ${today}

Create a daily study plan with up to 5 study blocks spread across the available days.
If daysRemaining <= 0, still return 1-2 high-priority blocks for today.
Return ONLY the JSON array, nothing else.

Example format:
[{"date":"${today}","topic":"Review Chapter 3 theory and key formulas"},{"date":"2024-01-02","topic":"Practice 10 past exam questions"}]`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '[]';

    // Strip accidental markdown code fences if Groq adds them
    const cleaned = raw.replace(/```json?/gi, '').replace(/```/g, '').trim();
    const plan = JSON.parse(cleaned);
    return Array.isArray(plan) ? plan.slice(0, 5) : [];
  } catch (err) {
    console.error('[Groq] generateStudyPlan error:', err.message);
    return [];
  }
}

/**
 * generateAttendanceAdvice
 * Prompt: Ask Groq for one short encouraging sentence about the student's attendance.
 * Returns: string
 */
async function generateAttendanceAdvice({
  subject,
  currentPercent,
  classesNeeded,
  riskLevel,
}) {
  if (!hasApiKey) {
    if (riskLevel === 'SAFE') {
      return `Excellent work! Your attendance in ${subject} is solid at ${currentPercent.toFixed(1)}%. Keep attending to maintain this status.`;
    } else {
      return `Your attendance in ${subject} is at ${currentPercent.toFixed(1)}%. Try to attend the next ${classesNeeded} class${classesNeeded > 1 ? 'es' : ''} consecutively to return to safe standing.`;
    }
  }

  const systemPrompt = `You are a supportive but direct academic advisor.
Generate exactly ONE sentence of advice for a student about their attendance.
The sentence must be encouraging yet honest, and under 40 words.
Respond with ONLY that single sentence — no quotes, no extra text.`;

  const userPrompt = `Student attendance for "${subject}":
- Current attendance: ${currentPercent.toFixed(1)}%
- Risk status: ${riskLevel}
- Additional classes needed to reach 75%: ${classesNeeded}

Write one short, direct sentence of advice for this student.`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 80,
    });

    return (
      completion.choices[0]?.message?.content?.trim() ??
      'Keep attending classes consistently to stay on track.'
    );
  } catch (err) {
    console.error('[Groq] generateAttendanceAdvice error:', err.message);
    return 'Keep attending classes consistently to stay on track.';
  }
}

module.exports = { generateStudyPlan, generateAttendanceAdvice };
