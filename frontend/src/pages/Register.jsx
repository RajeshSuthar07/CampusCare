import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
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

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name').max(80),
    email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
    registrationNumber: z.string().trim().max(40).optional(),
    phone: z.string().trim().max(20).optional(),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Za-z]/, 'Include at least one letter')
      .regex(/\d/, 'Include at least one number'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export default function Register() {
  const { user, loading, register: signUp } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  async function onSubmit({ confirm, ...values }) {
    setError('');
    try {
      await signUp({ ...values, registrationNumber: values.registrationNumber || undefined, phone: values.phone || undefined });
      toast.success('Account created. Welcome to CampusCare!');
      navigate('/student', { replace: true });
    } catch (e) {
      setError(e.message);
    }
  }

  const input = (name) => `input ${errors[name] ? 'input-error' : ''}`;
  return (
    <AuthShell title="Create your student account" subtitle="Staff and admin accounts are created by the administrator." footer={<>Already registered? <Link to="/login" className="font-medium text-brand-700 hover:underline">Log in</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</div>}
        <Field id="name" label="Full name" required error={errors.name?.message}>
          <input id="name" autoComplete="name" className={input('name')} aria-invalid={!!errors.name} {...register('name')} />
        </Field>
        <Field id="email" label="Email" required error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" className={input('email')} aria-invalid={!!errors.email} {...register('email')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="registrationNumber" label="Enrollment no." error={errors.registrationNumber?.message}>
            <input id="registrationNumber" className={input('registrationNumber')} {...register('registrationNumber')} />
          </Field>
          <Field id="phone" label="Phone" error={errors.phone?.message}>
            <input id="phone" type="tel" autoComplete="tel" className={input('phone')} {...register('phone')} />
          </Field>
        </div>
        <Field id="password" label="Password" required error={errors.password?.message} hint="At least 8 characters with a letter and a number.">
          <input id="password" type="password" autoComplete="new-password" className={input('password')} aria-invalid={!!errors.password} {...register('password')} />
        </Field>
        <Field id="confirm" label="Confirm password" required error={errors.confirm?.message}>
          <input id="confirm" type="password" autoComplete="new-password" className={input('confirm')} aria-invalid={!!errors.confirm} {...register('confirm')} />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Create account
        </button>
      </form>
    </AuthShell>
  );
}
