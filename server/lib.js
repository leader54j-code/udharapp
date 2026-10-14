import crypto from 'node:crypto'

export const id = (prefix) => `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`
export const now = () => new Date().toISOString()

export function toPaise(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) throw Object.assign(new Error('Amount must be greater than zero'), { status: 400 })
  return Math.round(amount * 100)
}

export function fromPaise(value) { return Number(value || 0) / 100 }

export function publicPerson(row) {
  return { ...row, balance: fromPaise(row.balance_paise), totalUdhar: fromPaise(row.total_udhar_paise), totalPaid: fromPaise(row.total_paid_paise) }
}
