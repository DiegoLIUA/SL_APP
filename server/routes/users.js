const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { authMiddleware } = require('../middleware/auth');

const db = new sqlite3.Database('./database/streetlifting.db');

// Get current user profile
router.get('/profile', authMiddleware, (req, res) => {
  const userId = req.user.id;

  db.get(
    `SELECT u.id, u.email, u.name, u.role, up.height, up.weight, up.age, 
            up.training_experience, up.goals
     FROM users u
     LEFT JOIN user_profiles up ON u.id = up.user_id
     WHERE u.id = ?`,
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    }
  );
});

// Update user profile
router.put('/profile', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { height, weight, age, training_experience, goals } = req.body;

  db.run(
    `UPDATE user_profiles 
     SET height = ?, weight = ?, age = ?, training_experience = ?, goals = ?
     WHERE user_id = ?`,
    [height, weight, age, training_experience, goals, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating profile' });
      }
      res.json({ message: 'Profile updated successfully' });
    }
  );
});

// Get athletes for trainer (trainer only)
router.get('/athletes', authMiddleware, (req, res) => {
  if (req.user.role !== 'trainer') {
    return res.status(403).json({ error: 'Access denied. Trainer role required.' });
  }

  const trainerId = req.user.id;

  db.all(
    `SELECT DISTINCT u.id, u.email, u.name, up.height, up.weight, up.age
     FROM users u
     LEFT JOIN user_profiles up ON u.id = up.user_id
     JOIN training_plans tp ON u.id = tp.user_id
     WHERE tp.trainer_id = ? AND u.role = 'athlete'`,
    [trainerId],
    (err, athletes) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(athletes);
    }
  );
});

// Get athlete details for trainer
router.get('/athletes/:athleteId', authMiddleware, (req, res) => {
  if (req.user.role !== 'trainer') {
    return res.status(403).json({ error: 'Access denied. Trainer role required.' });
  }

  const trainerId = req.user.id;
  const { athleteId } = req.params;

  // Verify trainer has access to this athlete
  db.get(
    `SELECT COUNT(*) as hasAccess
     FROM training_plans
     WHERE trainer_id = ? AND user_id = ?`,
    [trainerId, athleteId],
    (err, access) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (access.hasAccess === 0) {
        return res.status(403).json({ error: 'Access denied to this athlete' });
      }

      // Get athlete profile
      db.get(
        `SELECT u.id, u.email, u.name, u.role, up.*
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         WHERE u.id = ?`,
        [athleteId],
        (err, athlete) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json(athlete);
        }
      );
    }
  );
});

module.exports = router; 