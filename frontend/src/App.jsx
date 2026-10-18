import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute, { FullPageSpinner } from './components/ProtectedRoute.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';

const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard.jsx'));
const SubmitComplaint = lazy(() => import('./pages/student/SubmitComplaint.jsx'));
const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const Reports = lazy(() => import('./pages/admin/Reports.jsx'));
const Users = lazy(() => import('./pages/admin/Users.jsx'));
const Departments = lazy(() => import('./pages/admin/Departments.jsx'));
const Categories = lazy(() => import('./pages/admin/Categories.jsx'));
const SlaSettings = lazy(() => import('./pages/admin/SlaSettings.jsx'));
const FeedbackPage = lazy(() => import('./pages/admin/FeedbackPage.jsx'));
const ComplaintsList = lazy(() => import('./pages/ComplaintsList.jsx'));
const ComplaintDetail = lazy(() => import('./pages/ComplaintDetail.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute role="student" />}>
          <Route element={<AppLayout />}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/new" element={<SubmitComplaint />} />
            <Route
              path="/student/complaints"
              element={<ComplaintsList base="/student" title="My Complaints" subtitle="Every complaint you have submitted" variant="student" />}
            />
            <Route path="/student/complaints/:id" element={<ComplaintDetail base="/student" />} />
            <Route path="/student/notifications" element={<Notifications base="/student" />} />
            <Route path="/student/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="staff" />}>
          <Route element={<AppLayout />}>
            <Route path="/staff" element={<StaffDashboard />} />
            <Route
              path="/staff/assigned"
              element={<ComplaintsList base="/staff" title="Assigned Complaints" subtitle="Open complaints assigned to you or routed to your department" variant="staff" fixed={{ scope: 'open' }} />}
            />
            <Route
              path="/staff/history"
              element={<ComplaintsList base="/staff" title="Resolution History" subtitle="Complaints that have been resolved or closed" variant="staff" fixed={{ scope: 'done' }} />}
            />
            <Route path="/staff/complaints/:id" element={<ComplaintDetail base="/staff" />} />
            <Route path="/staff/notifications" element={<Notifications base="/staff" />} />
            <Route path="/staff/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="admin" />}>
          <Route element={<AppLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route
              path="/admin/complaints"
              element={<ComplaintsList base="/admin" title="All Complaints" subtitle="Search, filter and manage every complaint on campus" variant="admin" />}
            />
            <Route path="/admin/complaints/:id" element={<ComplaintDetail base="/admin" />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/departments" element={<Departments />} />
            <Route path="/admin/categories" element={<Categories />} />
            <Route path="/admin/sla" element={<SlaSettings />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/feedback" element={<FeedbackPage />} />
            <Route path="/admin/notifications" element={<Notifications base="/admin" />} />
            <Route path="/admin/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
