import { Building2 } from 'lucide-react';
import CrudPage from '../../components/CrudPage.jsx';

export default function Departments() {
  return (
    <CrudPage
      title="Departments"
      subtitle="Teams that complaints can be routed to"
      noun="Department"
      endpoint="/admin/departments"
      icon={Building2}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
      ]}
      columns={[
        { label: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
        { label: 'Description', render: (r) => r.description || '-' },
        { label: 'Active staff', render: (r) => r.staffCount },
      ]}
    />
  );
}
