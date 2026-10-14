import 'dotenv/config'
import { createDatabase } from './db.js'
import { createApp } from './app.js'

const port = Number(process.env.PORT || 4000)
const db = createDatabase()
const app = createApp(db)
app.listen(port, () => console.log(`KhataFlow API listening on http://localhost:${port}`))
