// src/hooks/useStudent.jsx
// Lightweight student context using React Context + localStorage
import { createContext, useContext, useState, useCallback } from 'react';
import api from '../utils/api';

const StudentContext = createContext(null);

export function StudentProvider({ children }) {
  const [student, setStudent] = useState(() => {
    try {
      const stored = localStorage.getItem('campusflow_student');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (phone) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/students/${encodeURIComponent(phone)}`);
      localStorage.setItem('campusflow_student', JSON.stringify(data));
      setStudent(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!student?.phone) return;
    try {
      const { data } = await api.get(`/students/${encodeURIComponent(student.phone)}`);
      localStorage.setItem('campusflow_student', JSON.stringify(data));
      setStudent(data);
      return data;
    } catch (err) {
      console.error('Refresh error:', err.message);
    }
  }, [student?.phone]);

  const logout = useCallback(() => {
    localStorage.removeItem('campusflow_student');
    setStudent(null);
    setError(null);
  }, []);

  return (
    <StudentContext.Provider value={{ student, setStudent, login, logout, refresh, loading, error }}>
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent() {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error('useStudent must be used inside StudentProvider');
  return ctx;
}
