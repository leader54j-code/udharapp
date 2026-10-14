import { fromPaise } from './lib.js'

const mapTxn = (r) => ({ ...r, amount: fromPaise(Math.abs(r.amount_paise)), signedAmount: fromPaise(r.amount_paise) })

export function dashboard(db, userId) {
  const totals = db.prepare(`SELECT
    COALESCE(SUM(CASE
      WHEN l.entry_type='charge' THEN l.amount_paise
      WHEN l.entry_type='adjustment' AND reversed.entry_type='charge' THEN l.amount_paise
      WHEN l.entry_type='adjustment' AND replacement_original.entry_type='charge' THEN l.amount_paise
      ELSE 0 END),0) total_udhar,
    COALESCE(SUM(CASE
      WHEN l.entry_type='payment' THEN -l.amount_paise
      WHEN l.entry_type='adjustment' AND reversed.entry_type='payment' THEN -l.amount_paise
      WHEN l.entry_type='adjustment' AND replacement_original.entry_type='payment' THEN -l.amount_paise
      ELSE 0 END),0) received,
    COALESCE(SUM(l.amount_paise),0) pending
    FROM ledger_entries l
    LEFT JOIN ledger_entries reversed ON reversed.id=l.reverses_entry_id
    LEFT JOIN corrections replacement ON replacement.replacement_entry_id=l.id
    LEFT JOIN ledger_entries replacement_original ON replacement_original.id=replacement.original_entry_id
    WHERE l.user_id=?`).get(userId)
  const overdue = db.prepare(`SELECT COALESCE(SUM(MIN(overdue_amount, MAX(balance, 0))),0) amount FROM (
    SELECT p.id,
      (SELECT COALESCE(SUM(o.amount_paise),0) FROM orders o WHERE o.person_id=p.id AND o.due_date < date('now')) overdue_amount,
      (SELECT COALESCE(SUM(l.amount_paise),0) FROM ledger_entries l WHERE l.person_id=p.id) balance
    FROM people p WHERE p.user_id=?
  )`).get(userId).amount
  const recent = db.prepare(`SELECT l.*, p.name person_name FROM ledger_entries l JOIN people p ON p.id=l.person_id
    WHERE l.user_id=? ORDER BY l.created_at DESC LIMIT 8`).all(userId).map(mapTxn)
  const trend = db.prepare(`SELECT substr(occurred_at,1,7) month,
    SUM(CASE WHEN amount_paise>0 THEN amount_paise ELSE 0 END) udhar,
    -SUM(CASE WHEN amount_paise<0 THEN amount_paise ELSE 0 END) received
    FROM ledger_entries WHERE user_id=? GROUP BY month ORDER BY month DESC LIMIT 6`).all(userId).reverse().map(r => ({ ...r, udhar: fromPaise(r.udhar), received: fromPaise(r.received) }))
  return { totalUdhar: fromPaise(totals.total_udhar), received: fromPaise(totals.received), pending: fromPaise(totals.pending), overdue: fromPaise(overdue), recent, trend }
}

export function listPeople(db, userId, search = '') {
  return db.prepare(`SELECT p.*,
    COALESCE(SUM(CASE WHEN l.entry_type='charge' THEN l.amount_paise ELSE 0 END),0) total_udhar_paise,
    COALESCE(-SUM(CASE WHEN l.entry_type='payment' THEN l.amount_paise ELSE 0 END),0) total_paid_paise,
    COALESCE(SUM(l.amount_paise),0) balance_paise
    FROM people p LEFT JOIN ledger_entries l ON l.person_id=p.id
    WHERE p.user_id=? AND (p.name LIKE ? OR p.phone LIKE ?)
    GROUP BY p.id ORDER BY p.name`).all(userId, `%${search}%`, `%${search}%`).map(r => ({ ...r, totalUdhar: fromPaise(r.total_udhar_paise), totalPaid: fromPaise(r.total_paid_paise), balance: fromPaise(r.balance_paise) }))
}

export function listTransactions(db, userId, filters = {}) {
  const where = ['l.user_id = ?']
  const params = [userId]
  if (filters.personId) { where.push('l.person_id = ?'); params.push(filters.personId) }
  if (filters.from) { where.push('date(l.occurred_at) >= date(?)'); params.push(filters.from) }
  if (filters.to) { where.push('date(l.occurred_at) <= date(?)'); params.push(filters.to) }
  if (filters.type) { where.push('l.entry_type = ?'); params.push(filters.type) }
  return db.prepare(`SELECT l.*,p.name person_name,c.reason correction_reason FROM ledger_entries l
    JOIN people p ON p.id=l.person_id LEFT JOIN corrections c ON c.original_entry_id=l.id
    WHERE ${where.join(' AND ')} ORDER BY l.occurred_at DESC,l.created_at DESC`).all(...params).map(mapTxn)
}
