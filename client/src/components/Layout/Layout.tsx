import React from 'react';
import { Box, Container } from '@mui/material';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const Layout: React.FC<LayoutProps> = ({ children, maxWidth = 'lg' }) => {
  return (
    <Box>
      <Navbar />
      <Container maxWidth={maxWidth} sx={{ mt: 10, mb: 5 }}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout;
