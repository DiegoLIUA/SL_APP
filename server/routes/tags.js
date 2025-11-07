const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { authMiddleware } = require('../middleware/auth');

// Database connection
const db = new sqlite3.Database('/data/streetlifting.db');

// Get all available tags grouped by category
router.get('/', authMiddleware, (req, res) => {
  const query = `
    SELECT id, category, value 
    FROM exercise_tags 
    ORDER BY category, value
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching tags:', err);
      return res.status(500).json({ error: 'Error fetching tags' });
    }
    
    // Group tags by category
    const tagsByCategory = {};
    rows.forEach(row => {
      if (!tagsByCategory[row.category]) {
        tagsByCategory[row.category] = [];
      }
      tagsByCategory[row.category].push({
        id: row.id,
        value: row.value
      });
    });
    
    res.json(tagsByCategory);
  });
});

// Get tags for a specific exercise
router.get('/exercise/:id', authMiddleware, (req, res) => {
  const exerciseId = req.params.id;
  
  const query = `
    SELECT et.id, et.category, et.value
    FROM exercise_tags et
    JOIN exercise_tag_assignments eta ON et.id = eta.tag_id
    WHERE eta.exercise_id = ?
    ORDER BY et.category, et.value
  `;
  
  db.all(query, [exerciseId], (err, rows) => {
    if (err) {
      console.error('Error fetching exercise tags:', err);
      return res.status(500).json({ error: 'Error fetching exercise tags' });
    }
    
    // Group tags by category
    const tagsByCategory = {};
    rows.forEach(row => {
      if (!tagsByCategory[row.category]) {
        tagsByCategory[row.category] = [];
      }
      tagsByCategory[row.category].push({
        id: row.id,
        value: row.value
      });
    });
    
    res.json(tagsByCategory);
  });
});

// Assign tags to an exercise
router.post('/exercise/:id', authMiddleware, (req, res) => {
  const exerciseId = req.params.id;
  const { tagIds } = req.body; // Array of tag IDs
  
  if (!Array.isArray(tagIds)) {
    return res.status(400).json({ error: 'tagIds must be an array' });
  }
  
  // First, remove all existing tags for this exercise
  const deleteQuery = `DELETE FROM exercise_tag_assignments WHERE exercise_id = ?`;
  
  db.run(deleteQuery, [exerciseId], (err) => {
    if (err) {
      console.error('Error removing existing tags:', err);
      return res.status(500).json({ error: 'Error updating exercise tags' });
    }
    
    // Then, insert the new tags
    if (tagIds.length === 0) {
      return res.json({ message: 'Exercise tags updated successfully' });
    }
    
    const insertQuery = `INSERT INTO exercise_tag_assignments (exercise_id, tag_id) VALUES (?, ?)`;
    let completed = 0;
    let hasError = false;
    
    tagIds.forEach(tagId => {
      db.run(insertQuery, [exerciseId, tagId], (err) => {
        if (err && !hasError) {
          hasError = true;
          console.error('Error inserting tag assignment:', err);
          return res.status(500).json({ error: 'Error updating exercise tags' });
        }
        
        completed++;
        if (completed === tagIds.length && !hasError) {
          res.json({ message: 'Exercise tags updated successfully' });
        }
      });
    });
  });
});



module.exports = router;
