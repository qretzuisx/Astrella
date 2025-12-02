import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;

// SQLite configuration (simplest - no server needed!)
if (dialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite', // Database file location
    logging: false, // Set to console.log to see SQL queries
    define: {
      timestamps: true,
      underscored: false
    }
  });
} 
// MySQL/PostgreSQL configuration (requires server)
else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'astrella_gown_rental',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: dialect,
      logging: false, // Set to console.log to see SQL queries
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: true,
        underscored: false
      }
    }
  );
}

const connectDb = async () => {
  try {
    await sequelize.authenticate();
    if (dialect === 'sqlite') {
      console.log('✅ SQLite Database Connected Successfully');
    } else {
      console.log(`✅ ${dialect.toUpperCase()} Database Connected Successfully`);
    }
    
    // Sync all models with database
    await sequelize.sync({ alter: false }); // Use { force: true } to drop tables, { alter: true } to update schema
    console.log('✅ Database Synchronized');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    process.exit(1);
  }
};

export { sequelize, connectDb };
export default connectDb;
