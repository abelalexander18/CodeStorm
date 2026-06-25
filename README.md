# CampusFlow 🎓

Smart academic management — deadline tracking with AI study plans + attendance risk alerts, built for a 3-hour hackathon demo.

---

## Project Structure

```
campusflow/
├── database/
│   └── schema.sql          ← Paste this into Supabase SQL Editor
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   ├── lib/
│   │   │   ├── supabase.js   ← Supabase client (secret key, server-side)
│   │   │   ├── groq.js       ← Groq SDK wrapper (AI prompts)
│   │   │   └── n8n.js        ← n8n webhook helper (non-blocking)
│   │   └── routes/
│   │       ├── students.js
│   │       ├── tasks.js      ← Module 1: Smart Deadline Manager
│   │       └── attendance.js ← Module 2: Attendance Risk Alerter
│   ├── .env.example
│   ├── .env                  ← Fill in real values here
│   ├── .gitignore
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   ├── hooks/
│   │   │   └── useStudent.js
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── OnboardingPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── TasksPage.jsx
│   │   │   └── AttendancePage.jsx
│   │   └── utils/
│   │       └── api.js
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
└── README.md
```

---

## Step 1 — Set up the database (Supabase)

1. Open your Supabase project → **SQL Editor**
2. Paste the entire contents of `database/schema.sql` and click **Run**
3. Verify three tables exist: `students`, `tasks`, `attendance`

> RLS is **disabled** on all tables — the secret key can read/write freely from the backend.

---

## Step 2 — Fill in environment variables

Edit `backend/.env` (copy of `.env.example`) with your real secrets:

```env
GROQ_API_KEY=gsk_...
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SECRET_KEY=sb-secret-...
N8N_DEADLINE_WEBHOOK=http://localhost:5678/webhook-test/deadline-reminder
N8N_ATTENDANCE_WEBHOOK=http://localhost:5678/webhook-test/attendance-alert
PORT=5000
```

> **NEVER** put these values in the frontend. The Vite proxy routes `/api/*` to the backend.

---

## Step 3 — Install dependencies

Open **two terminals** from the `campusflow/` root.

**Terminal 1 — Backend:**
```bash
cd backend
npm install
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
```

---

## Step 4 — Run both servers

**Terminal 1 — Backend (port 5000):**
```bash
cd backend
npm run dev
```
You should see:
```
🚀 CampusFlow API running at http://localhost:5000
```

**Terminal 2 — Frontend (port 5173):**
```bash
cd frontend
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/students` | Register a new student |
| GET | `/api/students/:phone` | Get student + tasks + attendance |
| POST | `/api/tasks` | Add task → Groq study plan → n8n webhook |
| GET | `/api/tasks/:phone` | List all tasks for a student |
| POST | `/api/attendance` | Update attendance → Groq advice → n8n webhook |
| GET | `/api/attendance/:phone` | List all attendance entries |
| GET | `/health` | Health check |

---

## Manual curl tests

### Health check
```bash
curl http://localhost:5000/health
```

### Register a student
```bash
curl -s -X POST http://localhost:5000/api/students \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Student","branch":"Computer Science","year":3,"subjects":"OS, DBMS, Networks","phone":"+919876543210","email":"test@college.edu"}' | jq .
```

### Login (look up student)
```bash
curl -s http://localhost:5000/api/students/%2B919876543210 | jq .
```

### Add a task (triggers Groq + n8n)
```bash
curl -s -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","title":"Prepare for OS exam","subject":"Operating Systems","deadline":"2025-07-15T10:00:00"}' | jq .
```

### Update attendance (triggers Groq + n8n)
```bash
curl -s -X POST http://localhost:5000/api/attendance \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","subject":"Operating Systems","classesHeld":40,"classesAttended":28}' | jq .
```

---

## Test n8n webhooks independently

> These fire your n8n workflows directly, bypassing the app — useful to verify n8n is connected before the demo.

**Deadline reminder webhook:**
```bash
curl -s -X POST http://localhost:5678/webhook-test/deadline-reminder \
  -H "Content-Type: application/json" \
  -d '{"studentName":"Test Student","phone":"+919876543210","subject":"OS","deadline":"2025-07-15T10:00:00Z","taskTitle":"Prepare for OS exam","aiStudyPlan":"2025-07-10: Review theory | 2025-07-11: Practice MCQs"}' | jq .
```

**Attendance alert webhook:**
```bash
curl -s -X POST http://localhost:5678/webhook-test/attendance-alert \
  -H "Content-Type: application/json" \
  -d '{"studentName":"Test Student","phone":"+919876543210","subject":"OS","currentPercent":70,"classesNeeded":4,"riskLevel":"AT_RISK","aiAdvice":"Attend all remaining OS classes to recover your attendance."}' | jq .
```

---

## Attendance formula

The minimum extra classes needed to reach 75%:

```
Let H = classesHeld, A = classesAttended, x = additional classes to attend

(A + x) / (H + x) >= 0.75
A + x >= 0.75H + 0.75x
0.25x >= 0.75H - A
x >= 3H - 4A

classesNeeded = max(0, ceil(3H - 4A))   — if currentPercent < 75
classesNeeded = 0                         — if currentPercent >= 75
```

---

## Groq prompts used

### Study plan (`src/lib/groq.js → generateStudyPlan`)

**System:** Academic planning assistant — return a valid JSON array of `{date, topic}` objects, no markdown.

**User:** Given `taskTitle`, `subject`, `daysRemaining`, and today's date — generate up to 5 daily study blocks.

### Attendance advice (`src/lib/groq.js → generateAttendanceAdvice`)

**System:** Supportive academic advisor — one sentence, under 40 words, no extra text.

**User:** Given `subject`, `currentPercent`, `classesNeeded`, and `riskLevel` — write one sentence of direct advice.

---

## What you still need to do manually

1. **Fill in `backend/.env`** with your real Groq API key, Supabase URL, and Supabase secret key.
2. **Run `npm install`** in both `backend/` and `frontend/` directories.
3. **Run the SQL schema** — paste `database/schema.sql` into the Supabase SQL Editor and click Run.
4. **Verify n8n is running** at `http://localhost:5678` with both webhook paths configured before the demo (use the curl commands above to test independently).
5. **Confirm the Supabase secret key format** — you're using the new publishable + secret key format; the secret key should have the prefix `sb-secret-...` or similar. Only paste this into `backend/.env`, never in any frontend file.
