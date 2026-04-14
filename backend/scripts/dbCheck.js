import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function checkAndCreateDatabase() {
  const connectionString = process.env.DATABASE_URL;
  const dbName = connectionString.split('/').pop();
  const baseUrl = connectionString.replace(`/${dbName}`, '/postgres');

  const client = new Client({
    connectionString: baseUrl,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server.');

    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
    if (res.rowCount === 0) {
      console.log(`Database '${dbName}' does not exist. Creating...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database '${dbName}' created successfully.`);
    } else {
      console.log(`Database '${dbName}' already exists.`);
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('Error: Could not connect to PostgreSQL. Is the service running?');
    } else {
      console.error('Error:', err.message);
    }
  } finally {
    await client.end();
  }
}

checkAndCreateDatabase();
