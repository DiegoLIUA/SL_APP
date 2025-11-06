import React, { useContext } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button
} from '@mui/material';
import { Link } from 'react-router-dom';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CalculateIcon from '@mui/icons-material/Calculate';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import TimelineIcon from '@mui/icons-material/Timeline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ListIcon from '@mui/icons-material/List';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrophyIcon from '@mui/icons-material/EmojiEvents';
import LibraryIcon from '@mui/icons-material/LibraryBooks';
import Layout from '../components/Layout/Layout';
import { AuthContext } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useContext(AuthContext);

  const quickActions = [
    {
      title: 'Crear Entrenamiento',
      description: 'Crea entrenamientos manual o automáticamente con PRS y ejercicios',
      icon: <FitnessCenterIcon sx={{ fontSize: 40 }} />,
      link: '/workouts',
      color: '#1976d2'
    },
    {
      title: 'Generar Entrenamiento',
      description: 'Crea entrenamientos automáticamente con IA',
      icon: <AutoAwesomeIcon sx={{ fontSize: 40 }} />,
      link: '/workout-generator',
      color: '#9c27b0'
    },
    {
      title: 'Planificación',
      description: 'Organiza y planifica tus entrenamientos en calendario',
      icon: <CalendarTodayIcon sx={{ fontSize: 40 }} />,
      link: '/planning',
      color: '#1565c0'
    },
    {
      title: 'Biblioteca de Entrenamientos',
      description: 'Consulta, analiza y reutiliza tus entrenamientos pasados',
      icon: <LibraryIcon sx={{ fontSize: 40 }} />,
      link: '/workout-library',
      color: '#7b1fa2'
    },
    {
      title: 'Biblioteca de Ejercicios',
      description: 'Gestiona y etiqueta tus ejercicios',
      icon: <ListIcon sx={{ fontSize: 40 }} />,
      link: '/exercises',
      color: '#2e7d32'
    },
    {
      title: 'Ver Progreso',
      description: 'Visualiza tu evolución y estadísticas',
      icon: <TimelineIcon sx={{ fontSize: 40 }} />,
      link: '/progress',
      color: '#f57c00'
    },
    {
      title: 'Mis PRs',
      description: 'Gestiona tus records personales de MU, dominadas, fondos y sentadillas',
      icon: <TrophyIcon sx={{ fontSize: 40 }} />,
      link: '/personal-records',
      color: '#FFD700'
    },
    {
      title: 'Calculadora 1RM',
      description: 'Calcula tu máximo para dominadas, fondos y muscle-ups',
      icon: <CalculateIcon sx={{ fontSize: 40 }} />,
      link: '/calculator',
      color: '#dc004e'
    },
    {
      title: 'Análisis de Video',
      description: 'Analiza tu técnica con IA (próximamente)',
      icon: <VideoCallIcon sx={{ fontSize: 40 }} />,
      link: '/video-analysis',
      color: '#388e3c'
    }
  ];

  return (
    <Layout>
      <Typography variant="h4" gutterBottom>
        ¡Bienvenido, {user?.name}!
      </Typography>
      
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {user?.role === 'trainer' ? 'Panel de Entrenador' : 'Panel de Atleta'}
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Quick Actions */}
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Box sx={{ color: action.color, mb: 2 }}>
                  {action.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {action.description}
                </Typography>
                <Button
                  component={Link}
                  to={action.link}
                  variant="contained"
                  size="small"
                  sx={{ backgroundColor: action.color }}
                >
                  Ir
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Recent Activity */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Actividad Reciente
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aquí se mostrarán tus entrenamientos recientes...
            </Typography>
          </Paper>
        </Grid>

        {/* Stats Summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resumen de Stats
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Total Entrenamientos:</strong> 0
              </Typography>
              <Typography variant="body2">
                <strong>Esta Semana:</strong> 0
              </Typography>
              <Typography variant="body2">
                <strong>Último Entrenamiento:</strong> -
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Layout>
  );
};

export default Dashboard; 