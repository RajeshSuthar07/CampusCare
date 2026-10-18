import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, ImagePlus, Info, Loader2, X } from 'lucide-react';
import Field from './Field.jsx';
import PriorityBadge from './PriorityBadge.jsx';
import StatusBadge from './StatusBadge.jsx';
import { useMeta } from '../context/MetaContext.jsx';
import { useDebounced } from '../hooks/useQuery.js';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/format.js';

const MAX_IMAGE = 3 * 1024 * 1024;

const schema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120, 'Title is too long (max 120)'),
  category: z.string().min(1, 'Choose a category'),
  location: z.string().trim().min(2, 'Enter the building, room or location').max(120),
  description: z.string().trim().min(10, 'Describe the problem in at least 10 characters').max(2000, 'Description is too long (max 2000)'),
  priority: z.enum(['', 'low', 'medium', 'high']),
});

export default function ComplaintForm({ onSubmit, submitting }) {
  const { categories } = useMeta();
  const [image, setImage] = useState(null);
  const [imageError, setImageError] = useState('');
  const [preview, setPreview] = useState(null);
  const [check, setCheck] = useState(null);

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { title: '', category: '', location: '', description: '', priority: '' },
  });

  const [category, location, title, description] = useWatch({ control, name: ['category', 'location', 'title', 'description'] });
  const dCategory = useDebounced(category, 500);
  const dLocation = useDebounced(location, 500);
  const dTitle = useDebounced(title, 800);
  const dDescription = useDebounced(description, 800);

  // Live pre-check: transparent priority suggestion + possible duplicates (never auto-merged)
  useEffect(() => {
    if (!dCategory || (dLocation ?? '').trim().length < 2) {
      setCheck(null);
      return undefined;
    }
    let cancelled = false;
    api
      .get('/complaints/precheck', { category: dCategory, location: dLocation.trim(), title: dTitle, description: dDescription })
      .then((r) => !cancelled && setCheck(r.data))
      .catch(() => !cancelled && setCheck(null));
    return () => { cancelled = true; };
  }, [dCategory, dLocation, dTitle, dDescription]);

  useEffect(() => {
    if (!image) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function pickImage(e) {
    const file = e.target.files?.[0];
    setImageError('');
    if (!file) return setImage(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImageError('Only JPG, PNG or WebP images are allowed');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE) {
      setImageError('Image must be 3 MB or smaller');
      e.target.value = '';
      return;
    }
    setImage(file);
  }

  const submit = handleSubmit((values) => onSubmit(values, image));
  const duplicates = useMemo(() => check?.duplicates ?? [], [check]);

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field id="title" label="Title" required error={errors.title?.message}>
        <input id="title" className={`input ${errors.title ? 'input-error' : ''}`} placeholder="e.g. Projector not working in Room 204" aria-invalid={!!errors.title} {...register('title')} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="category" label="Category" required error={errors.category?.message}>
          <select id="category" className={`input ${errors.category ? 'input-error' : ''}`} aria-invalid={!!errors.category} {...register('category')}>
            <option value="">Select a category</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </Field>
        <Field id="location" label="Building, room or location" required error={errors.location?.message}>
          <input id="location" className={`input ${errors.location ? 'input-error' : ''}`} placeholder="e.g. Block B, Lab 3" aria-invalid={!!errors.location} {...register('location')} />
        </Field>
      </div>

      {duplicates.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4" role="status">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle size={16} aria-hidden="true" /> A similar complaint is already open
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Someone may have already reported this location and category in the last 14 days. You can still submit yours - nothing is merged automatically.
          </p>
          <ul className="mt-3 space-y-2">
            {duplicates.map((d) => (
              <li key={d.complaintNumber} className="flex flex-wrap items-center gap-2 rounded-md bg-white/70 px-3 py-2 text-sm">
                <span className="font-mono text-xs font-medium text-brand-700">{d.complaintNumber}</span>
                <StatusBadge status={d.status} />
                <span className="text-xs text-slate-500">filed {formatDate(d.createdAt)}</span>
                {d.canView ? (
                  <Link to={`/student/complaints/${d.id}`} className="ml-auto text-xs font-medium text-brand-700 hover:underline" target="_blank" rel="noreferrer">
                    View your complaint
                  </Link>
                ) : (
                  <span className="ml-auto text-xs text-slate-500">Reported by another student</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Field id="description" label="Description" required error={errors.description?.message} hint="What is wrong, since when, and how many people it affects.">
        <textarea id="description" rows={5} className={`input ${errors.description ? 'input-error' : ''}`} aria-invalid={!!errors.description} {...register('description')} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="priority" label="Priority" hint="Leave on suggested to let CampusCare decide using the rules below. Critical is set by the rules or an admin.">
          <select id="priority" className="input" {...register('priority')}>
            <option value="">Use suggested priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>

        <div>
          <span className="label">Photo (optional)</span>
          {preview ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2">
              <img src={preview} alt="Selected attachment preview" className="h-16 w-16 rounded-md object-cover" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">{image.name}</p>
                <p className="text-xs text-slate-500">{(image.size / 1024).toFixed(0)} KB</p>
              </div>
              <button type="button" className="btn-ghost !min-h-9 !px-2" onClick={() => setImage(null)} aria-label="Remove photo">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <label htmlFor="image" className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 focus-within:outline-2 focus-within:outline-brand-600">
              <ImagePlus size={18} aria-hidden="true" /> Attach a JPG, PNG or WebP (max 3 MB)
              <input id="image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pickImage} />
            </label>
          )}
          {imageError && <p className="field-error" role="alert">{imageError}</p>}
        </div>
      </div>

      {check && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800">
            <Info size={16} className="text-brand-700" aria-hidden="true" /> Suggested priority: <PriorityBadge priority={check.suggestedPriority} />
          </p>
          {check.reasons.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {check.reasons.map((r, i) => (
                <li key={i}><span className="font-mono text-slate-500">{r.effect}</span> {r.rule}{r.note ? ` - ${r.note}` : ''}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-slate-500">No urgency rules matched yet. Add more detail to the description if this affects safety or many people.</p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Link to="/student/complaints" className="btn-secondary">Cancel</Link>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          Submit complaint
        </button>
      </div>
    </form>
  );
}
