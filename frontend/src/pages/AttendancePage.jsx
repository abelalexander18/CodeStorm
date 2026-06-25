// src/pages/AttendancePage.jsx — Module 2: Attendance Risk Alerter
import { useState, useEffect, useCallback } from 'react';
import { useStudent } from '../hooks/useStudent';
import api from '../utils/api';

function AttendanceCard({ entry }) {
  const safe = entry.risk_level === 'SAFE';
  const pct = parseFloat(entry.current_percent);

  return (
    <div
      className={`card-sm animate-slide-up border-l-4 ${
        safe ? 'border-l-emerald-500' : 'border-l-red-500'
      }`}
    >
      <div className="flex items-center justify-between gap-4 mb-3">
        <h3 className="font-semibold text-slate-100">{entry.subject}</h3>
        <span className={`badge-risk ${safe ? 'badge-safe' : 'badge-at-risk'}`}>
          {safe ? 'SAFE' : 'AT RISK'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Attendance</span>
          <span className={`font-semibold ${safe ? 'text-emerald-400' : 'text-red-400'}`}>
            {pct.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              safe ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-red-600 to-red-400'
            }`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>0%</span>
          <span className="text-amber-500/70">75% min</span>
          <span>100%</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-sm mb-3">
        <div className="bg-slate-800/60 rounded-lg px-3 py-1.5 text-center flex-1">
          <div className="text-slate-100 font-semibold">{entry.classes_attended}</div>
          <div className="text-xs text-slate-500">Attended</div>
        </div>
        <div className="bg-slate-800/60 rounded-lg px-3 py-1.5 text-center flex-1">
          <div className="text-slate-100 font-semibold">{entry.classes_held}</div>
          <div className="text-xs text-slate-500">Total</div>
        </div>
        <div className={`rounded-lg px-3 py-1.5 text-center flex-1 ${
          safe ? 'bg-emerald-500/10' : 'bg-red-500/10'
        }`}>
          <div className={`font-semibold ${safe ? 'text-emerald-400' : 'text-red-400'}`}>
            {entry.classes_needed}
          </div>
          <div className="text-xs text-slate-500">Need to attend</div>
        </div>
      </div>

      {/* AI advice */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-3 flex gap-3 items-start">
        <span className="text-xs font-bold mt-1 text-brand-400">AI</span>
        <p className="text-slate-300 text-sm leading-relaxed italic">{entry.ai_advice}</p>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const { student } = useStudent();
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);

  const [form, setForm] = useState({ subject: '', classesHeld: '', classesAttended: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [lastResult, setLastResult] = useState(null);

  const loadEntries = useCallback(async () => {
    if (!student?.phone) return;
    try {
      const { data } = await api.get(`/attendance/${encodeURIComponent(student.phone)}`);
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Load attendance error:', err.message);
    } finally {
      setLoadingEntries(false);
    }
  }, [student?.phone]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLastResult(null);

    const H = Number(form.classesHeld);
    const A = Number(form.classesAttended);

    if (!form.subject.trim() || !form.classesHeld || !form.classesAttended) {
      setError('All fields are required.');
      return;
    }
    if (H <= 0) { setError('Total classes held must be greater than 0.'); return; }
    if (A < 0 || A > H) { setError('Classes attended cannot exceed total classes held.'); return; }

    setSubmitting(true);
    try {
      const { data } = await api.post('/attendance', {
        phone: student.phone,
        subject: form.subject.trim(),
        classesHeld: H,
        classesAttended: A,
      });

      setLastResult({ ...data, subject: form.subject.trim(), classes_held: H, classes_attended: A });
      await loadEntries();
      setForm({ subject: '', classesHeld: '', classesAttended: '' });
      setSuccessMsg(`Attendance updated for ${form.subject.trim()}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Attendance Risk Alerter</h1>
        <p className="page-subtitle">Track attendance and get instant risk assessment</p>
      </div>

      {/* 75% rule callout */}
      <div className="glass p-4 flex gap-3 items-start">
        <span className="text-sm font-bold text-brand-400">i</span>
        <div className="text-sm text-slate-400">
          <span className="text-slate-200 font-medium">75% Rule: </span>
          You need to attend at least <strong className="text-amber-400">75%</strong> of classes
          in each subject. "Need to attend" shows the minimum additional classes required,
          assuming you attend every future class.
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <h2 className="font-semibold text-slate-200 mb-4">Update Attendance</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="att-subject" className="form-label">Subject name</label>
            <input
              id="att-subject" name="subject" type="text" required
              value={form.subject} onChange={handleChange}
              placeholder="Data Structures and Algorithms"
              className="form-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="att-held" className="form-label">Total classes held</label>
              <input
                id="att-held" name="classesHeld" type="number" required min="1"
                value={form.classesHeld} onChange={handleChange}
                placeholder="40" className="form-input"
              />
            </div>
            <div>
              <label htmlFor="att-attended" className="form-label">Classes you attended</label>
              <input
                id="att-attended" name="classesAttended" type="number" required min="0"
                value={form.classesAttended} onChange={handleChange}
                placeholder="28" className="form-input"
              />
            </div>
          </div>

          {/* Live preview */}
          {form.classesHeld && form.classesAttended && Number(form.classesHeld) > 0 && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-sm">
              {(() => {
                const H = Number(form.classesHeld);
                const A = Number(form.classesAttended);
                if (A < 0 || A > H) return <span className="text-red-400">Invalid values</span>;
                const pct = (A / H) * 100;
                const needed = pct >= 75 ? 0 : Math.max(0, Math.ceil(3 * H - 4 * A));
                const safe = pct >= 75;
                return (
                  <div className="flex gap-4">
                    <span>
                      Current: <strong className={safe ? 'text-emerald-400' : 'text-red-400'}>
                        {pct.toFixed(1)}%
                      </strong>
                    </span>
                    <span>
                      Status: <strong className={safe ? 'text-emerald-400' : 'text-red-400'}>
                        {safe ? 'SAFE' : 'AT RISK'}
                      </strong>
                    </span>
                    {!safe && (
                      <span>
                        Need: <strong className="text-amber-400">{needed} more classes</strong>
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

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
            id="update-attendance-btn"
            type="submit"
            className="btn-primary w-full"
            disabled={submitting}
          >
            {submitting ? <span className="spinner" /> : ''}
            {submitting ? 'Analysing with AI…' : 'Check Attendance Risk'}
          </button>
        </form>
      </div>

      {/* Subjects list */}
      <div>
        <h2 className="font-semibold text-slate-200 mb-4">
          Your Subjects{' '}
          <span className="text-slate-500 font-normal text-sm">({entries.length})</span>
        </h2>

        {loadingEntries ? (
          <div className="flex justify-center py-12">
            <span className="spinner border-brand-500" />
          </div>
        ) : entries.length === 0 ? (
          <div className="card text-center py-12 text-slate-500">
            <p>No subjects tracked yet. Use the form above!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <AttendanceCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
