// src/routes/students.js
const express = require('express');
const router = express.Router();
const { withSupabase, toExpress } = require('../lib/supabase');

// POST /api/students
// Create a new student record
const createStudent = withSupabase({ auth: 'none' }, async (req, ctx) => {
  try {
    const body = await req.json();
    const { name, branch, year, subjects, phone, email } = body;

    if (!name || !branch || !year || !subjects || !phone || !email) {
      return Response.json({ error: 'All fields are required.' }, { status: 400 });
    }

    // Validate phone is E.164
    if (!/^\+\d{10,15}$/.test(phone)) {
      return Response.json({
        error: 'Phone must be in E.164 format, e.g. +91XXXXXXXXXX',
      }, { status: 400 });
    }

    const { data, error } = await ctx.supabase
      .from('students')
      .insert([{ name, branch, year: Number(year), subjects, phone, email }])
      .select()
      .single();

    if (error) {
      // Duplicate phone or email
      if (error.code === '23505') {
        return Response.json({ error: 'A student with this phone or email already exists.' }, { status: 409 });
      }
      console.error('[students] insert error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data, { status: 201 });
  } catch (err) {
    console.error('[students] create handler error:', err);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
});

// GET /api/students/:phone
// Returns student record + tasks + attendance entries
const getStudent = withSupabase({ auth: 'none' }, async (req, ctx) => {
  try {
    const url = new URL(req.url);
    const phone = decodeURIComponent(url.pathname.split('/').pop());

    const { data: student, error: sErr } = await ctx.supabase
      .from('students')
      .select('*')
      .eq('phone', phone)
      .single();

    if (sErr || !student) {
      return Response.json({ error: 'Student not found.' }, { status: 404 });
    }

    const { data: tasks } = await ctx.supabase
      .from('tasks')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false });

    const { data: attendance } = await ctx.supabase
      .from('attendance')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false });

    return Response.json({
      ...student,
      tasks: tasks ?? [],
      attendance: attendance ?? [],
    });
  } catch (err) {
    console.error('[students] get handler error:', err);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
});

router.post('/', toExpress(createStudent));
router.get('/:phone', toExpress(getStudent));

module.exports = router;
