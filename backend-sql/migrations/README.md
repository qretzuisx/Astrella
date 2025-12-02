# Database Migrations

This folder is for database migration scripts. 

## Auto-Sync vs Migrations

Currently, the SQL backend uses **auto-sync** which automatically creates and updates tables based on your models. This is enabled in `configs/db.js`:

```javascript
await sequelize.sync({ alter: false });
```

## When to Use Migrations

For **production environments**, you should use proper migrations instead of auto-sync:

1. Better control over schema changes
2. Version control for database schema
3. Ability to rollback changes
4. Safer for production data

## Creating Migrations

### Manual Approach
Create migration files in this folder:

```javascript
// migrations/001-create-users.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('users', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    // ... other fields
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false
    }
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('users');
}
```

### Using Sequelize CLI (Recommended for Production)

1. Install Sequelize CLI:
```bash
npm install --save-dev sequelize-cli
```

2. Initialize migrations:
```bash
npx sequelize-cli init
```

3. Generate migration:
```bash
npx sequelize-cli migration:generate --name create-users-table
```

4. Edit the generated migration file

5. Run migrations:
```bash
npx sequelize-cli db:migrate
```

6. Rollback if needed:
```bash
npx sequelize-cli db:migrate:undo
```

## Migration Scripts

You can create custom migration scripts for specific tasks:

### Example: Migrate from MongoDB
```javascript
// migrations/mongoToSql.js
import mongoose from 'mongoose';
import { sequelize } from '../configs/db.js';
// Import both MongoDB and SQL models

async function migrateData() {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Migrate users
  const mongoUsers = await MongoUser.find();
  for (const user of mongoUsers) {
    await SqlUser.create({
      name: user.name,
      email: user.email,
      // ... map fields
    });
  }
  
  // Migrate gowns, bookings, etc.
}

migrateData();
```

### Example: Seed Database
```javascript
// migrations/seed.js
import { sequelize } from '../configs/db.js';
import User from '../models/User.js';
import Gown from '../models/Gown.js';

async function seedDatabase() {
  // Create test users
  const owner = await User.create({
    name: 'Test Owner',
    email: 'owner@test.com',
    password: 'hashed_password',
    role: 'owner',
    shopName: 'Test Shop'
  });
  
  // Create test gowns
  await Gown.create({
    ownerId: owner.id,
    name: 'Elegant Wedding Gown',
    location: 'Manila',
    contactNumber: '09123456789',
    eventType: ['wedding'],
    fabric: 'Satin',
    price: 5000,
    color: 'White',
    image: ['image1.jpg']
  });
  
  console.log('Database seeded!');
}

seedDatabase();
```

## Current Setup

The backend currently uses **auto-sync** for ease of development. Tables are automatically created when you start the server.

To switch to migrations for production:

1. Set `sync: false` in `configs/db.js`
2. Create migration files
3. Run migrations before starting server
4. Update deployment scripts

## Best Practices

- ✅ Use auto-sync for local development
- ✅ Use migrations for staging/production
- ✅ Always backup database before migrations
- ✅ Test migrations on a copy of production data
- ✅ Version control all migration files
- ✅ Never modify existing migrations after deployment

## Notes

- Auto-sync is enabled by default for quick setup
- Sequelize will log SQL queries if `logging: true` in `configs/db.js`
- All models are synced when the server starts
- Foreign keys and constraints are automatically created
