// src/routes/attendance.js
// Module 2 — Attendance Risk Alerter
const express = require('express');
const router = express.Router();
const { withSupabase, toExpress } = require('../lib/supabase');
const { generateAttendanceAdvice } = require('../lib/groq');
const { postAttendanceWebhook } = require('../lib/n8n');

// POST /api/attendance
// Full Module 2 flow
const createAttendance = withSupabase({ auth: 'none' }, async (req, ctx) => {
  try {
    const body = await req.json();
    const { phone, subject, classesHeld, classesAttended } = body;

    if (!phone || !subject || classesHeld == null || classesAttended == null) {
      return Response.json({
        error: 'phone, subject, classesHeld, and classesAttended are required.',
      }, { status: 400 });
    }

    const H = Number(classesHeld);
    const A = Number(classesAttended);

    if (H <= 0) {
      return Response.json({ error: 'classesHeld must be greater than 0.' }, { status: 400 });
    }

    if (A < 0 || A > H) {
      return Response.json({
        error: 'classesAttended must be between 0 and classesHeld.',
      }, { status: 400 });
    }

    // 1. Compute currentPercent
    const currentPercent = (A / H) * 100;

    // 2. Compute classesNeeded using derived formula: max(0, ceil(3H - 4A))
    let classesNeeded;
    if (currentPercent >= 75) {
      classesNeeded = 0;
    } else {
      classesNeeded = Math.ceil(3 * H - 4 * A);
      classesNeeded = Math.max(0, classesNeeded);
    }

    // 3. Determine risk level
    const riskLevel = currentPercent < 75 ? 'AT_RISK' : 'SAFE';

    // 4. Call Groq for advice
    const aiAdvice = await generateAttendanceAdvice({
      subject,
      currentPercent,
      classesNeeded,
      riskLevel,
    });

    // 5. Save to Supabase (upsert by phone + subject to allow updates)
    const { data: entry, error: dbErr } = await ctx.supabase
      .from('attendance')
      .upsert(
        [{
          phone,
          subject,
          classes_held: H,
          classes_attended: A,
          current_percent: parseFloat(currentPercent.toFixed(2)),
          classes_needed: classesNeeded,
          risk_level: riskLevel,
          ai_advice: aiAdvice,
        }],
        { onConflict: 'phone,subject' }
      )
      .select()
      .single();

    if (dbErr) {
      console.error('[attendance] upsert error:', dbErr);
      return Response.json({ error: dbErr.message }, { status: 500 });
    }

    // Fetch student name for webhook
    const { data: student } = await ctx.supabase
      .from('students')
      .select('name')
      .eq('phone', phone)
      .single();

    const studentName = student?.name ?? 'Unknown';

    // 6. Fire n8n webhook (non-blocking)
    postAttendanceWebhook({
      studentName,
      phone,
      subject,
      currentPercent: parseFloat(currentPercent.toFixed(2)),
      classesNeeded,
      riskLevel,
      aiAdvice,
    });

    // 7. Return result
    return Response.json({
      currentPercent: parseFloat(currentPercent.toFixed(2)),
      classesNeeded,
      riskLevel,
      aiAdvice,
    }, { status: 201 });
  } catch (err) {
    console.error('[attendance] create handler error:', err);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
});

// GET /api/attendance/:phone
// Returns all attendance entries for a student
const getAttendance = withSupabase({ auth: 'none' }, async (req, ctx) => {
  try {
    const { phone } = ctx.params;

    const { data: entries, error } = await ctx.supabase
      .from('attendance')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[attendance] fetch error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(entries ?? []);
  } catch (err) {
    console.error('[attendance] get handler error:', err);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
});

router.post('/', toExpress(createAttendance));
router.get('/:phone', toExpress(getAttendance));

module.exports = router;
