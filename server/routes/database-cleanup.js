const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { authMiddleware } = require('../middleware/auth');

const db = new sqlite3.Database('./database/streetlifting.db');

// TEMPORARY ROUTE - Remove after cleanup
router.post('/clean-duplicates', authMiddleware, (req, res) => {
  console.log('=== CLEANING DATABASE DUPLICATES ===');
  
  // Only allow if user is ID 1 (first user) as safety measure
  if (req.user.id !== 1) {
    return res.status(403).json({ error: 'Only first user can perform cleanup' });
  }

  const cleanupSteps = [];
  
  db.serialize(() => {
    // Step 1: Check current counts
    db.get('SELECT COUNT(*) as planned_count FROM planned_workouts', [], (err, result) => {
      if (err) {
        console.error('Error getting planned_workouts count:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      const originalPlannedCount = result.planned_count;
      console.log('Original planned_workouts count:', originalPlannedCount);
      cleanupSteps.push(`Original planned_workouts: ${originalPlannedCount}`);

      // Step 2: Check current workouts count
      db.get('SELECT COUNT(*) as workouts_count FROM workouts', [], (err, result) => {
        if (err) {
          console.error('Error getting workouts count:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        const originalWorkoutsCount = result.workouts_count;
        console.log('Original workouts count:', originalWorkoutsCount);
        cleanupSteps.push(`Original workouts: ${originalWorkoutsCount}`);

        // Step 3: Show duplicates before cleaning
        db.all(`
          SELECT workout_name, planned_date, COUNT(*) as count
          FROM planned_workouts 
          GROUP BY workout_name, planned_date 
          HAVING COUNT(*) > 1
        `, [], (err, duplicates) => {
          if (err) {
            console.error('Error finding duplicates:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          
          console.log('Found duplicates:', duplicates);
          cleanupSteps.push(`Found ${duplicates.length} duplicate groups`);

          // Step 4: Clean up duplicates in planned_workouts
          db.run(`
            DELETE FROM planned_workouts 
            WHERE id NOT IN (
                SELECT MAX(id) 
                FROM planned_workouts 
                GROUP BY workout_name, planned_date, user_id
            )
          `, [], function(err) {
            if (err) {
              console.error('Error cleaning planned_workouts duplicates:', err);
              return res.status(500).json({ error: 'Error cleaning duplicates' });
            }
            
            const deletedPlanned = this.changes;
            console.log('Deleted planned_workouts duplicates:', deletedPlanned);
            cleanupSteps.push(`Deleted ${deletedPlanned} duplicate planned_workouts`);

            // Step 5: Clean orphaned workout_exercises
            db.run(`
              DELETE FROM workout_exercises 
              WHERE workout_id NOT IN (SELECT id FROM workouts)
            `, [], function(err) {
              if (err) {
                console.error('Error cleaning orphaned workout_exercises:', err);
                return res.status(500).json({ error: 'Error cleaning orphaned exercises' });
              }
              
              const deletedExercises = this.changes;
              console.log('Deleted orphaned workout_exercises:', deletedExercises);
              cleanupSteps.push(`Deleted ${deletedExercises} orphaned workout_exercises`);

              // Step 6: Clean up template workouts with "(Plantilla)" and date 1970-01-01
              db.run(`
                DELETE FROM workouts 
                WHERE name LIKE '%Plantilla)%' 
                AND date = '1970-01-01'
                AND user_id = ?
              `, [req.user.id], function(err) {
                if (err) {
                  console.error('Error cleaning template workouts:', err);
                  return res.status(500).json({ error: 'Error cleaning template workouts' });
                }
                
                const deletedTemplates = this.changes;
                console.log('Deleted template workouts:', deletedTemplates);
                cleanupSteps.push(`Deleted ${deletedTemplates} unwanted template workouts with "(Plantilla)"`);

                // Step 7: Get final counts
                db.get('SELECT COUNT(*) as final_planned FROM planned_workouts', [], (err, result) => {
                  if (err) {
                    console.error('Error getting final planned count:', err);
                    return res.status(500).json({ error: 'Database error' });
                  }
                  
                  const finalPlannedCount = result.final_planned;
                  cleanupSteps.push(`Final planned_workouts: ${finalPlannedCount}`);

                  db.get('SELECT COUNT(*) as final_workouts FROM workouts', [], (err, result) => {
                    if (err) {
                      console.error('Error getting final workouts count:', err);
                      return res.status(500).json({ error: 'Database error' });
                    }
                    
                    const finalWorkoutsCount = result.final_workouts;
                    cleanupSteps.push(`Final workouts: ${finalWorkoutsCount}`);

                    console.log('=== CLEANUP COMPLETED ===');
                    
                    res.json({
                      success: true,
                      message: 'Database cleanup completed successfully',
                      summary: {
                        original: {
                          planned_workouts: originalPlannedCount,
                          workouts: originalWorkoutsCount
                        },
                        final: {
                          planned_workouts: finalPlannedCount,
                          workouts: finalWorkoutsCount
                        },
                        deleted: {
                          planned_duplicates: deletedPlanned,
                          orphaned_exercises: deletedExercises,
                          template_workouts: deletedTemplates
                        }
                      },
                      steps: cleanupSteps
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

// Get database status
router.get('/status', authMiddleware, (req, res) => {
  const status = {};
  
  db.serialize(() => {
    db.get('SELECT COUNT(*) as count FROM planned_workouts', [], (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      status.planned_workouts = result.count;

      db.get('SELECT COUNT(*) as count FROM workouts', [], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        status.workouts = result.count;

        db.get('SELECT COUNT(*) as count FROM workout_exercises', [], (err, result) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          status.workout_exercises = result.count;

          // Check for duplicates
          db.all(`
            SELECT workout_name, planned_date, COUNT(*) as count
            FROM planned_workouts 
            GROUP BY workout_name, planned_date 
            HAVING COUNT(*) > 1
          `, [], (err, duplicates) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            status.duplicates = duplicates;

            // Check for template workouts that need cleaning
            db.all(`
              SELECT name, date FROM workouts 
              WHERE name LIKE '%Plantilla)%' AND date = '1970-01-01'
              AND user_id = ?
            `, [req.user.id], (err, templates) => {
              if (err) return res.status(500).json({ error: 'Database error' });
              status.problematic_templates = templates;

              res.json({
                message: 'Database status',
                counts: status,
                has_duplicates: duplicates.length > 0,
                has_problematic_templates: templates.length > 0,
                problems_found: duplicates.length > 0 || templates.length > 0
              });
            });
          });
        });
      });
    });
  });
});

module.exports = router;
