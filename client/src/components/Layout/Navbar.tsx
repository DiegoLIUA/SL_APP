import React, { useContext, useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Box,
  Divider
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import {
  FitnessCenter,
  AccountCircle,
  Menu as MenuIcon,
  Dashboard,
  PlaylistAdd,
  AutoAwesome,
  TrendingUp,
  LibraryBooks,
  Calculate,
  VideoLibrary,
  Person,
  ExitToApp,
  CalendarToday as Calendar,
  Assignment,
  EmojiEvents as Trophy
} from '@mui/icons-material';
import { AuthContext } from '../../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileDrawer = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Nuevo Entrenamiento', icon: <PlaylistAdd />, path: '/workouts' },
    { text: 'Generar Entrenamiento', icon: <AutoAwesome />, path: '/workout-generator' },
    { text: 'Planificación', icon: <Calendar />, path: '/planning' },
    { text: 'Biblioteca de Entrenamientos', icon: <Assignment />, path: '/workout-library' },
    { text: 'Mis PRs', icon: <Trophy />, path: '/personal-records' },
    { text: 'Ver Progreso', icon: <TrendingUp />, path: '/progress' },
    { text: 'Ejercicios', icon: <LibraryBooks />, path: '/exercises' },
    { text: 'Calculadora 1RM', icon: <Calculate />, path: '/calculator' },
    { text: 'Video Análisis', icon: <VideoLibrary />, path: '/video-analysis' }
  ];

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          {/* Logo siempre visible */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="home"
            sx={{ mr: 2 }}
            component={Link}
            to="/dashboard"
          >
            <FitnessCenter />
          </IconButton>
          
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Streetlifting AI
          </Typography>

          {/* Navegación Desktop */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {menuItems.map((item) => (
                <Button 
                  key={item.path}
                  color="inherit" 
                  component={Link} 
                  to={item.path}
                  size="small"
                >
                  {item.text}
                </Button>
              ))}
            </Box>
          )}

          {/* Menú de Usuario */}
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>

          {/* Menú Hamburguesa (Mobile) */}
          {isMobile && (
            <IconButton
              size="large"
              edge="end"
              color="inherit"
              aria-label="menu"
              onClick={toggleMobileDrawer}
              sx={{ ml: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Menú de Usuario Dropdown */}
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem disabled>
          {user?.name} ({user?.role === 'trainer' ? 'Entrenador' : 'Atleta'})
        </MenuItem>
        <MenuItem component={Link} to="/profile" onClick={handleClose}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          Mi Perfil
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <ExitToApp fontSize="small" />
          </ListItemIcon>
          Cerrar Sesión
        </MenuItem>
      </Menu>

      {/* Drawer Mobile */}
      <Drawer
        anchor="right"
        open={mobileDrawerOpen}
        onClose={toggleMobileDrawer}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ pt: 8 }}> {/* Padding para no solapar con AppBar */}
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  onClick={toggleMobileDrawer}
                >
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          
          <Divider />
          
          <List>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/profile"
                onClick={toggleMobileDrawer}
              >
                <ListItemIcon>
                  <Person />
                </ListItemIcon>
                <ListItemText primary="Mi Perfil" />
              </ListItemButton>
            </ListItem>
            
            <ListItem disablePadding>
              <ListItemButton onClick={() => {
                toggleMobileDrawer();
                handleLogout();
              }}>
                <ListItemIcon>
                  <ExitToApp />
                </ListItemIcon>
                <ListItemText primary="Cerrar Sesión" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Navbar; 