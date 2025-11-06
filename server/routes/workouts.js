const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { authMiddleware } = require('../middleware/auth');

const db = new sqlite3.Database('./database/streetlifting.db');

// Create new workout
router.post('/', authMiddleware, (req, res) => {
  const { name, date, pre_workout_prs, notes } = req.body;
  const userId = req.user.id;

  db.run(
    'INSERT INTO workouts (user_id, name, date, pre_workout_prs, notes) VALUES (?, ?, ?, ?, ?)',
    [userId, name, date || new Date().toISOString().split('T')[0], pre_workout_prs, notes],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error creating workout' });
      }
      res.status(201).json({ 
        id: this.lastID, 
        user_id: userId,
        name,
        date,
        pre_workout_prs,
        notes
      });
    }
  );
});

// Get user's workouts
router.get('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;

  db.all(
    'SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?',
    [userId, limit, offset],
    (err, workouts) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(workouts);
    }
  );
});

// Get workout analytics (MUST BE BEFORE /:workoutId route)
router.get('/analytics/summary', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  db.all(
    `SELECT 
      COUNT(DISTINCT w.id) as total_workouts,
      COUNT(we.id) as total_exercises,
      AVG(w.post_workout_srpe) as avg_srpe,
      AVG(we.rpe) as avg_rpe,
      SUM(we.sets * we.reps) as total_volume
     FROM workouts w
     LEFT JOIN workout_exercises we ON w.id = we.workout_id
     WHERE w.user_id = ? AND w.date >= ?`,
    [userId, startDate.toISOString().split('T')[0]],
    (err, summary) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(summary[0]);
    }
  );
});

// Get specific workout with exercises
router.get('/:workoutId', authMiddleware, (req, res) => {
  const { workoutId } = req.params;
  const userId = req.user.id;

  // Get workout details
  db.get(
    'SELECT * FROM workouts WHERE id = ? AND user_id = ?',
    [workoutId, userId],
    (err, workout) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!workout) {
        return res.status(404).json({ error: 'Workout not found' });
      }

      // Get exercises from workout_exercises table first  
      db.all(
        `SELECT we.*, 
                COALESCE(we.exercise_name, e.name) as exercise_name,
                COALESCE(we.category, e.category) as category,
                COALESCE(we.muscle_groups, e.muscle_groups) as muscle_groups,
                COALESCE(we.equipment, e.equipment) as equipment,
                COALESCE(we.difficulty, e.difficulty) as difficulty,
                COALESCE(we.description, e.description) as description,
                COALESCE(we.sets_json, '[]') as sets_json
         FROM workout_exercises we 
         LEFT JOIN exercises e ON we.exercise_id = e.id 
         WHERE we.workout_id = ?
         ORDER BY we.exercise_order ASC, we.id ASC`,
        [workoutId],
        (err, exercises) => {
          if (err) {
            console.error('Error fetching workout exercises:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          console.log(`Found ${exercises?.length || 0} exercises for workout ${workoutId}`);
          
          // If we found exercises in workout_exercises, format and return them
          if (exercises && exercises.length > 0) {
            const formattedExercises = exercises.map(ex => {
              let parsedSets = [];
              
              console.log(`Processing exercise ${ex.id} (${ex.exercise_name}):`, {
                sets_count: ex.sets,
                sets_json: ex.sets_json,
                sets_json_type: typeof ex.sets_json
              });
              
              try {
                // Use sets_json column for detailed sets information
                if (ex.sets_json && ex.sets_json !== '[]' && ex.sets_json !== 'null') {
                  if (typeof ex.sets_json === 'string') {
                    parsedSets = JSON.parse(ex.sets_json);
                    console.log(`Parsed sets from sets_json for exercise ${ex.id}:`, parsedSets);
                  } else if (Array.isArray(ex.sets_json)) {
                    parsedSets = ex.sets_json;
                    console.log(`Using array sets_json for exercise ${ex.id}:`, parsedSets);
                  }
                }
                
                // Fallback: if no sets_json or empty, create sets based on count
                if (!parsedSets || parsedSets.length === 0) {
                  const setsCount = ex.sets || 1; // Use sets count column
                  console.log(`No detailed sets found, creating ${setsCount} default sets for exercise ${ex.id}`);
                  parsedSets = Array(setsCount).fill().map(() => ({
                    reps: ex.reps || 8,
                    weight: ex.weight || 0,
                    rest: 90
                  }));
                }
                
                // Validate sets structure
                parsedSets = parsedSets.filter(set => set && typeof set === 'object').map(set => ({
                  reps: parseInt(set.reps) || 8,
                  weight: parseFloat(set.weight) || 0,
                  rest: parseInt(set.rest) || 90
                }));
                
              } catch (parseError) {
                console.log(`Error parsing sets_json for exercise ${ex.id}:`, parseError.message, 'Raw data:', ex.sets_json);
                // Fallback to single set with basic data
                parsedSets = [{
                  reps: ex.reps || 8,
                  weight: ex.weight || 0,
                  rest: 90
                }];
              }
              
              const formattedExercise = {
                id: ex.id,
                exercise_name: ex.exercise_name || 'Unknown Exercise',
                category: ex.category || 'General', 
                muscle_groups: ex.muscle_groups || 'General',
                sets: parsedSets,
                equipment: ex.equipment || null,
                difficulty: ex.difficulty || null,
                description: ex.description || null,
                order: ex.exercise_order || 0
              };
              
              console.log(`Final formatted exercise ${ex.id}:`, {
                name: formattedExercise.exercise_name,
                setsCount: formattedExercise.sets.length,
                firstSet: formattedExercise.sets[0]
              });
              
              return formattedExercise;
            });
            
            console.log('=== RETURNING FORMATTED EXERCISES ===');
            console.log('Total exercises:', formattedExercises.length);
            formattedExercises.forEach((ex, i) => {
              console.log(`Exercise ${i + 1}:`, {
                id: ex.id,
                name: ex.exercise_name,
                sets: ex.sets.length,
                setsData: ex.sets
              });
            });
            
            return res.json({ ...workout, exercises: formattedExercises });
          }

          // If no exercises found, try to find them in planned_workouts
          db.get(
            `SELECT workout_data FROM planned_workouts 
             WHERE user_id = ? AND workout_name = ? AND planned_date = ?`,
            [userId, workout.name, workout.date],
            (plannedErr, plannedWorkout) => {
              if (plannedErr) {
                console.error('Error fetching from planned_workouts:', plannedErr);
                return res.json({ ...workout, exercises: [] });
              }

              if (plannedWorkout && plannedWorkout.workout_data) {
                try {
                  const workoutData = JSON.parse(plannedWorkout.workout_data);
                  const plannedExercises = workoutData.exercises || [];
                  
                  // Transform planned exercises to match expected format
                  const transformedExercises = plannedExercises.map((ex, index) => ({
                    id: ex.workoutExerciseId || `planned_${index}`,
                    exercise_name: ex.name,
                    category: ex.category || '',
                    muscle_groups: ex.muscle_groups || '',
                    sets: ex.sets || [],
                    // Add additional fields for display
                    equipment: ex.equipment || '',
                    difficulty: ex.difficulty || '',
                    description: ex.description || '',
                    order: ex.order || index
                  }));

                  return res.json({ ...workout, exercises: transformedExercises });
                } catch (parseError) {
                  console.error('Error parsing workout_data:', parseError);
                  return res.json({ ...workout, exercises: [] });
                }
              }

              // No exercises found anywhere
              res.json({ ...workout, exercises: [] });
            }
          );
        }
      );
    }
  );
});

// Add exercise to workout
router.post('/:workoutId/exercises', authMiddleware, (req, res) => {
  const { workoutId } = req.params;
  const { exercise_id, sets, reps, weight, rpe, notes } = req.body;

  db.run(
    `INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, weight, rpe, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [workoutId, exercise_id, sets, reps, weight, rpe, notes],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error adding exercise to workout' });
      }
      res.status(201).json({ 
        id: this.lastID,
        workout_id: workoutId,
        ...req.body 
      });
    }
  );
});

// Update workout (mainly for post-workout sRPE)
router.patch('/:workoutId', authMiddleware, (req, res) => {
  const { workoutId } = req.params;
  const { post_workout_srpe, notes } = req.body;
  const userId = req.user.id;

  let query = 'UPDATE workouts SET ';
  const params = [];

  if (post_workout_srpe !== undefined) {
    query += 'post_workout_srpe = ?, ';
    params.push(post_workout_srpe);
  }
  if (notes !== undefined) {
    query += 'notes = ?, ';
    params.push(notes);
  }

  // Remove trailing comma and space
  query = query.slice(0, -2);
  query += ' WHERE id = ? AND user_id = ?';
  params.push(workoutId, userId);

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error updating workout' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json({ message: 'Workout updated successfully' });
  });
});

// Update workout name, notes, and optionally exercises
router.put('/:workoutId', authMiddleware, (req, res) => {
  const { workoutId } = req.params;
  const { name, notes, exercises } = req.body;
  const userId = req.user.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Workout name is required' });
  }

  console.log('=== UPDATE WORKOUT DEBUG ===');
  console.log('Updating workout:', workoutId, 'for user:', userId);
  console.log('New name:', name);
  console.log('New notes:', notes);
  console.log('New exercises:', exercises ? exercises.length : 'none');
  
  if (exercises) {
    console.log('Raw exercises received from frontend:');
    exercises.forEach((ex, i) => {
      console.log(`Exercise ${i + 1}:`, {
        id: ex.id,
        exercise_name: ex.exercise_name,
        name: ex.name,
        category: ex.category,
        sets: ex.sets ? ex.sets.length : 0
      });
    });
  }

  // First, get the current workout to get its date
  db.get(
    'SELECT * FROM workouts WHERE id = ? AND user_id = ?',
    [workoutId, userId],
    (err, workout) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!workout) {
        return res.status(404).json({ error: 'Workout not found' });
      }

      // Update the workout basic info
      db.run(
        'UPDATE workouts SET name = ?, notes = ? WHERE id = ? AND user_id = ?',
        [name.trim(), notes || null, workoutId, userId],
        function(updateErr) {
          if (updateErr) {
            console.error('Error updating workout:', updateErr);
            return res.status(500).json({ error: 'Error updating workout' });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: 'Workout not found or no changes made' });
          }

          // If exercises are provided, update them
          if (exercises && Array.isArray(exercises) && exercises.length > 0) {
            console.log('=== UPDATING EXERCISES ===');
            console.log('Total exercises to process:', exercises.length);
            
            // First, delete existing exercises for this workout
            db.run(
              'DELETE FROM workout_exercises WHERE workout_id = ?',
              [workoutId],
              (deleteErr) => {
                if (deleteErr) {
                  console.error('Error deleting old exercises:', deleteErr);
                  return res.status(500).json({ error: 'Error updating exercises' });
                }

                console.log('Old exercises deleted successfully');

                // Insert new exercises - find exercise_id for each one
                let insertCount = 0;
                const totalExercises = exercises.length;

                exercises.forEach((exercise, index) => {
                  console.log(`=== INSERTING EXERCISE ${index + 1}/${totalExercises} ===`);
                  console.log('Exercise name:', exercise.exercise_name);
                  
                  // Extract exercise name properly  
                  const exerciseName = exercise.exercise_name || exercise.name || 'Unknown Exercise';
                  
                  // Skip exercises that are completely undefined or empty
                  if (!exercise || (!exercise.exercise_name && !exercise.name)) {
                    console.log(`⚠️ Skipping invalid exercise at index ${index}:`, exercise);
                    insertCount++;
                    if (insertCount === totalExercises) {
                      console.log(`Finished processing, ${insertCount - 1} valid exercises (skipped ${totalExercises - (insertCount - 1)} invalid)`);
                      updatePlannedWorkoutsSync();
                    }
                    return;
                  }
                  
                  console.log('Processing exercise:', exerciseName);
                  console.log('Full exercise object:', JSON.stringify(exercise, null, 2));
                  
                  // Extract first set data for old schema columns
                  const firstSet = exercise.sets && exercise.sets.length > 0 ? exercise.sets[0] : { reps: 8, weight: 20 };
                  const totalSets = exercise.sets ? exercise.sets.length : 1;
                  
                  console.log('First set data:', firstSet);
                  console.log('Total sets:', totalSets);

                  // First, find the exercise_id in the exercises table
                  db.get(
                    'SELECT id FROM exercises WHERE name = ? LIMIT 1',
                    [exerciseName],
                    (findErr, foundExercise) => {
                      let exerciseId = foundExercise?.id || 1; // Default to ID 1 if not found
                      
                      if (!foundExercise) {
                        console.log(`Exercise "${exerciseName}" not found in database, using default ID: 1`);
                      } else {
                        console.log(`Found exercise "${exerciseName}" with ID: ${exerciseId}`);
                      }

                      // Prepare sets JSON - ensure all sets have required fields
                      let setsJSON = [];
                      if (exercise.sets && Array.isArray(exercise.sets)) {
                        setsJSON = exercise.sets.map(set => ({
                          reps: parseInt(set.reps) || 8,
                          weight: parseFloat(set.weight) || 0,
                          rest: parseInt(set.rest) || 90
                        }));
                      } else {
                        setsJSON = [{ reps: 8, weight: 0, rest: 90 }]; // Default set
                      }

                      const setsJSONString = JSON.stringify(setsJSON);
                      console.log('Sets JSON string:', setsJSONString);

                      // Include ALL required columns for compatibility + sets JSON
                      const insertData = [
                        parseInt(workoutId),           // workout_id
                        exerciseId,                    // exercise_id (old schema)
                        totalSets,                     // sets count (old schema)
                        firstSet.reps || 8,          // reps (old schema)
                        firstSet.weight || 0,        // weight (old schema) 
                        null,                         // rpe (old schema)
                        `${exerciseName} - ${totalSets} sets`, // notes (old schema)
                        exerciseName,                 // exercise_name (new schema)
                        exercise.category || 'General', // category (new schema)
                        exercise.muscle_groups || 'General', // muscle_groups (new schema)
                        exercise.equipment || null,   // equipment (new schema)
                        exercise.difficulty || null,  // difficulty (new schema)
                        exercise.description || null, // description (new schema)
                        index + 1,                    // exercise_order (new schema)
                        setsJSONString                // sets JSON (new schema)
                      ];

                      console.log('Complete insert data (15 elements):', insertData);
                      console.log('Data mapping:');
                      console.log(`  workout_id: ${insertData[0]}`);
                      console.log(`  exercise_id: ${insertData[1]}`);
                      console.log(`  sets_count: ${insertData[2]}`);
                      console.log(`  reps: ${insertData[3]}`);
                      console.log(`  weight: ${insertData[4]}`);
                      console.log(`  rpe: ${insertData[5]}`);
                      console.log(`  notes: ${insertData[6]}`);
                      console.log(`  exercise_name: ${insertData[7]}`);
                      console.log(`  category: ${insertData[8]}`);
                      console.log(`  muscle_groups: ${insertData[9]}`);
                      console.log(`  equipment: ${insertData[10]}`);
                      console.log(`  difficulty: ${insertData[11]}`);
                      console.log(`  description: ${insertData[12]}`);
                      console.log(`  exercise_order: ${insertData[13]}`);
                      console.log(`  sets_json: ${insertData[14]}`);

                      db.run(`
                        INSERT INTO workout_exercises 
                        (workout_id, exercise_id, sets, reps, weight, rpe, notes, exercise_name, category, muscle_groups, equipment, difficulty, description, exercise_order, sets_json) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                      `, insertData, function(insertErr) {
                        if (insertErr) {
                          console.error('=== EXERCISE INSERT ERROR ===');
                          console.error('Error:', insertErr.message);
                          console.error('Code:', insertErr.code);
                          console.error('Data attempted:', insertData);
                          
                          // Only send response if we haven't already
                          if (!res.headersSent) {
                            return res.status(500).json({ 
                              error: 'Error inserting exercises', 
                              details: insertErr.message,
                              code: insertErr.code 
                            });
                          }
                          return;
                        }

                        console.log(`Exercise ${index + 1} inserted successfully`);
                        insertCount++;
                        
                        if (insertCount === totalExercises) {
                          console.log(`All ${insertCount} exercises inserted successfully`);
                          updatePlannedWorkoutsSync();
                        }
                      });
                    }
                  );
                });
              }
            );
          } else {
            // No exercises to update, just sync the name
            updatePlannedWorkoutsSync();
          }

          function updatePlannedWorkoutsSync() {
            if (!exercises) {
              // No exercises to sync, just update name
              console.log('No exercises provided, updating name only in planned_workouts');
              db.run(
                `UPDATE planned_workouts SET workout_name = ? 
                 WHERE user_id = ? AND workout_name = ? AND planned_date = ?`,
                [name.trim(), userId, workout.name, workout.date],
                (syncErr) => {
                  if (syncErr) {
                    console.log('Note: Could not sync workout name to planned_workouts:', syncErr.message);
                  } else {
                    console.log('Successfully synced workout name to planned_workouts');
                  }

                  console.log('Workout name updated successfully:', workoutId);
                  
                  if (!res.headersSent) {
                    res.json({ 
                      message: 'Workout updated successfully',
                      id: workoutId,
                      name: name.trim(),
                      notes: notes || null
                    });
                  }
                }
              );
              return;
            }

            // Prepare exercises with proper structure for planned_workouts
            const exercisesForPlanning = exercises.map((ex, idx) => ({
              id: ex.id,
              name: ex.exercise_name || ex.name,
              exercise_name: ex.exercise_name || ex.name,
              category: ex.category,
              muscle_groups: ex.muscle_groups,
              equipment: ex.equipment,
              difficulty: ex.difficulty,
              description: ex.description,
              sets: ex.sets || [{ reps: 8, weight: 0, rest: 90 }],
              order: idx
            }));

            const workoutDataForPlanning = JSON.stringify({ exercises: exercisesForPlanning });
            
            console.log('Syncing to planned_workouts with data:', JSON.stringify(exercisesForPlanning, null, 2));
            
            // Update planned_workouts with both name and exercises
            db.run(
              `UPDATE planned_workouts SET workout_name = ?, workout_data = ? 
               WHERE user_id = ? AND workout_name = ? AND planned_date = ?`,
              [name.trim(), workoutDataForPlanning, userId, workout.name, workout.date],
              (syncErr) => {
                if (syncErr) {
                  console.log('Note: Could not sync workout to planned_workouts:', syncErr.message);
                } else {
                  console.log('Successfully synced workout to planned_workouts');
                }

                console.log('Workout updated successfully:', workoutId);
                
                // Only send response if we haven't already
                if (!res.headersSent) {
                  res.json({ 
                    message: 'Workout updated successfully',
                    id: workoutId,
                    name: name.trim(),
                    notes: notes || null,
                    exercisesUpdated: exercises.length
                  });
                }
              }
            );
          }
        }
      );
    }
  );
});

// Delete workout
router.delete('/:workoutId', authMiddleware, (req, res) => {
  const { workoutId } = req.params;
  const userId = req.user.id;

  console.log('=== DELETE WORKOUT DEBUG ===');
  console.log('Deleting workout:', workoutId, 'for user:', userId);

  // First check if the workout belongs to the user
  db.get(
    'SELECT * FROM workouts WHERE id = ? AND user_id = ?',
    [workoutId, userId],
    (err, workout) => {
      if (err) {
        console.error('Error finding workout:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      if (!workout) {
        return res.status(404).json({ error: 'Workout not found or not authorized to delete' });
      }

      console.log('Found workout to delete:', { name: workout.name, date: workout.date });

      // Delete the workout and related data from ALL tables
      db.serialize(() => {
        // 1. Delete workout exercises first
        db.run('DELETE FROM workout_exercises WHERE workout_id = ?', [workoutId], (exerciseErr) => {
          if (exerciseErr) {
            console.log('Note: Could not delete workout exercises:', exerciseErr.message);
          } else {
            console.log('Successfully deleted workout exercises');
          }
        });
        
        // 2. Delete from planned_workouts (by matching name, date, user_id)
        db.run(
          'DELETE FROM planned_workouts WHERE user_id = ? AND workout_name = ? AND planned_date = ?',
          [userId, workout.name, workout.date],
          function(plannedErr) {
            if (plannedErr) {
              console.log('Note: Could not delete from planned_workouts:', plannedErr.message);
            } else {
              console.log(`Successfully deleted ${this.changes} entries from planned_workouts`);
            }
          }
        );

        // 3. Delete the workout itself from workouts table
        db.run(
          'DELETE FROM workouts WHERE id = ? AND user_id = ?',
          [workoutId, userId],
          function(deleteErr) {
            if (deleteErr) {
              console.error('Error deleting workout:', deleteErr);
              return res.status(500).json({ error: 'Error deleting workout' });
            }

            if (this.changes === 0) {
              return res.status(404).json({ error: 'Workout not found or no changes made' });
            }

            console.log('Workout deleted successfully from all tables:', workoutId);
            res.json({ 
              message: 'Workout deleted successfully',
              id: workoutId
            });
          }
        );
      });
    }
  );
});

module.exports = router; 