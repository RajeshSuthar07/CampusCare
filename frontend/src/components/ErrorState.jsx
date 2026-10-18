import { AlertCircle } from 'lucide-react';

export default function ErrorState({ error, onRetry }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center" role="alert">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertCircle size={22} aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold text-slate-900">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{error?.message || 'We could not load this page.'}</p>
      {onRetry && (
        <button type="button" className="btn-secondary mt-5" onClick={() => onRetry()}>
          Try again
        </button>
      )}
    </div>
  );
}
