import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PageHeader from '../../components/PageHeader.jsx';
import ComplaintForm from '../../components/ComplaintForm.jsx';
import { api } from '../../lib/api.js';

export default function SubmitComplaint() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(values, image) {
    setSubmitting(true);
    setError('');
    try {
      let body;
      if (image) {
        body = new FormData();
        Object.entries(values).forEach(([k, v]) => v && body.append(k, v));
        body.append('image', image);
      } else {
        body = { ...values, priority: values.priority || undefined };
      }
      const res = await api.post('/complaints', body);
      const c = res.data.complaint;
      toast.success(`Complaint ${c.complaintNumber} submitted`);
      navigate(`/student/complaints/${c._id}`);
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Submit a complaint" subtitle="Describe the problem so the right team can fix it quickly" />
      <div className="card card-pad mx-auto max-w-3xl">
        {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</div>}
        <ComplaintForm onSubmit={onSubmit} submitting={submitting} />
      </div>
    </>
  );
}
