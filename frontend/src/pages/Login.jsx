import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AuthShell from './AuthShell.jsx';
import Field from '../components/Field.jsx';
import { FullPageSpinner } from '../components/ProtectedRoute.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_HOME } from '../lib/format.js';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  async function onSubmit({ email, password }) {
    setError('');
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}`);
      const from = location.state?.from;
      navigate(from && from.startsWith(ROLE_HOME[u.role]) ? from : ROLE_HOME[u.role], { replace: true });
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <AuthShell title="Log in to CampusCare" subtitle="Students, staff and administrators sign in here." footer={<>New student? <Link to="/register" className="font-medium text-brand-700 hover:underline">Create an account</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</div>}
        <Field id="email" label="Email" error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" className={`input ${errors.email ? 'input-error' : ''}`} aria-invalid={!!errors.email} {...register('email')} />
        </Field>
        <Field id="password" label="Password" error={errors.password?.message}>
          <input id="password" type="password" autoComplete="current-password" className={`input ${errors.password ? 'input-error' : ''}`} aria-invalid={!!errors.password} {...register('password')} />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Log in
        </button>
      </form>
    </AuthShell>
  );
}
