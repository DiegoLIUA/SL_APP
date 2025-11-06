import React, { useState, useEffect, useContext } from 'react';
import {
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Card,
  CardContent,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip
} from '@mui/material';
import {
  AccountCircle as AccountIcon,
  FitnessCenter as FitnessIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import Layout from '../components/Layout/Layout';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';

const Profile: React.FC = () => {
  const { user, logout } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form states
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [experience, setExperience] = useState('');
  const [goals, setGoals] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const profileData = response.data;
      
      // Fill form with existing data
      setHeight(profileData.height?.toString() || '');
      setWeight(profileData.weight?.toString() || '');
      setAge(profileData.age?.toString() || '');
      setExperience(profileData.training_experience || '');
      setGoals(profileData.goals || '');
    } catch (err: any) {
      setError('Error al cargar perfil');
    }
  };

  const updateProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.put('/api/users/profile', {
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        age: age ? parseInt(age) : null,
        training_experience: experience || null,
        goals: goals || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Perfil actualizado correctamente');
      fetchProfile(); // Refresh data
    } catch (err: any) {
      setError('Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const calculateBMI = () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (h && w && h > 0) {
      const heightInMeters = h / 100;
      return (w / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return null;
  };

  const getBMIStatus = (bmi: string) => {
    const value = parseFloat(bmi);
    if (value < 18.5) return { label: 'Bajo peso', color: 'info' };
    if (value < 25) return { label: 'Normal', color: 'success' };
    if (value < 30) return { label: 'Sobrepeso', color: 'warning' };
    return { label: 'Obesidad', color: 'error' };
  };

  return (
    <Layout>
      <Box display="flex" alignItems="center" mb={4}>
        <AccountIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4">
          Mi Cuenta
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Información Personal */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <FitnessIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">
                  Información Personal
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nombre"
                    value={user?.name || ''}
                    disabled
                    helperText="No editable"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={user?.email || ''}
                    disabled
                    helperText="No editable"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Altura (cm)"
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="170"
                    inputProps={{ min: 120, max: 220 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Peso (kg)"
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="70"
                    inputProps={{ min: 30, max: 200, step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Edad"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="25"
                    inputProps={{ min: 12, max: 100 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Experiencia en entrenamiento</InputLabel>
                    <Select
                      value={experience}
                      label="Experiencia en entrenamiento"
                      onChange={(e) => setExperience(e.target.value)}
                    >
                      <MenuItem value="">Seleccionar</MenuItem>
                      <MenuItem value="beginner">Principiante (0-1 año)</MenuItem>
                      <MenuItem value="intermediate">Intermedio (1-3 años)</MenuItem>
                      <MenuItem value="advanced">Avanzado (3-5 años)</MenuItem>
                      <MenuItem value="expert">Experto (5+ años)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Chip 
                    label={user?.role === 'trainer' ? 'Entrenador' : 'Atleta'} 
                    color="primary" 
                    sx={{ mt: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Objetivos de entrenamiento"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    multiline
                    rows={3}
                    placeholder="Ej: Mejorar fuerza en muscle-ups, aumentar resistencia..."
                  />
                </Grid>
              </Grid>

              <Box mt={3}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={updateProfile}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Panel Lateral */}
        <Grid item xs={12} md={4}>
          {/* Estadísticas */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Estadísticas
              </Typography>
              
              {height && weight && (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">IMC:</Typography>
                    <Typography variant="h6">{calculateBMI()}</Typography>
                  </Box>
                  {calculateBMI() && (
                    <Chip 
                      label={getBMIStatus(calculateBMI()!).label}
                      color={getBMIStatus(calculateBMI()!).color as any}
                      size="small"
                      sx={{ mb: 2 }}
                    />
                  )}
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Altura:</Typography>
                <Typography variant="body2">{height || '-'} cm</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Peso:</Typography>
                <Typography variant="body2">{weight || '-'} kg</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Edad:</Typography>
                <Typography variant="body2">{age || '-'} años</Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Configuraciones */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Configuración
                </Typography>
              </Box>

              <Box mb={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notifications}
                      onChange={(e) => setNotifications(e.target.checked)}
                    />
                  }
                  label="Notificaciones"
                />
              </Box>
              <Box mb={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                    />
                  }
                  label="Modo oscuro"
                />
              </Box>
            </CardContent>
          </Card>

          {/* Acciones de Cuenta */}
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Cuenta
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{ mb: 2 }}
              >
                Cerrar Sesión
              </Button>

              <Typography variant="caption" color="text.secondary">
                Miembro desde: {user ? new Date().toLocaleDateString('es-ES') : ''}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Layout>
  );
};

export default Profile; 