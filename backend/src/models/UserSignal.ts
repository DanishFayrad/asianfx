import { DataTypes, Model } from 'sequelize';
import type { Optional } from 'sequelize';
import sequelize from '../config/db.js';

interface UserSignalAttributes {
  id: number;
  user_id: number;
  signal_id: number;
  taken_price: number;
  result?: string;
  profit_loss?: number;
  invested_amount?: number;
  deducted_amount?: number;
  taken_at?: Date;
  closed_at?: Date | null;
}

interface UserSignalCreationAttributes extends Optional<UserSignalAttributes, 'id'> {}

const UserSignal = sequelize.define<Model<UserSignalAttributes, UserSignalCreationAttributes>>('UserSignal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  signal_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  taken_price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  result: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending'
  },
  profit_loss: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  invested_amount: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  deducted_amount: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  taken_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  closed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'usersignals',
  timestamps: false
});

export default UserSignal;
export type { UserSignalAttributes, UserSignalCreationAttributes };
