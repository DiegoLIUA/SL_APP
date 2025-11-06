import React, { useState } from 'react';
import {
  Container,
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
  Divider,
  Alert
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';

interface CalculationResult {
  exercise: string;
  addedWeight: number;
  bodyWeight: number;
  reps: number;
  oneRM: number;
  weightEquivalences: { weight: number; maxReps: number }[];
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
    const peso = addedWeight + bodyWeight;
    const bw = bodyWeight;
    
    // Fórmula: 0.5 x ( - ( peso ^ 2 - 294 x peso - 24 x bw x ((reps ^ 1.5) - 1) ^ 0.5 + 21600 ) ^ 0.5 + peso + 147 )
    const inner = Math.pow(peso, 2) - 294 * peso - 24 * bw * Math.pow((Math.pow(reps, 1.5) - 1), 0.5) + 21600;
    const oneRM = 0.5 * (-(Math.pow(inner, 0.5)) + peso + 147);
    
    return Math.max(oneRM - bw, 0); // Retorna solo el peso añadido
  };

  const calculateDipsOrPullUps1RM = (addedWeight: number, bodyWeight: number, reps: number): number => {
    const peso = addedWeight;
    const bw = bodyWeight;
    
    // Fórmula: ((peso+ bw) × (1 + (0.0333 × reps) + (36 / (37 - reps)) + reps ^ 0.1) / 3) - bw
    const totalWeight = peso + bw;
    const factor1 = 1 + (0.0333 * reps);
    const factor2 = 36 / (37 - reps);
    const factor3 = Math.pow(reps, 0.1);
    
    const oneRM = (totalWeight * (factor1 + factor2 + factor3) / 3) - bw;
    
    return Math.max(oneRM, 0); // Retorna solo el peso añadido
  };

  // Función para calcular reps máximas dado un peso
  const calculateMaxReps = (targetWeight: number, bodyWeight: number, oneRM: number, exerciseType: string): number => {
    // Función inversa aproximada usando bisección
    for (let testReps = 1; testReps <= 20; testReps++) {
      let calculated1RM;
      
      if (exerciseType === 'muscle-ups') {
        calculated1RM = calculateMuscleUp1RM(targetWeight, bodyWeight, testReps);
      } else {
        calculated1RM = calculateDipsOrPullUps1RM(targetWeight, bodyWeight, testReps);
      }
      
      if (calculated1RM <= oneRM) {
        return testReps;
      }
    }
    return 20; // Máximo
  };

  const calculate1RM = () => {
    const w = parseFloat(addedWeight) || 0;
    const bw = parseFloat(bodyWeight) || 0;
    const r = parseInt(reps) || 0;

    // Validaciones
    if (bw < 45) {
      setError('El peso corporal debe ser mínimo 45kg');
      return;
    }

    if (r <= 0 || r > 20) {
      setError('Las repeticiones deben estar entre 1 y 20. Demasiadas repeticiones para poder calcular de forma precisa.');
      return;
    }

    setError('');

    let oneRM: number;
    
    // Calcular 1RM según el ejercicio
    if (exercise === 'muscle-ups') {
      oneRM = calculateMuscleUp1RM(w, bw, r);
    } else {
      oneRM = calculateDipsOrPullUps1RM(w, bw, r);
    }

    // Generar tabla de equivalencias de peso (cuántas reps con diferentes pesos)
    const weightStep = exercise === 'muscle-ups' ? 2.5 : 5;
    const weightEquivalences = [];
    
    for (let testWeight = oneRM; testWeight >= 0; testWeight -= weightStep) {
      if (testWeight < 0) break;
      const maxReps = calculateMaxReps(testWeight, bw, oneRM, exercise);
      if (maxReps <= 20) {
        weightEquivalences.push({
          weight: Math.round(testWeight * 10) / 10,
          maxReps
        });
      }
    }

    // Generar tabla de equivalencias de repeticiones (cuánto peso con diferentes reps)
    const repEquivalences = [];
    for (let testReps = 1; testReps <= 15; testReps++) {
      let maxWeight;
      
      if (exercise === 'muscle-ups') {
        // Para muscle-ups, calculamos inversamente
        maxWeight = oneRM - (oneRM * (testReps - 1) * 0.05); // Aproximación
      } else {
        // Para fondos/dominadas, usamos la fórmula inversa
        const factor1 = 1 + (0.0333 * testReps);
        const factor2 = 36 / (37 - testReps);
        const factor3 = Math.pow(testReps, 0.1);
        maxWeight = ((oneRM + bw) * 3) / (factor1 + factor2 + factor3) - bw;
      }
      
      if (maxWeight >= 0) {
        repEquivalences.push({
          reps: testReps,
          maxWeight: Math.round(Math.max(maxWeight, 0) * 10) / 10
        });
      }
    }

    const selectedExercise = exercises.find(ex => ex.value === exercise);

    setResult({
      exercise: selectedExercise?.label || exercise,
      addedWeight: w,
      bodyWeight: bw,
      reps: r,
      oneRM: Math.round(oneRM * 10) / 10,
      weightEquivalences: weightEquivalences.slice(0, 10), // Limitar a 10 entradas
      repEquivalences: repEquivalences.slice(0, 10)
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
    <Container maxWidth="md">
      <Paper sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <CalculateIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4">
            Calculadora de 1RM
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" paragraph>
          Calcula tu máximo (1RM) basándote en las repeticiones realizadas con un peso específico.
          Utiliza fórmulas específicas y precisas para cada ejercicio de streetlifting.
        </Typography>

        {error && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="error" sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 1 }}>
              ⚠️ {error}
            </Typography>
          </Box>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
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
              label="Tu peso corporal (kg)"
              type="number"
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
              helperText="Mínimo 45kg - Necesario para cálculos precisos"
              required
            />

            <TextField
              fullWidth
              margin="normal"
              label="Peso adicional (kg)"
              type="number"
              value={addedWeight}
              onChange={(e) => setAddedWeight(e.target.value)}
              helperText="Solo el peso añadido (cinturón, mancuernas, etc.)"
            />

            <TextField
              fullWidth
              margin="normal"
              label="Repeticiones realizadas"
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              helperText="Entre 1 y 20 repeticiones máximo"
              required
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

          <Grid item xs={12} md={6}>
            {result && (
              <Box>
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Resultados para {result.exercise}
                    </Typography>
                    
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        Peso corporal: {result.bodyWeight}kg | Peso añadido: {result.addedWeight}kg | {result.reps} repeticiones
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        p: 2,
                        borderRadius: 1,
                        textAlign: 'center',
                        mb: 2
                      }}
                    >
                      <Typography variant="h6">
                        1RM Estimado (peso añadido)
                      </Typography>
                      <Typography variant="h3">
                        {result.oneRM} kg
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                <Grid container spacing={2}>
                  {/* Tabla de equivalencias por peso */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Repeticiones Máximas por Peso
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          ¿Cuántas reps puedes hacer con X peso?
                        </Typography>
                        
                        {result.weightEquivalences.map(({ weight, maxReps }, index) => (
                          <Box
                            key={index}
                            display="flex"
                            justifyContent="space-between"
                            py={0.5}
                            borderBottom="1px solid #eee"
                          >
                            <Typography variant="body2">
                              {weight} kg
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {maxReps} reps
                            </Typography>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Tabla de equivalencias por repeticiones */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Peso Máximo por Repeticiones
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          ¿Cuánto peso puedes usar para X reps?
                        </Typography>
                        
                        {result.repEquivalences.map(({ reps, maxWeight }, index) => (
                          <Box
                            key={index}
                            display="flex"
                            justifyContent="space-between"
                            py={0.5}
                            borderBottom="1px solid #eee"
                          >
                            <Typography variant="body2">
                              {reps} reps
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {maxWeight} kg
                            </Typography>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Calculator;
