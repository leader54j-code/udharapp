import { fromPaise, id, now, toPaise } from './lib.js'

export function getPersonBalancePaise(db, userId, personId) {
  return db.prepare('SELECT COALESCE(SUM(amount_paise), 0) balance FROM ledger_entries WHERE user_id = ? AND person_id = ?').get(userId, personId).balance
}

function assertOwnsPerson(db, userId, personId) {
  const person = db.prepare('SELECT * FROM people WHERE id = ? AND user_id = ?').get(personId, userId)
  if (!person) throw Object.assign(new Error('Person not found'), { status: 404 })
  return person
}

export function createCharge(db, userId, input) {
  const run = db.transaction(() => {
    assertOwnsPerson(db, userId, input.personId)
    const amountPaise = toPaise(input.amount)
    const orderId = id('ord')
    const entryId = id('txn')
    const createdAt = now()
    db.prepare(`INSERT INTO orders (id,user_id,person_id,description,amount_paise,order_date,due_date,created_at)
      VALUES (?,?,?,?,?,?,?,?)`).run(orderId, userId, input.personId, input.description.trim(), amountPaise, input.date, input.dueDate || null, createdAt)
    db.prepare(`INSERT INTO ledger_entries (id,user_id,person_id,entry_type,amount_paise,description,occurred_at,source_id,created_at)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(entryId, userId, input.personId, 'charge', amountPaise, input.description.trim(), input.date, orderId, createdAt)
    return { id: orderId, transactionId: entryId, amount: fromPaise(amountPaise) }
  })
  return run()
}

export function recordPayment(db, userId, input) {
  const run = db.transaction(() => {
    assertOwnsPerson(db, userId, input.personId)
    const amountPaise = toPaise(input.amount)
    const outstanding = getPersonBalancePaise(db, userId, input.personId)
    if (amountPaise > outstanding) throw Object.assign(new Error(`Payment exceeds outstanding balance of ₹${fromPaise(outstanding).toFixed(2)}`), { status: 400 })
    const paymentId = id('pay')
    const entryId = id('txn')
    const createdAt = now()
    db.prepare(`INSERT INTO payments (id,user_id,person_id,amount_paise,payment_date,method,reference,notes,created_at)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(paymentId, userId, input.personId, amountPaise, input.date, input.method || 'cash', input.reference?.trim() || null, input.notes?.trim() || '', createdAt)
    db.prepare(`INSERT INTO ledger_entries (id,user_id,person_id,entry_type,amount_paise,description,occurred_at,source_id,created_at)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(entryId, userId, input.personId, 'payment', -amountPaise, input.notes?.trim() || `Payment via ${input.method || 'cash'}`, input.date, paymentId, createdAt)
    return { id: paymentId, transactionId: entryId, amount: fromPaise(amountPaise), balance: fromPaise(outstanding - amountPaise) }
  })
  return run()
}

export function correctEntry(db, userId, entryId, input) {
  const run = db.transaction(() => {
    const original = db.prepare('SELECT * FROM ledger_entries WHERE id = ? AND user_id = ?').get(entryId, userId)
    if (!original) throw Object.assign(new Error('Transaction not found'), { status: 404 })
    if (db.prepare('SELECT 1 FROM corrections WHERE original_entry_id = ?').get(entryId)) throw Object.assign(new Error('This transaction has already been corrected'), { status: 409 })
    if (!input.reason?.trim()) throw Object.assign(new Error('A correction reason is required'), { status: 400 })
    const createdAt = now()
    const reversalId = id('txn')
    db.prepare(`INSERT INTO ledger_entries (id,user_id,person_id,entry_type,amount_paise,description,occurred_at,reverses_entry_id,created_at)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(reversalId, userId, original.person_id, 'adjustment', -original.amount_paise, `Reversal: ${input.reason.trim()}`, createdAt, original.id, createdAt)
    let replacementId = null
    if (input.replacementAmount !== undefined && input.replacementAmount !== null && input.replacementAmount !== '') {
      replacementId = id('txn')
      const absolute = toPaise(input.replacementAmount)
      const signed = original.amount_paise < 0 ? -absolute : absolute
      db.prepare(`INSERT INTO ledger_entries (id,user_id,person_id,entry_type,amount_paise,description,occurred_at,created_at)
        VALUES (?,?,?,?,?,?,?,?)`).run(replacementId, userId, original.person_id, 'adjustment', signed, input.replacementDescription?.trim() || original.description, createdAt, createdAt)
    }
    const correctionId = id('cor')
    db.prepare(`INSERT INTO corrections (id,user_id,original_entry_id,reversal_entry_id,replacement_entry_id,reason,created_at)
      VALUES (?,?,?,?,?,?,?)`).run(correctionId, userId, original.id, reversalId, replacementId, input.reason.trim(), createdAt)
    return { id: correctionId, reversalTransactionId: reversalId, replacementTransactionId: replacementId }
  })
  return run()
}
