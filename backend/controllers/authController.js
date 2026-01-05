const User = require('../models/User'); // Ensure path is correct
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { email, password, publicKey, wrappedPrivateKey, keySalt } = req.body;

  try {
    // This line caused your error because 'User' wasn't a valid model object
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Save the Zero-Knowledge identity fields [cite: 6, 52]
    const user = await User.create({ 
      email, 
      passwordHash, 
      publicKey, 
      wrappedPrivateKey, 
      keySalt 
    });

    res.status(201).json({ message: 'User created' });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // Return backup fields so new browsers can restore identity [cite: 6]
    res.json({ 
      token, 
      publicKey: user.publicKey,
      wrappedPrivateKey: user.wrappedPrivateKey,
      keySalt: user.keySalt
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};