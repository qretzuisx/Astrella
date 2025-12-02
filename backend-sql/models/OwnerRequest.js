import { DataTypes } from 'sequelize';
import { sequelize } from '../configs/db.js';
import User from './User.js';

const OwnerRequest = sequelize.define('OwnerRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  message: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  systemNote: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  reviewedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'owner_requests',
  timestamps: true
});

// Define associations
OwnerRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });
OwnerRequest.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });

User.hasMany(OwnerRequest, { foreignKey: 'userId', as: 'ownerRequests' });

export default OwnerRequest;
