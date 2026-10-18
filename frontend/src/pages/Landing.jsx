import { Link } from 'react-router-dom';
import { BarChart3, Bell, ClipboardList, Clock, ShieldCheck, Star, UserCheck, Wifi, Zap, Droplets, Building, BookOpen } from 'lucide-react';
import { Brand } from '../components/Sidebar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_HOME } from '../lib/format.js';

const FEATURES = [
  { icon: ClipboardList, title: 'Report in under a minute', text: 'Describe the problem, pick a location and attach a photo. We warn you if someone already reported the same issue.' },
  { icon: Clock, title: 'Clear resolution targets', text: 'Every complaint gets a target time based on its priority, with live countdowns and overdue tracking.' },
  { icon: Bell, title: 'Updates as they happen', text: 'Get notified when your complaint is reviewed, assigned, fixed or needs your input.' },
  { icon: UserCheck, title: 'Routed to the right team', text: 'Administrators assign each complaint to a department and staff member, with a full audit timeline.' },
  { icon: Star, title: 'Rate the outcome', text: 'Once resolved, rate the fix. Not satisfied? Reopen it with a reason within seven days.' },
  { icon: BarChart3, title: 'Reports for decision makers', text: 'Real-time analytics on volumes, categories, department performance and resolution times.' },
];

const STEPS = [
  ['Submit', 'Tell us what is wrong and where.'],
  ['Review', 'An administrator checks and prioritises it.'],
  ['Assign', 'The right department and staff member take it on.'],
  ['Resolve', 'Staff fix the issue and record what they did.'],
  ['Feedback', 'You confirm the result and rate the service.'],
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <nav className="flex items-center gap-2" aria-label="Account">
            {user ? (
              <Link to={ROLE_HOME[user.role]} className="btn-primary">Go to dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Log in</Link>
                <Link to="/register" className="btn-primary">Register</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="bg-gradient-to-b from-brand-50/70 to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-2">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-200">
                <ShieldCheck size={14} aria-hidden="true" /> Smart campus complaint management
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl lg:text-5xl">Report it. Track it. Get it fixed.</h1>
              <p className="mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
                CampusCare replaces verbal complaints with a transparent process. Students report issues with Wi-Fi, labs, classrooms, water, electricity and more, and follow every step until it is resolved.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={user ? ROLE_HOME[user.role] : '/register'} className="btn-primary !min-h-11 !px-6">{user ? 'Open dashboard' : 'Create student account'}</Link>
                {!user && <Link to="/login" className="btn-secondary !min-h-11 !px-6">Log in</Link>}
              </div>
              <p className="mt-3 text-xs text-slate-500">Staff and administrator accounts are created by the college administrator.</p>
            </div>

            <div className="card card-pad mx-auto w-full max-w-md" aria-hidden="true">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Example complaint</p>
              <p className="mt-2 font-mono text-xs text-brand-700">CC-2026-0042</p>
              <p className="font-semibold text-slate-900">Wi-Fi down in library reading hall</p>
              <ol className="mt-5 space-y-3 text-sm">
                {[['Submitted', true], ['Under review', true], ['Assigned to IT Services', true], ['In progress', false], ['Resolved', false]].map(([t, done]) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{done ? '✓' : ''}</span>
                    <span className={done ? 'text-slate-900' : 'text-slate-400'}>{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="areas">
          <h2 id="areas" className="text-center text-xl font-semibold">Covers everything on campus</h2>
          <ul className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-slate-700">
            {[[Wifi, 'IT and Wi-Fi'], [Building, 'Classrooms and labs'], [Zap, 'Electricity'], [Droplets, 'Water supply'], [BookOpen, 'Library'], [ClipboardList, 'Hostel, canteen and more']].map(([Icon, t]) => (
              <li key={t} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2"><Icon size={16} className="text-brand-700" aria-hidden="true" /> {t}</li>
            ))}
          </ul>
        </section>

        <section className="bg-slate-50 py-14" aria-labelledby="features">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="features" className="text-center text-2xl font-semibold">Built for students, staff and administrators</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="card card-pad">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon size={20} aria-hidden="true" /></span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="how">
          <h2 id="how" className="text-center text-2xl font-semibold">How it works</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-900 text-sm font-semibold text-white">{i + 1}</span>
                <h3 className="mt-3 font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-slate-600">{d}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-6 text-center text-sm text-slate-500">
        CampusCare - Smart Campus Complaint Management System
      </footer>
    </div>
  );
}
