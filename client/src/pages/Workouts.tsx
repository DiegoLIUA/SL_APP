import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Button,
  Box,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Grid,
  Chip,
  Alert,
  LinearProgress,
  IconButton,

  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,

  InputAdornment,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  FitnessCenter as WorkoutIcon,

  Close as CloseIcon,
  AutoAwesome as AutoIcon,
  Build as ManualIcon,

  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  SwapVert as SwapIcon,
  Settings as SettingsIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import Layout from '../components/Layout/Layout';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Workout {
  id: number;
  name: string;
  date: string;
  pre_workout_prs: number | null;
  post_workout_srpe: number | null;
  notes: string;
  exercises?: any[];
}

interface Exercise {
  id: number;
  name: string;
  category: string;
  muscle_groups: string;
  equipment: string;
  difficulty: string;
  description?: string;
  video_url?: string;
  tags?: string[];
}

interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  rest: number;
}

interface WorkoutExercise extends Exercise {
  workoutExerciseId: string;
  sets: WorkoutSet[];
  order: number;
}

const Workouts: React.FC = () => {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Tab and mode states
  const [currentTab, setCurrentTab] = useState(0);
  const [newWorkoutOpen, setNewWorkoutOpen] = useState(false);
  const [srpeDialogOpen, setSRPEDialogOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  // Manual workout states
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [exerciseSearchOpen, setExerciseSearchOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedExerciseForConfig, setSelectedExerciseForConfig] = useState<WorkoutExercise | null>(null);
  const [planningDialogOpen, setPlanningDialogOpen] = useState(false);
  const [selectedPlanDate, setSelectedPlanDate] = useState('');

  // sRPE form
  const [srpeValue, setSRPEValue] = useState(5);
  const [notes, setNotes] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchWorkouts();
    fetchAllExercises();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper functions
  const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const normalizeExerciseOrder = (exercises: WorkoutExercise[]): WorkoutExercise[] => {
    return exercises.map((exercise, index) => ({
      ...exercise,
      order: index
    }));
  };

  const formatDateString = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const fetchWorkouts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/workouts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkouts(response.data);
    } catch (err: any) {
      setError('Error al cargar entrenamientos');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllExercises = async () => {
    try {
      const response = await axios.get('/api/workout-generator/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllExercises(response.data);
    } catch (err: any) {
      console.error('Error fetching all exercises:', err);
    }
  };

  // Manual workout exercise management
  const addExerciseManually = (exercise: Exercise) => {
    const workoutExercise: WorkoutExercise = {
      ...exercise,
      workoutExerciseId: generateId(),
      sets: [{ 
        id: generateId(), 
        reps: 8, 
        weight: 0, 
        rest: 90 
      }],
      order: workoutExercises.length
    };
    
    const newExercises = [...workoutExercises, workoutExercise];
    setWorkoutExercises(normalizeExerciseOrder(newExercises));
    setExerciseSearchOpen(false);
    setExerciseSearch('');
  };

  const removeExercise = (workoutExerciseId: string) => {
    const newExercises = workoutExercises.filter(ex => ex.workoutExerciseId !== workoutExerciseId);
    setWorkoutExercises(normalizeExerciseOrder(newExercises));
  };

  const duplicateExercise = (workoutExerciseId: string) => {
    const exerciseIndex = workoutExercises.findIndex(ex => ex.workoutExerciseId === workoutExerciseId);
    if (exerciseIndex === -1) return;

    const originalExercise = workoutExercises[exerciseIndex];
    const duplicatedExercise: WorkoutExercise = {
      ...originalExercise,
      workoutExerciseId: generateId(),
      sets: originalExercise.sets.map(set => ({
        ...set,
        id: generateId()
      })),
      order: exerciseIndex + 1
    };

    const newExercises = [
      ...workoutExercises.slice(0, exerciseIndex + 1),
      duplicatedExercise,
      ...workoutExercises.slice(exerciseIndex + 1)
    ];
    setWorkoutExercises(normalizeExerciseOrder(newExercises));
  };

  const moveExercise = (workoutExerciseId: string, direction: 'up' | 'down') => {
    const currentIndex = workoutExercises.findIndex(ex => ex.workoutExerciseId === workoutExerciseId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= workoutExercises.length) return;

    const newExercises = [...workoutExercises];
    [newExercises[currentIndex], newExercises[newIndex]] = [newExercises[newIndex], newExercises[currentIndex]];
    setWorkoutExercises(normalizeExerciseOrder(newExercises));
  };

  const createWorkout = async () => {
    if (!workoutName.trim()) {
      setError('El nombre del entrenamiento es requerido');
      return;
    }

    try {
      // Para entrenamientos manuales básicos (sin ejercicios), no incluir PRS
      const response = await axios.post('/api/workouts', {
        name: workoutName,
        date: workoutDate,
        pre_workout_prs: null, // PRS se añadirá desde el calendario
        notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setWorkouts([response.data, ...workouts]);
      handleCloseNewWorkout();
      setError('');
      alert('Entrenamiento básico creado. Puedes añadir PRS y sRPE desde el calendario.');
    } catch (err: any) {
      setError('Error al crear entrenamiento');
    }
  };

  // Planning integration
  const saveToPlanning = async () => {
    if (!workoutExercises.length || !selectedPlanDate) return;

    try {
      const workoutData = {
        name: workoutName || 'Entrenamiento Manual',
        exercises: workoutExercises.map(ex => ({
          id: ex.id,
          name: ex.name,
          category: ex.category,
          muscle_groups: ex.muscle_groups,
          equipment: ex.equipment,
          difficulty: ex.difficulty,
          description: ex.description,
          video_url: ex.video_url,
          workoutExerciseId: ex.workoutExerciseId,
          sets: ex.sets.map(set => ({
            id: set.id,
            reps: set.reps,
            weight: set.weight,
            rest: set.rest
          })),
          order: ex.order,
          tags: ex.tags || []
        }))
      };

      console.log('Saving workout data:', workoutData); // Debug

      await axios.post('/api/planning/add', {
        planned_date: selectedPlanDate,
        workout_name: workoutName || 'Entrenamiento Manual',
        workout_data: workoutData // Enviar como objeto, no como string
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPlanningDialogOpen(false);
      setSelectedPlanDate('');
      setError('');
      handleCloseNewWorkout(); // Cerrar el diálogo principal también
      alert('¡Entrenamiento añadido a la planificación exitosamente! Puedes ver los detalles en el calendario.');
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.error?.includes('máximo 2 entrenamientos')) {
        setError('Ya tienes el máximo de entrenamientos permitidos (2) para esa fecha');
      } else {
        setError('Error al añadir a la planificación: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const updateWorkoutSRPE = async () => {
    if (!selectedWorkout) return;

    try {
      await axios.patch(`/api/workouts/${selectedWorkout.id}`, {
        post_workout_srpe: srpeValue,
        notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      setWorkouts(workouts.map(w => 
        w.id === selectedWorkout.id 
          ? { ...w, post_workout_srpe: srpeValue, notes }
          : w
      ));
      
      handleCloseSRPE();
      setError('');
    } catch (err: any) {
      setError('Error al actualizar sRPE');
    }
  };

  const handleCloseNewWorkout = () => {
    setNewWorkoutOpen(false);
    setWorkoutName('');
    setNotes('');
    setWorkoutExercises([]);
    setCurrentTab(0);
  };

  // Exercise configuration
  const openExerciseConfig = (exercise: WorkoutExercise) => {
    setSelectedExerciseForConfig(exercise);
    setConfigDialogOpen(true);
  };

  const updateExerciseSets = (workoutExerciseId: string, newSets: WorkoutSet[]) => {
    setWorkoutExercises(prev => prev.map(ex => 
      ex.workoutExerciseId === workoutExerciseId 
        ? { ...ex, sets: newSets }
        : ex
    ));
  };

  const addSet = () => {
    if (!selectedExerciseForConfig) return;
    const newSet: WorkoutSet = {
      id: generateId(),
      reps: 8,
      weight: 0,
      rest: 90
    };
    const updatedSets = [...selectedExerciseForConfig.sets, newSet];
    updateExerciseSets(selectedExerciseForConfig.workoutExerciseId, updatedSets);
    setSelectedExerciseForConfig({
      ...selectedExerciseForConfig,
      sets: updatedSets
    });
  };

  const removeSet = (setId: string) => {
    if (!selectedExerciseForConfig || selectedExerciseForConfig.sets.length <= 1) return;
    const updatedSets = selectedExerciseForConfig.sets.filter(set => set.id !== setId);
    updateExerciseSets(selectedExerciseForConfig.workoutExerciseId, updatedSets);
    setSelectedExerciseForConfig({
      ...selectedExerciseForConfig,
      sets: updatedSets
    });
  };

  const updateSet = (setId: string, field: keyof WorkoutSet, value: number) => {
    if (!selectedExerciseForConfig) return;
    const updatedSets = selectedExerciseForConfig.sets.map(set =>
      set.id === setId ? { ...set, [field]: value } : set
    );
    updateExerciseSets(selectedExerciseForConfig.workoutExerciseId, updatedSets);
    setSelectedExerciseForConfig({
      ...selectedExerciseForConfig,
      sets: updatedSets
    });
  };

  const handleCloseSRPE = () => {
    setSRPEDialogOpen(false);
    setSelectedWorkout(null);
    setSRPEValue(5);
    setNotes('');
  };

  const openSRPEDialog = (workout: Workout) => {
    setSelectedWorkout(workout);
    setSRPEValue(workout.post_workout_srpe || 5);
    setNotes(workout.notes || '');
    setSRPEDialogOpen(true);
  };

  const getPRSColor = (prs: number | null): 'default' | 'success' | 'warning' | 'error' => {
    if (!prs) return 'default';
    if (prs >= 8) return 'success';
    if (prs >= 6) return 'warning';
    return 'error';
  };

  const getSRPEColor = (srpe: number | null): 'default' | 'success' | 'warning' | 'error' => {
    if (!srpe) return 'default';
    if (srpe <= 3) return 'success';
    if (srpe <= 6) return 'warning';
    return 'error';
  };

  return (
    <Layout>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Crear Entrenamiento
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setNewWorkoutOpen(true)}
        >
          Nuevo Entrenamiento
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      <Grid container spacing={3}>
        {workouts.map((workout) => (
          <Grid item xs={12} md={6} lg={4} key={workout.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {workout.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {new Date(workout.date).toLocaleDateString('es-ES')}
                </Typography>

                <Box sx={{ my: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">PRS Pre-entreno:</Typography>
                    {workout.pre_workout_prs ? (
                      <Chip 
                        label={`${workout.pre_workout_prs}/10`}
                        color={getPRSColor(workout.pre_workout_prs)}
                        size="small"
                      />
                    ) : (
                      <Chip label="No registrado" variant="outlined" size="small" />
                    )}
                  </Box>

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">sRPE Post-entreno:</Typography>
                    {workout.post_workout_srpe ? (
                      <Chip 
                        label={`${workout.post_workout_srpe}/10`}
                        color={getSRPEColor(workout.post_workout_srpe)}
                        size="small"
                      />
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openSRPEDialog(workout)}
                      >
                        Registrar sRPE
                      </Button>
                    )}
                  </Box>
                </Box>

                {workout.notes && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    📝 {workout.notes}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {workouts.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <WorkoutIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No tienes entrenamientos registrados
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Crea tu primer entrenamiento y comienza a monitorear tu progreso
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNewWorkoutOpen(true)}
          >
            Crear primer entrenamiento
          </Button>
        </Paper>
      )}

      {/* Dialog: Nuevo entrenamiento unificado */}
      <Dialog open={newWorkoutOpen} onClose={handleCloseNewWorkout} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Crear Entrenamiento
            <IconButton onClick={handleCloseNewWorkout}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
              <Tab 
                icon={<AutoIcon />} 
                label="Automático" 
                iconPosition="start"
              />
              <Tab 
                icon={<ManualIcon />} 
                label="Manual" 
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Tab Automático */}
          {currentTab === 0 && (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <AutoIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Generación Automática de Entrenamientos
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Utiliza filtros inteligentes para generar entrenamientos personalizados basados en grupos musculares, tipo de entrenamiento, modalidad y más.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<AutoIcon />}
                onClick={() => {
                  handleCloseNewWorkout();
                  navigate('/workout-generator');
                }}
                sx={{ mt: 2 }}
              >
                Ir al Generador Automático
              </Button>
            </Paper>
          )}

          {/* Tab Manual */}
          {currentTab === 1 && (
            <Grid container spacing={3}>
              {/* Información básica */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Información del Entrenamiento
                </Typography>
                <TextField
                  fullWidth
                  label="Nombre del entrenamiento"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  margin="normal"
                  placeholder="Ej: Entrenamiento de fuerza"
                />
                <TextField
                  fullWidth
                  label="Fecha"
                  type="date"
                  value={workoutDate}
                  onChange={(e) => setWorkoutDate(e.target.value)}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="Notas"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  margin="normal"
                  multiline
                  rows={3}
                  placeholder="Objetivos, observaciones..."
                />


              </Grid>

              {/* Ejercicios */}
              <Grid item xs={12} md={6}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Ejercicios ({workoutExercises.length})
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setExerciseSearchOpen(true)}
                  >
                    Añadir Ejercicio
                  </Button>
                </Box>

                {workoutExercises.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <WorkoutIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No hay ejercicios añadidos
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Haz click en "Añadir Ejercicio" para comenzar
                    </Typography>
                  </Paper>
                ) : (
                  <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {workoutExercises.map((exercise, index) => {
                      const duplicateCount = workoutExercises.filter(ex => ex.id === exercise.id).length;
                      const isDuplicated = duplicateCount > 1;
                      
                      return (
                        <ListItem
                          key={exercise.workoutExerciseId}
                          sx={{
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                            mb: 1,
                            bgcolor: isDuplicated ? 'warning.light' : 'background.paper',
                            '&:hover': { bgcolor: isDuplicated ? 'warning.main' : 'action.hover' }
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body1" fontWeight="medium">
                                  {index + 1}. {exercise.name}
                                </Typography>
                                {isDuplicated && (
                                  <Chip label={`x${duplicateCount}`} size="small" color="warning" />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  {exercise.muscle_groups} • {exercise.equipment} • {exercise.difficulty}
                                </Typography>
                                <br />
                                <Typography variant="caption" color="primary">
                                  {exercise.sets.length} serie{exercise.sets.length !== 1 ? 's' : ''} • 
                                  {exercise.sets.map(set => `${set.reps} reps`).join(', ')}
                                </Typography>
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Tooltip title="Configurar series">
                                <span>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => openExerciseConfig(exercise)}
                                  >
                                    <SettingsIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              
                              <Tooltip title="Subir">
                                <span>
                                  <IconButton 
                                    size="small" 
                                    disabled={index === 0}
                                    onClick={() => moveExercise(exercise.workoutExerciseId, 'up')}
                                  >
                                    <SwapIcon style={{ transform: 'rotate(180deg)' }} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              
                              <Tooltip title="Bajar">
                                <span>
                                  <IconButton 
                                    size="small" 
                                    disabled={index === workoutExercises.length - 1}
                                    onClick={() => moveExercise(exercise.workoutExerciseId, 'down')}
                                  >
                                    <SwapIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              
                              <Tooltip title="Duplicar">
                                <IconButton 
                                  size="small" 
                                  onClick={() => duplicateExercise(exercise.workoutExerciseId)}
                                >
                                  <DuplicateIcon />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Eliminar">
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => removeExercise(exercise.workoutExerciseId)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                  </List>
                )}

                {workoutExercises.length > 0 && (
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<CalendarIcon />}
                      onClick={() => setPlanningDialogOpen(true)}
                      fullWidth
                    >
                      Añadir a Planificación
                    </Button>
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewWorkout}>Cancelar</Button>
          {currentTab === 1 && workoutExercises.length === 0 && (
            <Button 
              variant="contained" 
              onClick={createWorkout}
              disabled={!workoutName.trim()}
            >
              Crear Entrenamiento Básico
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog: sRPE Post-entrenamiento */}
      <Dialog open={srpeDialogOpen} onClose={handleCloseSRPE} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            sRPE - Esfuerzo Percibido
            <IconButton onClick={handleCloseSRPE}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            ¿Cómo fue la intensidad de tu entrenamiento?
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Evalúa el esfuerzo percibido de toda la sesión (1-10):
          </Typography>

          <Box sx={{ my: 3 }}>
            <Typography variant="body2" gutterBottom>
              Esfuerzo percibido: {srpeValue}/10
            </Typography>
            <FormControl fullWidth>
              <Select
                value={srpeValue}
                onChange={(e) => setSRPEValue(Number(e.target.value))}
              >
                <MenuItem value={1}>1 - Muy fácil</MenuItem>
                <MenuItem value={2}>2 - Fácil</MenuItem>
                <MenuItem value={3}>3 - Moderado</MenuItem>
                <MenuItem value={4}>4 - Algo difícil</MenuItem>
                <MenuItem value={5}>5 - Difícil</MenuItem>
                <MenuItem value={6}>6 - Difícil+</MenuItem>
                <MenuItem value={7}>7 - Muy difícil</MenuItem>
                <MenuItem value={8}>8 - Muy difícil+</MenuItem>
                <MenuItem value={9}>9 - Extremadamente difícil</MenuItem>
                <MenuItem value={10}>10 - Máximo esfuerzo</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TextField
            fullWidth
            label="Notas adicionales"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={3}
            placeholder="¿Cómo te sentiste? ¿Algo que destacar?"
          />

          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              Interpretación sRPE:
            </Typography>
            <Typography variant="body2">
              • <strong>1-3:</strong> Recuperación activa, trabajo técnico<br/>
              • <strong>4-6:</strong> Entrenamiento moderado, desarrollo aeróbico<br/>
              • <strong>7-8:</strong> Entrenamiento intenso, desarrollo de fuerza<br/>
              • <strong>9-10:</strong> Máxima intensidad, pruebas o competición
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSRPE}>Cancelar</Button>
          <Button variant="contained" onClick={updateWorkoutSRPE}>
            Guardar sRPE
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Buscar y añadir ejercicios */}
      <Dialog open={exerciseSearchOpen} onClose={() => setExerciseSearchOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Añadir Ejercicio
            <IconButton onClick={() => setExerciseSearchOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Buscar ejercicios"
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
            margin="normal"
            placeholder="Escribe el nombre del ejercicio..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  🔍
                </InputAdornment>
              ),
            }}
          />
          
          <List sx={{ maxHeight: 400, overflow: 'auto', mt: 2 }}>
            {allExercises
              .filter(exercise => 
                exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
                exercise.muscle_groups.toLowerCase().includes(exerciseSearch.toLowerCase())
              )
              .map((exercise) => (
                <ListItem
                  key={exercise.id}
                  button
                  onClick={() => addExerciseManually(exercise)}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <ListItemText
                    primary={exercise.name}
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {exercise.muscle_groups} • {exercise.equipment} • {exercise.difficulty}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
          </List>
          
          {allExercises.filter(exercise => 
            exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
            exercise.muscle_groups.toLowerCase().includes(exerciseSearch.toLowerCase())
          ).length === 0 && exerciseSearch && (
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
              No se encontraron ejercicios que coincidan con "{exerciseSearch}"
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Configurar series de ejercicio */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Configurar: {selectedExerciseForConfig?.name}
            <IconButton onClick={() => setConfigDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedExerciseForConfig && (
            <>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configura las series, repeticiones, peso y descanso para este ejercicio
              </Typography>
              
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Series ({selectedExerciseForConfig.sets.length})
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addSet}
                >
                  Añadir Serie
                </Button>
              </Box>

              {selectedExerciseForConfig.sets.map((set, index) => (
                <Paper key={set.id} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle2">
                      Serie {index + 1}
                    </Typography>
                    {selectedExerciseForConfig.sets.length > 1 && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeSet(set.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth
                        label="Reps"
                        type="number"
                        size="small"
                        value={set.reps}
                        onChange={(e) => updateSet(set.id, 'reps', Number(e.target.value))}
                        inputProps={{ min: 1, max: 50 }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth
                        label="Peso (kg)"
                        type="number"
                        size="small"
                        value={set.weight}
                        onChange={(e) => updateSet(set.id, 'weight', Number(e.target.value))}
                        inputProps={{ min: 0, step: 0.5 }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth
                        label="Descanso (s)"
                        type="number"
                        size="small"
                        value={set.rest}
                        onChange={(e) => updateSet(set.id, 'rest', Number(e.target.value))}
                        inputProps={{ min: 30, max: 600, step: 15 }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Añadir a planificación */}
      <Dialog open={planningDialogOpen} onClose={() => setPlanningDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Añadir a Planificación
            <IconButton onClick={() => setPlanningDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Selecciona la fecha para añadir este entrenamiento a tu planificación
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Ejercicios: {workoutExercises.length} • 
            Series totales: {workoutExercises.reduce((acc, ex) => acc + ex.sets.length, 0)}
          </Typography>
          
          <TextField
            fullWidth
            label="Fecha"
            type="date"
            value={selectedPlanDate}
            onChange={(e) => setSelectedPlanDate(e.target.value)}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            inputProps={{
              min: (() => {
                const today = new Date();
                return formatDateString(today);
              })()
            }}
          />

          {selectedPlanDate && (
            <Typography variant="body2" color="primary" sx={{ mt: 2 }}>
              📅 Fecha seleccionada: {new Date(selectedPlanDate + 'T00:00:00').toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanningDialogOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={saveToPlanning}
            disabled={!selectedPlanDate || workoutExercises.length === 0}
          >
            Añadir a Planificación
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default Workouts; 