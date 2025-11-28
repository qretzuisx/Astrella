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


const allowedOrigins = [
    'http://localhost:5173', 
    'http://localhost:5174',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
    'https://astrella.vercel.app' 
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

app.use(express.json());

app.get('/', (req, res) => res.send("Server is running"))
app.use('/api/user', userRouter)
app.use('/api/owner', ownerRouter)
app.use('/api/bookings', bookingRouter)
app.use('/api/ml', mlRouter) // ML-powered recommendations

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));