import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import { connectDB } from './lib/db.js';
import { ENV } from './lib/env.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import {app,server} from './lib/socket.js';
import friendRoutes from "./routes/friend.route.js";




const __dirname = path.resolve();

const PORT = ENV.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cors({origin:ENV.CLIENT_URL,credentials:true}));
app.use(cookieParser());

app.use("/api/auth",authRoutes);
app.use("/api/messages",messageRoutes);
app.use("/api/friends", friendRoutes);

if (ENV.NODE_ENV === 'production') {
    // ✅ Correct (No ../)
app.use(express.static(path.join(__dirname, 'Frontend/vite-project/dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend/vite-project/dist/index.html'));
});
}


server.listen(PORT, () => {
    console.log('Server is running on port:'+PORT)
    connectDB();
});