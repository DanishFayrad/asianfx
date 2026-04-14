import { DataTypes, Model } from 'sequelize';
import type { Optional } from 'sequelize';
import sequelize from '../config/db.js';

interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password?: string;
  wallet_balance?: number;
  free_signal_available?: boolean;
  is_admin?: boolean;
  is_email_verified?: boolean;
  email_verification_token?: string | null;
  verification_token_expires?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

const User = sequelize.define<Model<UserAttributes, UserCreationAttributes>>('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  wallet_balance: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  free_signal_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_admin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  email_verification_token: {
    type: DataTypes.STRING,
    allowNull: true
  },
  verification_token_expires: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default User;
export type { UserAttributes, UserCreationAttributes };
