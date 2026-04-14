import { DataTypes, Model } from 'sequelize';
import type { Optional } from 'sequelize';
import sequelize from '../config/db.js';

interface TransactionAttributes {
  id: number;
  user_id: number;
  amount: number;
  type: string;
  description?: string | null;
  created_at?: Date;
}

interface TransactionCreationAttributes extends Optional<TransactionAttributes, 'id'> {}

const Transaction = sequelize.define<Model<TransactionAttributes, TransactionCreationAttributes>>('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default Transaction;
export type { TransactionAttributes, TransactionCreationAttributes };
