import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Card,
  CardContent,
  Divider,
  AlertTitle
} from '@mui/material';
import { Link } from 'react-router-dom';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  Whatshot as FireIcon
} from '@mui/icons-material';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PersonalRecord {
  id: number;
  weight_kg: number;
  repetitions: number;
  date: string;
  calculated_1rm: number;
  notes?: string;
  percentage: number;
  created_at: string;
}

interface PRForm {
  weight_kg: string;
  repetitions: string;
  date: string;
  notes: string;
}

const exerciseTypes = ['MU', 'Dominada', 'Fondos', 'Sentadilla'];
const exerciseNames = {
  'MU': 'Muscle Ups',
  'Dominada': 'Dominadas',
  'Fondos': 'Fondos',
  'Sentadilla': 'Sentadillas'
};

export default function PersonalRecords() {
  const { token } = useContext(AuthContext);
  const [currentTab, setCurrentTab] = useState(0);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Body weight check state
  const [hasBodyWeight, setHasBodyWeight] = useState<boolean | null>(null);
  const [bodyWeight, setBodyWeight] = useState<number | null>(null);
  const [checkingWeight, setCheckingWeight] = useState(true);
  
  // Form state
  const [form, setForm] = useState<PRForm>({
    weight_kg: '',
    repetitions: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PersonalRecord | null>(null);

  const getCurrentExerciseType = () => exerciseTypes[currentTab];

  // Check if user has body weight configured
  const checkBodyWeight = async () => {
    if (!token) return;
    
    try {
      setCheckingWeight(true);
      console.log('Checking if user has body weight configured...');
      
      const response = await axios.get('/api/personal-records/profile/check', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Body weight check response:', response.data);
      setHasBodyWeight(response.data.has_body_weight);
      setBodyWeight(response.data.body_weight);
      
    } catch (err: any) {
      console.error('Error checking body weight:', err);
      setHasBodyWeight(false);
    } finally {
      setCheckingWeight(false);
    }
  };

  // Fetch records for current exercise
  const fetchRecords = async (exerciseType: string) => {
    if (!token || !hasBodyWeight) return;
    
    try {
      setLoading(true);
      setError('');
      
      console.log(`Fetching records for ${exerciseType}`);
      const response = await axios.get(`/api/personal-records/${exerciseType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`Records for ${exerciseType}:`, response.data);
      setRecords(response.data);
      
    } catch (err: any) {
      console.error('Error fetching records:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Error al cargar records';
      setError(`Error al cargar records: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Check body weight on component mount
  useEffect(() => {
    checkBodyWeight();
  }, [token]);

  // Load records when tab changes or body weight is confirmed
  useEffect(() => {
    if (hasBodyWeight) {
      const exerciseType = getCurrentExerciseType();
      fetchRecords(exerciseType);
    }
  }, [currentTab, token, hasBodyWeight]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    // Clear form when switching tabs
    setForm({
      weight_kg: '',
      repetitions: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setError('');
    setSuccess('');
  };

  const handleFormChange = (field: keyof PRForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError('No estás autenticado');
      return;
    }

    if (!hasBodyWeight) {
      setError('Debes configurar tu peso corporal en tu perfil primero');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const exerciseType = getCurrentExerciseType();
      
      const requestData = {
        exercise_type: exerciseType,
        weight_kg: parseFloat(form.weight_kg),
        repetitions: parseInt(form.repetitions),
        date: form.date,
        notes: form.notes.trim() || null
      };

      console.log('Creating PR:', requestData);

      const response = await axios.post('/api/personal-records', requestData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('PR created:', response.data);
      const bodyWeightUsed = response.data.body_weight_used;
      setSuccess(`¡PR de ${exerciseNames[exerciseType as keyof typeof exerciseNames]} añadido! 1RM calculado: ${response.data.calculated_1rm.toFixed(1)}kg (usando peso corporal: ${bodyWeightUsed}kg)`);
      
      // Reset form
      setForm({
        weight_kg: '',
        repetitions: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });

      // Refresh records
      fetchRecords(exerciseType);

    } catch (err: any) {
      console.error('Error creating PR:', err);
      
      // Handle specific body weight error
      if (err.response?.data?.action === 'configure_weight') {
        setError('Debes configurar tu peso corporal en tu perfil para calcular PRs correctamente.');
        // Refresh body weight check
        checkBodyWeight();
        return;
      }
      
      const errorMessage = err.response?.data?.error || err.message || 'Error desconocido';
      setError(`Error al añadir PR: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord || !token) return;

    try {
      setLoading(true);
      console.log('Deleting PR:', selectedRecord.id);
      
      await axios.delete(`/api/personal-records/${selectedRecord.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('PR eliminado exitosamente');
      setDeleteDialogOpen(false);
      setSelectedRecord(null);

      // Refresh records
      fetchRecords(getCurrentExerciseType());

    } catch (err: any) {
      console.error('Error deleting PR:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Error desconocido';
      setError(`Error al eliminar PR: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  // Prepare data for progress chart
  const prepareChartData = () => {
    if (!records || records.length === 0) return [];
    
    // Sort records chronologically (oldest first)
    const sortedRecords = [...records].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    return sortedRecords.map((record, index) => ({
      date: formatDate(record.date),
      fullDate: record.date,
      oneRM: Math.round(record.calculated_1rm * 10) / 10,
      weight: record.weight_kg,
      reps: record.repetitions,
      recordNumber: index + 1,
      notes: record.notes || ''
    }));
  };

  const chartData = prepareChartData();

  const getRankingIcon = (index: number) => {
    if (index === 0) return <TrophyIcon sx={{ color: '#FFD700' }} />;
    if (index === 1) return <StarIcon sx={{ color: '#C0C0C0' }} />;
    if (index === 2) return <FireIcon sx={{ color: '#CD7F32' }} />;
    return null;
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage === 100) return '#FFD700';
    if (percentage >= 95) return '#FF6B6B';
    if (percentage >= 90) return '#4ECDC4';
    if (percentage >= 85) return '#45B7D1';
    if (percentage >= 80) return '#96CEB4';
    return '#FECA57';
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <TrophyIcon sx={{ fontSize: 40, color: '#FFD700', mr: 2 }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Mis Records Personales
          </Typography>
        </Box>

      {checkingWeight && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Verificando configuración del perfil...
        </Alert>
      )}

      {!checkingWeight && hasBodyWeight === false && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Peso Corporal Requerido</AlertTitle>
          Para calcular tus PRs correctamente usando las fórmulas específicas de streetlifting, necesitas configurar tu peso corporal.
          <Box sx={{ mt: 1 }}>
            <Button 
              component={Link} 
              to="/profile" 
              variant="contained" 
              size="small"
              sx={{ textTransform: 'none' }}
            >
              Ir a Configurar Perfil
            </Button>
          </Box>
        </Alert>
      )}

      {!checkingWeight && hasBodyWeight === true && bodyWeight && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <AlertTitle>✅ Listo para calcular PRs</AlertTitle>
          Peso corporal configurado: <strong>{bodyWeight}kg</strong>. 
          Se usarán las fórmulas específicas de streetlifting para cálculos precisos.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
          {error.includes('peso corporal') && (
            <Box sx={{ mt: 1 }}>
              <Button 
                component={Link} 
                to="/profile" 
                variant="outlined" 
                size="small"
                sx={{ textTransform: 'none' }}
              >
                Configurar Peso en Perfil
              </Button>
            </Box>
          )}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          centered
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {exerciseTypes.map((type, index) => (
            <Tab 
              key={type}
              label={exerciseNames[type as keyof typeof exerciseNames]}
              icon={<TrophyIcon />}
            />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Add New PR Form */}
          <Card sx={{ 
            mb: 4, 
            background: hasBodyWeight ? 'linear-gradient(45deg, #f5f5f5, #ffffff)' : 'rgba(0,0,0,0.05)',
            opacity: hasBodyWeight ? 1 : 0.6
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <AddIcon sx={{ mr: 1 }} />
                Añadir Nuevo PR - {exerciseNames[getCurrentExerciseType() as keyof typeof exerciseNames]}
                {getCurrentExerciseType() !== 'Sentadilla' && bodyWeight && (
                  <Chip 
                    label={`Peso corporal: ${bodyWeight}kg`} 
                    size="small" 
                    sx={{ ml: 2, bgcolor: 'success.light', color: 'white' }}
                  />
                )}
              </Typography>
              
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label={getCurrentExerciseType() === 'Sentadilla' ? 'Peso Total (kg)' : 'Peso Adicional (kg)'}
                      type="number"
                      value={form.weight_kg}
                      onChange={(e) => handleFormChange('weight_kg', e.target.value)}
                      required
                      disabled={!hasBodyWeight}
                      inputProps={{ min: 0, step: 0.1 }}
                      helperText={getCurrentExerciseType() === 'Sentadilla' ? 'Peso total (barra + discos)' : 'Peso añadido al ejercicio'}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Repeticiones"
                      type="number"
                      value={form.repetitions}
                      onChange={(e) => handleFormChange('repetitions', e.target.value)}
                      required
                      disabled={!hasBodyWeight}
                      inputProps={{ min: 1, max: 50 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Fecha"
                      type="date"
                      value={form.date}
                      onChange={(e) => handleFormChange('date', e.target.value)}
                      required
                      disabled={!hasBodyWeight}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={3}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={loading || !hasBodyWeight}
                      sx={{ 
                        height: '56px',
                        background: hasBodyWeight ? 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)' : 'rgba(0,0,0,0.3)'
                      }}
                    >
                      {loading ? 'Añadiendo...' : !hasBodyWeight ? 'Configura peso corporal' : 'Añadir PR'}
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Notas (opcional)"
                      multiline
                      rows={2}
                      value={form.notes}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      disabled={!hasBodyWeight}
                      placeholder="Condiciones, sensaciones, técnica..."
                    />
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>

          <Divider sx={{ mb: 3 }} />

          {/* Records Ranking */}
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <TrophyIcon sx={{ mr: 1, color: '#FFD700' }} />
            Ranking de PRs - {exerciseNames[getCurrentExerciseType() as keyof typeof exerciseNames]}
          </Typography>

          {loading ? (
            <Typography>Cargando records...</Typography>
          ) : records.length === 0 ? (
            <Card sx={{ textAlign: 'center', p: 4, background: '#f9f9f9' }}>
              <Typography variant="h6" color="textSecondary">
                No hay PRs registrados para {exerciseNames[getCurrentExerciseType() as keyof typeof exerciseNames]}
              </Typography>
              <Typography color="textSecondary">
                ¡Añade tu primer PR arriba!
              </Typography>
            </Card>
          ) : (
            <List>
              {records.map((record, index) => (
                <ListItem
                  key={record.id}
                  sx={{
                    mb: 2,
                    bgcolor: index < 3 ? 'rgba(255, 215, 0, 0.1)' : 'background.paper',
                    border: index === 0 ? '2px solid #FFD700' : '1px solid #e0e0e0',
                    borderRadius: 2
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                    {getRankingIcon(index)}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      #{index + 1}
                    </Typography>
                  </Box>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6">
                          {record.repetitions} rep{record.repetitions > 1 ? 's' : ''} × {record.weight_kg}kg
                        </Typography>
                        <Chip
                          label={`${record.calculated_1rm.toFixed(1)}kg (1RM)`}
                          size="small"
                          sx={{
                            backgroundColor: getPercentageColor(record.percentage),
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                        <Chip
                          label={`${record.percentage}%`}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          📅 {formatDate(record.date)}
                        </Typography>
                        {record.notes && (
                          <Typography variant="body2" color="textSecondary">
                            💭 {record.notes}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton
                      onClick={() => {
                        setSelectedRecord(record);
                        setDeleteDialogOpen(true);
                      }}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Paper>

      {/* Progress Chart */}
      {!checkingWeight && hasBodyWeight && chartData.length > 1 && (
        <Paper sx={{ mt: 4 }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              📈 Evolución de PRs - {exerciseNames[getCurrentExerciseType() as keyof typeof exerciseNames]}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Progreso de tu 1RM a lo largo del tiempo. Cada punto representa un PR registrado.
            </Typography>
            
            <Box sx={{ width: '100%', height: 400, mt: 2 }}>
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    label={{ value: 'Fecha', position: 'insideBottom', offset: -5 }}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    label={{ value: '1RM (kg)', angle: -90, position: 'insideLeft' }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'oneRM') return [`${value} kg`, '1RM Calculado'];
                      return [value, name];
                    }}
                    labelFormatter={(date: any) => `Fecha: ${date}`}
                    contentStyle={{ 
                      backgroundColor: '#f5f5f5', 
                      border: '1px solid #ddd',
                      borderRadius: '8px'
                    }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <Card sx={{ p: 2, maxWidth: 300 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              📅 {label}
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2">
                              🏆 <strong>1RM:</strong> {data.oneRM}kg
                            </Typography>
                            <Typography variant="body2">
                              💪 <strong>Ejercicio:</strong> {data.reps} reps × {data.weight}kg
                            </Typography>
                            {data.notes && (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                💭 <em>{data.notes}</em>
                              </Typography>
                            )}
                          </Card>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="oneRM" 
                    stroke="#FF6B6B" 
                    strokeWidth={3}
                    name="1RM (kg)"
                    dot={{ 
                      fill: '#FF6B6B', 
                      strokeWidth: 2, 
                      r: 6,
                      stroke: '#fff'
                    }}
                    activeDot={{ 
                      r: 8, 
                      stroke: '#FF6B6B', 
                      strokeWidth: 3,
                      fill: '#fff'
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>

            {chartData.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="textSecondary">
                      📊 Total PRs registrados
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {chartData.length}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="textSecondary">
                      🎯 Mejor 1RM
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {Math.max(...chartData.map(d => d.oneRM))}kg
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="textSecondary">
                      📈 Progreso total
                    </Typography>
                    <Typography variant="h6" color="primary">
                      +{(Math.max(...chartData.map(d => d.oneRM)) - Math.min(...chartData.map(d => d.oneRM))).toFixed(1)}kg
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="textSecondary">
                      📅 Primer PR
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {chartData[0]?.date}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* No chart message when not enough data */}
      {!checkingWeight && hasBodyWeight && chartData.length <= 1 && records.length > 0 && (
        <Paper sx={{ mt: 4, textAlign: 'center', p: 3, bgcolor: 'background.default' }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            📈 Gráfica de Progreso
          </Typography>
          <Typography color="textSecondary">
            Necesitas al menos 2 PRs registrados para ver la gráfica de progreso temporal.
            ¡Sigue entrenando y registrando tus mejores marcas!
          </Typography>
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Typography>
              ¿Estás seguro de que quieres eliminar el PR de{' '}
              <strong>{selectedRecord.repetitions} reps × {selectedRecord.weight_kg}kg</strong>{' '}
              del {formatDate(selectedRecord.date)}?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Layout>
  );
}
