const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ ALL ROUTES (NO DUPLICATES)
app.use('/api/requests', require('./routes/requestsRouter'));
app.use('/api/auth', require('./routes/authRouter'));
app.use('/api/skills', require('./routes/skillsRouter'));

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'SkillSwap Pro API ✅' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
