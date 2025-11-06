import React, { useState, useContext } from 'react';
import {
  Container,
  Typography,
  Paper,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Rating,
  Slider
} from '@mui/material';
import { Add, FitnessCenter, Assessment } from '@mui/icons-material';
import { AuthContext } from '../contexts/AuthContext';

interface Workout {
  id: number;
  date: string;
  name: string;
  preWorkoutPRS: number;
  postWorkoutSRPE: number | null;
  exercises: Exercise[];
  notes: string;
}

interface Exercise {
  id: number;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  rpe: number;
  notes: string;
}

const Workouts: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [workouts] = useState<Workout[]>([]);
  const [openNewWorkout, setOpenNewWorkout] = useState(false);
  const [currentWorkout, setCurrentWorkout] = useState<Partial<Workout>>({
    name: '',
    preWorkoutPRS: 5,
    exercises: [],
    notes: ''
  });

  const handleCreateWorkout = () => {
    setOpenNewWorkout(true);
  };

  const handleCloseDialog = () => {
    setOpenNewWorkout(false);
    setCurrentWorkout({
      name: '',
      preWorkoutPRS: 5,
      exercises: [],
      notes: ''
    });
  };

  const handlePRSChange = (event: Event, newValue: number | number[]) => {
    setCurrentWorkout({
      ...currentWorkout,
      preWorkoutPRS: newValue as number
    });
  };

  const handleSaveWorkout = () => {
    // Aquí implementaremos la lógica para guardar el entrenamiento
    console.log('Guardar entrenamiento:', currentWorkout);
    handleCloseDialog();
  };

  const getPRSColor = (prs: number) => {
    if (prs >= 8) return '#4caf50'; // Verde - Excelente
    if (prs >= 6) return '#ff9800'; // Naranja - Bueno
    if (prs >= 4) return '#f44336'; // Rojo - Bajo
    return '#9e9e9e'; // Gris - Muy bajo
  };

  const getPRSText = (prs: number) => {
    if (prs >= 8) return 'Excelente';
    if (prs >= 6) return 'Bueno';
    if (prs >= 4) return 'Regular';
    return 'Bajo';
  };

  return (
    <Container>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Mis Entrenamientos
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateWorkout}
          size="large"
        >
          Nuevo Entrenamiento
        </Button>
      </Box>

      {/* Resumen de la semana */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <FitnessCenter sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">Esta Semana</Typography>
              <Typography variant="h4" color="primary">
                {workouts.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Entrenamientos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assessment sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6">PRS Promedio</Typography>
              <Typography variant="h4" color="success.main">
                {workouts.length > 0 ? '7.2' : '-'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Preparación
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assessment sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h6">sRPE Promedio</Typography>
              <Typography variant="h4" color="warning.main">
                {workouts.length > 0 ? '6.8' : '-'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Esfuerzo Percibido
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Lista de entrenamientos */}
      {workouts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <FitnessCenter sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Aún no tienes entrenamientos registrados
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Comienza registrando tu primer entrenamiento con el sistema PRS/sRPE para un seguimiento inteligente.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateWorkout}
            size="large"
          >
            Crear Primer Entrenamiento
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {workouts.map((workout) => (
            <Grid item xs={12} key={workout.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {workout.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {new Date(workout.date).toLocaleDateString('es-ES')}
                      </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                      <Chip
                        label={`PRS: ${workout.preWorkoutPRS}`}
                        sx={{ backgroundColor: getPRSColor(workout.preWorkoutPRS), color: 'white' }}
                        size="small"
                      />
                      {workout.postWorkoutSRPE && (
                        <Chip
                          label={`sRPE: ${workout.postWorkoutSRPE}`}
                          color="warning"
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2">
                    {workout.exercises.length} ejercicios • {workout.notes || 'Sin notas'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog para nuevo entrenamiento */}
      <Dialog open={openNewWorkout} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Nuevo Entrenamiento</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nombre del entrenamiento"
              value={currentWorkout.name}
              onChange={(e) => setCurrentWorkout({
                ...currentWorkout,
                name: e.target.value
              })}
              margin="normal"
              placeholder="Ej: Tren Superior - Dominadas"
            />

            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography gutterBottom>
                PRS - ¿Cómo te sientes antes de entrenar? ({currentWorkout.preWorkoutPRS}/10)
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Evalúa tu energía, motivación y preparación física
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={currentWorkout.preWorkoutPRS}
                  onChange={handlePRSChange}
                  min={1}
                  max={10}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  sx={{ color: getPRSColor(currentWorkout.preWorkoutPRS || 5) }}
                />
                <Box display="flex" justifyContent="space-between" sx={{ mt: 1 }}>
                  <Typography variant="caption">Muy mal (1)</Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {getPRSText(currentWorkout.preWorkoutPRS || 5)}
                  </Typography>
                  <Typography variant="caption">Excelente (10)</Typography>
                </Box>
              </Box>
            </Box>

            <TextField
              fullWidth
              label="Notas del entrenamiento"
              value={currentWorkout.notes}
              onChange={(e) => setCurrentWorkout({
                ...currentWorkout,
                notes: e.target.value
              })}
              margin="normal"
              multiline
              rows={3}
              placeholder="Objetivos, sensaciones, observaciones..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSaveWorkout} variant="contained">
            Crear Entrenamiento
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Workouts;
