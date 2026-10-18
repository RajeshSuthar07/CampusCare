/** Label + control + error message wrapper that wires up aria attributes. */
export default function Field({ id, label, error, hint, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-red-600" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  );
}
