const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('/data/streetlifting.db');

// Register route
router.post('/register', async (req, res) => {
  const { email, password, name, role } = req.body;

  try {
    // Check if user exists
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      db.run(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, name, role],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error creating user' });
          }

          const userId = this.lastID;

          // Create user profile
          db.run(
            'INSERT INTO user_profiles (user_id) VALUES (?)',
            [userId],
            (err) => {
              if (err) {
                console.error('Error creating user profile:', err);
              }
            }
          );

          // Create token
          const token = jwt.sign(
            { id: userId, email, role },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '7d' }
          );

          res.status(201).json({
            token,
            user: {
              id: userId,
              email,
              name,
              role
            }
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login route
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  });
});

module.exports = router; 