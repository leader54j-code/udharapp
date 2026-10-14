import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createDatabase } from '../server/db.js'
import { createApp } from '../server/app.js'

let db, app, agent
beforeEach(() => { db=createDatabase(':memory:'); app=createApp(db,{uploadDir:'./uploads'}); agent=request.agent(app) })
afterEach(() => db.close())

describe('authenticated API persistence', () => {
  it('registers, creates a person, and persists a charge through the API', async () => {
    await agent.post('/api/auth/register').send({name:'Owner',email:'api@test.local',password:'password123'}).expect(201)
    const person = await agent.post('/api/people').send({name:'Customer',phone:'9999999999',notes:''}).expect(201)
    await agent.post('/api/charges').send({personId:person.body.person.id,description:'Food order',amount:750,date:'2026-10-01'}).expect(201)
    const dashboard = await agent.get('/api/dashboard').expect(200)
    expect(dashboard.body.pending).toBe(750)
  })

  it('rejects access without authentication', async () => {
    await request(app).get('/api/people').expect(401)
  })
})
