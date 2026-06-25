// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudent } from '../hooks/useStudent';
import api from '../utils/api';

const AI_TIPS = [
  "Break study sessions into 25-minute focused blocks with 5-minute breaks (Pomodoro technique) — it dramatically cuts mental fatigue.",
  "Before any lecture, spend 5 minutes glancing at the topic. Your brain will absorb 40% more when it's not seeing material cold.",
  "Teach what you just learned to an imaginary student. The gaps in your explanation reveal exactly what you haven't mastered yet.",
  "Sleep consolidates memory. Reviewing notes right before bed makes them stick significantly better than morning review.",
  "One hard problem per day beats ten easy problems. Difficulty is what builds durable neural pathways.",
];

function StatCard({ icon, label, value, color = 'brand' }) {
  const colorMap = {
    brand: 'from-brand-500/20 to-brand-600/10 border-brand-500/30',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  };
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-2xl p-5 flex items-center gap-4`}>
      <span className="text-3xl">{icon}</span>
      <div>
        <div className="text-2xl font-bold text-slate-100">{value}</div>
        <div className="text-xs text-slate-400 font-medium mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { student, refresh } = useStudent();
  const [fullData, setFullData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const todayTip = AI_TIPS[new Date().getDay() % AI_TIPS.length];

  useEffect(() => {
    async function load() {
      if (!student?.phone) return;
      try {
        const { data } = await api.get(`/students/${encodeURIComponent(student.phone)}`);
        setFullData(data);
      } catch (err) {
        console.error('Dashboard load error:', err.message);
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [student?.phone]);

  const tasks = fullData?.tasks ?? [];
  const attendance = fullData?.attendance ?? [];
  const atRiskSubjects = attendance.filter((a) => a.risk_level === 'AT_RISK');
  const safeSubjects = attendance.filter((a) => a.risk_level === 'SAFE');

  // Upcoming deadlines (next 7 days)
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const urgentTasks = tasks.filter((t) => {
    const d = new Date(t.deadline);
    return d >= now && d <= in7;
  });

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <span className="spinner w-8 h-8 border-brand-500" />
          <span className="text-sm">Loading your dashboard…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">
          Hello, <span className="gradient-text">{student?.name?.split(' ')[0] ?? 'Student'}</span>
        </h1>
        <p className="text-slate-400 mt-1">
          {student?.branch} · Year {student?.year}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="" label="Total tasks" value={tasks.length} color="brand" />
        <StatCard icon="" label="Due this week" value={urgentTasks.length} color="amber" />
        <StatCard icon="" label="At-risk subjects" value={atRiskSubjects.length} color="red" />
        <StatCard icon="" label="Safe subjects" value={safeSubjects.length} color="emerald" />
      </div>

      {/* AI Tip */}
      <div className="glass p-5 flex gap-4 items-start">
        <span className="text-2xl mt-0.5 text-brand-400">*</span>
        <div>
          <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            AI Tip of the Day
          </p>
          <p className="text-slate-200 text-sm leading-relaxed">{todayTip}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-100 text-lg">Your Tasks</h2>
            <Link to="/tasks" className="text-brand-400 text-xs hover:text-brand-300 font-medium">
              Add task →
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No tasks yet.</p>
              <Link to="/tasks" className="text-brand-400 hover:text-brand-300 text-sm mt-2 inline-block">
                Add your first task
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {tasks.slice(0, 5).map((task) => {
                const deadline = new Date(task.deadline);
                const daysLeft = Math.max(0, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)));
                const overdue = deadline < now;
                return (
                  <li key={task.id} className="card-sm flex items-start gap-3">
                    <span className={`text-2xl leading-none -mt-1 ${overdue ? 'text-red-500' : daysLeft <= 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      •
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-200 text-sm truncate">{task.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{task.subject}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-semibold ${overdue ? 'text-red-400' : daysLeft <= 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {overdue ? 'Overdue' : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                      </span>
                    </div>
                  </li>
                );
              })}
              {tasks.length > 5 && (
                <Link to="/tasks" className="text-xs text-brand-400 hover:text-brand-300 text-center block mt-2">
                  +{tasks.length - 5} more tasks →
                </Link>
              )}
            </ul>
          )}
        </div>

        {/* Attendance section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-100 text-lg">Attendance Risk</h2>
            <Link to="/attendance" className="text-brand-400 text-xs hover:text-brand-300 font-medium">
              Update →
            </Link>
          </div>

          {attendance.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No attendance tracked yet.</p>
              <Link to="/attendance" className="text-brand-400 hover:text-brand-300 text-sm mt-2 inline-block">
                Track a subject
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {attendance.slice(0, 5).map((entry) => {
                const safe = entry.risk_level === 'SAFE';
                return (
                  <li key={entry.id} className="card-sm">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-slate-200 text-sm">{entry.subject}</p>
                      <span className={`badge-risk ${safe ? 'badge-safe' : 'badge-at-risk'}`}>
                        {safe ? 'SAFE' : 'AT RISK'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Mini progress bar */}
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${safe ? 'bg-emerald-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, entry.current_percent)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 tabular-nums shrink-0">
                        {parseFloat(entry.current_percent).toFixed(1)}%
                      </span>
                    </div>
                  </li>
                );
              })}
              {attendance.length > 5 && (
                <Link to="/attendance" className="text-xs text-brand-400 hover:text-brand-300 text-center block mt-2">
                  +{attendance.length - 5} more subjects →
                </Link>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
