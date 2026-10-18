import {
  LayoutDashboard, PlusCircle, ListChecks, Bell, UserCog, Inbox, History, Users, Building2, Tags, Timer, BarChart3, MessageSquareText,
} from 'lucide-react';

export const NAV = {
  student: [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/student/new', label: 'Submit Complaint', icon: PlusCircle },
    { to: '/student/complaints', label: 'My Complaints', icon: ListChecks },
    { to: '/student/notifications', label: 'Notifications', icon: Bell },
    { to: '/student/profile', label: 'Profile & Settings', icon: UserCog },
  ],
  staff: [
    { to: '/staff', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/staff/assigned', label: 'Assigned Complaints', icon: Inbox },
    { to: '/staff/history', label: 'Resolution History', icon: History },
    { to: '/staff/notifications', label: 'Notifications', icon: Bell },
    { to: '/staff/profile', label: 'Profile & Settings', icon: UserCog },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/complaints', label: 'All Complaints', icon: ListChecks },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/departments', label: 'Departments', icon: Building2 },
    { to: '/admin/categories', label: 'Categories', icon: Tags },
    { to: '/admin/sla', label: 'SLA Settings', icon: Timer },
    { to: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
    { to: '/admin/feedback', label: 'Feedback', icon: MessageSquareText },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell },
    { to: '/admin/profile', label: 'Profile & Settings', icon: UserCog },
  ],
};
