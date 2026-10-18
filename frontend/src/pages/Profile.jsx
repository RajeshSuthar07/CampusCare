import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../components/PageHeader.jsx';
import Field from '../components/Field.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  phone: z.string().trim().max(20).optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export default function Profile() {
  const { user, setUser } = useAuth();
  const [pwError, setPwError] = useState('');

  const profile = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: user.name, phone: user.phone ?? '' } });
  const password = useForm({ resolver: zodResolver(passwordSchema) });

  async function saveProfile(values) {
    try {
      const res = await api.patch('/auth/me', values);
      setUser(res.data.user);
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function savePassword({ currentPassword, newPassword }) {
    setPwError('');
    try {
      await api.patch('/auth/me', { currentPassword, newPassword });
      toast.success('Password changed');
      password.reset();
    } catch (e) {
      setPwError(e.message);
    }
  }

  const e1 = profile.formState.errors;
  const e2 = password.formState.errors;
  return (
    <>
      <PageHeader title="Profile & Settings" subtitle="Update your basic details and password" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card card-pad" aria-labelledby="profile-h">
          <h2 id="profile-h" className="text-base font-semibold">Your details</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
            <div><dt className="text-xs text-slate-500">Email</dt><dd className="break-all font-medium">{user.email}</dd></div>
            <div><dt className="text-xs text-slate-500">Role</dt><dd className="font-medium capitalize">{user.role}</dd></div>
            {user.registrationNumber && <div><dt className="text-xs text-slate-500">Enrollment no.</dt><dd className="font-medium">{user.registrationNumber}</dd></div>}
            {user.department?.name && <div><dt className="text-xs text-slate-500">Department</dt><dd className="font-medium">{user.department.name}</dd></div>}
          </dl>
          <form onSubmit={profile.handleSubmit(saveProfile)} noValidate className="mt-5 space-y-4">
            <Field id="name" label="Full name" required error={e1.name?.message}>
              <input id="name" className={`input ${e1.name ? 'input-error' : ''}`} {...profile.register('name')} />
            </Field>
            <Field id="phone" label="Phone" error={e1.phone?.message}>
              <input id="phone" type="tel" className="input" {...profile.register('phone')} />
            </Field>
            <button type="submit" className="btn-primary" disabled={profile.formState.isSubmitting}>
              {profile.formState.isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Save changes
            </button>
          </form>
        </section>

        <section className="card card-pad" aria-labelledby="pw-h">
          <h2 id="pw-h" className="text-base font-semibold">Change password</h2>
          <form onSubmit={password.handleSubmit(savePassword)} noValidate className="mt-5 space-y-4">
            {pwError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{pwError}</div>}
            <Field id="currentPassword" label="Current password" error={e2.currentPassword?.message}>
              <input id="currentPassword" type="password" autoComplete="current-password" className={`input ${e2.currentPassword ? 'input-error' : ''}`} {...password.register('currentPassword')} />
            </Field>
            <Field id="newPassword" label="New password" error={e2.newPassword?.message} hint="At least 8 characters with a letter and a number.">
              <input id="newPassword" type="password" autoComplete="new-password" className={`input ${e2.newPassword ? 'input-error' : ''}`} {...password.register('newPassword')} />
            </Field>
            <Field id="confirm" label="Confirm new password" error={e2.confirm?.message}>
              <input id="confirm" type="password" autoComplete="new-password" className={`input ${e2.confirm ? 'input-error' : ''}`} {...password.register('confirm')} />
            </Field>
            <button type="submit" className="btn-primary" disabled={password.formState.isSubmitting}>
              {password.formState.isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Update password
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
