import React, { useState, useEffect } from 'react';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Timer as TimerIcon,
  Psychology as PsychologyIcon,
  FitnessCenter as FitnessCenterIcon
} from '@mui/icons-material';
import Layout from '../components/Layout/Layout';
import axios from 'axios';

interface AnalyticsData {
  total_workouts: number;
  total_exercises: number;
  avg_srpe: number;
  avg_rpe: number;
  total_volume: number;
}

interface Workout {
  id: number;
  name: string;
  date: string;
  pre_workout_prs: number | null;
  post_workout_srpe: number | null;
  notes: string;
}

const Progress: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, workoutsRes] = await Promise.all([
        axios.get('/api/workouts/analytics/summary', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/workouts?limit=10', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setAnalytics(analyticsRes.data);
      setRecentWorkouts(workoutsRes.data);
    } catch (err: any) {
      setError('Error al cargar datos de progreso');
    } finally {
      setLoading(false);
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

  const getProgressValue = (value: number, max: number) => {
    return Math.min((value / max) * 100, 100);
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box display="flex" alignItems="center" mb={4}>
        <AssessmentIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4">
          Ver Progreso
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {analytics && (
        <>
          {/* Resumen General */}
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            📊 Resumen de los últimos 30 días
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <FitnessCenterIcon color="primary" />
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      Entrenamientos
                    </Typography>
                  </Box>
                  <Typography variant="h3" color="primary">
                    {analytics.total_workouts}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sesiones completadas
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <TrendingUpIcon color="primary" />
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      Volumen Total
                    </Typography>
                  </Box>
                  <Typography variant="h3" color="primary">
                    {analytics.total_volume || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sets × Reps acumuladas
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <PsychologyIcon color="primary" />
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      sRPE Promedio
                    </Typography>
                  </Box>
                  <Typography variant="h3" color="primary">
                    {analytics.avg_srpe ? analytics.avg_srpe.toFixed(1) : 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Esfuerzo percibido
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <TimerIcon color="primary" />
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      Ejercicios
                    </Typography>
                  </Box>
                  <Typography variant="h3" color="primary">
                    {analytics.total_exercises}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ejercicios realizados
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Análisis de Intensidad */}
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            🎯 Análisis de Intensidad
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Distribución de Intensidad (sRPE)
                  </Typography>
                  <Box sx={{ my: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">Recuperación (1-3)</Typography>
                      <Typography variant="body2" color="success.main">25%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={25} 
                      color="success"
                      sx={{ height: 8, borderRadius: 1, mb: 2 }}
                    />

                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">Moderado (4-6)</Typography>
                      <Typography variant="body2" color="warning.main">45%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={45} 
                      color="warning"
                      sx={{ height: 8, borderRadius: 1, mb: 2 }}
                    />

                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">Intenso (7-10)</Typography>
                      <Typography variant="body2" color="error.main">30%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={30} 
                      color="error"
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Métricas de Rendimiento
                  </Typography>
                  <Box sx={{ my: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="body2">Consistencia Semanal</Typography>
                      <Chip 
                        label="85%" 
                        color="success" 
                        size="small"
                      />
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={85} 
                      color="success"
                      sx={{ height: 6, borderRadius: 1, mb: 3 }}
                    />

                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="body2">Carga de Entrenamiento</Typography>
                      <Chip 
                        label="Óptima" 
                        color="success" 
                        size="small"
                      />
                    </Box>

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Recuperación</Typography>
                      <Chip 
                        label="Buena" 
                        color="warning" 
                        size="small"
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Entrenamientos Recientes */}
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            📝 Entrenamientos Recientes
          </Typography>

          <Grid container spacing={2}>
            {recentWorkouts.slice(0, 6).map((workout) => (
              <Grid item xs={12} sm={6} md={4} key={workout.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {workout.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {new Date(workout.date).toLocaleDateString('es-ES')}
                    </Typography>

                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                      <Box>
                        <Typography variant="caption">PRS</Typography>
                        <Box>
                          {workout.pre_workout_prs ? (
                            <Chip 
                              label={`${workout.pre_workout_prs}/10`}
                              color={getPRSColor(workout.pre_workout_prs)}
                              size="small"
                            />
                          ) : (
                            <Chip label="N/A" variant="outlined" size="small" />
                          )}
                        </Box>
                      </Box>

                      <Box>
                        <Typography variant="caption">sRPE</Typography>
                        <Box>
                          {workout.post_workout_srpe ? (
                            <Chip 
                              label={`${workout.post_workout_srpe}/10`}
                              color={getSRPEColor(workout.post_workout_srpe)}
                              size="small"
                            />
                          ) : (
                            <Chip label="N/A" variant="outlined" size="small" />
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {recentWorkouts.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <AssessmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No hay entrenamientos para mostrar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Comienza a entrenar para ver tu progreso aquí
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Layout>
  );
};

export default Progress;
