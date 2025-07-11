// Required modules
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const router = express.Router();
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));


app.use(cors());
app.use(express.json()); // required for parsing JSON


// Temporary dummy user
const dummyUser = {
  email: 'admin@securefiles.com',
  password: 'test123'
};


// Connect DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// ✅ Register routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files')); // <== Don't miss this

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (email !== dummyUser.email || password !== dummyUser.password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: email }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

  res.json({ token });
});

const startCleanupJob = require('./cron/cleanup');
startCleanupJob();


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
