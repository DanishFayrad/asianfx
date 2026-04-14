import pg from 'pg';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined in .env');
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  dialectModule: pg,
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

export default sequelize;
