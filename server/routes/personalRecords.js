const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { authMiddleware } = require('../middleware/auth');

// Initialize database connection
const db = new sqlite3.Database('/data/streetlifting.db');

// 1RM Calculations using Streetlifting-specific formulas (like Calculator)

// Muscle-up 1RM calculation
function calculateMuscleUp1RM(addedWeight, bodyWeight, reps) {
  try {
    const peso = addedWeight;
    const bw = bodyWeight;
    
    const repsCalc = Math.pow(reps, 1.5) - 1;
    
    if (repsCalc < 0) {
      return calculateMuscleUp1RM(addedWeight, bodyWeight, 1);
    }
    
    const sqrtPart = Math.pow(repsCalc, 0.5);
    const inner = Math.pow(peso, 2) - 294 * peso - 24 * bw * sqrtPart + 21600;
    
    if (inner < 0) {
      const simpleCalc = (peso + bw) * (36 / (37 - reps));
      return Math.max(simpleCalc - bw, 0);
    }
    
    const sqrtInner = Math.pow(inner, 0.5);
    const oneRM = 0.5 * (-sqrtInner + peso + 147);
    
    return Math.max(oneRM, 0);
  } catch (error) {
    // Fallback a fórmula simplificada
    const simpleRM = (addedWeight + bodyWeight) * (36 / (37 - reps)) - bodyWeight;
    return Math.max(simpleRM, 0);
  }
}

// Dominadas y Fondos 1RM calculation  
function calculateDipsOrPullUps1RM(addedWeight, bodyWeight, reps) {
  try {
    const peso = addedWeight;
    const bw = bodyWeight;
    const totalWeight = peso + bw;
    const factor1 = 1 + (0.0333 * reps);
    const factor2 = 36 / (37 - reps);
    const factor3 = Math.pow(reps, 0.1);
    const oneRM = (totalWeight * (factor1 + factor2 + factor3) / 3) - bw;
    return Math.max(oneRM, 0); // Retorna solo el peso añadido
  } catch (error) {
    return 0;
  }
}

// Sentadilla 1RM calculation (usando fórmula adaptada)
function calculateSquat1RM(weight, bodyWeight, reps) {
  try {
    // Para sentadillas, el peso incluye barra + discos, no peso corporal
    const totalWeight = weight; // peso total de la barra
    const factor1 = 1 + (0.0333 * reps);
    const factor2 = 36 / (37 - reps);
    const oneRM = totalWeight * (factor1 + factor2) / 2;
    return Math.max(oneRM, 0);
  } catch (error) {
    return weight * (1 + reps / 30); // Fallback Epley
  }
}

// Main calculation function
function calculate1RM(exerciseType, weight, bodyWeight, reps) {
  switch (exerciseType) {
    case 'MU':
      return calculateMuscleUp1RM(weight, bodyWeight, reps);
    case 'Dominada':
      return calculateDipsOrPullUps1RM(weight, bodyWeight, reps);
    case 'Fondos':
      return calculateDipsOrPullUps1RM(weight, bodyWeight, reps);
    case 'Sentadilla':
      return calculateSquat1RM(weight, bodyWeight, reps);
    default:
      // Fallback Epley formula
      return weight * (1 + reps / 30);
  }
}

// GET /api/personal-records/:exercise_type - Get all PRs for specific exercise
router.get('/:exercise_type', authMiddleware, (req, res) => {
  const { exercise_type } = req.params;
  const userId = req.user.id;
  
  console.log(`Getting personal records for ${exercise_type}, user: ${userId}`);
  
  if (!['MU', 'Dominada', 'Fondos', 'Sentadilla'].includes(exercise_type)) {
    return res.status(400).json({ error: 'Tipo de ejercicio inválido' });
  }
  
  const query = `
    SELECT id, weight_kg, repetitions, date, calculated_1rm, notes, created_at
    FROM personal_records 
    WHERE user_id = ? AND exercise_type = ?
    ORDER BY calculated_1rm DESC, date DESC
  `;
  
  db.all(query, [userId, exercise_type], (err, rows) => {
    if (err) {
      console.error('Error fetching personal records:', err);
      return res.status(500).json({ 
        error: 'Error interno del servidor',
        details: err.message,
        code: err.code
      });
    }
    
    console.log(`Found ${rows.length} personal records for ${exercise_type}`);
    
    // Calculate percentage relative to best 1RM
    let recordsWithPercentage = [];
    if (rows.length > 0) {
      const best1RM = rows[0].calculated_1rm; // First record has highest 1RM due to ORDER BY
      recordsWithPercentage = rows.map(record => ({
        ...record,
        percentage: Math.round((record.calculated_1rm / best1RM) * 100)
      }));
    }
    
    res.json(recordsWithPercentage);
  });
});

// POST /api/personal-records - Create new personal record
router.post('/', authMiddleware, (req, res) => {
  const { exercise_type, weight_kg, repetitions, date, notes } = req.body;
  const userId = req.user.id;
  
  console.log('Creating personal record:', { exercise_type, weight_kg, repetitions, date, userId });
  
  // Validation
  if (!exercise_type || !['MU', 'Dominada', 'Fondos', 'Sentadilla'].includes(exercise_type)) {
    return res.status(400).json({ error: 'Tipo de ejercicio requerido y válido' });
  }
  
  if (weight_kg == null || weight_kg < 0) {
    return res.status(400).json({ error: 'Peso debe ser un número positivo o cero' });
  }
  
  if (!repetitions || repetitions < 1 || repetitions > 50) {
    return res.status(400).json({ error: 'Repeticiones debe ser entre 1 y 50' });
  }
  
  if (!date) {
    return res.status(400).json({ error: 'Fecha es requerida' });
  }
  
  // First, get user's body weight from profile
  const profileQuery = `
    SELECT weight FROM user_profiles WHERE user_id = ?
  `;
  
  db.get(profileQuery, [userId], (err, userProfile) => {
    if (err) {
      console.error('Error fetching user profile:', err);
      return res.status(500).json({ 
        error: 'Error interno del servidor',
        details: err.message
      });
    }
    
    // Check if user has body weight configured
    const bodyWeight = userProfile?.weight;
    if (!bodyWeight || bodyWeight <= 0) {
      return res.status(400).json({ 
        error: 'Peso corporal requerido',
        message: 'Debes configurar tu peso corporal en tu perfil para calcular PRs correctamente',
        action: 'configure_weight',
        redirect_to: '/profile'
      });
    }
    
    console.log(`Using body weight: ${bodyWeight}kg for user ${userId}`);
    
    // Calculate 1RM using correct formulas
    const calculated1RM = calculate1RM(exercise_type, parseFloat(weight_kg), bodyWeight, parseInt(repetitions));
    
    console.log(`Calculated 1RM for ${exercise_type}: ${calculated1RM}kg (weight: ${weight_kg}kg, bodyweight: ${bodyWeight}kg, reps: ${repetitions})`);
    
    const insertQuery = `
      INSERT INTO personal_records (user_id, exercise_type, weight_kg, repetitions, date, calculated_1rm, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(insertQuery, [userId, exercise_type, weight_kg, repetitions, date, calculated1RM, notes || null], function(err) {
      if (err) {
        console.error('Error creating personal record:', err);
        return res.status(500).json({ 
          error: 'Error interno del servidor',
          details: err.message,
          code: err.code
        });
      }
      
      console.log('Personal record created with ID:', this.lastID);
      
      res.status(201).json({
        message: 'Record personal creado exitosamente',
        id: this.lastID,
        calculated_1rm: calculated1RM,
        body_weight_used: bodyWeight
      });
    });
  });
});

// DELETE /api/personal-records/:id - Delete personal record
router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  console.log(`Deleting personal record ${id} for user ${userId}`);
  
  const query = `DELETE FROM personal_records WHERE id = ? AND user_id = ?`;
  
  db.run(query, [id, userId], function(err) {
    if (err) {
      console.error('Error deleting personal record:', err);
      return res.status(500).json({ 
        error: 'Error interno del servidor',
        details: err.message,
        code: err.code
      });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Record personal no encontrado' });
    }
    
    console.log('Personal record deleted successfully');
    res.json({ message: 'Record personal eliminado exitosamente' });
  });
});

// GET /api/personal-records/summary/all - Get summary of all exercises
router.get('/summary/all', authMiddleware, (req, res) => {
  const userId = req.user.id;
  
  const query = `
    SELECT 
      exercise_type,
      MAX(calculated_1rm) as best_1rm,
      COUNT(*) as total_records,
      MAX(date) as latest_date
    FROM personal_records 
    WHERE user_id = ?
    GROUP BY exercise_type
  `;
  
  db.all(query, [userId], (err, rows) => {
    if (err) {
      console.error('Error fetching PR summary:', err);
      return res.status(500).json({ 
        error: 'Error interno del servidor',
        details: err.message,
        code: err.code
      });
    }
    
    res.json(rows);
  });
});

// GET /api/personal-records/profile/check - Check if user has body weight configured
router.get('/profile/check', authMiddleware, (req, res) => {
  const userId = req.user.id;
  
  const query = `
    SELECT weight FROM user_profiles WHERE user_id = ?
  `;
  
  db.get(query, [userId], (err, userProfile) => {
    if (err) {
      console.error('Error fetching user profile for check:', err);
      return res.status(500).json({ 
        error: 'Error interno del servidor',
        details: err.message
      });
    }
    
    const hasWeight = userProfile?.weight && userProfile.weight > 0;
    
    res.json({
      has_body_weight: hasWeight,
      body_weight: hasWeight ? userProfile.weight : null,
      message: hasWeight ? 'Peso corporal configurado correctamente' : 'Peso corporal no configurado'
    });
  });
});

module.exports = router;
