import { Tags } from 'lucide-react';
import CrudPage from '../../components/CrudPage.jsx';
import { formatHours } from '../../lib/format.js';

export default function Categories() {
  return (
    <CrudPage
      title="Complaint categories"
      subtitle="Students choose one of these when submitting a complaint"
      noun="Category"
      endpoint="/admin/categories"
      icon={Tags}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'defaultResolutionHours', label: 'Maximum resolution time (hours)', type: 'number', min: 1, default: 72, hint: 'The SLA target is the shorter of this and the priority target.' },
      ]}
      columns={[
        { label: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
        { label: 'Description', render: (r) => r.description || '-' },
        { label: 'Max resolution time', render: (r) => formatHours(r.defaultResolutionHours) },
      ]}
    />
  );
}
