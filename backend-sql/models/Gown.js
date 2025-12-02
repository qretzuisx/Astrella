import { DataTypes } from 'sequelize';
import { sequelize } from '../configs/db.js';
import User from './User.js';

const Gown = sequelize.define('Gown', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contactNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  eventType: {
    type: DataTypes.JSON, // Stores array as JSON
    allowNull: true,
    defaultValue: [],
    validate: {
      isValidEventTypes(value) {
        const validTypes = ["wedding", "traditional", "prom", "formal", "themed"];
        if (Array.isArray(value)) {
          for (let type of value) {
            if (!validTypes.includes(type)) {
              throw new Error(`Invalid event type: ${type}`);
            }
          }
        }
      }
    }
  },
  fabric: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  size: {
    type: DataTypes.JSON, // Stores array as JSON
    defaultValue: ["Free Size"]
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image: {
    type: DataTypes.JSON, // Stores array of image URLs as JSON
    allowNull: false
  },
  available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  laundryDays: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 0,
      max: 14
    }
  }
}, {
  tableName: 'gowns',
  timestamps: true
});

// Define associations
Gown.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
User.hasMany(Gown, { foreignKey: 'ownerId', as: 'gowns' });

export default Gown;
