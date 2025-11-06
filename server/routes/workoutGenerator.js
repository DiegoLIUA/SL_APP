const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { authMiddleware } = require('../middleware/auth');

const db = new sqlite3.Database('./database/streetlifting.db');

// Generate automatic workout based on filters
router.post('/generate', authMiddleware, (req, res) => {
  const { 
    muscleGroups = [], 
    trainingTypes = [], 
    modalities = [], 
    difficulties = [], 
    equipment = [],
    exerciseCount = 6 
  } = req.body;
  
  console.log('Generating workout with filters:', {
    muscleGroups, trainingTypes, modalities, difficulties, equipment, exerciseCount
  });
  
  // Build the WHERE clause based on filters
  let whereConditions = [];
  let params = [];
  
  // Helper function to add filter conditions
  const addFilterCondition = (filterArray, category) => {
    if (filterArray.length > 0) {
      const placeholders = filterArray.map(() => '?').join(',');
      whereConditions.push(`
        e.id IN (
          SELECT DISTINCT eta.exercise_id 
          FROM exercise_tag_assignments eta
          JOIN exercise_tags et ON eta.tag_id = et.id
          WHERE et.category = '${category}' AND et.value IN (${placeholders})
        )
      `);
      params.push(...filterArray);
    }
  };
  
  addFilterCondition(muscleGroups, 'muscle_group');
  addFilterCondition(trainingTypes, 'training_type');
  addFilterCondition(modalities, 'modality');
  addFilterCondition(difficulties, 'difficulty');
  addFilterCondition(equipment, 'equipment');
  
  const userId = req.user.id;
  
  // Add user filter to where conditions (global exercises + user's private exercises)
  const userCondition = `(e.user_id IS NULL OR e.user_id = ${userId})`;
  const finalWhereClause = whereConditions.length > 0 ? 
    `WHERE ${userCondition} AND ${whereConditions.join(' AND ')}` : 
    `WHERE ${userCondition}`;
  
  const query = `
    SELECT DISTINCT e.id, e.name, e.category, e.muscle_groups, e.equipment, e.difficulty, e.description, e.video_url,
           GROUP_CONCAT(et.category || ':' || et.value) as tags
    FROM exercises e
    LEFT JOIN exercise_tag_assignments eta ON e.id = eta.exercise_id
    LEFT JOIN exercise_tags et ON eta.tag_id = et.id
    ${finalWhereClause}
    GROUP BY e.id
    ORDER BY RANDOM()
    LIMIT ?
  `;
  
  params.push(exerciseCount);
  
  console.log('Executing query:', query);
  console.log('With params:', params);
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error generating workout' });
    }
    
    console.log('Query result rows:', rows.length);
    
    // Parse tags for each exercise
    const exercises = rows.map(row => {
      const tagsByCategory = {};
      if (row.tags) {
        row.tags.split(',').forEach(tag => {
          const [category, value] = tag.split(':');
          if (!tagsByCategory[category]) {
            tagsByCategory[category] = [];
          }
          tagsByCategory[category].push(value);
        });
      }
      
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        muscle_groups: row.muscle_groups,
        equipment: row.equipment,
        difficulty: row.difficulty,
        description: row.description,
        video_url: row.video_url,
        tags: tagsByCategory
      };
    });
    
    res.json({
      exercises,
      generatedAt: new Date().toISOString(),
      requested: exerciseCount,
      found: exercises.length,
      hasLimitedResults: exercises.length < exerciseCount,
      filters: {
        muscleGroups,
        trainingTypes,
        modalities,
        difficulties,
        equipment
      }
    });
  });
});

// Get similar exercises by muscle groups
router.get('/similar/:exerciseId', authMiddleware, (req, res) => {
  try {
    const exerciseId = parseInt(req.params.exerciseId);
    const userId = req.user.id;

    console.log('Finding similar exercises for exercise ID:', exerciseId, 'user:', userId);

    // First get the original exercise muscle groups
    db.get(
      'SELECT muscle_groups FROM exercises WHERE id = ?',
      [exerciseId],
      (err, exercise) => {
        if (err) {
          console.error('Error fetching exercise:', err);
          return res.status(500).json({ error: 'Error interno del servidor' });
        }

        if (!exercise) {
          console.log('Exercise not found:', exerciseId);
          return res.status(404).json({ error: 'Ejercicio no encontrado' });
        }

        console.log('Original exercise muscle groups:', exercise.muscle_groups);

        // Query to find similar exercises with tags
        const query = `
          SELECT DISTINCT e.id, e.name, e.category, e.muscle_groups, 
                 e.equipment, e.difficulty, e.description, e.video_url,
                 GROUP_CONCAT(et.category || ':' || et.value) as tags
          FROM exercises e
          LEFT JOIN exercise_tag_assignments eta ON e.id = eta.exercise_id
          LEFT JOIN exercise_tags et ON eta.tag_id = et.id
          WHERE (e.user_id IS NULL OR e.user_id = ?)
            AND e.id != ?
            AND e.muscle_groups IS NOT NULL
          GROUP BY e.id
          ORDER BY RANDOM()
          LIMIT 3
        `;

        db.all(query, [userId, exerciseId], (err, rows) => {
          if (err) {
            console.error('Error fetching similar exercises:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
          }

          console.log('Found similar exercises:', rows.length);

          const similarExercises = rows.map(row => {
            const tags = {
              muscle_group: [],
              training_type: [],
              modality: [],
              difficulty: [],
              equipment: []
            };

            if (row.tags) {
              const tagPairs = row.tags.split(',');
              tagPairs.forEach(tagPair => {
                const [category, value] = tagPair.split(':');
                if (tags[category]) {
                  tags[category].push(value);
                }
              });
            }

            return {
              id: row.id,
              name: row.name,
              category: row.category,
              muscle_groups: row.muscle_groups || '',
              equipment: row.equipment || '',
              difficulty: row.difficulty || '',
              description: row.description || '',
              video_url: row.video_url || '',
              tags: tags
            };
          });

          res.json(similarExercises);
        });
      }
    );
  } catch (error) {
    console.error('Error getting similar exercises:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get all exercises for manual selection
router.get('/all', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;

    console.log('Fetching all exercises for user:', userId);

    const query = `
      SELECT DISTINCT e.id, e.name, e.category, e.muscle_groups, 
             e.equipment, e.difficulty, e.description, e.video_url,
             GROUP_CONCAT(et.category || ':' || et.value) as tags
      FROM exercises e
      LEFT JOIN exercise_tag_assignments eta ON e.id = eta.exercise_id
      LEFT JOIN exercise_tags et ON eta.tag_id = et.id
      WHERE (e.user_id IS NULL OR e.user_id = ?)
      GROUP BY e.id
      ORDER BY e.name ASC
    `;

    db.all(query, [userId], (err, rows) => {
      if (err) {
        console.error('Error fetching all exercises:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      console.log('Found exercises:', rows.length);

      const exercises = rows.map(row => {
        const tags = {
          muscle_group: [],
          training_type: [],
          modality: [],
          difficulty: [],
          equipment: []
        };

        if (row.tags) {
          const tagPairs = row.tags.split(',');
          tagPairs.forEach(tagPair => {
            const [category, value] = tagPair.split(':');
            if (tags[category]) {
              tags[category].push(value);
            }
          });
        }

        return {
          id: row.id,
          name: row.name,
          category: row.category,
          muscle_groups: row.muscle_groups || '',
          equipment: row.equipment || '',
          difficulty: row.difficulty || '',
          description: row.description || '',
          video_url: row.video_url || '',
          tags: tags
        };
      });

      res.json(exercises);
    });
  } catch (error) {
    console.error('Error getting all exercises:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
