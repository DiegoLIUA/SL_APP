import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const VideoAnalysis: React.FC = () => {
  return (
    <Container>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Análisis de Video
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Analiza tu técnica con IA usando MediaPipe para obtener feedback en tiempo real.
        </Typography>
      </Paper>
    </Container>
  );
};

export default VideoAnalysis;
