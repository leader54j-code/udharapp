import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { createDatabase } from '../db.js'
import { createCharge, recordPayment } from '../ledger.js'
import { id, now } from '../lib.js'

const db = createDatabase()
const email = 'demo@khataflow.in'
let user = db.prepare('SELECT * FROM users WHERE email=?').get(email)
if (!user) {
  user = { id: id('usr'), name: 'Aarav Sharma', email, password_hash: await bcrypt.hash('Demo@1234', 12) }
  db.prepare('INSERT INTO users (id,name,email,password_hash) VALUES (@id,@name,@email,@password_hash)').run(user)
}
if (!db.prepare('SELECT 1 FROM people WHERE user_id=? LIMIT 1').get(user.id)) {
  const samples = [
    ['Rohan Mehta','98765 43210','Prefers UPI'],
    ['Priya Kapoor','98111 22334','Office lunch account'],
    ['Vikram Singh','98990 11223','Pays every Friday'],
    ['Neha Verma','98220 45678',''],
  ].map(([name,phone,notes]) => ({ id: id('per'), user_id: user.id, name, phone, notes, created_at: now(), updated_at: now() }))
  const add = db.prepare('INSERT INTO people (id,user_id,name,phone,notes,created_at,updated_at) VALUES (@id,@user_id,@name,@phone,@notes,@created_at,@updated_at)')
  samples.forEach(sample => add.run(sample))
  const dates = ['2026-10-02','2026-10-05','2026-10-07','2026-10-09','2026-10-11','2026-10-12']
  createCharge(db,user.id,{personId:samples[0].id,description:'Team lunch — thali & lassi',amount:2450,date:dates[0],dueDate:'2026-10-10'})
  recordPayment(db,user.id,{personId:samples[0].id,amount:1000,date:dates[1],method:'upi',reference:'UPI-DEMO-1001',notes:'Partial payment'})
  createCharge(db,user.id,{personId:samples[1].id,description:'Office breakfast order',amount:1800,date:dates[2],dueDate:'2026-10-15'})
  createCharge(db,user.id,{personId:samples[2].id,description:'Friday snacks',amount:3280,date:dates[3],dueDate:'2026-10-12'})
  recordPayment(db,user.id,{personId:samples[2].id,amount:3280,date:dates[4],method:'bank',reference:'NEFT-DEMO-4421',notes:'Paid in full'})
  createCharge(db,user.id,{personId:samples[3].id,description:'Dinner parcel',amount:890,date:dates[5],dueDate:'2026-10-20'})
}
console.log('Seed complete. Login: demo@khataflow.in / Demo@1234')
db.close()
