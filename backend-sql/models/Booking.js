import { DataTypes } from 'sequelize';
import { sequelize } from '../configs/db.js';
import User from './User.js';
import Gown from './Gown.js';

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  gownId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'gowns',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'canceled', 'completed'),
    defaultValue: 'pending'
  },
  pickupDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  returnDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  pickupTime: {
    type: DataTypes.STRING,
    allowNull: true
  },
  returnTime: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pickupConfirmedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  returnConfirmedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  contactNumber: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  // Measurements
  waist: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  hips: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  measurementUnit: {
    type: DataTypes.STRING,
    defaultValue: 'inches'
  },
  // Payment information
  paymentMethod: {
    type: DataTypes.ENUM('gcash'),
    defaultValue: 'gcash'
  },
  depositAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  remainingBalance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  transactionRef: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paymentScreenshot: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    defaultValue: 'pending'
  },
  paymentVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paymentVerifiedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  balancePaidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  balancePaidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  }
}, {
  tableName: 'bookings',
  timestamps: true
});

// Define associations
Booking.belongsTo(Gown, { foreignKey: 'gownId', as: 'gown' });
Booking.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Booking.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Booking.belongsTo(User, { foreignKey: 'paymentVerifiedBy', as: 'verifier' });

Gown.hasMany(Booking, { foreignKey: 'gownId', as: 'bookings' });
User.hasMany(Booking, { foreignKey: 'userId', as: 'userBookings' });
User.hasMany(Booking, { foreignKey: 'ownerId', as: 'ownerBookings' });

export default Booking;