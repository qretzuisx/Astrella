# Astrella Backend - SQL Version

This is the SQL-based backend for Astrella Gown Rental System. It provides the same functionality as the MongoDB backend but uses SQL databases (SQLite/MySQL/PostgreSQL) for offline development and deployment flexibility.

## 🌟 Features

- **SQLite by Default**: Zero configuration, no database server needed!
- **SQL Database Support**: Works with SQLite, MySQL, and PostgreSQL
- **Complete Feature Parity**: All features from the original MongoDB backend
- **ML-Powered Recommendations**: Hybrid recommendation system with Collaborative Filtering + Content-Based Filtering
- **Offline Development**: No internet connection required for local development
- **RESTful API**: Express.js-based REST API
- **Authentication**: JWT-based authentication system
- **Image Management**: ImageKit integration for image uploads
- **Booking System**: Complete gown rental booking management
- **Owner Management**: Shop owner verification and gown management

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn

**That's it!** SQLite is used by default (no database server needed!)

### Optional (if not using SQLite):
- MySQL (v8.0+) or PostgreSQL (v12+)

## 🚀 Quick Start

### ⚡ Super Fast Setup (SQLite - Recommended!)

**No database server needed!** Just 3 commands:

```bash
# 1. Install dependencies
cd Astrella/backend-sql
npm install

# 2. Create .env file (SQLite is default)
cp .env.example .env

# 3. Start server
npm run server
```

**Done!** 🎉 Your database is automatically created as `database.sqlite`

For detailed SQLite setup, see [SQLITE_QUICKSTART.md](./SQLITE_QUICKSTART.md)

---

### 🗄️ Alternative: MySQL/PostgreSQL Setup

If you prefer MySQL or PostgreSQL instead of SQLite:

#### For MySQL:
```bash
# Create database
mysql -u root -p
CREATE DATABASE astrella_gown_rental;
EXIT;

# Edit .env
cp .env.example .env
# Change DB_DIALECT=sqlite to DB_DIALECT=mysql
# Add MySQL credentials
```

#### For PostgreSQL:
```bash
# Create database
psql -U postgres
CREATE DATABASE astrella_gown_rental;
\q

# Edit .env
cp .env.example .env
# Change DB_DIALECT=sqlite to DB_DIALECT=postgres
# Add PostgreSQL credentials
```

### Environment Configuration Examples

**SQLite (Default - Simplest!):**
```env
DB_DIALECT=sqlite
DB_STORAGE=./database.sqlite
JWT_SECRET=your_secret_key_here
```

**MySQL:**
```env
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=astrella_gown_rental
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key_here
```

**PostgreSQL:**
```env
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=astrella_gown_rental
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key_here
```

### Run the Server

```bash
# Development mode (with auto-reload)
npm run server

# Production mode
npm start
```

The server will automatically create the database tables on first run.

## 📚 API Endpoints

### User Routes (`/api/user`)
- `POST /register` - Register new user
- `POST /login` - User login
- `GET /profile` - Get user profile (protected)
- `PUT /profile` - Update user profile (protected)
- `GET /gowns` - Get all available gowns
- `GET /gowns/:id` - Get gown details

### Owner Routes (`/api/owner`)
- `POST /request` - Request owner role (protected)
- `POST /gowns` - Add new gown (protected, owner only)
- `PUT /gowns/:id` - Update gown (protected, owner only)
- `DELETE /gowns/:id` - Delete gown (protected, owner only)
- `GET /my-gowns` - Get owner's gowns (protected, owner only)
- `GET /bookings` - Get owner's bookings (protected, owner only)

### Booking Routes (`/api/bookings`)
- `POST /` - Create booking (protected)
- `GET /user` - Get user's bookings (protected)
- `GET /owner` - Get owner's bookings (protected, owner only)
- `PUT /:id/confirm-pickup` - Confirm pickup (protected, owner only)
- `PUT /:id/confirm-return` - Confirm return (protected, owner only)
- `PUT /:id/cancel` - Cancel booking (protected)

### ML Recommendation Routes (`/api/ml`)
- `GET /recommendations` - Get ML-powered recommendations (public)
- `GET /similar-users` - Get recommendations from similar users (protected)
- `GET /personalized-feed` - Get personalized feed (protected)
- `POST /retrain` - Manually retrain ML model (admin)
- `GET /stats` - Get ML model statistics

## 🤖 Machine Learning Features

The backend includes a sophisticated ML recommendation system:

### Hybrid Recommendation Algorithm
1. **Collaborative Filtering**: Learns from user booking history
2. **Content-Based Filtering**: Matches gown attributes with user preferences
3. **Popularity-Based Ranking**: Considers trending gowns

### How It Works
- **For New Users**: Uses content-based filtering (80%) + popularity (20%)
- **For Existing Users**: Uses hybrid approach - Collaborative (50%) + Content-Based (40%) + Popularity (10%)

### Testing the ML Model

```bash
npm run test-ml
```

This will:
- Check database statistics
- Train the ML model
- Display model metrics
- Generate sample recommendations
- Run performance tests

## 🛠️ Utility Scripts

### Verify All Gowns
```bash
npm run verify-gowns
```
Sets all gowns in the database to `verified: true`

### Test ML Model
```bash
npm run test-ml
```
Runs comprehensive tests on the ML recommendation system

## 🔄 Database Comparison

### SQLite (Default) ⭐ RECOMMENDED
- ✅ **No server required** - Just Node.js!
- ✅ **Zero configuration** - Works out of the box
- ✅ **Single file** - Easy backup and sharing
- ✅ **Perfect for development** - Fast setup
- ✅ **Great for small-medium apps** - Handles thousands of users
- ✅ **100% offline** - No internet needed

### MySQL
- ✅ Good for large applications
- ✅ Widely supported hosting
- ⚠️ Requires MySQL server installation
- ⚠️ More configuration needed

### PostgreSQL
- ✅ Advanced features
- ✅ Great for complex queries
- ⚠️ Requires PostgreSQL server installation
- ⚠️ More configuration needed

**Recommendation**: Start with SQLite. It's perfect for development and works great for most applications!

## 📦 Dependencies

- **express**: Web framework
- **sequelize**: SQL ORM
- **sqlite3**: SQLite database driver (default)
- **mysql2**: MySQL database driver (optional)
- **pg**: PostgreSQL database driver (optional)
- **jsonwebtoken**: JWT authentication
- **bcrypt**: Password hashing
- **imagekit**: Image management
- **multer**: File upload handling
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variables

## 🐛 Troubleshooting

### SQLite Issues

**Issue: Database file not created**
- Check write permissions in directory
- Ensure `DB_STORAGE` path is valid

**Issue: Database is locked**
- Close any SQLite browser/viewer apps
- Only one connection can write at a time

### MySQL/PostgreSQL Issues

**Issue: Cannot connect to database**
- Verify database server is running
- Check credentials in `.env`
- Ensure database exists

**Issue: Tables not created**
- Check console for sync errors
- Verify user has CREATE TABLE permissions

## 📝 Development Notes

- The server auto-syncs database schema on startup
- Use `{ alter: true }` in `db.js` for schema updates in development
- ML model retrains automatically every 24 hours
- ImageKit is used for image storage (same as MongoDB version)

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected routes with middleware
- CORS configuration for frontend access
- SQL injection prevention (Sequelize parameterized queries)

## 📄 Documentation Files

- **[README.md](./README.md)** (this file) - Overview and quick start
- **[SQLITE_QUICKSTART.md](./SQLITE_QUICKSTART.md)** - Detailed SQLite guide
- **[SETUP.md](./SETUP.md)** - Complete setup guide
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - MongoDB to SQL migration
- **[SUMMARY.md](./SUMMARY.md)** - Project summary
- **[../BACKEND_COMPARISON.md](../BACKEND_COMPARISON.md)** - MongoDB vs SQL comparison

## 🆘 Support

For issues or questions:
1. Check [SQLITE_QUICKSTART.md](./SQLITE_QUICKSTART.md) for SQLite
2. Check [SETUP.md](./SETUP.md) for detailed setup
3. Review `.env.example` for configuration
4. Run `npm run test-ml` to verify ML setup
5. Check server logs for errors

## 🎯 Next Steps

1. ✅ Install dependencies (`npm install`)
2. ✅ Create `.env` file (`cp .env.example .env`)
3. ✅ Start server (`npm run server`)
4. ✅ Test ML model (`npm run test-ml`)
5. ✅ Connect frontend (update API URL)
6. ✅ Start developing!

---

**Note**: This backend is fully compatible with the existing Astrella frontend. Simply change the API URL to point to this server instead of the MongoDB version.

**Default choice: SQLite** - The simplest way to get started! 🚀
