import React, { useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Card,
  CardContent,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout/Layout';

interface CalculationResult {
  exercise: string;
  addedWeight: number;
  bodyWeight: number;
  reps: number;
  oneRM: number;
  repEquivalences: { reps: number; maxWeight: number }[];
}

const Calculator: React.FC = () => {
  const [exercise, setExercise] = useState('pull-ups');
  const [addedWeight, setAddedWeight] = useState('');
  const [bodyWeight, setBodyWeight] = useState('');
  const [reps, setReps] = useState('');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState('');

  const exercises = [
    { value: 'pull-ups', label: 'Dominadas' },
    { value: 'dips', label: 'Fondos' },
    { value: 'muscle-ups', label: 'Muscle-ups' }
  ];

  const handleExerciseChange = (e: SelectChangeEvent) => {
    setExercise(e.target.value);
  };

  // Fórmulas específicas para cada ejercicio
  const calculateMuscleUp1RM = (addedWeight: number, bodyWeight: number, reps: number): number => {
    try {
      const peso = addedWeight; // CORREGIDO: peso es solo el peso añadido
      const bw = bodyWeight;
      
      // Fórmula corregida: 0.5 × (-(peso² - 294×peso - 24×bw×((reps^1.5)-1)^0.5 + 21600)^0.5 + peso + 147)
      // donde peso = peso añadido únicamente
      
      const repsCalc = Math.pow(reps, 1.5) - 1;
      
      if (repsCalc < 0) {
        return calculateMuscleUp1RM(addedWeight, bodyWeight, 1);
      }
      
      const sqrtPart = Math.pow(repsCalc, 0.5);
      const inner = Math.pow(peso, 2) - 294 * peso - 24 * bw * sqrtPart + 21600;
      
      if (inner < 0) {
        const simpleCalc = (peso + bw) * (36 / (37 - reps));
        return Math.max(simpleCalc - bw, 0);
      }
      
      const sqrtInner = Math.pow(inner, 0.5);
      const oneRM = 0.5 * (-sqrtInner + peso + 147);
      
      return Math.max(oneRM, 0);
    } catch (error) {
      // Fallback a fórmula simplificada
      const simpleRM = (addedWeight + bodyWeight) * (36 / (37 - reps)) - bodyWeight;
      return Math.max(simpleRM, 0);
    }
  };

  const calculateDipsOrPullUps1RM = (addedWeight: number, bodyWeight: number, reps: number): number => {
    try {
      const peso = addedWeight;
      const bw = bodyWeight;
      const totalWeight = peso + bw;
      const factor1 = 1 + (0.0333 * reps);
      const factor2 = 36 / (37 - reps);
      const factor3 = Math.pow(reps, 0.1);
      const oneRM = (totalWeight * (factor1 + factor2 + factor3) / 3) - bw;
      return Math.max(oneRM, 0); // Retorna solo el peso añadido
    } catch (error) {
      return 0;
    }
  };

  // Función para encontrar el peso máximo para un número dado de reps
  const findMaxWeightForReps = (targetReps: number, oneRM: number, bodyWeight: number, exercise: string): number => {
    // Búsqueda binaria para encontrar el peso máximo que produce el 1RM objetivo
    let low = 0;
    let high = oneRM * 1.5; // Buscar hasta 1.5x el 1RM
    let bestWeight = 0;
    
    for (let iteration = 0; iteration < 50; iteration++) {
      const mid = (low + high) / 2;
      let calculated1RM;
      
      if (exercise === 'muscle-ups') {
        calculated1RM = calculateMuscleUp1RM(mid, bodyWeight, targetReps);
      } else {
        calculated1RM = calculateDipsOrPullUps1RM(mid, bodyWeight, targetReps);
      }
      
      // Si el 1RM calculado es cercano al objetivo, hemos encontrado el peso
      if (Math.abs(calculated1RM - oneRM) < 0.1) {
        bestWeight = mid;
        break;
      } else if (calculated1RM < oneRM) {
        low = mid;
      } else {
        high = mid;
      }
      
      if (high - low < 0.01) {
        bestWeight = mid;
        break;
      }
    }
    
    return Math.max(0, bestWeight);
  };

  const calculateEquivalences = (exercise: string, oneRM: number, bodyWeight: number, userReps: number, userWeight: number) => {
    // Solo tabla de reps vs peso máximo: "Para hacer X reps, ¿cuál es el peso máximo?"
    const repEquivalences = [];
    for (let r = 1; r <= 10; r++) {
      let maxWeight;
      
      // SOLUCIÓN: Si coincide con los reps del usuario, usar exactamente su peso
      if (r === userReps) {
        maxWeight = userWeight;
      } else {
        maxWeight = findMaxWeightForReps(r, oneRM, bodyWeight, exercise);
      }
      
      repEquivalences.push({ 
        reps: r, 
        maxWeight: Math.round(maxWeight * 10) / 10 
      });
    }

    return { weightEquivalences: [], repEquivalences }; // Eliminamos weightEquivalences
  };

  const calculate1RM = () => {
    setError('');
    const aw = parseFloat(addedWeight) || 0;
    const bw = parseFloat(bodyWeight) || 0;
    const r = parseInt(reps) || 0;

    // Validaciones generales
    if (bw < 45) {
      setError('El peso corporal debe ser mínimo 45kg');
      return;
    }
    if (aw < 0) {
      setError('El peso adicional no puede ser negativo');
      return;
    }
    if (r <= 0 || r > 20) {
      setError('Las repeticiones deben estar entre 1 y 20. Demasiadas repeticiones para poder calcular de forma precisa.');
      return;
    }

    // Validaciones específicas por ejercicio
    const maxWeights = {
      'muscle-ups': 60,
      'pull-ups': 130,
      'dips': 200
    };

    const maxWeight = maxWeights[exercise as keyof typeof maxWeights];
    if (aw > maxWeight) {
      const exerciseNames = {
        'muscle-ups': 'Muscle-ups',
        'pull-ups': 'Dominadas', 
        'dips': 'Fondos'
      };
      setError(`El peso adicional máximo para ${exerciseNames[exercise as keyof typeof exerciseNames]} es ${maxWeight}kg`);
      return;
    }

    // Calcular 1RM según ejercicio usando las fórmulas
    let calculatedOneRM;
    if (exercise === 'muscle-ups') {
      calculatedOneRM = calculateMuscleUp1RM(aw, bw, r);
    } else {
      calculatedOneRM = calculateDipsOrPullUps1RM(aw, bw, r);
    }

    // Generar tabla de equivalencias basada en el 1RM calculado
    const { repEquivalences } = calculateEquivalences(exercise, calculatedOneRM, bw, r, aw);
    
    // USAR EL 1RM DE LA TABLA (para 1 rep) como resultado principal para consistencia
    const oneRMFromTable = repEquivalences.find(item => item.reps === 1)?.maxWeight || calculatedOneRM;
    
    const selectedExercise = exercises.find(ex => ex.value === exercise);

    setResult({
      exercise: selectedExercise?.label || exercise,
      addedWeight: aw,
      bodyWeight: bw,
      reps: r,
      oneRM: Math.round(oneRMFromTable * 10) / 10,
      repEquivalences
    });
  };

  const reset = () => {
    setAddedWeight('');
    setBodyWeight('');
    setReps('');
    setResult(null);
    setError('');
  };

  return (
    <Layout maxWidth="xl">
      <Paper sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <CalculateIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4">
            Calculadora de 1RM Streetlifting
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" paragraph>
          Calcula tu máximo (1RM) con fórmulas específicas para streetlifting. 
          Incluye peso corporal para cálculos precisos y tablas de equivalencias.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Ejercicio</InputLabel>
              <Select
                value={exercise}
                label="Ejercicio"
                onChange={handleExerciseChange}
              >
                {exercises.map(ex => (
                  <MenuItem key={ex.value} value={ex.value}>
                    {ex.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              margin="normal"
              label="Peso corporal (kg)"
              type="number"
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
              helperText="Mínimo 45kg requerido"
              inputProps={{ min: 45, step: 0.1 }}
            />

            <TextField
              fullWidth
              margin="normal"
              label="Peso adicional (kg)"
              type="number"
              value={addedWeight}
              onChange={(e) => setAddedWeight(e.target.value)}
              helperText={`Peso añadido (máx: ${exercise === 'muscle-ups' ? '60kg' : exercise === 'pull-ups' ? '130kg' : '200kg'})`}
              inputProps={{ 
                min: 0, 
                max: exercise === 'muscle-ups' ? 60 : exercise === 'pull-ups' ? 130 : 200,
                step: 0.5 
              }}
            />

            <TextField
              fullWidth
              margin="normal"
              label="Repeticiones realizadas"
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              helperText="Entre 1 y 20 repeticiones"
              inputProps={{ min: 1, max: 20 }}
            />

            <Box mt={3} display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={calculate1RM}
                disabled={!bodyWeight || !reps}
                fullWidth
              >
                Calcular 1RM
              </Button>
              <Button
                variant="outlined"
                onClick={reset}
                fullWidth
              >
                Limpiar
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            {result && (
              <Box>
                {/* Resultado principal */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Box
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        p: 2,
                        borderRadius: 1,
                        textAlign: 'center'
                      }}
                    >
                      <Typography variant="h3" gutterBottom>
                      Resultados para {result.exercise}
                      </Typography>
                      <Typography variant="h5">
                        1RM Estimado (peso adicional)
                      </Typography>
                      <Typography variant="h3">
                        {result.oneRM} kg
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                {/* Tabla de equivalencias */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Tabla de Equivalencias - Reps → Peso Máximo
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Peso máximo que podrías levantar para cada número de repeticiones
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Repeticiones</strong></TableCell>
                            <TableCell><strong>Peso Máx (kg)</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {result.repEquivalences.map((row, index) => (
                            <TableRow key={index} sx={{ 
                              bgcolor: row.reps === result.reps ? 'action.selected' : 'transparent' 
                            }}>
                              <TableCell>{row.reps}</TableCell>
                              <TableCell>
                                <strong>{row.maxWeight}</strong>
                                {row.reps === result.reps && ' ✓'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>

                {/* Gráfica de línea con recharts */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      📈 Gráfica de Equivalencias - Repeticiones vs Peso
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Curva decreciente: A más repeticiones, menos peso máximo
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={result.repEquivalences}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="reps" 
                          label={{ value: 'Repeticiones', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value: any) => [`${value} kg`, 'Peso máximo']}
                          labelFormatter={(reps: any) => `${reps} repeticiones`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="maxWeight" 
                          stroke="#1976d2" 
                          strokeWidth={3}
                          name="Peso máximo"
                          dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#1976d2', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Grid>
        </Grid>

        {/* Fórmulas al final */}
        <Card sx={{ mt: 4, bgcolor: 'background.default' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📐 Fórmulas utilizadas
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="primary">
                  Muscle-ups:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  0.5 × (-(peso² - 294×peso - 24×bw×((reps^1.5)-1)^0.5 + 21600)^0.5 + peso + 147)
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="primary">
                  Dominadas:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  ((peso_adicional + bw) × (1 + 0.0333×reps + 36/(37-reps) + reps^0.1) / 3) - bw
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="primary">
                  Fondos:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  ((peso_adicional + bw) × (1 + 0.0333×reps + 36/(37-reps) + reps^0.1) / 3) - bw
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Paper>
    </Layout>
  );
};

export default Calculator;