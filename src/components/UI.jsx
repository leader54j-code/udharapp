import { AlertCircle, LoaderCircle, X } from 'lucide-react'

export function Button({ children, variant='primary', className='', loading, ...props }) {
  const styles = { primary:'bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-blue-200', secondary:'border border-slate-200 bg-white text-ink hover:bg-slate-50', danger:'bg-red-600 text-white hover:bg-red-700' }
  return <button className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`} disabled={loading || props.disabled} {...props}>{loading && <LoaderCircle size={17} className="animate-spin"/>}{children}</button>
}
export function Modal({ title, description, open, onClose, children, size='max-w-lg' }) {
  if (!open) return null
  return <div className="fixed inset-0 z-[60] grid place-items-center p-4"><button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"/><section role="dialog" aria-modal="true" className={`relative max-h-[90vh] w-full overflow-auto rounded-3xl bg-white p-6 shadow-2xl ${size}`}><button onClick={onClose} className="absolute right-5 top-5 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={20}/></button><h2 className="pr-8 text-xl font-extrabold text-ink">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}<div className="mt-6">{children}</div></section></div>
}
export function Field({ label, error, children }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}{error && <span className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle size={12}/>{error}</span>}</label> }
export function EmptyState({ icon:Icon, title, text, action }) { return <div className="grid place-items-center px-5 py-16 text-center"><span className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary-50 text-primary-600"><Icon size={26}/></span><h3 className="font-extrabold text-ink">{title}</h3><p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>{action && <div className="mt-5">{action}</div>}</div> }
export function Loading({ label='Loading your khata…' }) { return <div className="grid min-h-[320px] place-items-center"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-primary-600" size={30}/><p className="mt-3 text-sm font-semibold text-slate-500">{label}</p></div></div> }
export function ErrorMessage({ message }) { return message ? <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"><AlertCircle size={17}/>{message}</div> : null }
