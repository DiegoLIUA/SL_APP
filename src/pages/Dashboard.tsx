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
import { AuthContext } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useContext(AuthContext);

  const quickActions = [
    {
      title: 'Nuevo Entrenamiento',
      description: 'Registra tu sesión de entrenamiento con PRS y sRPE',
      icon: <FitnessCenterIcon sx={{ fontSize: 40 }} />,
      link: '/workouts',
      color: '#1976d2'
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
      description: 'Analiza tu técnica con IA',
      icon: <VideoCallIcon sx={{ fontSize: 40 }} />,
      link: '/video-analysis',
      color: '#388e3c'
    },
    {
      title: 'Ver Progreso',
      description: 'Visualiza tu evolución',
      icon: <TimelineIcon sx={{ fontSize: 40 }} />,
      link: '/workouts',
      color: '#f57c00'
    }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        ¡Bienvenido, {user?.name}!
      </Typography>
      
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {user?.role === 'trainer' ? 'Panel de Entrenador' : 'Panel de Atleta'}
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Quick Actions */}
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
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
              Aquí se mostrarán tus entrenamientos recientes con PRS y sRPE...
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
    </Box>
  );
};

export default Dashboard;
