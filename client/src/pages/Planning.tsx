import React, { useState, useEffect, useContext } from 'react';
import {
  Typography,
  Container,
  Card,
  CardContent,
  Grid,
  Button,
  Box,
  Alert,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Fab,
  TextField,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CompleteIcon,
  FitnessCenter as WorkoutIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Today as TodayIcon,
  Psychology as MoodIcon,
  Hotel as SleepIcon,
  Bolt as EnergyIcon,
  Star as RatingIcon,
  Close as CloseIcon,
  Assessment as PRSIcon,
  Edit as EditIcon,
  LibraryBooks as LibraryIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';

interface PlannedWorkout {
  id: number;
  planned_date: string;
  workout_name: string;
  workout_data: any;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  pre_workout_prs?: number | null;
  post_workout_srpe?: number | null;
}

interface PRSForm {
  sleep_quality: number;
  energy_level: number;
  motivation: number;
  muscle_soreness: number;
  mood: number;
}

interface WorkoutCount {
  planned_date: string;
  workout_count: number;
}

interface LibraryWorkout {
  id: number;
  name: string;
  date: string;
  notes: string | null;
  exercises?: any[];
}

// Helper function to format dates without timezone issues
const formatDateString = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const Planning: React.FC = () => {
  const { user } = useContext(AuthContext);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // State management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
  const [workoutCounts, setWorkoutCounts] = useState<WorkoutCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [workoutDetailsOpen, setWorkoutDetailsOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<PlannedWorkout | null>(null);
  
  // PRS and sRPE states
  const [prsDialogOpen, setPRSDialogOpen] = useState(false);
  const [srpeDialogOpen, setSRPEDialogOpen] = useState(false);
  
  // Edit workout states
  const [editWorkoutDialogOpen, setEditWorkoutDialogOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<PlannedWorkout | null>(null);
  const [editWorkoutName, setEditWorkoutName] = useState('');
  
  // Library selection states
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const [libraryWorkouts, setLibraryWorkouts] = useState<LibraryWorkout[]>([]);
  const [selectedWorkoutForPRS, setSelectedWorkoutForPRS] = useState<PlannedWorkout | null>(null);
  const [selectedWorkoutForSRPE, setSelectedWorkoutForSRPE] = useState<PlannedWorkout | null>(null);
  const [prsForm, setPRSForm] = useState<PRSForm>({
    sleep_quality: 5,
    energy_level: 5,
    motivation: 5,
    muscle_soreness: 5,
    mood: 5
  });
  const [srpeValue, setSRPEValue] = useState(5);

  useEffect(() => {
    fetchMonthWorkouts();
  }, [currentDate]);


  const fetchMonthWorkouts = async () => {
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const startStr = formatDateString(startDate);
      const endStr = formatDateString(endDate);

      const response = await axios.get(`/api/planning/range/${startStr}/${endStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setWorkoutCounts(response.data);
    } catch (err: any) {
      setError('Error al cargar entrenamientos del mes');
      console.error('Error fetching month workouts:', err);
    }
  };

  const fetchDayWorkouts = async (date: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/planning/date/${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlannedWorkouts(response.data);
    } catch (err: any) {
      setError('Error al cargar entrenamientos del día');
      console.error('Error fetching day workouts:', err);
    } finally {
      setLoading(false);
    }
  };

  const completeWorkout = async (workoutId: number) => {
    try {
      await axios.put(`/api/planning/complete/${workoutId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh day workouts
      if (selectedDate) {
        fetchDayWorkouts(selectedDate);
      }
      fetchMonthWorkouts();
      setSuccess('Entrenamiento marcado como completado');
    } catch (err: any) {
      setError('Error al completar entrenamiento');
      console.error('Error completing workout:', err);
    }
  };

  const deleteWorkout = async (workoutId: number) => {
    try {
      await axios.delete(`/api/planning/${workoutId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh day workouts
      if (selectedDate) {
        fetchDayWorkouts(selectedDate);
      }
      fetchMonthWorkouts();
      setSuccess('Entrenamiento eliminado de la planificación');
    } catch (err: any) {
      setError('Error al eliminar entrenamiento');
      console.error('Error deleting workout:', err);
    }
  };

  // PRS and sRPE functions
  const calculatePRS = (form: PRSForm): number => {
    const total = form.sleep_quality + form.energy_level + form.motivation + 
                  (11 - form.muscle_soreness) + form.mood;
    return Math.round((total / 5) * 10) / 10;
  };

  const openPRSDialog = (workout: PlannedWorkout) => {
    setSelectedWorkoutForPRS(workout);
    setPRSDialogOpen(true);
  };

  const savePRS = async () => {
    if (!selectedWorkoutForPRS) {
      setError('No hay entrenamiento seleccionado');
      return;
    }

    try {
      const prsScore = calculatePRS(prsForm);
      console.log('Saving PRS:', prsScore, 'for workout:', selectedWorkoutForPRS.id);
      
      // Actualizar el entrenamiento con PRS
      const response = await axios.put(`/api/planning/update-prs/${selectedWorkoutForPRS.id}`, {
        pre_workout_prs: prsScore
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('PRS response:', response.data);

      setPRSDialogOpen(false);
      setSelectedWorkoutForPRS(null);
      setPRSForm({
        sleep_quality: 5,
        energy_level: 5,
        motivation: 5,
        muscle_soreness: 5,
        mood: 5
      });
      
      // Refresh workouts
      if (selectedDate) {
        fetchDayWorkouts(selectedDate);
      }
      setSuccess('PRS añadido exitosamente');
    } catch (err: any) {
      console.error('Error saving PRS:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Full error object:', JSON.stringify(err.response, null, 2));
      
      const errorMessage = err.response?.data?.error || err.message || 'Error desconocido al guardar PRS';
      setError(`Error al guardar PRS: ${errorMessage}`);
    }
  };

  const openSRPEDialog = (workout: PlannedWorkout) => {
    setSelectedWorkoutForSRPE(workout);
    setSRPEValue(5);
    setSRPEDialogOpen(true);
  };

  const saveSRPEAndComplete = async () => {
    if (!selectedWorkoutForSRPE) {
      setError('No hay entrenamiento seleccionado');
      return;
    }

    try {
      console.log('Completing workout with sRPE:', srpeValue, 'for workout:', selectedWorkoutForSRPE.id);
      
      // Guardar sRPE y marcar como completado
      const response = await axios.put(`/api/planning/complete-with-srpe/${selectedWorkoutForSRPE.id}`, {
        post_workout_srpe: srpeValue
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('sRPE response:', response.data);

      setSRPEDialogOpen(false);
      setSelectedWorkoutForSRPE(null);
      setSRPEValue(5);
      
      // Refresh workouts
      if (selectedDate) {
        fetchDayWorkouts(selectedDate);
      }
      fetchMonthWorkouts();
      setSuccess('Entrenamiento completado con sRPE registrado');
    } catch (err: any) {
      console.error('Error completing workout with sRPE:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      const errorMessage = err.response?.data?.error || err.message || 'Error desconocido al completar entrenamiento';
      setError(`Error al completar entrenamiento: ${errorMessage}`);
    }
  };

  // Edit workout functions
  const openEditWorkoutDialog = (workout: PlannedWorkout) => {
    setEditingWorkout(workout);
    setEditWorkoutName(workout.workout_name);
    setEditWorkoutDialogOpen(true);
  };

  const updateWorkoutName = async () => {
    if (!editingWorkout || !editWorkoutName.trim()) return;

    try {
      const response = await axios.put(`/api/planning/update-name/${editingWorkout.id}`, {
        workout_name: editWorkoutName.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      setPlannedWorkouts(prev => prev.map(w => 
        w.id === editingWorkout.id 
          ? { ...w, workout_name: editWorkoutName.trim() }
          : w
      ));

      setEditWorkoutDialogOpen(false);
      setEditingWorkout(null);
      setEditWorkoutName('');
      setSuccess('Nombre del entrenamiento actualizado exitosamente');
    } catch (err: any) {
      console.error('Error updating workout name:', err);
      setError('Error al actualizar el nombre del entrenamiento: ' + (err.response?.data?.error || err.message));
    }
  };

  // Library selection functions
  const openLibraryDialog = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/workouts', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 50 }
      });
      setLibraryWorkouts(response.data);
      setLibraryDialogOpen(true);
    } catch (err: any) {
      console.error('Error fetching library workouts:', err);
      setError('Error al cargar entrenamientos de la biblioteca: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const addWorkoutFromLibrary = async (libraryWorkout: LibraryWorkout) => {
    if (!selectedDate) return;

    try {
      // Get workout details including exercises
      const detailResponse = await axios.get(`/api/workouts/${libraryWorkout.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const workoutData = {
        name: libraryWorkout.name,
        exercises: detailResponse.data.exercises || []
      };

      await axios.post('/api/planning/add', {
        planned_date: selectedDate,
        workout_name: libraryWorkout.name,
        workout_data: workoutData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setLibraryDialogOpen(false);
      fetchDayWorkouts(selectedDate);
      fetchMonthWorkouts();
      setSuccess(`Entrenamiento "${libraryWorkout.name}" añadido exitosamente`);
    } catch (err: any) {
      console.error('Error adding workout from library:', err);
      if (err.response?.status === 400 && err.response?.data?.error?.includes('máximo 2 entrenamientos')) {
        setError('Ya tienes el máximo de entrenamientos permitidos (2) para esa fecha');
      } else {
        setError('Error al añadir entrenamiento: ' + (err.response?.data?.error || err.message));
      }
    }
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

  const isDateTodayOrPast = (dateStr: string): boolean => {
    const today = formatDateString(new Date());
    return dateStr <= today;
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Convert Sunday=0 to Monday=0 format (Monday=0, Sunday=6)
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek < 0) startingDayOfWeek = 6; // Sunday becomes 6

    const days = [];
    // Fix today calculation to avoid timezone issues
    const today = new Date();
    const todayStr = formatDateString(today);

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<Box key={`empty-${i}`} sx={{ minHeight: 60 }} />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      // Fix timezone issue by building date string directly
      const dateStr = formatDateString(new Date(year, month, day));
      const workoutCount = workoutCounts.find(wc => wc.planned_date === dateStr)?.workout_count || 0;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDate;

      days.push(
        <Paper
          key={day}
          elevation={isSelected ? 3 : 1}
          sx={{
            p: 1,
            minHeight: 60,
            cursor: 'pointer',
            bgcolor: isToday ? 'primary.light' : isSelected ? 'action.selected' : 'background.paper',
            color: isToday ? 'primary.contrastText' : 'text.primary',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            '&:hover': {
              bgcolor: 'action.hover'
            }
          }}
          onClick={() => {
            setSelectedDate(dateStr);
            fetchDayWorkouts(dateStr);
          }}
        >
          <Typography variant="body2" fontWeight={isToday ? 'bold' : 'normal'}>
            {day}
          </Typography>
          {workoutCount > 0 && (
            <Chip
              size="small"
              label={workoutCount}
              color="primary"
              sx={{ fontSize: '0.7rem', height: 18 }}
            />
          )}
        </Paper>
      );
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    setSelectedDate(null);
    setPlannedWorkouts([]);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const todayStr = formatDateString(today);
    setSelectedDate(todayStr);
    fetchDayWorkouts(todayStr);
  };

  const openWorkoutDetails = (workout: PlannedWorkout) => {
    setSelectedWorkout(workout);
    setWorkoutDetailsOpen(true);
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            <CalendarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Planificación de Entrenamientos
          </Typography>
          <Button
            variant="outlined"
            startIcon={<TodayIcon />}
            onClick={goToToday}
          >
            Hoy
          </Button>
        </Box>

        <Typography variant="body1" color="text.secondary" mb={4}>
          Planifica y organiza tus entrenamientos. Puedes tener hasta 2 entrenamientos por día.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Grid container spacing={3}>
          {/* Calendar Section */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                {/* Calendar Header */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <IconButton onClick={() => navigateMonth('prev')}>
                    <PrevIcon />
                  </IconButton>
                  <Typography variant="h5">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </Typography>
                  <IconButton onClick={() => navigateMonth('next')}>
                    <NextIcon />
                  </IconButton>
                </Box>

                {/* Day Names Header */}
                <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0.5} mb={1}>
                  {dayNames.map(dayName => (
                    <Typography
                      key={dayName}
                      variant="body2"
                      align="center"
                      fontWeight="bold"
                      color="text.secondary"
                      sx={{ p: 1 }}
                    >
                      {dayName}
                    </Typography>
                  ))}
                </Box>

                {/* Calendar Grid */}
                <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0.5}>
                  {generateCalendarDays().map((day, index) => (
                    <Box key={index}>
                      {day}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Day Details Section */}
          <Grid item xs={12} md={4}>
            {selectedDate ? (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <WorkoutIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {loading ? (
                    <Typography>Cargando...</Typography>
                  ) : plannedWorkouts.length > 0 ? (
                    <List>
                      {plannedWorkouts.map((workout, index) => (
                        <ListItem
                          key={workout.id}
                          divider={index < plannedWorkouts.length - 1}
                          sx={{
                            bgcolor: workout.is_completed ? 'action.selected' : 'transparent',
                            borderRadius: 1,
                            mb: 1
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Box
                                  sx={{
                                    maxWidth: '300px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 1
                                  }}
                                  title={workout.workout_name || `Entrenamiento ${index + 1}`}
                                >
                                  {workout.workout_name || `Entrenamiento ${index + 1}`}
                                </Box>
                                {Boolean(workout.is_completed) && (
                                  <Chip
                                    size="small"
                                    label="Completado"
                                    color="success"
                                    icon={<CompleteIcon />}
                                  />
                                )}
                                {workout.pre_workout_prs && workout.pre_workout_prs > 0 && (
                                  <Chip
                                    size="small"
                                    label={`PRS: ${workout.pre_workout_prs.toFixed(1)}`}
                                    color={getPRSColor(workout.pre_workout_prs)}
                                  />
                                )}
                                {workout.post_workout_srpe && workout.post_workout_srpe > 0 && (
                                  <Chip
                                    size="small"
                                    label={`sRPE: ${workout.post_workout_srpe}/10`}
                                    color={getSRPEColor(workout.post_workout_srpe)}
                                  />
                                )}
                              </Box>
                            }
                            secondary={`${workout.workout_data?.exercises?.length || 0} ejercicios`}
                            onClick={() => openWorkoutDetails(workout)}
                            sx={{ 
                              cursor: 'pointer',
                              paddingRight: '120px' // Reserve space for action buttons
                            }}
                          />
                          <ListItemSecondaryAction>
                            <Box display="flex" gap={1}>
                              {!workout.is_completed && isDateTodayOrPast(selectedDate || '') && (
                                <>
                                  {!workout.pre_workout_prs ? (
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => openPRSDialog(workout)}
                                      title="Añadir PRS"
                                    >
                                      <PRSIcon />
                                    </IconButton>
                                  ) : (
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => openSRPEDialog(workout)}
                                      title="Marcar como completado"
                                    >
                                      <CompleteIcon />
                                    </IconButton>
                                  )}
                                </>
                              )}
                              <IconButton
                                size="small"
                                color="info"
                                onClick={() => openEditWorkoutDialog(workout)}
                                title="Editar nombre"
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => deleteWorkout(workout.id)}
                                title="Eliminar"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box textAlign="center" py={3}>
                      <Typography color="text.secondary" gutterBottom>
                        No hay entrenamientos planificados para este día
                      </Typography>
                    </Box>
                  )}

                  {plannedWorkouts.length < 2 && (
                    <Box mt={2} display="flex" flexDirection="column" gap={1}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<AddIcon />}
                        onClick={() => navigate(`/workout-generator?planDate=${selectedDate}`)}
                      >
                        Generar Entrenamiento
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<LibraryIcon />}
                        onClick={openLibraryDialog}
                      >
                        Seleccionar de Biblioteca
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <CalendarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Selecciona un día del calendario
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Haz clic en cualquier día para ver o agregar entrenamientos
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>

        {/* Workout Details Dialog */}
        <Dialog
          open={workoutDetailsOpen}
          onClose={() => setWorkoutDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Detalles del Entrenamiento
            {selectedWorkout?.is_completed && (
              <Chip
                size="small"
                label="Completado"
                color="success"
                icon={<CompleteIcon />}
                sx={{ ml: 2 }}
              />
            )}
          </DialogTitle>
          <DialogContent>
            {selectedWorkout && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {selectedWorkout.workout_name || 'Entrenamiento sin nombre'}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Fecha: {new Date(selectedWorkout.planned_date + 'T00:00:00').toLocaleDateString('es-ES')}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" gutterBottom>
                  Ejercicios ({selectedWorkout.workout_data.exercises?.length || 0}):
                </Typography>

                {selectedWorkout.workout_data.exercises?.map((exercise: any, index: number) => (
                  <Paper key={index} elevation={1} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {index + 1}. {exercise.name}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {exercise.description || 'Sin descripción'}
                    </Typography>

                    {exercise.sets && exercise.sets.length > 0 && (
                      <Box mt={1}>
                        <Typography variant="body2" gutterBottom>
                          Series configuradas:
                        </Typography>
                        {exercise.sets.map((set: any, setIndex: number) => (
                          <Chip
                            key={setIndex}
                            size="small"
                            label={`${setIndex + 1}: ${set.reps} reps${set.weight ? ` • ${set.weight}kg` : ''}${set.rest ? ` • ${set.rest}s` : ''}`}
                            sx={{ mr: 1, mb: 1 }}
                          />
                        ))}
                      </Box>
                    )}
                  </Paper>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setWorkoutDetailsOpen(false)}>
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>

        {/* PRS Dialog */}
        <Dialog open={prsDialogOpen} onClose={() => setPRSDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              PRS - Pre-workout Readiness Score
              <IconButton onClick={() => setPRSDialogOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Evalúa tu estado antes del entrenamiento (1-10):
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Este cuestionario te ayudará a determinar tu nivel de preparación para el entrenamiento.
            </Typography>

            {[
              { key: 'sleep_quality', label: 'Calidad del sueño', icon: <SleepIcon />, 
                description: '1 = Muy malo, 10 = Excelente' },
              { key: 'energy_level', label: 'Nivel de energía', icon: <EnergyIcon />, 
                description: '1 = Muy bajo, 10 = Muy alto' },
              { key: 'motivation', label: 'Motivación', icon: <RatingIcon />, 
                description: '1 = Sin ganas, 10 = Muy motivado' },
              { key: 'muscle_soreness', label: 'Dolor muscular', icon: <WorkoutIcon />, 
                description: '1 = Sin dolor, 10 = Mucho dolor' },
              { key: 'mood', label: 'Estado de ánimo', icon: <MoodIcon />, 
                description: '1 = Muy malo, 10 = Excelente' }
            ].map((question) => (
              <Box key={question.key} sx={{ mb: 3 }}>
                <Box display="flex" alignItems="center" mb={1}>
                  {question.icon}
                  <Typography variant="body1" sx={{ ml: 1 }}>
                    {question.label}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  {question.description}
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={prsForm[question.key as keyof PRSForm]}
                    onChange={(e) => setPRSForm({
                      ...prsForm,
                      [question.key]: Number(e.target.value)
                    })}
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map(num => (
                      <MenuItem key={num} value={num}>{num}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            ))}

            <Divider sx={{ my: 3 }} />
            <Box textAlign="center">
              <Typography variant="h5" color="primary">
                PRS Calculado: {calculatePRS(prsForm)}/10
              </Typography>
              <Chip 
                size="medium"
                label={`${calculatePRS(prsForm) >= 8 ? 'Excelente' : 
                        calculatePRS(prsForm) >= 6 ? 'Bueno' : 'Precaución'}`}
                color={getPRSColor(calculatePRS(prsForm))}
                sx={{ mt: 1 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPRSDialogOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={savePRS}>
              Guardar PRS
            </Button>
          </DialogActions>
        </Dialog>

        {/* sRPE Dialog */}
        <Dialog open={srpeDialogOpen} onClose={() => setSRPEDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              sRPE - Esfuerzo Percibido
              <IconButton onClick={() => setSRPEDialogOpen(false)}>
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
              <Typography variant="body1" gutterBottom>
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

            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
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
            <Button onClick={() => setSRPEDialogOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={saveSRPEAndComplete}>
              Completar Entrenamiento
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Workout Name Dialog */}
        <Dialog 
          open={editWorkoutDialogOpen} 
          onClose={() => setEditWorkoutDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              ✏️ Editar Nombre del Entrenamiento
              <IconButton onClick={() => setEditWorkoutDialogOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                autoFocus
                fullWidth
                label="Nombre del Entrenamiento"
                value={editWorkoutName}
                onChange={(e) => setEditWorkoutName(e.target.value)}
                helperText="Este nombre se actualizará en la planificación y en la biblioteca"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditWorkoutDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="contained"
              onClick={updateWorkoutName}
              disabled={!editWorkoutName.trim()}
            >
              Guardar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Library Selection Dialog */}
        <Dialog 
          open={libraryDialogOpen} 
          onClose={() => setLibraryDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              📚 Seleccionar Entrenamiento de la Biblioteca
              <IconButton onClick={() => setLibraryDialogOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="textSecondary" paragraph>
              Selecciona un entrenamiento de tu biblioteca para añadirlo al {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES')}
            </Typography>
            
            {libraryWorkouts.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <WorkoutIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No hay entrenamientos en tu biblioteca
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Crea entrenamientos y guárdalos para poder reutilizarlos aquí.
                </Typography>
              </Paper>
            ) : (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {libraryWorkouts.map((workout) => (
                  <ListItem key={workout.id} divider>
                    <ListItemText
                      primary={workout.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            📅 {new Date(workout.date).toLocaleDateString('es-ES')}
                          </Typography>
                          {workout.notes && (
                            <Typography variant="body2" color="textSecondary">
                              💭 {workout.notes}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => addWorkoutFromLibrary(workout)}
                      >
                        Seleccionar
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLibraryDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Floating Action Button for quick access */}
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => navigate('/workout-generator')}
        >
          <AddIcon />
        </Fab>
      </Container>
    </Layout>
  );
};

export default Planning;
