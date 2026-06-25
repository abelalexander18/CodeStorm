// src/routes/tasks.js
// Module 1 — Smart Deadline Manager
const express = require('express');
const router = express.Router();
const { withSupabase, toExpress } = require('../lib/supabase');
const { generateStudyPlan } = require('../lib/groq');
const { postDeadlineWebhook } = require('../lib/n8n');

// POST /api/tasks
// Full Module 1 flow: compute days remaining, call Groq, save, fire webhook
const createTask = withSupabase({ auth: 'none' }, async (req, ctx) => {
  try {
    const body = await req.json();
    const { phone, title, subject, deadline } = body;

    if (!phone || !title || !subject || !deadline) {
      return Response.json({ error: 'phone, title, subject, and deadline are required.' }, { status: 400 });
    }

    // 1. Compute days remaining
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysRemaining = Math.max(0, Math.ceil((deadlineDate - now) / msPerDay));

    // 2. Call Groq for study plan
    const aiStudyPlan = await generateStudyPlan({ taskTitle: title, subject, daysRemaining });

    // 3. Save task to Supabase
    const { data: task, error: dbErr } = await ctx.supabase
      .from('tasks')
      .insert([{
        phone,
        title,
        subject,
        deadline: deadlineDate.toISOString(),
        days_remaining: daysRemaining,
        ai_study_plan: aiStudyPlan,
      }])
      .select()
      .single();

    if (dbErr) {
      console.error('[tasks] insert error:', dbErr);
      return Response.json({ error: dbErr.message }, { status: 500 });
    }

    // 4. Fetch student name for the webhook payload
    const { data: student } = await ctx.supabase
      .from('students')
      .select('name')
      .eq('phone', phone)
      .single();

    const studentName = student?.name ?? 'Unknown';

    // Convert aiStudyPlan to a readable string for n8n
    const aiStudyPlanStr = aiStudyPlan
      .map((block) => `${block.date}: ${block.topic}`)
      .join(' | ');

    // 5. Fire n8n webhook (non-blocking, errors are swallowed)
    postDeadlineWebhook({
      studentName,
      phone,
      subject,
      deadline: deadlineDate.toISOString(),
      taskTitle: title,
      aiStudyPlan: aiStudyPlanStr,
    });

    // 6. Return saved task + plan
    return Response.json({ task, aiStudyPlan }, { status: 201 });
  } catch (err) {
    console.error('[tasks] create handler error:', err);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
});

// GET /api/tasks/:phone
// Returns all tasks for a student
const getTasks = withSupabase({ auth: 'none' }, async (req, ctx) => {
  try {
    const { phone } = ctx.params;

    const { data: tasks, error } = await ctx.supabase
      .from('tasks')
      .select('*')
      .eq('phone', phone)
      .order('deadline', { ascending: true });

    if (error) {
      console.error('[tasks] fetch error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(tasks ?? []);
  } catch (err) {
    console.error('[tasks] get handler error:', err);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
});

router.post('/', toExpress(createTask));
router.get('/:phone', toExpress(getTasks));

module.exports = router;
