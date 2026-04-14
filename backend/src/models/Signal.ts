import { DataTypes, Model } from 'sequelize';
import type { Optional } from 'sequelize';
import sequelize from '../config/db.js';

interface SignalAttributes {
  id: number;
  symbol: string;
  type: string;
  entry_price: number;
  target_price: number;
  stop_loss: number;
  status?: string;
  result?: string;
  signal_type?: string;
  created_by: number;
  expires_at?: Date | null;
  total_taken?: number;
  total_wins?: number;
  total_losses?: number;
  description?: string | null;
  image_url?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface SignalCreationAttributes extends Optional<SignalAttributes, 'id'> {}

const Signal = sequelize.define<Model<SignalAttributes, SignalCreationAttributes>>('Signal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  symbol: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  type: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  entry_price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  target_price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  stop_loss: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active'
  },
  result: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending'
  },
  signal_type: {
    type: DataTypes.STRING(20),
    defaultValue: 'free'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  total_taken: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_wins: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_losses: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'signals',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default Signal;
export type { SignalAttributes, SignalCreationAttributes };
