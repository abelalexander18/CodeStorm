// src/pages/OnboardingPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useStudent } from '../hooks/useStudent';

const YEARS = [1, 2, 3, 4, 5];

export default function OnboardingPage() {
  const { setStudent } = useStudent();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', branch: '', year: '1',
    subjects: '', phone: '', email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!/^\+\d{10,15}$/.test(form.phone.trim())) {
      setError('Phone must be in E.164 format, e.g. +91XXXXXXXXXX');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/students', {
        ...form,
        phone: form.phone.trim(),
        year: Number(form.year),
      });
      localStorage.setItem('campusflow_student', JSON.stringify(data));
      setStudent(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 animate-fade-in">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3 font-bold text-brand-400">CF</div>
        <h1 className="text-3xl font-bold gradient-text">Join CampusFlow</h1>
        <p className="text-slate-400 mt-1">Set up your profile in 30 seconds</p>
      </div>

      <div className="card w-full max-w-lg animate-slide-up">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name + Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="form-label">Full name</label>
              <input
                id="name" name="name" type="text" required
                value={form.name} onChange={handleChange}
                placeholder="Priya Sharma" className="form-input"
              />
            </div>
            <div>
              <label htmlFor="branch" className="form-label">Branch / Department</label>
              <input
                id="branch" name="branch" type="text" required
                value={form.branch} onChange={handleChange}
                placeholder="Computer Science" className="form-input"
              />
            </div>
          </div>

          {/* Year */}
          <div>
            <label htmlFor="year" className="form-label">Year of study</label>
            <select
              id="year" name="year" required
              value={form.year} onChange={handleChange}
              className="form-input"
            >
              {YEARS.map((y) => (
                <option key={y} value={y} className="bg-slate-800">Year {y}</option>
              ))}
            </select>
          </div>

          {/* Subjects */}
          <div>
            <label htmlFor="subjects" className="form-label">
              Subjects <span className="text-slate-500">(comma-separated)</span>
            </label>
            <input
              id="subjects" name="subjects" type="text" required
              value={form.subjects} onChange={handleChange}
              placeholder="DSA, OS, DBMS, Networks"
              className="form-input"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="onboard-phone" className="form-label">Phone (E.164)</label>
            <input
              id="onboard-phone" name="phone" type="tel" required
              value={form.phone} onChange={handleChange}
              placeholder="+91XXXXXXXXXX" className="form-input"
              autoComplete="tel"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email" name="email" type="email" required
              value={form.email} onChange={handleChange}
              placeholder="priya@college.edu" className="form-input"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            id="register-btn"
            type="submit"
            className="btn-primary w-full mt-2"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Creating your account…' : 'Create Account →'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-5">
          Already registered?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
