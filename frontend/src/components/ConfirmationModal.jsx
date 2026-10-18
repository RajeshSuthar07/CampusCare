import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Accessible confirmation dialog built on the native <dialog> element
 * (focus trapping, Escape to close and inert background come from the browser).
 * Optional `children` render extra fields (e.g. a reason textarea).
 */
export default function ConfirmationModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel?.();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onCancel?.();
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-900/50"
    >
      {open && (
        <form
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy && !confirmDisabled) onConfirm?.();
          }}
          className="p-5 sm:p-6"
        >
          <h2 id="confirm-title" className="text-lg font-semibold">{title}</h2>
          {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </button>
            <button type="submit" className={tone === 'danger' ? 'btn-danger' : 'btn-primary'} disabled={busy || confirmDisabled}>
              {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {confirmLabel}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
