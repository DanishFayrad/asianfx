import sequelize from '../config/db.js';
import User from './User.js';
import Signal from './Signal.js';
import Transaction from './Transaction.js';
import UserSignal from './UserSignal.js';

// Associations
User.hasMany(Transaction, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Transaction.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(UserSignal, { foreignKey: 'user_id', onDelete: 'CASCADE' });
UserSignal.belongsTo(User, { foreignKey: 'user_id' });

Signal.hasMany(UserSignal, { foreignKey: 'signal_id', onDelete: 'CASCADE' });
UserSignal.belongsTo(Signal, { foreignKey: 'signal_id' });

export {
  sequelize,
  User,
  Signal,
  Transaction,
  UserSignal
};
