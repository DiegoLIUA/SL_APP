import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Container,
  Paper,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Avatar,
  CardActions
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  ContentCopy as DuplicateIcon,
  FitnessCenter as WorkoutIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Save as SaveIcon
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
  notes: string | null;
  created_at: string;
  exercises?: WorkoutExercise[];
}

interface WorkoutExercise {
  id: number | string;
  exercise_name: string;
  category: string;
  muscle_groups: string;
  sets: any[]; // Array of sets with reps, weight, rest
  equipment?: string | null;
  difficulty?: string | null;
  description?: string | null;
  order?: number;
}

interface WorkoutStats {
  totalWorkouts: number;
  completedWorkouts: number;
  averagePRS: number;
  averageSRPE: number;
  lastWorkoutDate: string;
  mostFrequentCategory: string;
}

interface Exercise {
  id: number;
  name: string;
  category: string;
  muscle_groups: string;
  description?: string;
  video_url?: string;
}

const WorkoutLibrary: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // State management
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [filteredWorkouts, setFilteredWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<WorkoutStats | null>(null);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, thisWeek, thisMonth, last3Months
  const [completionFilter, setCompletionFilter] = useState('all'); // all, completed, pending
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, name, prs, srpe

  // Dialog states
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [workoutDetailsOpen, setWorkoutDetailsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [editForm, setEditForm] = useState({ name: '', notes: '' });
  
  // Exercise editing states
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [editingExercises, setEditingExercises] = useState<WorkoutExercise[]>([]);
  const [isEditingExercises, setIsEditingExercises] = useState(false);

  // UI states
  const [currentTab, setCurrentTab] = useState(0);

  const fetchWorkouts = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.get('/api/workouts', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 } // Get more workouts for the library
      });

      const workoutsData = response.data;
      setWorkouts(workoutsData);
      calculateStats(workoutsData);
    } catch (err: any) {
      console.error('Error fetching workouts:', err);
      setError('Error al cargar los entrenamientos');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchWorkoutDetails = async (workoutId: number) => {
    if (!token) return;

    try {
      const response = await axios.get(`/api/workouts/${workoutId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSelectedWorkout(response.data);
      setWorkoutDetailsOpen(true);
    } catch (err: any) {
      console.error('Error fetching workout details:', err);
      setError('Error al cargar los detalles del entrenamiento');
    }
  };

  const calculateStats = (workoutsData: Workout[]) => {
    if (workoutsData.length === 0) {
      setStats(null);
      return;
    }

    const completed = workoutsData.filter(w => w.post_workout_srpe !== null);
    const prsScores = workoutsData.filter(w => w.pre_workout_prs !== null).map(w => w.pre_workout_prs!);
    const srpeScores = completed.map(w => w.post_workout_srpe!);

    const stats: WorkoutStats = {
      totalWorkouts: workoutsData.length,
      completedWorkouts: completed.length,
      averagePRS: prsScores.length > 0 ? prsScores.reduce((a, b) => a + b, 0) / prsScores.length : 0,
      averageSRPE: srpeScores.length > 0 ? srpeScores.reduce((a, b) => a + b, 0) / srpeScores.length : 0,
      lastWorkoutDate: workoutsData[0]?.date || '',
      mostFrequentCategory: 'Fuerza' // Placeholder
    };

    setStats(stats);
  };

  const applyFilters = useCallback(() => {
    let filtered = [...workouts];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(workout => 
        workout.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workout.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'thisWeek':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'thisMonth':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'last3Months':
          filterDate.setMonth(now.getMonth() - 3);
          break;
      }
      
      filtered = filtered.filter(workout => new Date(workout.date) >= filterDate);
    }

    // Completion filter
    if (completionFilter !== 'all') {
      filtered = filtered.filter(workout => 
        completionFilter === 'completed' 
          ? workout.post_workout_srpe !== null
          : workout.post_workout_srpe === null
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'prs':
          return (b.pre_workout_prs || 0) - (a.pre_workout_prs || 0);
        case 'srpe':
          return (b.post_workout_srpe || 0) - (a.post_workout_srpe || 0);
        default: // date_desc
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    setFilteredWorkouts(filtered);
  }, [workouts, searchTerm, dateFilter, completionFilter, sortBy]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDaysAgo = (dateString: string) => {
    const workoutDate = new Date(dateString);
    const today = new Date();
    const diffTime = today.getTime() - workoutDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return `Hace ${Math.floor(diffDays / 30)} meses`;
  };


  const duplicateWorkout = async (workout: Workout) => {
    // This would navigate to workout creation with pre-filled data
    navigate('/workouts', { 
      state: { 
        duplicateFrom: workout,
        tab: 1 // Manual tab
      }
    });
  };

  const fetchAvailableExercises = useCallback(async () => {
    if (!token) return;

    try {
      const response = await axios.get('/api/exercises', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableExercises(response.data);
    } catch (err: any) {
      console.error('Error fetching exercises:', err);
    }
  }, [token]);

  const openEditDialog = async (workout: Workout) => {
    console.log('Opening edit dialog for workout:', workout); // Debug
    setEditingWorkout(workout);
    setEditForm({
      name: workout.name || '',
      notes: workout.notes || ''
    });
    
    // Fetch workout details to get exercises
    await fetchWorkoutDetails(workout.id);
    
    // Set editing exercises - normalize the data structure
    if (selectedWorkout?.exercises) {
      const normalizedExercises = selectedWorkout.exercises.map((exercise, index) => ({
        id: exercise.id || `existing_${index}`,
        exercise_name: exercise.exercise_name || 'Unknown Exercise',
        category: exercise.category || 'General',
        muscle_groups: exercise.muscle_groups || 'General',
        sets: exercise.sets || [{ reps: 8, weight: 20, rest: 90 }],
        equipment: exercise.equipment || null,
        difficulty: exercise.difficulty || null,
        description: exercise.description || null,
        order: exercise.order || index
      }));
      
      console.log('Normalized exercises for editing:', normalizedExercises);
      setEditingExercises(normalizedExercises);
    } else {
      setEditingExercises([]);
    }
    
    setIsEditingExercises(false);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (workout: Workout) => {
    setEditingWorkout(workout);
    setDeleteDialogOpen(true);
  };

  const updateWorkout = async () => {
    if (!editingWorkout || !editForm.name.trim()) return;

    try {
      const updateData: any = {
        name: editForm.name.trim(),
        notes: editForm.notes.trim() || null
      };

      // If exercises were edited, include them with normalized structure
      if (isEditingExercises && editingExercises.length > 0) {
        console.log('Sending exercises to backend:', editingExercises);
        
        // Ensure all exercises have proper structure before sending
        const normalizedExercises = editingExercises.map((exercise, index) => ({
          id: exercise.id || `normalized_${index}`,
          exercise_name: exercise.exercise_name || 'Unknown Exercise',
          category: exercise.category || 'General',
          muscle_groups: exercise.muscle_groups || 'General',
          sets: exercise.sets || [{ reps: 8, weight: 20, rest: 90 }],
          equipment: exercise.equipment || null,
          difficulty: exercise.difficulty || null,
          description: exercise.description || null,
          order: exercise.order || index
        }));
        
        updateData.exercises = normalizedExercises;
        console.log('Normalized exercises being sent:', normalizedExercises);
      }

      console.log('Sending update data:', updateData);

      await axios.put(`/api/workouts/${editingWorkout.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      setWorkouts(prev => prev.map(w => 
        w.id === editingWorkout.id 
          ? { ...w, name: editForm.name.trim(), notes: editForm.notes.trim() || null }
          : w
      ));

      setEditDialogOpen(false);
      setEditingWorkout(null);
      setEditForm({ name: '', notes: '' });
      setEditingExercises([]);
      setIsEditingExercises(false);
    } catch (err: any) {
      console.error('Error updating workout:', err);
      setError('Error al actualizar el entrenamiento: ' + (err.response?.data?.error || err.message));
    }
  };

  const deleteWorkout = async () => {
    if (!editingWorkout) return;

    try {
      await axios.delete(`/api/workouts/${editingWorkout.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      setWorkouts(prev => prev.filter(w => w.id !== editingWorkout.id));

      setDeleteDialogOpen(false);
      setEditingWorkout(null);
    } catch (err: any) {
      console.error('Error deleting workout:', err);
      setError('Error al eliminar el entrenamiento: ' + (err.response?.data?.error || err.message));
    }
  };

  const addExerciseToWorkout = (exercise: Exercise) => {
    console.log('Adding exercise to workout:', exercise);
    
    const newWorkoutExercise: WorkoutExercise = {
      id: `temp_${Date.now()}`,
      exercise_name: exercise.name || 'Unknown Exercise',
      category: exercise.category || 'General',
      muscle_groups: exercise.muscle_groups || 'General',
      description: exercise.description || null,
      equipment: null,
      difficulty: null,
      sets: [
        { reps: 8, weight: 20, rest: 90 }
      ]
    };

    console.log('Created workout exercise:', newWorkoutExercise);
    setEditingExercises(prev => [...prev, newWorkoutExercise]);
    setIsEditingExercises(true);
  };

  const removeExerciseFromWorkout = (index: number) => {
    setEditingExercises(prev => prev.filter((_, i) => i !== index));
    setIsEditingExercises(true);
  };

  const updateExerciseSet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight' | 'rest', value: number) => {
    setEditingExercises(prev => {
      const updated = [...prev];
      if (!updated[exerciseIndex].sets[setIndex]) {
        updated[exerciseIndex].sets[setIndex] = { reps: 8, weight: 20, rest: 90 };
      }
      updated[exerciseIndex].sets[setIndex][field] = value;
      return updated;
    });
    setIsEditingExercises(true);
  };

  const addSetToExercise = (exerciseIndex: number) => {
    setEditingExercises(prev => {
      const updated = [...prev];
      const lastSet = updated[exerciseIndex].sets[updated[exerciseIndex].sets.length - 1];
      updated[exerciseIndex].sets.push({
        reps: lastSet?.reps || 8,
        weight: lastSet?.weight || 20,
        rest: lastSet?.rest || 90
      });
      return updated;
    });
    setIsEditingExercises(true);
  };

  const removeSetFromExercise = (exerciseIndex: number, setIndex: number) => {
    setEditingExercises(prev => {
      const updated = [...prev];
      if (updated[exerciseIndex].sets.length > 1) {
        updated[exerciseIndex].sets.splice(setIndex, 1);
      }
      return updated;
    });
    setIsEditingExercises(true);
  };

  // Effects - placed after all function declarations
  useEffect(() => {
    fetchWorkouts();
    fetchAvailableExercises();
  }, [fetchWorkouts, fetchAvailableExercises]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const StatsCards = () => {
    if (!stats) return null;

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">
              {stats.totalWorkouts}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Entrenamientos Totales
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">
              {stats.completedWorkouts}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Completados
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">
              {stats.averagePRS.toFixed(1)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              PRS Promedio
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="error.main">
              {stats.averageSRPE.toFixed(1)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              sRPE Promedio
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const WorkoutCard = ({ workout }: { workout: Workout }) => {
    const isCompleted = workout.post_workout_srpe !== null;

    return (
      <Card sx={{ mb: 2, position: 'relative' }}>
        {isCompleted && (
          <Chip 
            label="Completado" 
            color="success" 
            size="small"
            sx={{ position: 'absolute', top: 8, right: 8 }}
          />
        )}
        
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <WorkoutIcon />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="div">
                {workout.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                📅 {formatDate(workout.date)} • {getDaysAgo(workout.date)}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {workout.pre_workout_prs && (
              <Chip 
                label={`PRS: ${workout.pre_workout_prs}`} 
                color="warning" 
                size="small"
                icon={<TrendingUpIcon />}
              />
            )}
            {workout.post_workout_srpe && (
              <Chip 
                label={`sRPE: ${workout.post_workout_srpe}`} 
                color="error" 
                size="small"
                icon={<StarIcon />}
              />
            )}
          </Box>

          {workout.notes && (
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              💭 {workout.notes}
            </Typography>
          )}
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button 
              size="small" 
              startIcon={<ViewIcon />}
              onClick={() => fetchWorkoutDetails(workout.id)}
            >
              Ver Detalles
            </Button>
            <Button 
              size="small" 
              startIcon={<EditIcon />}
              onClick={() => openEditDialog(workout)}
            >
              Editar
            </Button>
            <Button 
              size="small" 
              startIcon={<DuplicateIcon />}
              onClick={() => duplicateWorkout(workout)}
            >
              Duplicar
            </Button>
          </Box>
          <Button 
            size="small" 
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => openDeleteDialog(workout)}
            sx={{ minWidth: 'auto' }}
          >
            Eliminar
          </Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <AssignmentIcon sx={{ mr: 2, fontSize: 40 }} />
            Biblioteca de Entrenamientos
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Consulta, analiza y reutiliza tus entrenamientos pasados
          </Typography>
        </Box>

        {/* Loading */}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Stats Cards */}
        <StatsCards />

        {/* Filters and Search */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            🔍 Buscar y Filtrar
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar por nombre o notas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Período</InputLabel>
                <Select
                  value={dateFilter}
                  label="Período"
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="thisWeek">Esta semana</MenuItem>
                  <MenuItem value="thisMonth">Este mes</MenuItem>
                  <MenuItem value="last3Months">Últimos 3 meses</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={completionFilter}
                  label="Estado"
                  onChange={(e) => setCompletionFilter(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="completed">Completados</MenuItem>
                  <MenuItem value="pending">Pendientes</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Ordenar por</InputLabel>
                <Select
                  value={sortBy}
                  label="Ordenar por"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="date_desc">Fecha (Reciente)</MenuItem>
                  <MenuItem value="date_asc">Fecha (Antiguo)</MenuItem>
                  <MenuItem value="name">Nombre</MenuItem>
                  <MenuItem value="prs">PRS</MenuItem>
                  <MenuItem value="srpe">sRPE</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('all');
                  setCompletionFilter('all');
                  setSortBy('date_desc');
                }}
                sx={{ height: '56px' }}
              >
                Limpiar Filtros
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Results */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" color="primary">
            📋 {filteredWorkouts.length} entrenamientos encontrados
          </Typography>
        </Box>

        {/* Empty State */}
        {!loading && filteredWorkouts.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <WorkoutIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {workouts.length === 0 ? 'No tienes entrenamientos registrados' : 'No se encontraron entrenamientos con estos filtros'}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {workouts.length === 0 
                ? 'Comienza creando entrenamientos y añadiéndolos al calendario para verlos aquí.'
                : 'Prueba ajustando los filtros para encontrar lo que buscas.'
              }
            </Typography>
            {workouts.length === 0 && (
              <Button 
                variant="contained" 
                onClick={() => navigate('/workouts')}
                sx={{ mt: 2 }}
              >
                Crear Primer Entrenamiento
              </Button>
            )}
          </Paper>
        )}

        {/* Workout Cards */}
        {filteredWorkouts.map((workout) => (
          <WorkoutCard key={workout.id} workout={workout} />
        ))}

        {/* Workout Details Dialog */}
        <Dialog 
          open={workoutDetailsOpen} 
          onClose={() => setWorkoutDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">
                📋 Detalles del Entrenamiento
              </Typography>
              <IconButton onClick={() => setWorkoutDetailsOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedWorkout && (
              <Box>
                <Typography variant="h5" gutterBottom>
                  {selectedWorkout.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  📅 {formatDate(selectedWorkout.date)}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                  {selectedWorkout.pre_workout_prs && (
                    <Chip 
                      label={`PRS: ${selectedWorkout.pre_workout_prs}`} 
                      color="warning"
                      icon={<TrendingUpIcon />}
                    />
                  )}
                  {selectedWorkout.post_workout_srpe && (
                    <Chip 
                      label={`sRPE: ${selectedWorkout.post_workout_srpe}`} 
                      color="error"
                      icon={<StarIcon />}
                    />
                  )}
                </Box>

                {selectedWorkout.notes && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      💭 <strong>Notas:</strong> {selectedWorkout.notes}
                    </Typography>
                  </Alert>
                )}

                {selectedWorkout.exercises && selectedWorkout.exercises.length > 0 ? (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      💪 Ejercicios ({selectedWorkout.exercises.length})
                    </Typography>
                    <List>
                      {selectedWorkout.exercises.map((exercise, index) => (
                        <ListItem key={exercise.id} divider>
                          <ListItemIcon>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {index + 1}
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={exercise.exercise_name}
                            secondary={
                              <React.Fragment>
                                {exercise.category && (
                                  <Typography variant="body2" color="textSecondary" component="span" display="block">
                                    📂 {exercise.category}
                                  </Typography>
                                )}
                                {exercise.muscle_groups && (
                                  <Typography variant="body2" color="textSecondary" component="span" display="block">
                                    💪 {exercise.muscle_groups}
                                  </Typography>
                                )}
                                {exercise.equipment && (
                                  <Typography variant="body2" color="textSecondary" component="span" display="block">
                                    🔧 {exercise.equipment}
                                  </Typography>
                                )}
                                
                                {/* Display sets information */}
                                {exercise.sets && exercise.sets.length > 0 ? (
                                  <React.Fragment>
                                    <Typography variant="body2" fontWeight="bold" component="span" display="block" sx={{ mt: 1 }}>
                                      🏋️ Sets ({exercise.sets.length}):
                                    </Typography>
                                    {exercise.sets.map((set: any, setIndex: number) => (
                                      <Typography key={setIndex} variant="body2" component="span" display="block" sx={{ ml: 2 }}>
                                        • Set {setIndex + 1}: {set.reps} reps × {set.weight}kg
                                        {set.rest && ` • Descanso: ${set.rest}s`}
                                      </Typography>
                                    ))}
                                  </React.Fragment>
                                ) : (
                                  <Typography variant="body2" color="textSecondary" component="span" display="block">
                                    ⚠️ Sin configuración de sets registrada
                                  </Typography>
                                )}
                              </React.Fragment>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ) : (
                  <Alert severity="info">
                    Este entrenamiento no tiene ejercicios detallados registrados.
                  </Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setWorkoutDetailsOpen(false)}>
              Cerrar
            </Button>
            {selectedWorkout && (
              <Button 
                variant="contained"
                startIcon={<DuplicateIcon />}
                onClick={() => {
                  setWorkoutDetailsOpen(false);
                  duplicateWorkout(selectedWorkout);
                }}
              >
                Duplicar Entrenamiento
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Edit Workout Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => setEditDialogOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: { 
              maxHeight: '85vh',
              minHeight: '400px'
            }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">
                ✏️ Editar Entrenamiento
              </Typography>
              <IconButton onClick={() => setEditDialogOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
              <Tab label="Información Básica" />
              <Tab label="Ejercicios" />
            </Tabs>

            {/* Tab 0: Basic Information */}
            {currentTab === 0 && (
              <Box sx={{ mt: 3 }}>
                <TextField
                  autoFocus
                  fullWidth
                  label="Nombre del Entrenamiento"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  sx={{ mb: 3 }}
                  required
                  helperText="Este nombre se actualizará en la biblioteca y en la planificación"
                />
                
                <TextField
                  fullWidth
                  label="Notas (Opcional)"
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  multiline
                  rows={3}
                  helperText="Añade comentarios sobre el entrenamiento"
                />
              </Box>
            )}

            {/* Tab 1: Exercises */}
            {currentTab === 1 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  💪 Ejercicios del Entrenamiento ({editingExercises.length})
                </Typography>

                {/* Current Exercises */}
                {editingExercises.map((exercise, exerciseIndex) => (
                  <Paper key={`${exercise.id}-${exerciseIndex}`} sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {exerciseIndex + 1}. {exercise.exercise_name}
                      </Typography>
                      <Button
                        color="error"
                        size="small"
                        startIcon={<RemoveIcon />}
                        onClick={() => removeExerciseFromWorkout(exerciseIndex)}
                      >
                        Eliminar
                      </Button>
                    </Box>

                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      📂 {exercise.category} • 💪 {exercise.muscle_groups}
                    </Typography>

                    {/* Sets */}
                    <Typography variant="subtitle2" gutterBottom>
                      🏋️ Sets ({exercise.sets.length}):
                    </Typography>
                    {exercise.sets.map((set: any, setIndex: number) => (
                      <Box key={setIndex} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" sx={{ minWidth: '60px' }}>
                          Set {setIndex + 1}:
                        </Typography>
                        <TextField
                          label="Reps"
                          type="number"
                          size="small"
                          value={set.reps}
                          onChange={(e) => updateExerciseSet(exerciseIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                          sx={{ width: '80px' }}
                        />
                        <Typography variant="body2">×</Typography>
                        <TextField
                          label="Peso (kg)"
                          type="number"
                          size="small"
                          value={set.weight}
                          onChange={(e) => updateExerciseSet(exerciseIndex, setIndex, 'weight', parseFloat(e.target.value) || 0)}
                          sx={{ width: '100px' }}
                        />
                        <TextField
                          label="Descanso (s)"
                          type="number"
                          size="small"
                          value={set.rest}
                          onChange={(e) => updateExerciseSet(exerciseIndex, setIndex, 'rest', parseInt(e.target.value) || 0)}
                          sx={{ width: '120px' }}
                        />
                        {exercise.sets.length > 1 && (
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => removeSetFromExercise(exerciseIndex, setIndex)}
                          >
                            <RemoveIcon />
                          </IconButton>
                        )}
                      </Box>
                    ))}
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => addSetToExercise(exerciseIndex)}
                      sx={{ mt: 1 }}
                    >
                      Añadir Set
                    </Button>
                  </Paper>
                ))}

                {/* Add New Exercise */}
                <Paper sx={{ p: 2, backgroundColor: 'primary.50', border: '1px dashed', borderColor: 'primary.main' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    ➕ Añadir Ejercicio de la Biblioteca
                  </Typography>
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {availableExercises.map((exercise) => (
                      <Box
                        key={exercise.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '&:hover': { backgroundColor: 'action.hover' }
                        }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {exercise.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            📂 {exercise.category} • 💪 {exercise.muscle_groups}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => addExerciseToWorkout(exercise)}
                          disabled={editingExercises.some(ex => ex.exercise_name === exercise.name)}
                        >
                          Añadir
                        </Button>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={updateWorkout}
              disabled={!editForm.name.trim()}
              color={isEditingExercises ? 'warning' : 'primary'}
            >
              {isEditingExercises ? 'Guardar Cambios en Ejercicios' : 'Guardar Cambios'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Workout Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DeleteIcon color="error" />
              Confirmar Eliminación
            </Box>
          </DialogTitle>
          <DialogContent>
            {editingWorkout && (
              <>
                <Typography variant="body1" gutterBottom>
                  ¿Estás seguro de que quieres eliminar el entrenamiento?
                </Typography>
                <Typography variant="h6" color="error" gutterBottom>
                  "{editingWorkout.name}"
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Esta acción no se puede deshacer. El entrenamiento se eliminará permanentemente 
                  de tu biblioteca.
                </Typography>
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    ⚠️ <strong>Importante:</strong> Esta acción eliminará el entrenamiento de tu biblioteca, 
                    pero no afectará los entrenamientos ya planificados en el calendario.
                  </Typography>
                </Alert>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={deleteWorkout}
              disabled={loading}
            >
              {loading ? 'Eliminando...' : 'Eliminar Entrenamiento'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default WorkoutLibrary;
