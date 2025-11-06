const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, 'database', 'streetlifting.db');
fs.mkdirSync(path.dirname(SQLITE_PATH), { recursive: true });

const db = new sqlite3.Database(SQLITE_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log(`Connected to SQLite database at ${SQLITE_PATH}`);
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('athlete', 'trainer')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User profiles table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      height REAL,
      weight REAL,
      age INTEGER,
      training_experience TEXT,
      goals TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Exercises table
  db.run(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      muscle_groups TEXT NOT NULL,
      equipment TEXT,
      difficulty TEXT,
      description TEXT,
      video_url TEXT,
      user_id INTEGER NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Workouts table
  db.run(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL,
      name TEXT,
      notes TEXT,
      pre_workout_prs INTEGER,
      post_workout_srpe INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Workout exercises table
  db.run(`
    CREATE TABLE IF NOT EXISTS workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      sets INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight REAL,
      rpe INTEGER,
      notes TEXT,
      FOREIGN KEY (workout_id) REFERENCES workouts (id),
      FOREIGN KEY (exercise_id) REFERENCES exercises (id)
    )
  `);

  // Training plans table
  db.run(`
    CREATE TABLE IF NOT EXISTS training_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      trainer_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      start_date DATE,
      end_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (trainer_id) REFERENCES users (id)
    )
  `);

  // Exercise tags table - Define categories and their possible values
  db.run(`
    CREATE TABLE IF NOT EXISTS exercise_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL CHECK(category IN ('muscle_group', 'training_type', 'modality', 'difficulty', 'equipment')),
      value TEXT NOT NULL,
      UNIQUE(category, value)
    )
  `);

  // Exercise tag assignments table - Many-to-many relationship between exercises and tags
  db.run(`
    CREATE TABLE IF NOT EXISTS exercise_tag_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES exercise_tags (id) ON DELETE CASCADE,
      UNIQUE(exercise_id, tag_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating exercise_tag_assignments table:', err);
      return;
    }
    
    // Planned workouts table
    db.run(`
      CREATE TABLE IF NOT EXISTS planned_workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        planned_date DATE NOT NULL,
        workout_name TEXT,
        workout_data TEXT NOT NULL,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at DATETIME NULL,
        pre_workout_prs REAL NULL,
        post_workout_srpe INTEGER NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating planned_workouts table:', err);
        return;
      }
      
      // Personal Records table
      db.run(`
        CREATE TABLE IF NOT EXISTS personal_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          exercise_type TEXT NOT NULL CHECK (exercise_type IN ('MU', 'Dominada', 'Fondos', 'Sentadilla')),
          weight_kg REAL NOT NULL DEFAULT 0,
          repetitions INTEGER NOT NULL,
          date DATE NOT NULL,
          calculated_1rm REAL NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating personal_records table:', err);
          return;
        }
        console.log('All tables created successfully. Adding missing columns...');
        
        // Add missing PRS and sRPE columns if they don't exist
        db.run(`ALTER TABLE planned_workouts ADD COLUMN pre_workout_prs REAL NULL`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding pre_workout_prs column:', err.message);
          } else {
            console.log('pre_workout_prs column ready');
          }
        });
        
        db.run(`ALTER TABLE planned_workouts ADD COLUMN post_workout_srpe INTEGER NULL`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding post_workout_srpe column:', err.message);
          } else {
            console.log('post_workout_srpe column ready');
          }
        });

        // Add new columns to workout_exercises if they don't exist
        db.run(`ALTER TABLE workout_exercises ADD COLUMN exercise_name TEXT`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding exercise_name column to workout_exercises:', err);
          } else {
            console.log('exercise_name column ready');
          }
        });

        db.run(`ALTER TABLE workout_exercises ADD COLUMN category TEXT`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding category column to workout_exercises:', err);
          } else {
            console.log('category column ready');
          }
        });

        db.run(`ALTER TABLE workout_exercises ADD COLUMN muscle_groups TEXT`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding muscle_groups column to workout_exercises:', err);
          } else {
            console.log('muscle_groups column ready');
          }
        });

        db.run(`ALTER TABLE workout_exercises ADD COLUMN equipment TEXT`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding equipment column to workout_exercises:', err);
          } else {
            console.log('equipment column ready');
          }
        });

        db.run(`ALTER TABLE workout_exercises ADD COLUMN difficulty TEXT`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding difficulty column to workout_exercises:', err);
          } else {
            console.log('difficulty column ready');
          }
        });

        db.run(`ALTER TABLE workout_exercises ADD COLUMN description TEXT`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding description column to workout_exercises:', err);
          } else {
            console.log('description column ready');
          }
        });

        db.run(`ALTER TABLE workout_exercises ADD COLUMN exercise_order INTEGER DEFAULT 0`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding exercise_order column to workout_exercises:', err);
          } else {
            console.log('exercise_order column ready');
          }
        });

        // Add sets_json column for detailed sets information (separate from 'sets' count column)
        db.run(`ALTER TABLE workout_exercises ADD COLUMN sets_json TEXT`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding sets_json column to workout_exercises:', err);
          } else {
            console.log('sets_json column ready - will store detailed sets information');
          }
        });
        
        console.log('Starting seeding...');
        // Seed default exercise tags first, then exercises
        seedExerciseTags(() => {
          console.log('Exercise tags seeded. Now seeding exercises...');
          seedExercises();
        });
      });
    });
  });
}

// Seed default exercise tags
function seedExerciseTags(callback) {
  const tags = [
    // Muscle Groups
    { category: 'muscle_group', value: 'Pecho' },
    { category: 'muscle_group', value: 'Espalda' },
    { category: 'muscle_group', value: 'Hombros' },
    { category: 'muscle_group', value: 'Bíceps' },
    { category: 'muscle_group', value: 'Tríceps' },
    { category: 'muscle_group', value: 'Core' },
    { category: 'muscle_group', value: 'Piernas' },
    { category: 'muscle_group', value: 'Antebrazo' },
    { category: 'muscle_group', value: 'Lumbar' },
    
    // Training Types
    { category: 'training_type', value: 'Fuerza' },
    { category: 'training_type', value: 'Resistencia' },
    { category: 'training_type', value: 'Explosividad' },
    { category: 'training_type', value: 'Hipertrofia' },
    { category: 'training_type', value: 'Movilidad' },
    
    // Modality
    { category: 'modality', value: 'Streetlifting' },
    { category: 'modality', value: 'Calistenia Básica' },
    { category: 'modality', value: 'Isométricos' },
    
    // Difficulty
    { category: 'difficulty', value: 'Principiante' },
    { category: 'difficulty', value: 'Intermedio' },
    { category: 'difficulty', value: 'Avanzado' },
    { category: 'difficulty', value: 'Experto' },
    
    // Equipment
    { category: 'equipment', value: 'Barra' },
    { category: 'equipment', value: 'Paralelas' },
    { category: 'equipment', value: 'Anillas' },
    { category: 'equipment', value: 'Ninguno' },
    { category: 'equipment', value: 'Lastre' }
  ];

  let completed = 0;
  const total = tags.length;
  
  tags.forEach(tag => {
    db.run(`
      INSERT OR IGNORE INTO exercise_tags (category, value) 
      VALUES (?, ?)
    `, [tag.category, tag.value], (err) => {
      if (err) {
        console.error('Error inserting tag:', err);
      }
      completed++;
      if (completed === total && callback) {
        callback();
      }
    });
  });
}

// Seed default exercises with tags
function seedExercises() {
  const exercises = [
    {
      name: 'Dominadas',
      category: 'Dominadas',
      muscle_groups: 'Espalda, Bíceps',
      equipment: 'Barra',
      difficulty: 'intermediate',
      description: 'Ejercicio básico de tracción vertical en barra fija',
      tags: ['Espalda', 'Bíceps', 'Fuerza', 'Calistenia Básica', 'Intermedio', 'Barra']
    },
    {
      name: 'Dominadas con Lastre',
      category: 'Dominadas',
      muscle_groups: 'Espalda, Bíceps',
      equipment: 'Barra, Lastre',
      difficulty: 'advanced',
      description: 'Dominadas con peso adicional para mayor intensidad',
      tags: ['Espalda', 'Bíceps', 'Fuerza', 'Streetlifting', 'Avanzado', 'Barra', 'Lastre']
    },
    {
      name: 'Muscle-ups',
      category: 'Muscle-ups',
      muscle_groups: 'Espalda, Pecho, Tríceps',
      equipment: 'Barra',
      difficulty: 'advanced',
      description: 'Ejercicio complejo que combina dominada y fondo en barra',
      tags: ['Espalda', 'Pecho', 'Tríceps', 'Explosividad', 'Streetlifting', 'Avanzado', 'Barra']
    },
    {
      name: 'Fondos en Paralelas',
      category: 'Fondos',
      muscle_groups: 'Pecho, Tríceps',
      equipment: 'Paralelas',
      difficulty: 'intermediate',
      description: 'Ejercicio de empuje vertical en barras paralelas',
      tags: ['Pecho', 'Tríceps', 'Fuerza', 'Calistenia Básica', 'Intermedio', 'Paralelas']
    },
    {
      name: 'Fondos con Lastre',
      category: 'Fondos',
      muscle_groups: 'Pecho, Tríceps',
      equipment: 'Paralelas, Lastre',
      difficulty: 'advanced',
      description: 'Fondos en paralelas con peso adicional',
      tags: ['Pecho', 'Tríceps', 'Fuerza', 'Streetlifting', 'Avanzado', 'Paralelas', 'Lastre']
    },
    {
      name: 'Flexiones',
      category: 'Flexiones',
      muscle_groups: 'Pecho, Tríceps',
      equipment: 'Ninguno',
      difficulty: 'beginner',
      description: 'Ejercicio básico de empuje horizontal',
      tags: ['Pecho', 'Tríceps', 'Resistencia', 'Calistenia Básica', 'Principiante', 'Ninguno']
    },
    {
      name: 'L-Sit',
      category: 'Isométricos',
      muscle_groups: 'Core, Hombros',
      equipment: 'Paralelas',
      difficulty: 'advanced',
      description: 'Posición isométrica en forma de L',
      tags: ['Core', 'Hombros', 'Fuerza', 'Isométricos', 'Avanzado', 'Paralelas']
    },
    {
      name: 'Planche Push-ups',
      category: 'Flexiones',
      muscle_groups: 'Pecho, Hombros, Core',
      equipment: 'Ninguno',
      difficulty: 'expert',
      description: 'Flexiones en posición de plancha, ejercicio muy avanzado',
      tags: ['Pecho', 'Hombros', 'Core', 'Fuerza', 'Calistenia Básica', 'Experto', 'Ninguno']
    },
    {
      name: 'Dominadas con Agarre de Farmer',
      category: 'Dominadas',
      muscle_groups: 'Espalda, Bíceps, Antebrazo',
      equipment: 'Barra, Lastre',
      difficulty: 'intermediate',
      description: 'Dominadas con agarre grueso y peso para trabajar antebrazo',
      tags: ['Antebrazo', 'Espalda', 'Bíceps', 'Fuerza', 'Hipertrofia', 'Streetlifting', 'Intermedio', 'Lastre']
    },
    {
      name: 'Fondos con Lastre en Paralelas',
      category: 'Fondos',
      muscle_groups: 'Pecho, Tríceps, Hombros',
      equipment: 'Paralelas, Lastre', 
      difficulty: 'intermediate',
      description: 'Fondos en paralelas con peso adicional',
      tags: ['Pecho', 'Tríceps', 'Fuerza', 'Hipertrofia', 'Streetlifting', 'Intermedio', 'Lastre']
    }
  ];

  exercises.forEach(exercise => {
    // First, try to find if exercise already exists
    db.get(`
      SELECT id FROM exercises WHERE name = ?
    `, [exercise.name], (err, existingRow) => {
      if (err) {
        console.error('Error checking existing exercise:', err);
        return;
      }
      
      let exerciseId = existingRow ? existingRow.id : null;
      
      if (!exerciseId) {
        // Exercise doesn't exist, insert it
        db.run(`
          INSERT INTO exercises (name, category, muscle_groups, equipment, difficulty, description) 
          VALUES (?, ?, ?, ?, ?, ?)
        `, [exercise.name, exercise.category, exercise.muscle_groups, exercise.equipment, exercise.difficulty, exercise.description], function(err) {
          if (err) {
            console.error('Error inserting exercise:', err);
            return;
          }
          exerciseId = this.lastID;
          assignTagsToExercise(exerciseId, exercise.tags);
        });
      } else {
        // Exercise exists, just assign tags
        assignTagsToExercise(exerciseId, exercise.tags);
      }
    });
  });
  
  function assignTagsToExercise(exerciseId, tags) {
    tags.forEach(tagValue => {
      // Find the tag ID
      db.get(`
        SELECT id FROM exercise_tags WHERE value = ?
      `, [tagValue], (err, row) => {
        if (err) {
          console.error('Error finding tag:', tagValue, err);
          return;
        }
        if (!row) {
          console.log('Tag not found:', tagValue);
          return;
        }
        
        // Insert the tag assignment
        db.run(`
          INSERT OR IGNORE INTO exercise_tag_assignments (exercise_id, tag_id) 
          VALUES (?, ?)
        `, [exerciseId, row.id], (err) => {
          if (err) {
            console.error('Error assigning tag:', err);
          }
        });
      });
    });
  }
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/workouts', require('./routes/workouts'));
app.use('/api/training-plans', require('./routes/trainingPlans'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/workout-generator', require('./routes/workoutGenerator'));
app.use('/api/planning', require('./routes/planning'));
app.use('/api/personal-records', require('./routes/personalRecords'));

// Temporary cleanup route - REMOVE AFTER CLEANUP
app.use('/api/database', require('./routes/database-cleanup'));

// Basic test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Streetlifting AI API is working!' });
});

// Serve cleanup tool HTML - TEMPORARY
app.get('/cleanup-tool.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'cleanup-tool.html'));
});

const shouldServeClient = process.env.SERVE_CLIENT === 'true' || process.env.NODE_ENV === 'production';

if (shouldServeClient) {
  const CLIENT_BUILD_PATH = process.env.CLIENT_BUILD_PATH || path.join(__dirname, '../client/build');

  if (fs.existsSync(CLIENT_BUILD_PATH)) {
    console.log(`Serving client build from ${CLIENT_BUILD_PATH}`);
    app.use(express.static(CLIENT_BUILD_PATH));

    app.get('*', (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }

      if (req.path.startsWith('/api/')) {
        return next();
      }

      if (req.path === '/cleanup-tool.html') {
        return next();
      }

      res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
    });
  } else {
    console.warn(`Client build path not found at ${CLIENT_BUILD_PATH}. SPA assets will not be served.`);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 