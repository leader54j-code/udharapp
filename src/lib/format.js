export const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const shortDate = (value) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
export const initials = (name = '') => name.split(' ').map(x => x[0]).slice(0,2).join('').toUpperCase()
export const today = () => new Date().toISOString().slice(0,10)
