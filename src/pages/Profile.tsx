import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const Profile: React.FC = () => {
  return (
    <Container>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Mi Perfil
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestiona tu información personal y preferencias de entrenamiento.
        </Typography>
      </Paper>
    </Container>
  );
};

export default Profile;
