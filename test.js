const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect().then(() => client.query('SELECT * FROM "AttendanceRecords" ORDER BY "CreatedAt" DESC LIMIT 5')).then(res => { console.log(res.rows); client.end(); }).catch(console.error);
