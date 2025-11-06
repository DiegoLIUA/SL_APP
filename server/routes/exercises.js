const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { authMiddleware } = require('../middleware/auth');

const db = new sqlite3.Database('./database/streetlifting.db');

// 1RM calculation formulas
const calculate1RM = {
  // Brzycki formula
  brzycki: (weight, reps) => weight * (36 / (37 - reps)),
  // Epley formula
  epley: (weight, reps) => weight * (1 + 0.0333 * reps),
  // Average of both formulas
  average: (weight, reps) => {
    const brzycki = weight * (36 / (37 - reps));
    const epley = weight * (1 + 0.0333 * reps);
    return (brzycki + epley) / 2;
  }
};

// Calculate 1RM endpoint
router.post('/calculate-1rm', authMiddleware, (req, res) => {
  const { weight, reps, exercise, formula = 'average' } = req.body;

  if (!weight || !reps || reps <= 0 || reps > 30) {
    return res.status(400).json({ error: 'Invalid input. Reps must be between 1 and 30.' });
  }

  const oneRM = calculate1RM[formula](weight, reps);
  
  res.json({
    exercise,
    weight,
    reps,
    oneRM: Math.round(oneRM * 10) / 10,
    formula
  });
});

// Get all exercises (global + user's private exercises)
router.get('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  
  const query = `
    SELECT * FROM exercises 
    WHERE user_id IS NULL OR user_id = ?
    ORDER BY category, name
  `;
  
  db.all(query, [userId], (err, exercises) => {
    if (err) {
      console.error('Error fetching exercises:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(exercises);
  });
});

// Get exercises by category
router.get('/category/:category', authMiddleware, (req, res) => {
  const { category } = req.params;
  
  db.all(
    'SELECT * FROM exercises WHERE category = ? ORDER BY name',
    [category],
    (err, exercises) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(exercises);
    }
  );
});

// Add default streetlifting exercises (run once to populate database)
router.post('/seed', authMiddleware, (req, res) => {
  const defaultExercises = [
    {
      name: 'Pull-ups',
      category: 'pull',
      muscle_groups: 'back,biceps,core',
      equipment: 'pull-up bar',
      difficulty: 'intermediate',
      description: 'Standard pull-up with overhand grip'
    },
    {
      name: 'Weighted Pull-ups',
      category: 'pull',
      muscle_groups: 'back,biceps,core',
      equipment: 'pull-up bar,weight belt',
      difficulty: 'advanced',
      description: 'Pull-ups with additional weight'
    },
    {
      name: 'Dips',
      category: 'push',
      muscle_groups: 'chest,triceps,shoulders',
      equipment: 'parallel bars',
      difficulty: 'intermediate',
      description: 'Standard parallel bar dips'
    },
    {
      name: 'Weighted Dips',
      category: 'push',
      muscle_groups: 'chest,triceps,shoulders',
      equipment: 'parallel bars,weight belt',
      difficulty: 'advanced',
      description: 'Dips with additional weight'
    },
    {
      name: 'Muscle-ups',
      category: 'compound',
      muscle_groups: 'back,chest,arms,core',
      equipment: 'pull-up bar',
      difficulty: 'advanced',
      description: 'Explosive pull-up transitioning to dip'
    },
    {
      name: 'Push-ups',
      category: 'push',
      muscle_groups: 'chest,triceps,shoulders,core',
      equipment: 'none',
      difficulty: 'beginner',
      description: 'Standard push-ups on the ground'
    },
    {
      name: 'Pistol Squats',
      category: 'legs',
      muscle_groups: 'quads,glutes,core',
      equipment: 'none',
      difficulty: 'advanced',
      description: 'Single-leg squat'
    },
    {
      name: 'Front Lever',
      category: 'isometric',
      muscle_groups: 'back,core,shoulders',
      equipment: 'pull-up bar',
      difficulty: 'advanced',
      description: 'Horizontal body hold on pull-up bar'
    },
    {
      name: 'Planche',
      category: 'isometric',
      muscle_groups: 'shoulders,chest,core',
      equipment: 'parallettes or floor',
      difficulty: 'advanced',
      description: 'Horizontal body hold with arms only'
    },
    {
      name: 'Human Flag',
      category: 'isometric',
      muscle_groups: 'core,shoulders,obliques',
      equipment: 'vertical pole',
      difficulty: 'advanced',
      description: 'Horizontal body hold on vertical pole'
    }
  ];

  // Insert exercises one by one
  let inserted = 0;
  defaultExercises.forEach((exercise) => {
    db.run(
      `INSERT OR IGNORE INTO exercises (name, category, muscle_groups, equipment, difficulty, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [exercise.name, exercise.category, exercise.muscle_groups, exercise.equipment, exercise.difficulty, exercise.description],
      (err) => {
        if (!err) inserted++;
        
        if (inserted === defaultExercises.length) {
          res.json({ message: `Seeded ${inserted} exercises successfully` });
        }
      }
    );
  });
});

// Create custom exercise
router.post('/', authMiddleware, (req, res) => {
  const { name, category, muscle_groups, equipment, difficulty, description, video_url } = req.body;
  const userId = req.user.id; // User's private exercise

  db.run(
    `INSERT INTO exercises (name, category, muscle_groups, equipment, difficulty, description, video_url, user_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, category, muscle_groups, equipment, difficulty, description, video_url, userId],
    function(err) {
      if (err) {
        console.error('Error creating exercise:', err);
        return res.status(500).json({ error: 'Error creating exercise' });
      }
      res.status(201).json({ id: this.lastID, ...req.body });
    }
  );
});

// Update exercise
router.put('/:exerciseId', authMiddleware, (req, res) => {
  const { exerciseId } = req.params;
  const { name, category, description, video_url } = req.body;
  const userId = req.user.id;

  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  console.log('=== EXERCISE UPDATE DEBUG ===');
  console.log('Updating exercise:', exerciseId, 'for user:', userId);
  console.log('Request body:', req.body);

  // First check if the exercise belongs to the user or is public
  db.get(
    'SELECT * FROM exercises WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
    [exerciseId, userId],
    (err, exercise) => {
      if (err) {
        console.error('Error finding exercise:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      console.log('Found exercise:', exercise);

      if (!exercise) {
        console.log('Exercise not found with query: SELECT * FROM exercises WHERE id = ? AND (user_id = ? OR user_id IS NULL)');
        console.log('Parameters:', [exerciseId, userId]);
        
        // Let's also check if the exercise exists at all
        db.get('SELECT * FROM exercises WHERE id = ?', [exerciseId], (checkErr, anyExercise) => {
          if (checkErr) {
            console.error('Error checking if exercise exists:', checkErr);
          } else {
            console.log('Exercise exists in DB:', anyExercise);
          }
        });
        
        return res.status(404).json({ error: 'Exercise not found or not authorized' });
      }

      // If it's a public exercise, create a personalized copy for the user
      if (exercise.user_id === null) {
        console.log('Creating personalized copy of public exercise for user:', userId);
        
        const createQuery = `
          INSERT INTO exercises (name, category, muscle_groups, equipment, difficulty, description, video_url, user_id)
          SELECT ?, ?, muscle_groups, equipment, difficulty, ?, ?, ?
          FROM exercises WHERE id = ?
        `;

        db.run(createQuery, [name, category, description || '', video_url || '', userId, exerciseId], function(createErr) {
          if (createErr) {
            console.error('Error creating personalized exercise:', createErr);
            return res.status(500).json({ error: 'Error creating personalized exercise' });
          }

          const newExerciseId = this.lastID;
          console.log('Created personalized exercise with ID:', newExerciseId);
          
          res.json({ 
            message: 'Personalized exercise created successfully',
            id: newExerciseId,
            originalId: exerciseId,
            name,
            category,
            description,
            video_url,
            isPersonalized: true
          });
        });
        return;
      }

      // Only allow updating user's own exercises (not public ones)
      if (exercise.user_id !== userId) {
        return res.status(403).json({ error: 'Cannot edit exercises belonging to other users' });
      }

      // Update the user's own exercise
      const updateQuery = `
        UPDATE exercises 
        SET name = ?, category = ?, description = ?, video_url = ?
        WHERE id = ? AND user_id = ?
      `;

      db.run(updateQuery, [name, category, description || '', video_url || '', exerciseId, userId], function(updateErr) {
        if (updateErr) {
          console.error('Error updating exercise:', updateErr);
          return res.status(500).json({ error: 'Error updating exercise' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Exercise not found or no changes made' });
        }

        console.log('Exercise updated successfully:', exerciseId);
        res.json({ 
          message: 'Exercise updated successfully',
          id: exerciseId,
          name,
          category,
          description,
          video_url
        });
      });
    }
  );
});

// Delete exercise
router.delete('/:exerciseId', authMiddleware, (req, res) => {
  const { exerciseId } = req.params;
  const userId = req.user.id;

  console.log('=== EXERCISE DELETE DEBUG ===');
  console.log('Deleting exercise:', exerciseId, 'for user:', userId);

  // First check if the exercise belongs to the user
  db.get(
    'SELECT * FROM exercises WHERE id = ? AND user_id = ?',
    [exerciseId, userId],
    (err, exercise) => {
      if (err) {
        console.error('Error finding exercise:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found or not authorized to delete' });
      }

      // Delete the exercise (tags will be deleted by foreign key constraints if set up)
      db.run(
        'DELETE FROM exercises WHERE id = ? AND user_id = ?',
        [exerciseId, userId],
        function(deleteErr) {
          if (deleteErr) {
            console.error('Error deleting exercise:', deleteErr);
            return res.status(500).json({ error: 'Error deleting exercise' });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: 'Exercise not found or no changes made' });
          }

          // Also delete related tag assignments
          db.run(
            'DELETE FROM exercise_tag_assignments WHERE exercise_id = ?',
            [exerciseId],
            (tagDeleteErr) => {
              if (tagDeleteErr) {
                console.log('Note: Could not delete exercise tag assignments:', tagDeleteErr.message);
              } else {
                console.log('Successfully deleted exercise tag assignments');
              }
            }
          );

          console.log('Exercise deleted successfully:', exerciseId);
          res.json({ 
            message: 'Exercise deleted successfully',
            id: exerciseId
          });
        }
      );
    }
  );
});

module.exports = router; 