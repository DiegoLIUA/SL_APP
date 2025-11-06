import React, { useState, useEffect, useContext } from 'react';
import {
  Typography,
  Container,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Box,
  Alert,
  Paper,
  Divider,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Fab,
  Menu,
  MenuItem,
  CardActions,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AutoAwesome as AutoAwesomeIcon,
  FitnessCenter as FitnessCenterIcon,
  PlayCircleFilled as PlayIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  SwapHoriz as SwapIcon,
  DragIndicator as DragIcon,
  Settings as SettingsIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  CalendarToday as CalendarIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';

interface Exercise {
  id: number;
  name: string;
  category: string;
  muscle_groups: string;
  equipment: string;
  difficulty: string;
  description: string;
  video_url: string;
  tags: { [category: string]: string[] };
}

interface WorkoutExercise extends Exercise {
  sets: ExerciseSet[];
  order: number;
  workoutExerciseId: string; // ID único para cada instancia en el entrenamiento
}

interface ExerciseSet {
  id: string;
  reps: number;
  weight?: number;
  rest?: number; // en segundos
  notes?: string;
}

interface Tag {
  id: number;
  value: string;
}

interface TagsByCategory {
  [category: string]: Tag[];
}

interface GeneratedWorkout {
  exercises: Exercise[];
  generatedAt: string;
  requested: number;
  found: number;
  hasLimitedResults: boolean;
  filters: {
    muscleGroups: string[];
    trainingTypes: string[];
    modalities: string[];
    difficulties: string[];
    equipment: string[];
  };
}

const WorkoutGenerator: React.FC = () => {
  const { user } = useContext(AuthContext);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State management
  const [availableTags, setAvailableTags] = useState<TagsByCategory>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null);
  
  // New enhanced workout state
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  
  // Dialog states
  const [manualSelectionOpen, setManualSelectionOpen] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [exerciseMenuAnchor, setExerciseMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedExerciseForMenu, setSelectedExerciseForMenu] = useState<string | null>(null);
  const [similarExercisesOpen, setSimilarExercisesOpen] = useState(false);
  const [similarExercises, setSimilarExercises] = useState<Exercise[]>([]);
  const [exerciseConfigOpen, setExerciseConfigOpen] = useState(false);
  const [selectedExerciseForConfig, setSelectedExerciseForConfig] = useState<WorkoutExercise | null>(null);
  
  // Search state for manual selection
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  
  // Planning dialog state
  const [planningDialogOpen, setPlanningDialogOpen] = useState(false);
  const [selectedPlanDate, setSelectedPlanDate] = useState('');
  
  // Workout naming state
  const [workoutName, setWorkoutName] = useState('');

  // Filter states
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]);
  const [selectedTrainingTypes, setSelectedTrainingTypes] = useState<string[]>([]);
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [exerciseCount, setExerciseCount] = useState<number>(6);

  useEffect(() => {
    fetchAvailableTags();
    
    // Check if coming from calendar with a specific date
    const planDate = searchParams.get('planDate');
    if (planDate) {
      setSelectedPlanDate(planDate);
    }
  }, []);

  // Check if user came from planning page
  const isFromPlanning = searchParams.get('planDate') !== null; // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAvailableTags = async () => {
    try {
      const response = await axios.get('/api/tags', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableTags(response.data);
    } catch (err: any) {
      setError('Error al cargar etiquetas');
      console.error('Error fetching tags:', err);
    }
  };

  const handleGenerateWorkout = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await axios.post('/api/workout-generator/generate', {
        muscleGroups: selectedMuscleGroups,
        trainingTypes: selectedTrainingTypes,
        modalities: selectedModalities,
        difficulties: selectedDifficulties,
        equipment: selectedEquipment,
        exerciseCount: exerciseCount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setGeneratedWorkout(response.data);
      
      // Convert to WorkoutExercise format
      const workoutExercisesData: WorkoutExercise[] = response.data.exercises.map((exercise: Exercise, index: number) => ({
        ...exercise,
        order: index,
        workoutExerciseId: generateId(), // ID único para esta instancia del ejercicio
        sets: [{ id: generateId(), reps: 8, weight: 0, rest: 60 }] // Default: 1 set, 8 reps, 60s rest
      }));
      
      // Normalize order numbers
      const normalizedExercises = normalizeExerciseOrder(workoutExercisesData);
      setWorkoutExercises(normalizedExercises);
      
      if (response.data.hasLimitedResults) {
        setSuccess(`Se generaron ${response.data.found} ejercicios de ${response.data.requested} solicitados. Considera crear más ejercicios con estas características.`);
      } else {
        setSuccess(`¡Entrenamiento generado con ${response.data.exercises.length} ejercicios!`);
      }
    } catch (err: any) {
      setError('Error al generar entrenamiento. Intenta ajustar los filtros.');
      console.error('Error generating workout:', err);
    } finally {
      setLoading(false);
    }
  };

  // Utility function to generate unique IDs
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Utility function to normalize exercise order numbers
  const normalizeExerciseOrder = (exercises: WorkoutExercise[]): WorkoutExercise[] => {
    return exercises.map((exercise, index) => ({
      ...exercise,
      order: index
    }));
  };

  // Fetch all exercises for manual selection
  const fetchAllExercises = async () => {
    try {
      const response = await axios.get('/api/workout-generator/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllExercises(response.data);
    } catch (err: any) {
      setError('Error al cargar ejercicios');
      console.error('Error fetching all exercises:', err);
    }
  };

  // Fetch similar exercises
  const fetchSimilarExercises = async (workoutExerciseId: string) => {
    try {
      // Find the exercise to get its original ID
      const exercise = workoutExercises.find(ex => ex.workoutExerciseId === workoutExerciseId);
      if (!exercise) return;

      const response = await axios.get(`/api/workout-generator/similar/${exercise.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSimilarExercises(response.data);
      setSimilarExercisesOpen(true);
    } catch (err: any) {
      setError('Error al cargar ejercicios similares');
      console.error('Error fetching similar exercises:', err);
    }
  };

  // Add exercise manually
  const addExerciseManually = (exercise: Exercise) => {
    const newWorkoutExercise: WorkoutExercise = {
      ...exercise,
      order: workoutExercises.length,
      workoutExerciseId: generateId(), // ID único para esta instancia
      sets: [{ id: generateId(), reps: 8, weight: 0, rest: 60 }]
    };
    
    const updatedExercises = [...workoutExercises, newWorkoutExercise];
    const normalizedExercises = normalizeExerciseOrder(updatedExercises);
    setWorkoutExercises(normalizedExercises);
    
    setManualSelectionOpen(false);
    setExerciseSearchTerm('');
    setSuccess(`Ejercicio "${exercise.name}" agregado al entrenamiento`);
  };

  // Remove exercise from workout
  const removeExercise = (workoutExerciseId: string) => {
    const updatedExercises = workoutExercises.filter(ex => ex.workoutExerciseId !== workoutExerciseId);
    const normalizedExercises = normalizeExerciseOrder(updatedExercises);
    setWorkoutExercises(normalizedExercises);
    
    setSelectedExerciseForMenu(null); // Resetear selección
    setSuccess('Ejercicio eliminado del entrenamiento');
  };

  // Duplicate exercise in workout
  const duplicateExercise = (workoutExerciseId: string) => {
    const exerciseToDuplicate = workoutExercises.find(ex => ex.workoutExerciseId === workoutExerciseId);
    if (!exerciseToDuplicate) return;

    const duplicatedExercise: WorkoutExercise = {
      ...exerciseToDuplicate,
      workoutExerciseId: generateId(), // Nuevo ID único para el duplicado
      order: workoutExercises.length, // Se añade al final
      sets: exerciseToDuplicate.sets.map(set => ({ ...set, id: generateId() })) // Copiar sets con nuevos IDs
    };

    const updatedExercises = [...workoutExercises, duplicatedExercise];
    const normalizedExercises = normalizeExerciseOrder(updatedExercises);
    setWorkoutExercises(normalizedExercises);
    
    setSelectedExerciseForMenu(null);
    setSuccess(`Ejercicio "${exerciseToDuplicate.name}" duplicado`);
  };

  // Replace exercise with similar one
  const replaceExercise = (workoutExerciseId: string, newExercise: Exercise) => {
    const oldExercise = workoutExercises.find(ex => ex.workoutExerciseId === workoutExerciseId);
    if (!oldExercise) {
      console.log('❌ ERROR: Old exercise not found for workoutExerciseId:', workoutExerciseId);
      return;
    }

    const newWorkoutExercise: WorkoutExercise = {
      ...newExercise,
      order: oldExercise.order,
      workoutExerciseId: oldExercise.workoutExerciseId, // Mantener el mismo workoutExerciseId
      sets: oldExercise.sets // Keep the same set configuration
    };

    const updatedExercises = workoutExercises.map(ex => 
      ex.workoutExerciseId === workoutExerciseId ? newWorkoutExercise : ex
    );
    
    const normalizedExercises = normalizeExerciseOrder(updatedExercises);
    setWorkoutExercises(normalizedExercises);
    
    setSimilarExercisesOpen(false);
    setSelectedExerciseForMenu(null);
    setSuccess(`Ejercicio sustituido por "${newExercise.name}"`);
  };

  // Move exercise up/down
  const moveExercise = (workoutExerciseId: string, direction: 'up' | 'down') => {
    const currentIndex = workoutExercises.findIndex(ex => ex.workoutExerciseId === workoutExerciseId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= workoutExercises.length) return;

    const newWorkoutExercises = [...workoutExercises];
    [newWorkoutExercises[currentIndex], newWorkoutExercises[newIndex]] = 
    [newWorkoutExercises[newIndex], newWorkoutExercises[currentIndex]];
    
    // Normalize order numbers after reordering
    const normalizedExercises = normalizeExerciseOrder(newWorkoutExercises);
    setWorkoutExercises(normalizedExercises);
  };

  // Update exercise sets configuration
  const updateExerciseSets = (workoutExerciseId: string, sets: ExerciseSet[]) => {
    const updatedExercises = workoutExercises.map(ex => 
      ex.workoutExerciseId === workoutExerciseId ? { ...ex, sets } : ex
    );
    // No es necesario normalizar aquí ya que no cambia el orden, pero mantenemos consistencia
    setWorkoutExercises(updatedExercises);
  };

  // Handle exercise menu
  const handleExerciseMenuOpen = (event: React.MouseEvent<HTMLElement>, workoutExerciseId: string) => {
    setExerciseMenuAnchor(event.currentTarget);
    setSelectedExerciseForMenu(workoutExerciseId);
  };

  // Check if exercise has duplicates and get styling
  const getExerciseStyle = (exercise: WorkoutExercise) => {
    const duplicateCount = workoutExercises.filter(ex => ex.id === exercise.id).length;
    if (duplicateCount > 1) {
      return {
        backgroundColor: 'rgba(255, 193, 7, 0.1)', // Fondo amarillo suave para duplicados
        border: '1px solid rgba(255, 193, 7, 0.3)'
      };
    }
    return {};
  };

  // Get duplicate count for display
  const getDuplicateCount = (exercise: WorkoutExercise) => {
    return workoutExercises.filter(ex => ex.id === exercise.id).length;
  };

  const handleExerciseMenuClose = () => {
    setExerciseMenuAnchor(null);
    // NO resetear selectedExerciseForMenu aquí porque se necesita para sustituciones
  };

  // Open manual selection dialog
  const openManualSelection = () => {
    fetchAllExercises();
    setManualSelectionOpen(true);
  };

  // Add workout to planning
  const addToPlanning = async (date: string) => {
    try {
      if (!generatedWorkout || workoutExercises.length === 0) {
        setError('Necesitas generar un entrenamiento primero');
        return;
      }

      setLoading(true);
      
      const workoutData = {
        exercises: workoutExercises,
        filters: {
          muscleGroups: selectedMuscleGroups,
          trainingTypes: selectedTrainingTypes,
          modalities: selectedModalities,
          difficulties: selectedDifficulties,
          equipment: selectedEquipment
        },
        generatedAt: generatedWorkout.generatedAt
      };

      const response = await axios.post('/api/planning/add', {
        planned_date: date,
        workout_name: workoutName || `Entrenamiento ${workoutExercises.length} ejercicios`,
        workout_data: workoutData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(`Entrenamiento agregado a la planificación para ${new Date(date + 'T00:00:00').toLocaleDateString('es-ES')}`);
      setPlanningDialogOpen(false);
      
      // If came from planning, go back to planning
      if (isFromPlanning) {
        navigate('/planning');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al agregar a planificación');
      console.error('Error adding to planning:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open planning date selection dialog
  const openPlanningDialog = () => {
    if (!generatedWorkout || workoutExercises.length === 0) {
      setError('Necesitas generar un entrenamiento primero');
      return;
    }
    setPlanningDialogOpen(true);
  };

  // Filter exercises for search
  const filteredExercises = allExercises.filter(exercise =>
    exercise.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase()) ||
    exercise.muscle_groups.toLowerCase().includes(exerciseSearchTerm.toLowerCase())
  );

  const handleTagToggle = (category: string, value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => 
      prev.includes(value) 
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  };

  const clearAllFilters = () => {
    setSelectedMuscleGroups([]);
    setSelectedTrainingTypes([]);
    setSelectedModalities([]);
    setSelectedDifficulties([]);
    setSelectedEquipment([]);
    setGeneratedWorkout(null);
    
    // Clear workout exercises and reset state
    setWorkoutExercises([]);
    setSelectedExerciseForMenu(null);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: any } = {
      muscle_group: 'primary',
      training_type: 'secondary',
      modality: 'success',
      difficulty: 'warning',
      equipment: 'info'
    };
    return colors[category] || 'default';
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      muscle_group: 'Grupos Musculares',
      training_type: 'Tipos de Entrenamiento',
      modality: 'Modalidad',
      difficulty: 'Dificultad',
      equipment: 'Equipamiento'
    };
    return labels[category] || category;
  };

  const getSelectedForCategory = (category: string) => {
    switch (category) {
      case 'muscle_group': return selectedMuscleGroups;
      case 'training_type': return selectedTrainingTypes;
      case 'modality': return selectedModalities;
      case 'difficulty': return selectedDifficulties;
      case 'equipment': return selectedEquipment;
      default: return [];
    }
  };

  const getSetterForCategory = (category: string) => {
    switch (category) {
      case 'muscle_group': return setSelectedMuscleGroups;
      case 'training_type': return setSelectedTrainingTypes;
      case 'modality': return setSelectedModalities;
      case 'difficulty': return setSelectedDifficulties;
      case 'equipment': return setSelectedEquipment;
      default: return () => {};
    }
  };

  const getTotalFiltersCount = () => {
    return selectedMuscleGroups.length + 
           selectedTrainingTypes.length + 
           selectedModalities.length + 
           selectedDifficulties.length + 
           selectedEquipment.length;
  };

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            <AutoAwesomeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Generador Automático de Entrenamientos
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" mb={4}>
          Selecciona tus preferencias y genera entrenamientos personalizados automáticamente
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Grid container spacing={3}>
          {/* Filters Section */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Filtros de Entrenamiento
                  {getTotalFiltersCount() > 0 && (
                    <Chip 
                      label={`${getTotalFiltersCount()} filtros`} 
                      size="small" 
                      color="primary" 
                      sx={{ ml: 1 }} 
                    />
                  )}
                </Typography>

                <Divider sx={{ my: 2 }} />

                {/* Exercise Count Slider */}
                <Box mb={3}>
                  <Typography gutterBottom>
                    Número de ejercicios: {exerciseCount}
                  </Typography>
                  <Slider
                    value={exerciseCount}
                    onChange={(_, value) => setExerciseCount(value as number)}
                    min={3}
                    max={12}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Filter Categories */}
                {Object.keys(availableTags).map(category => (
                  <Accordion key={category} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">
                        {getCategoryLabel(category)}
                        {getSelectedForCategory(category).length > 0 && (
                          <Chip 
                            label={getSelectedForCategory(category).length} 
                            size="small" 
                            color={getCategoryColor(category)}
                            sx={{ ml: 1 }} 
                          />
                        )}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {availableTags[category]?.map(tag => (
                          <Chip
                            key={tag.id}
                            label={tag.value}
                            clickable
                            size="small"
                            color={getSelectedForCategory(category).includes(tag.value) ? getCategoryColor(category) : 'default'}
                            variant={getSelectedForCategory(category).includes(tag.value) ? 'filled' : 'outlined'}
                            onClick={() => handleTagToggle(
                              category,
                              tag.value,
                              getSetterForCategory(category)
                            )}
                          />
                        )) || []}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}

                <Box mt={3} display="flex" gap={2}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<PlayIcon />}
                    onClick={handleGenerateWorkout}
                    disabled={loading}
                  >
                    {loading ? 'Generando...' : 'Generar Entrenamiento'}
                  </Button>
                </Box>

                <Button
                  variant="text"
                  fullWidth
                  onClick={clearAllFilters}
                  disabled={getTotalFiltersCount() === 0}
                  sx={{ mt: 1 }}
                >
                  Limpiar Filtros
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Enhanced Workout Section */}
          <Grid item xs={12} md={8}>
            {loading && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Generando tu entrenamiento personalizado...
                  </Typography>
                  <LinearProgress sx={{ mt: 2 }} />
                </CardContent>
              </Card>
            )}

            {workoutExercises.length > 0 && !loading && (
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      <FitnessCenterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Tu Entrenamiento Personalizado
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={openManualSelection}
                      size="small"
                    >
                      Agregar Ejercicio
                    </Button>
                  </Box>
                  
                  {generatedWorkout && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Generado el {new Date(generatedWorkout.generatedAt).toLocaleString('es-ES')}
                    </Typography>
                  )}

                  <TextField
                    fullWidth
                    label="Nombre del Entrenamiento"
                    value={workoutName}
                    onChange={(e) => setWorkoutName(e.target.value)}
                    placeholder={`Entrenamiento ${workoutExercises.length} ejercicios`}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 2, mb: 2 }}
                    helperText="Personaliza el nombre de tu entrenamiento"
                  />

                  <Divider sx={{ my: 2 }} />

                  {/* Enhanced Exercises List */}
                  <Grid container spacing={2}>
                    {workoutExercises
                      .sort((a, b) => a.order - b.order)
                      .map((exercise, index) => (
                      <Grid item xs={12} key={exercise.workoutExerciseId}>
                        <Card variant="outlined" sx={{ position: 'relative', ...getExerciseStyle(exercise) }}>
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                              <Box flex={1}>
                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                  <DragIcon color="disabled" />
                                  <Typography variant="h6">
                                    {index + 1}. {exercise.name}
                                    {getDuplicateCount(exercise) > 1 && (
                                      <Chip 
                                        label={`x${getDuplicateCount(exercise)}`} 
                                        size="small" 
                                        color="warning" 
                                        sx={{ ml: 1 }} 
                                      />
                                    )}
                                  </Typography>
                                </Box>
                                
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  {exercise.description || 'Sin descripción'}
                                </Typography>

                                {/* Exercise Tags */}
                                <Box mt={1} mb={2}>
                                  {Object.keys(exercise.tags).map(category => (
                                    exercise.tags[category].length > 0 && (
                                      <Box key={category} display="inline-block" mr={2}>
                                        {exercise.tags[category].map(tagValue => (
                                          <Chip
                                            key={tagValue}
                                            label={tagValue}
                                            size="small"
                                            color={getCategoryColor(category)}
                                            sx={{ mr: 0.5, mb: 0.5 }}
                                          />
                                        ))}
                                      </Box>
                                    )
                                  ))}
                                </Box>

                                {/* Sets Configuration Display */}
                                <Box mt={2}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Configuración de Series:
                                  </Typography>
                                  {exercise.sets.map((set, setIndex) => (
                                    <Chip
                                      key={set.id}
                                      label={`Serie ${setIndex + 1}: ${set.reps} reps${set.weight ? ` • ${set.weight}kg` : ''}${set.rest ? ` • ${set.rest}s descanso` : ''}`}
                                      variant="outlined"
                                      size="small"
                                      sx={{ mr: 1, mb: 1 }}
                                    />
                                  ))}
                                </Box>
                              </Box>

                              <Box display="flex" flexDirection="column" gap={1}>
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleExerciseMenuOpen(e, exercise.workoutExerciseId)}
                                >
                                  <MoreVertIcon />
                                </IconButton>
                              </Box>
                            </Box>
                          </CardContent>

                          <CardActions>
                            <Box display="flex" justifyContent="space-between" width="100%">
                              <Box>
                                <Tooltip title={index === 0 ? "No se puede subir más" : "Subir ejercicio"}>
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => moveExercise(exercise.workoutExerciseId, 'up')}
                                      disabled={index === 0}
                                    >
                                      ↑
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title={index === workoutExercises.length - 1 ? "No se puede bajar más" : "Bajar ejercicio"}>
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => moveExercise(exercise.workoutExerciseId, 'down')}
                                      disabled={index === workoutExercises.length - 1}
                                    >
                                      ↓
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Box>

                              <Box>
                                <Button
                                  size="small"
                                  startIcon={<SettingsIcon />}
                                  onClick={() => {
                                    setSelectedExerciseForConfig(exercise);
                                    setExerciseConfigOpen(true);
                                  }}
                                >
                                  Configurar
                                </Button>
                              </Box>
                            </Box>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Planning Actions */}
                  <Box mt={3} display="flex" gap={2} justifyContent="center">
                    {isFromPlanning && selectedPlanDate ? (
                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        startIcon={<SaveIcon />}
                        onClick={() => addToPlanning(selectedPlanDate)}
                        disabled={loading}
                      >
                        Finalizar y Guardar para {new Date(selectedPlanDate + 'T00:00:00').toLocaleDateString('es-ES')}
                      </Button>
                    ) : (
                      <Button
                        variant="outlined"
                        startIcon={<CalendarIcon />}
                        onClick={openPlanningDialog}
                        disabled={loading}
                      >
                        Incorporar a Planificación
                      </Button>
                    )}
                  </Box>

                  {/* Limited Results Message */}
                  {generatedWorkout?.hasLimitedResults && workoutExercises.length > 0 && (
                    <Paper sx={{ p: 3, bgcolor: 'warning.light', color: 'warning.contrastText', mt: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        📋 Resultados Limitados
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        Estos son todos los ejercicios que he podido recopilar basado en sus preferencias 
                        ({generatedWorkout.found} de {generatedWorkout.requested} solicitados).
                      </Typography>
                      <Box display="flex" gap={2} mt={2}>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => navigate('/exercises')}
                        >
                          Crear Nuevo Ejercicio
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<SearchIcon />}
                          onClick={openManualSelection}
                        >
                          Seleccionar Manualmente
                        </Button>
                      </Box>
                    </Paper>
                  )}
                </CardContent>
              </Card>
            )}

            {workoutExercises.length === 0 && !loading && (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <AutoAwesomeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Configura tus filtros y genera tu entrenamiento
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Selecciona los grupos musculares, tipo de entrenamiento y otros filtros para crear un entrenamiento personalizado
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<SearchIcon />}
                  onClick={openManualSelection}
                >
                  O selecciona ejercicios manualmente
                </Button>
              </Paper>
            )}
          </Grid>
        </Grid>

        {/* Exercise Context Menu */}
        <Menu
          anchorEl={exerciseMenuAnchor}
          open={Boolean(exerciseMenuAnchor)}
          onClose={handleExerciseMenuClose}
        >
          <MenuItem 
            onClick={() => {
              if (selectedExerciseForMenu) {
                duplicateExercise(selectedExerciseForMenu);
                handleExerciseMenuClose();
              }
            }}
          >
            <CopyIcon sx={{ mr: 1 }} />
            Duplicar Ejercicio
          </MenuItem>
          <MenuItem 
            onClick={() => {
              if (selectedExerciseForMenu) {
                fetchSimilarExercises(selectedExerciseForMenu);
                handleExerciseMenuClose(); // Cerrar menú después de iniciar la búsqueda
              }
            }}
          >
            <SwapIcon sx={{ mr: 1 }} />
            Sustituir por Similar
          </MenuItem>
          <MenuItem 
            onClick={() => {
              if (selectedExerciseForMenu) {
                removeExercise(selectedExerciseForMenu);
                handleExerciseMenuClose();
              }
            }}
          >
            <DeleteIcon sx={{ mr: 1 }} />
            Eliminar del Entrenamiento
          </MenuItem>
        </Menu>

        {/* Manual Exercise Selection Dialog */}
        <Dialog 
          open={manualSelectionOpen} 
          onClose={() => setManualSelectionOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Seleccionar Ejercicio Manualmente
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              placeholder="Buscar ejercicios..."
              value={exerciseSearchTerm}
              onChange={(e) => setExerciseSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ mb: 2 }}
            />
            
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {filteredExercises.map(exercise => (
                <ListItem 
                  key={exercise.id}
                  divider
                >
                  <ListItemText
                    primary={exercise.name}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {exercise.muscle_groups} • {exercise.difficulty}
                        </Typography>
                        <Box mt={0.5}>
                          {Object.keys(exercise.tags).map(category => (
                            exercise.tags[category].length > 0 && (
                              <Box key={category} display="inline-block" mr={1}>
                                {exercise.tags[category].slice(0, 2).map(tagValue => (
                                  <Chip
                                    key={tagValue}
                                    label={tagValue}
                                    size="small"
                                    color={getCategoryColor(category)}
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                  />
                                ))}
                              </Box>
                            )
                          ))}
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => addExerciseManually(exercise)}
                    >
                      Agregar
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            
            {filteredExercises.length === 0 && exerciseSearchTerm && (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No se encontraron ejercicios que coincidan con "{exerciseSearchTerm}"
                </Typography>
              </Paper>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setManualSelectionOpen(false)}>
              Cancelar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Similar Exercises Dialog */}
        <Dialog 
          open={similarExercisesOpen} 
          onClose={() => setSimilarExercisesOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Ejercicios Similares
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Selecciona un ejercicio para sustituir el actual:
            </Typography>
            
            <List>
              {similarExercises.map(exercise => (
                <ListItem 
                  key={exercise.id}
                  divider
                >
                  <ListItemText
                    primary={exercise.name}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {exercise.muscle_groups} • {exercise.difficulty}
                        </Typography>
                        <Box mt={0.5}>
                          {Object.keys(exercise.tags).map(category => (
                            exercise.tags[category].length > 0 && (
                              <Box key={category} display="inline-block" mr={1}>
                                {exercise.tags[category].slice(0, 2).map(tagValue => (
                                  <Chip
                                    key={tagValue}
                                    label={tagValue}
                                    size="small"
                                    color={getCategoryColor(category)}
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                  />
                                ))}
                              </Box>
                            )
                          ))}
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        if (selectedExerciseForMenu) {
                          replaceExercise(selectedExerciseForMenu, exercise);
                        }
                      }}
                    >
                      Sustituir
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            
            {similarExercises.length === 0 && (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No se encontraron ejercicios similares
                </Typography>
              </Paper>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setSimilarExercisesOpen(false);
              setSelectedExerciseForMenu(null); // Resetear al cancelar
            }}>
              Cancelar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Exercise Configuration Dialog */}
        <Dialog 
          open={exerciseConfigOpen} 
          onClose={() => setExerciseConfigOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Configurar: {selectedExerciseForConfig?.name}
          </DialogTitle>
          <DialogContent>
            {selectedExerciseForConfig && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Series y Repeticiones:
                </Typography>
                
                {selectedExerciseForConfig.sets.map((set, index) => (
                  <Card key={set.id} variant="outlined" sx={{ mb: 2, p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Serie {index + 1}
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          label="Repeticiones"
                          type="number"
                          value={set.reps}
                          onChange={(e) => {
                            const newSets = [...selectedExerciseForConfig.sets];
                            newSets[index] = { ...set, reps: parseInt(e.target.value) || 1 };
                            updateExerciseSets(selectedExerciseForConfig.workoutExerciseId, newSets);
                            setSelectedExerciseForConfig({ ...selectedExerciseForConfig, sets: newSets });
                          }}
                          inputProps={{ min: 1, max: 50 }}
                          size="small"
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Peso (kg)"
                          type="number"
                          value={set.weight || ''}
                          onChange={(e) => {
                            const newSets = [...selectedExerciseForConfig.sets];
                            newSets[index] = { ...set, weight: parseInt(e.target.value) || 0 };
                            updateExerciseSets(selectedExerciseForConfig.workoutExerciseId, newSets);
                            setSelectedExerciseForConfig({ ...selectedExerciseForConfig, sets: newSets });
                          }}
                          inputProps={{ min: 0, max: 500 }}
                          size="small"
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Descanso (segundos)"
                          type="number"
                          value={set.rest || ''}
                          onChange={(e) => {
                            const newSets = [...selectedExerciseForConfig.sets];
                            newSets[index] = { ...set, rest: parseInt(e.target.value) || 0 };
                            updateExerciseSets(selectedExerciseForConfig.workoutExerciseId, newSets);
                            setSelectedExerciseForConfig({ ...selectedExerciseForConfig, sets: newSets });
                          }}
                          inputProps={{ min: 0, max: 600 }}
                          size="small"
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Box display="flex" justifyContent="flex-end" alignItems="center" height="100%">
                          {selectedExerciseForConfig.sets.length > 1 && (
                            <IconButton
                              color="error"
                              onClick={() => {
                                const newSets = selectedExerciseForConfig.sets.filter((_, i) => i !== index);
                                updateExerciseSets(selectedExerciseForConfig.workoutExerciseId, newSets);
                                setSelectedExerciseForConfig({ ...selectedExerciseForConfig, sets: newSets });
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  </Card>
                ))}
                
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newSet: ExerciseSet = {
                      id: generateId(),
                      reps: 8,
                      weight: selectedExerciseForConfig.sets[selectedExerciseForConfig.sets.length - 1]?.weight || 0,
                      rest: 60
                    };
                    const newSets = [...selectedExerciseForConfig.sets, newSet];
                    updateExerciseSets(selectedExerciseForConfig.workoutExerciseId, newSets);
                    setSelectedExerciseForConfig({ ...selectedExerciseForConfig, sets: newSets });
                  }}
                  fullWidth
                >
                  Agregar Serie
                </Button>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExerciseConfigOpen(false)}>
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Planning Date Selection Dialog */}
        <Dialog
          open={planningDialogOpen}
          onClose={() => setPlanningDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <CalendarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Agregar a Planificación
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Selecciona la fecha para agregar este entrenamiento a tu planificación.
            </Typography>
            
            <TextField
              label="Nombre del Entrenamiento (Opcional)"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              fullWidth
              margin="normal"
              placeholder={`Entrenamiento ${workoutExercises.length} ejercicios`}
              helperText="Si no especificas un nombre, se generará automáticamente"
            />
            
            <TextField
              type="date"
              label="Fecha de Planificación"
              value={selectedPlanDate}
              onChange={(e) => setSelectedPlanDate(e.target.value)}
              fullWidth
              margin="normal"
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                min: (() => {
                  const today = new Date();
                  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                })() // No permitir fechas pasadas
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
            <Button onClick={() => setPlanningDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={() => addToPlanning(selectedPlanDate)}
              disabled={!selectedPlanDate || loading}
            >
              {loading ? 'Guardando...' : 'Agregar a Planificación'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default WorkoutGenerator;
