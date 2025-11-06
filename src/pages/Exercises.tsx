import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const Exercises: React.FC = () => {
  return (
    <Container>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Ejercicios
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Biblioteca de ejercicios de Streetlifting con videos y descripciones.
        </Typography>
      </Paper>
    </Container>
  );
};

export default Exercises;
