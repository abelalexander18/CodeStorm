// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStudent } from '../hooks/useStudent';

export default function LoginPage() {
  const { login, loading } = useStudent();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const trimmed = phone.trim();
    if (!/^\+\d{10,15}$/.test(trimmed)) {
      setError('Enter your phone in E.164 format, e.g. +91XXXXXXXXXX');
      return;
    }
    try {
      await login(trimmed);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-4 font-bold text-brand-400">CF</div>
        <h1 className="text-4xl font-bold mb-2">
          <span className="gradient-text">Campus</span>
          <span className="text-slate-100">Flow</span>
        </h1>
        <p className="text-slate-400 text-lg">Your smart academic companion</p>
      </div>

      {/* Card */}
      <div className="card w-full max-w-md animate-slide-up">
        <h2 className="text-xl font-bold text-slate-100 mb-1">Welcome back</h2>
        <p className="text-slate-400 text-sm mb-6">Enter your phone number to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone-input" className="form-label">Phone number (E.164)</label>
            <input
              id="phone-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className="form-input"
              autoComplete="tel"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            id="login-btn"
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Looking up…' : 'Sign In →'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800 text-center">
          <p className="text-slate-500 text-sm">
            First time here?{' '}
            <Link
              to="/onboarding"
              className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              Create your account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
