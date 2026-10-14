import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../server/db.js'
import { correctEntry, createCharge, getPersonBalancePaise, recordPayment } from '../server/ledger.js'
import { dashboard } from '../server/queries.js'

let db, userId, personId
beforeEach(() => {
  db = createDatabase(':memory:')
  userId = 'usr_test'; personId = 'per_test'
  db.prepare('INSERT INTO users (id,name,email,password_hash) VALUES (?,?,?,?)').run(userId,'Test Owner','owner@test.local','hash')
  db.prepare('INSERT INTO people (id,user_id,name) VALUES (?,?,?)').run(personId,userId,'Test Person')
})
afterEach(() => db.close())

describe('financial ledger', () => {
  it('calculates balance from charge and partial payment entries', () => {
    createCharge(db,userId,{personId,description:'Lunch',amount:1250.50,date:'2026-10-01'})
    const payment = recordPayment(db,userId,{personId,amount:400.25,date:'2026-10-02',method:'upi',reference:'REF-1'})
    expect(payment.balance).toBe(850.25)
    expect(getPersonBalancePaise(db,userId,personId)).toBe(85025)
  })

  it('supports a full payment and returns zero balance', () => {
    createCharge(db,userId,{personId,description:'Dinner',amount:999,date:'2026-10-01'})
    recordPayment(db,userId,{personId,amount:999,date:'2026-10-02',method:'cash'})
    expect(getPersonBalancePaise(db,userId,personId)).toBe(0)
  })

  it('rejects payments larger than the outstanding balance', () => {
    createCharge(db,userId,{personId,description:'Tea',amount:100,date:'2026-10-01'})
    expect(() => recordPayment(db,userId,{personId,amount:101,date:'2026-10-02',method:'cash'})).toThrow(/exceeds outstanding/i)
    expect(getPersonBalancePaise(db,userId,personId)).toBe(10000)
  })

  it('preserves history and corrects with reversal and replacement entries', () => {
    const charge = createCharge(db,userId,{personId,description:'Wrong amount',amount:500,date:'2026-10-01'})
    correctEntry(db,userId,charge.transactionId,{reason:'Amount was entered incorrectly',replacementAmount:350,replacementDescription:'Correct amount'})
    expect(getPersonBalancePaise(db,userId,personId)).toBe(35000)
    const entries = db.prepare('SELECT * FROM ledger_entries ORDER BY created_at,id').all()
    expect(entries).toHaveLength(3)
    expect(entries.map(x => x.amount_paise).sort((a,b)=>a-b)).toEqual([-50000,35000,50000])
    expect(db.prepare('SELECT * FROM corrections').all()).toHaveLength(1)
    const summary = dashboard(db,userId)
    expect(summary.totalUdhar).toBe(350)
    expect(summary.pending).toBe(350)
  })

  it('blocks direct update and deletion of ledger records', () => {
    const charge = createCharge(db,userId,{personId,description:'Protected',amount:100,date:'2026-10-01'})
    expect(() => db.prepare('UPDATE ledger_entries SET amount_paise=1 WHERE id=?').run(charge.transactionId)).toThrow(/immutable/i)
    expect(() => db.prepare('DELETE FROM ledger_entries WHERE id=?').run(charge.transactionId)).toThrow(/cannot be deleted/i)
  })

  it('persists records when the database is reopened', async () => {
    const { default: fs } = await import('node:fs')
    const { default: os } = await import('node:os')
    const { default: path } = await import('node:path')
    const file = path.join(os.tmpdir(), `khata-${Date.now()}.db`)
    const diskDb = createDatabase(file)
    diskDb.prepare('INSERT INTO users (id,name,email,password_hash) VALUES (?,?,?,?)').run('u','Owner','persist@test.local','x')
    diskDb.close()
    const reopened = createDatabase(file)
    expect(reopened.prepare('SELECT email FROM users WHERE id=?').get('u').email).toBe('persist@test.local')
    reopened.close(); fs.rmSync(file,{force:true})
  })
})
