import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard';
import Calculator from './pages/Calculator';
import Workouts from './pages/Workouts';
import Progress from './pages/Progress';
import Profile from './pages/Profile';
import Exercises from './pages/Exercises';
import WorkoutGenerator from './pages/WorkoutGenerator';
import Planning from './pages/Planning';
import PersonalRecords from './pages/PersonalRecords';
import WorkoutLibrary from './pages/WorkoutLibrary';
import { AuthContext, AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppContent() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/workouts" element={isAuthenticated ? <Workouts /> : <Navigate to="/login" />} />
      <Route path="/workout-generator" element={isAuthenticated ? <WorkoutGenerator /> : <Navigate to="/login" />} />
      <Route path="/progress" element={isAuthenticated ? <Progress /> : <Navigate to="/login" />} />
      <Route path="/exercises" element={isAuthenticated ? <Exercises /> : <Navigate to="/login" />} />
      <Route path="/planning" element={isAuthenticated ? <Planning /> : <Navigate to="/login" />} />
                <Route path="/personal-records" element={isAuthenticated ? <PersonalRecords /> : <Navigate to="/login" />} />
                <Route path="/workout-library" element={isAuthenticated ? <WorkoutLibrary /> : <Navigate to="/login" />} />
      <Route path="/calculator" element={isAuthenticated ? <Calculator /> : <Navigate to="/login" />} />
      <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
    </Routes>
  );
}

export default App;