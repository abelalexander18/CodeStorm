// src/pages/TasksPage.jsx — Module 1: Smart Deadline Manager
import { useState, useEffect, useCallback } from 'react';
import { useStudent } from '../hooks/useStudent';
import api from '../utils/api';

function StudyPlanBlock({ plan }) {
  if (!Array.isArray(plan) || plan.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2 border-t border-slate-700 pt-3">
      {plan.map((block, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-xs text-brand-400 font-bold">
            {i + 1}
          </span>
          <div>
            <span className="font-medium text-slate-300">{block.date}</span>
            <span className="text-slate-400 mx-1.5">—</span>
            <span className="text-slate-300">{block.topic}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TaskCard({ task }) {
  const [expanded, setExpanded] = useState(false);
  const now = new Date();
  const deadline = new Date(task.deadline);
  const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  const overdue = deadline < now;
  const plan = Array.isArray(task.ai_study_plan) ? task.ai_study_plan : [];

  return (
    <div className="card-sm animate-slide-up">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-slate-100">{task.title}</h3>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
              {task.subject}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Due: {deadline.toLocaleString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-sm font-bold ${overdue ? 'text-red-400' : daysLeft <= 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {overdue ? 'Overdue' : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
          </div>
        </div>
      </div>

      {plan.length > 0 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
        >
          <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
          {expanded ? 'Hide' : 'View'} AI Study Plan ({plan.length} blocks)
        </button>
      )}
      {expanded && <StudyPlanBlock plan={plan} />}
    </div>
  );
}

export default function TasksPage() {
  const { student } = useStudent();
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [form, setForm] = useState({ title: '', subject: '', deadline: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadTasks = useCallback(async () => {
    if (!student?.phone) return;
    try {
      const { data } = await api.get(`/tasks/${encodeURIComponent(student.phone)}`);
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Load tasks error:', err.message);
    } finally {
      setLoadingTasks(false);
    }
  }, [student?.phone]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!form.title.trim() || !form.subject.trim() || !form.deadline) {
      setError('All fields are required.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/tasks', {
        phone: student.phone,
        title: form.title.trim(),
        subject: form.subject.trim(),
        deadline: form.deadline,
      });

      const newTask = data.task;
      setTasks((prev) => [newTask, ...prev]);
      setForm({ title: '', subject: '', deadline: '' });
      setSuccessMsg(`Task added with ${data.aiStudyPlan?.length ?? 0}-block AI study plan!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Minimum datetime for picker = now
  const minDatetime = new Date(Date.now() - 60000).toISOString().slice(0, 16);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Smart Deadline Manager</h1>
        <p className="page-subtitle">Add a task and get an AI-generated study plan instantly</p>
      </div>

      {/* Add task form */}
      <div className="card">
        <h2 className="font-semibold text-slate-200 mb-4">Add New Task</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="task-title" className="form-label">Task title</label>
            <input
              id="task-title" name="title" type="text" required
              value={form.title} onChange={handleChange}
              placeholder="Prepare for OS mid-semester exam"
              className="form-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-subject" className="form-label">Subject</label>
              <input
                id="task-subject" name="subject" type="text" required
                value={form.subject} onChange={handleChange}
                placeholder="Operating Systems" className="form-input"
              />
            </div>
            <div>
              <label htmlFor="task-deadline" className="form-label">Deadline</label>
              <input
                id="task-deadline" name="deadline" type="datetime-local" required
                value={form.deadline} onChange={handleChange}
                min={minDatetime}
                className="form-input"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm">
              {successMsg}
            </div>
          )}

          <button
            id="add-task-btn"
            type="submit"
            className="btn-primary w-full"
            disabled={submitting}
          >
            {submitting ? <span className="spinner" /> : ''}
            {submitting ? 'Generating AI study plan…' : 'Add Task + Generate Plan'}
          </button>
        </form>
      </div>

      {/* Tasks list */}
      <div>
        <h2 className="font-semibold text-slate-200 mb-4">
          Your Tasks{' '}
          <span className="text-slate-500 font-normal text-sm">({tasks.length})</span>
        </h2>

        {loadingTasks ? (
          <div className="flex justify-center py-12">
            <span className="spinner border-brand-500" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="card text-center py-12 text-slate-500">
            <p>No tasks yet. Add your first one above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
