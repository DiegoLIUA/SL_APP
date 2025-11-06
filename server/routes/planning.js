const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { authMiddleware } = require('../middleware/auth');

const db = new sqlite3.Database('./database/streetlifting.db');

// Get planned workouts for a specific date
router.get('/date/:date', authMiddleware, (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.id;

    console.log('Getting planned workouts for date:', date, 'user:', userId);

    const query = `
      SELECT * FROM planned_workouts 
      WHERE user_id = ? AND planned_date = ?
      ORDER BY created_at ASC
    `;

    db.all(query, [userId, date], (err, rows) => {
      if (err) {
        console.error('Error fetching planned workouts:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      // Parse workout_data JSON for each workout
      const workouts = rows.map(row => ({
        ...row,
        workout_data: JSON.parse(row.workout_data)
      }));

      res.json(workouts);
    });
  } catch (error) {
    console.error('Error getting planned workouts by date:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get planned workouts for a date range (month view)
router.get('/range/:startDate/:endDate', authMiddleware, (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const userId = req.user.id;

    console.log('Getting planned workouts from', startDate, 'to', endDate, 'for user:', userId);

    const query = `
      SELECT planned_date, COUNT(*) as workout_count
      FROM planned_workouts 
      WHERE user_id = ? AND planned_date BETWEEN ? AND ?
      GROUP BY planned_date
      ORDER BY planned_date ASC
    `;

    db.all(query, [userId, startDate, endDate], (err, rows) => {
      if (err) {
        console.error('Error fetching planned workouts range:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      res.json(rows);
    });
  } catch (error) {
    console.error('Error getting planned workouts range:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Add a workout to planning
router.post('/add', authMiddleware, (req, res) => {
  try {
    const { planned_date, workout_name, workout_data } = req.body;
    const userId = req.user.id;

    if (!planned_date || !workout_data) {
      return res.status(400).json({ error: 'Fecha y datos del entrenamiento son requeridos' });
    }

    console.log('Adding planned workout for date:', planned_date, 'user:', userId);

    // Check if user already has 2 workouts for this date
    const checkQuery = `
      SELECT COUNT(*) as count FROM planned_workouts 
      WHERE user_id = ? AND planned_date = ?
    `;

    db.get(checkQuery, [userId, planned_date], (err, row) => {
      if (err) {
        console.error('Error checking workout count:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      if (row.count >= 2) {
        return res.status(400).json({ 
          error: 'Máximo 2 entrenamientos por día permitidos' 
        });
      }

      // Insert the planned workout
      const insertQuery = `
        INSERT INTO planned_workouts (user_id, planned_date, workout_name, workout_data)
        VALUES (?, ?, ?, ?)
      `;

      const workoutDataJson = JSON.stringify(workout_data);

      db.run(insertQuery, [userId, planned_date, workout_name, workoutDataJson], function(err) {
        if (err) {
          console.error('Error inserting planned workout:', err);
          return res.status(500).json({ error: 'Error interno del servidor' });
        }

        const plannedWorkoutId = this.lastID;
        console.log('Planned workout added with ID:', plannedWorkoutId);

        // Also create a basic workout entry for the gallery if it has exercises
        if (workout_data && workout_data.exercises && workout_data.exercises.length > 0) {
          const workoutInsertQuery = `
            INSERT INTO workouts (user_id, date, name, notes, pre_workout_prs, post_workout_srpe)
            VALUES (?, ?, ?, ?, ?, ?)
          `;
          
          db.run(workoutInsertQuery, [
            userId, 
            planned_date, 
            workout_name || 'Entrenamiento Manual',
            `Entrenamiento con ${workout_data.exercises.length} ejercicios. Ver detalles en planificación.`,
            null, // PRS will be added later
            null  // sRPE will be added later
          ], function(workoutErr) {
            if (workoutErr) {
              console.error('Error creating basic workout entry:', workoutErr);
              // Don't fail the whole operation, just log the error
            } else {
              console.log('Basic workout entry created with ID:', this.lastID);
            }
          });
        }

        res.json({ 
          id: plannedWorkoutId, 
          message: 'Entrenamiento añadido a la planificación',
          planned_date,
          workout_name
        });
      });
    });
  } catch (error) {
    console.error('Error adding planned workout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Complete a planned workout
router.put('/complete/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log('Completing planned workout:', id, 'for user:', userId);

    const query = `
      UPDATE planned_workouts 
      SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;

    db.run(query, [id, userId], function(err) {
      if (err) {
        console.error('Error completing planned workout:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Entrenamiento planificado no encontrado' });
      }

      res.json({ message: 'Entrenamiento marcado como completado' });
    });
  } catch (error) {
    console.error('Error completing planned workout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update PRS for a planned workout
router.put('/update-prs/:id', authMiddleware, (req, res) => {
  console.log('=== PRS UPDATE ROUTE HIT ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Request params:', req.params);
  console.log('Request body:', req.body);
  
  try {
    const { id } = req.params;
    const { pre_workout_prs } = req.body;
    const userId = req.user.id;

    console.log('Updating PRS for planned workout:', id, 'PRS:', pre_workout_prs, 'for user:', userId);

    if (pre_workout_prs === undefined || pre_workout_prs === null) {
      return res.status(400).json({ error: 'PRS es requerido' });
    }

    const query = `
      UPDATE planned_workouts 
      SET pre_workout_prs = ?
      WHERE id = ? AND user_id = ?
    `;

    db.run(query, [pre_workout_prs, id, userId], function(err) {
      if (err) {
        console.error('Error updating PRS for planned workout:', err);
        console.error('SQLite error details:', err.message, err.code);
        return res.status(500).json({ 
          error: 'Error interno del servidor', 
          details: err.message,
          code: err.code 
        });
      }

      if (this.changes === 0) {
        console.log('No changes made - workout not found or no permission');
        return res.status(404).json({ error: 'Entrenamiento planificado no encontrado' });
      }

      console.log('PRS updated successfully in planned_workouts, changes:', this.changes);
      
      // Get the planned workout data first for syncing
      const getPlannedQuery = `
        SELECT planned_date, workout_name FROM planned_workouts 
        WHERE id = ? AND user_id = ?
      `;
      
      db.get(getPlannedQuery, [id, userId], function(getErr, plannedWorkout) {
        if (getErr) {
          console.error('Error fetching planned workout data for sync:', getErr);
          // Still return success for main operation
        } else if (plannedWorkout) {
          // Now sync to workouts table with the retrieved data
          const syncQuery = `
            UPDATE workouts 
            SET pre_workout_prs = ?
            WHERE user_id = ? AND date = ? AND name = ?
          `;
          
          db.run(syncQuery, [pre_workout_prs, userId, plannedWorkout.planned_date, plannedWorkout.workout_name], function(syncErr) {
            if (syncErr) {
              console.error('Error syncing PRS to workouts table:', syncErr);
            } else {
              console.log('PRS synced to workouts table, changes:', this.changes);
            }
          });
        }
      });

      res.json({ message: 'PRS actualizado exitosamente', pre_workout_prs });
    });
  } catch (error) {
    console.error('Error updating PRS for planned workout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Complete a planned workout with sRPE
router.put('/complete-with-srpe/:id', authMiddleware, (req, res) => {
  console.log('=== sRPE COMPLETE ROUTE HIT ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Request params:', req.params);
  console.log('Request body:', req.body);
  
  try {
    const { id } = req.params;
    const { post_workout_srpe } = req.body;
    const userId = req.user.id;

    console.log('Completing planned workout with sRPE:', id, 'sRPE:', post_workout_srpe, 'for user:', userId);

    if (post_workout_srpe === undefined || post_workout_srpe === null) {
      return res.status(400).json({ error: 'sRPE es requerido' });
    }

    const query = `
      UPDATE planned_workouts 
      SET post_workout_srpe = ?, is_completed = TRUE, completed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;

    db.run(query, [post_workout_srpe, id, userId], function(err) {
      if (err) {
        console.error('Error completing planned workout with sRPE:', err);
        console.error('SQLite error details:', err.message, err.code);
        return res.status(500).json({ 
          error: 'Error interno del servidor', 
          details: err.message,
          code: err.code 
        });
      }

      if (this.changes === 0) {
        console.log('No changes made - workout not found or no permission');
        return res.status(404).json({ error: 'Entrenamiento planificado no encontrado' });
      }

      console.log('sRPE updated successfully in planned_workouts, changes:', this.changes);
      
      // Get the planned workout data first for syncing
      const getPlannedQuery = `
        SELECT planned_date, workout_name FROM planned_workouts 
        WHERE id = ? AND user_id = ?
      `;
      
      db.get(getPlannedQuery, [id, userId], function(getErr, plannedWorkout) {
        if (getErr) {
          console.error('Error fetching planned workout data for sRPE sync:', getErr);
          // Still return success for main operation
        } else if (plannedWorkout) {
          // Now sync to workouts table with the retrieved data
          const syncQuery = `
            UPDATE workouts 
            SET post_workout_srpe = ?
            WHERE user_id = ? AND date = ? AND name = ?
          `;
          
          db.run(syncQuery, [post_workout_srpe, userId, plannedWorkout.planned_date, plannedWorkout.workout_name], function(syncErr) {
            if (syncErr) {
              console.error('Error syncing sRPE to workouts table:', syncErr);
            } else {
              console.log('sRPE synced to workouts table, changes:', this.changes);
            }
          });
        }
      });

      res.json({ 
        message: 'Entrenamiento completado con sRPE registrado', 
        post_workout_srpe,
        is_completed: true 
      });
    });
  } catch (error) {
    console.error('Error completing planned workout with sRPE:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Delete a planned workout
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log('Deleting planned workout:', id, 'for user:', userId);

    const query = `
      DELETE FROM planned_workouts 
      WHERE id = ? AND user_id = ?
    `;

    db.run(query, [id, userId], function(err) {
      if (err) {
        console.error('Error deleting planned workout:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Entrenamiento planificado no encontrado' });
      }

      res.json({ message: 'Entrenamiento eliminado de la planificación' });
    });
  } catch (error) {
    console.error('Error deleting planned workout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Update planned workout name
router.put('/update-name/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { workout_name } = req.body;
  const userId = req.user.id;

  if (!workout_name) {
    return res.status(400).json({ error: 'Workout name is required' });
  }

  console.log('Updating workout name for ID:', id, 'to:', workout_name);

  // First get the current workout to update corresponding workouts table entry
  const getQuery = `
    SELECT * FROM planned_workouts 
    WHERE id = ? AND user_id = ?
  `;

  db.get(getQuery, [id, userId], (err, plannedWorkout) => {
    if (err) {
      console.error('Error getting planned workout:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    if (!plannedWorkout) {
      return res.status(404).json({ error: 'Planned workout not found' });
    }

    // Update the planned workout name
    const updateQuery = `
      UPDATE planned_workouts 
      SET workout_name = ? 
      WHERE id = ? AND user_id = ?
    `;

    db.run(updateQuery, [workout_name, id, userId], function(updateErr) {
      if (updateErr) {
        console.error('Error updating planned workout name:', updateErr);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Planned workout not found or no changes made' });
      }

      // Also try to update the corresponding workout in workouts table
      const updateWorkoutsQuery = `
        UPDATE workouts 
        SET name = ? 
        WHERE user_id = ? AND name = ? AND date = ?
      `;

      db.run(updateWorkoutsQuery, [
        workout_name, 
        userId, 
        plannedWorkout.workout_name, 
        plannedWorkout.planned_date
      ], (workoutUpdateErr) => {
        if (workoutUpdateErr) {
          console.log('Note: Could not update workouts table name:', workoutUpdateErr.message);
        } else {
          console.log('Successfully updated workouts table name');
        }

        // Return success regardless of workouts table update
        res.json({ 
          message: 'Workout name updated successfully',
          id: id,
          workout_name: workout_name
        });
      });
    });
  });
});

module.exports = router;
