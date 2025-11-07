const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { authMiddleware, trainerMiddleware } = require('../middleware/auth');

const db = new sqlite3.Database('/data/streetlifting.db');

// Create training plan
router.post('/', authMiddleware, (req, res) => {
  const { name, description, start_date, end_date, user_id } = req.body;
  const trainerId = req.user.role === 'trainer' ? req.user.id : null;
  const athleteId = req.user.role === 'trainer' ? user_id : req.user.id;

  db.run(
    `INSERT INTO training_plans (user_id, trainer_id, name, description, start_date, end_date) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [athleteId, trainerId, name, description, start_date, end_date],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error creating training plan' });
      }
      res.status(201).json({ 
        id: this.lastID,
        user_id: athleteId,
        trainer_id: trainerId,
        name,
        description,
        start_date,
        end_date
      });
    }
  );
});

// Get user's training plans
router.get('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const isTrainer = req.user.role === 'trainer';

  let query;
  let params;

  if (isTrainer) {
    // Get all plans where user is the trainer
    query = `SELECT tp.*, u.name as athlete_name, u.email as athlete_email
             FROM training_plans tp
             JOIN users u ON tp.user_id = u.id
             WHERE tp.trainer_id = ?
             ORDER BY tp.created_at DESC`;
    params = [userId];
  } else {
    // Get user's own plans
    query = `SELECT tp.*, u.name as trainer_name, u.email as trainer_email
             FROM training_plans tp
             LEFT JOIN users u ON tp.trainer_id = u.id
             WHERE tp.user_id = ?
             ORDER BY tp.created_at DESC`;
    params = [userId];
  }

  db.all(query, params, (err, plans) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(plans);
  });
});

// Get specific training plan
router.get('/:planId', authMiddleware, (req, res) => {
  const { planId } = req.params;
  const userId = req.user.id;
  const isTrainer = req.user.role === 'trainer';

  db.get(
    `SELECT * FROM training_plans 
     WHERE id = ? AND (user_id = ? OR trainer_id = ?)`,
    [planId, userId, userId],
    (err, plan) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!plan) {
        return res.status(404).json({ error: 'Training plan not found' });
      }
      res.json(plan);
    }
  );
});

// Update training plan
router.put('/:planId', authMiddleware, (req, res) => {
  const { planId } = req.params;
  const userId = req.user.id;
  const { name, description, start_date, end_date } = req.body;

  // Verify user has permission to update
  db.get(
    `SELECT * FROM training_plans 
     WHERE id = ? AND (user_id = ? OR trainer_id = ?)`,
    [planId, userId, userId],
    (err, plan) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!plan) {
        return res.status(404).json({ error: 'Training plan not found or access denied' });
      }

      // Update the plan
      db.run(
        `UPDATE training_plans 
         SET name = ?, description = ?, start_date = ?, end_date = ?
         WHERE id = ?`,
        [name, description, start_date, end_date, planId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error updating training plan' });
          }
          res.json({ message: 'Training plan updated successfully' });
        }
      );
    }
  );
});

// Delete training plan
router.delete('/:planId', authMiddleware, (req, res) => {
  const { planId } = req.params;
  const userId = req.user.id;

  db.run(
    'DELETE FROM training_plans WHERE id = ? AND (user_id = ? OR trainer_id = ?)',
    [planId, userId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting training plan' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Training plan not found or access denied' });
      }
      res.json({ message: 'Training plan deleted successfully' });
    }
  );
});

module.exports = router; 