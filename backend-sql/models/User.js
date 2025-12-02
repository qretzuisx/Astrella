import { DataTypes } from 'sequelize';
import { sequelize } from '../configs/db.js';

const User = sequelize.define('User', {
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
  role: {
    type: DataTypes.ENUM('owner', 'user'),
    defaultValue: 'user'
  },
  image: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  contactNumber: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Shop Profile fields (for owners)
  shopName: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  shopDescription: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  shopAddress: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  shopCity: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  shopContactNumber: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  operatingHours: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  businessPermit: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  dtiRegistration: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  facebookUrl: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  instagramUrl: {
    type: DataTypes.STRING,
    defaultValue: ''
  }
}, {
  tableName: 'users',
  timestamps: true
});

export default User;
