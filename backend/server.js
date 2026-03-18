import express, { response } from "express";
import "dotenv/config";
import cors from "cors";
import connectDb from "./configs/db.js";
import userRouter from "./routes/userRoutes.js";
import ownerRouter from "./routes/ownerRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import mlRouter from "./routes/mlRoutes.js";

const app = express()

await connectDb()


const allowedOrigins = new Set(
  [
    // Local dev (Vite)
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',

    // Other common local dev ports
    'http://localhost:3000',
    'http://127.0.0.1:3000',

    // Configurable + production
    process.env.FRONTEND_URL,
    'https://astrella.vercel.app',
  ].filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, or curl)
      if (!origin) return callback(null, true);

      if (!allowedOrigins.has(origin)) {
        const msg = `CORS blocked for origin: ${origin}`;
        return callback(new Error(msg), false);
      }

      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());

app.get('/', (req, res) => res.send("Server is running"))
// API Route mapping
app.use('/api/user', userRouter)     // User profiles and general actions
app.use('/api/owner', ownerRouter)   // Boutique owner management
app.use('/api/bookings', bookingRouter) // Booking and schedule logic
app.use('/api/ml', mlRouter)        // AI-powered style recommendations

const PORT = process.env.PORT || 5000;
app.listen(PORT);