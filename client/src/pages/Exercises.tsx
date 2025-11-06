import React, { useState, useEffect } from 'react';
import {
  Typography,
  Container,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Alert,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Label as LabelIcon,
  FitnessCenter as FitnessCenterIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  ContentCopy as DuplicateIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import Layout from '../components/Layout/Layout';
import axios from 'axios';

interface Exercise {
  id: number;
  name: string;
  category: string;
  muscle_groups: string;
  equipment: string;
  difficulty: string;
  description: string;
  video_url: string;
  user_id: number | null;
  tags: { [category: string]: Tag[] };
}

interface Tag {
  id: number;
  value: string;
}

interface TagsByCategory {
  [category: string]: Tag[];
}

const Exercises: React.FC = () => {
  const token = localStorage.getItem('token');

  // State management
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [availableTags, setAvailableTags] = useState<TagsByCategory>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [newExerciseOpen, setNewExerciseOpen] = useState(false);
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [editExerciseOpen, setEditExerciseOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // New exercise form
  const [newExercise, setNewExercise] = useState({
    name: '',
    category: '',
    description: '',
    video_url: ''
  });

  // New exercise tags
  const [newExerciseTags, setNewExerciseTags] = useState<{ [category: string]: number[] }>({});

  // Edit exercise form
  const [editExercise, setEditExercise] = useState({
    id: 0,
    name: '',
    category: '',
    description: '',
    video_url: ''
  });

  // Edit exercise tags
  const [editExerciseTags, setEditExerciseTags] = useState<{ [category: string]: number[] }>({});

  // Predefined categories
  const exerciseCategories = [
    'Dominadas', 'Pull-ups', 'Fondos', 'Dips', 'Muscle-ups', 
    'Flexiones', 'Push-ups', 'Isométricos', 'Core', 'Cardio'
  ];

  // Tag editor state
  const [selectedTags, setSelectedTags] = useState<{ [category: string]: number[] }>({});

  useEffect(() => {
    fetchExercises();
    fetchAvailableTags();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/exercises', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // For each exercise, fetch its tags
      const exercisesWithTags = await Promise.all(
        response.data.map(async (exercise: any) => {
          try {
            const tagsResponse = await axios.get(`/api/tags/exercise/${exercise.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            return {
              ...exercise,
              tags: tagsResponse.data
            };
          } catch (err) {
            return {
              ...exercise,
              tags: {}
            };
          }
        })
      );

      setExercises(exercisesWithTags);
    } catch (err: any) {
      setError('Error al cargar ejercicios');
      console.error('Error fetching exercises:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTags = async () => {
    try {
      const response = await axios.get('/api/tags', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableTags(response.data);
    } catch (err: any) {
      console.error('Error fetching tags:', err);
    }
  };

  const handleCreateExercise = async () => {
    // Validate required fields
    if (!newExercise.name.trim() || !newExercise.category.trim()) {
      setError('Nombre y categoría son obligatorios');
      return;
    }

    // Validate required tags (at least one from each category)
    const requiredCategories = ['muscle_group', 'training_type', 'modality', 'difficulty', 'equipment'];
    for (const category of requiredCategories) {
      if (!newExerciseTags[category] || newExerciseTags[category].length === 0) {
        setError(`Debes seleccionar al menos un ${getCategoryLabel(category).toLowerCase()}`);
        return;
      }
    }

    // Check single selection categories
    if (newExerciseTags['modality'] && newExerciseTags['modality'].length > 1) {
      setError('Solo puedes seleccionar una modalidad');
      return;
    }
    if (newExerciseTags['difficulty'] && newExerciseTags['difficulty'].length > 1) {
      setError('Solo puedes seleccionar una dificultad');
      return;
    }

    try {
      setLoading(true);
      
      // Build muscle_groups from selected muscle_group tags
      const muscleGroupTags = newExerciseTags['muscle_group'] || [];
      const muscleGroups = muscleGroupTags.map(tagId => {
        const tag = availableTags['muscle_group']?.find(t => t.id === tagId);
        return tag?.value;
      }).filter(Boolean).join(', ');

      // Build equipment from selected equipment tags  
      const equipmentTags = newExerciseTags['equipment'] || [];
      const equipment = equipmentTags.map(tagId => {
        const tag = availableTags['equipment']?.find(t => t.id === tagId);
        return tag?.value;
      }).filter(Boolean).join(', ');

      // Get difficulty from selected difficulty tag
      const difficultyTags = newExerciseTags['difficulty'] || [];
      const difficulty = difficultyTags.length > 0 ? 
        availableTags['difficulty']?.find(t => t.id === difficultyTags[0])?.value || '' : '';

      // Create exercise with constructed fields
      const exerciseData = {
        ...newExercise,
        muscle_groups: muscleGroups,
        equipment: equipment,
        difficulty: difficulty
      };

      const exerciseResponse = await axios.post('/api/exercises', exerciseData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const exerciseId = exerciseResponse.data.id;

      // Assign tags to the new exercise
      const allTagIds: number[] = [];
      Object.values(newExerciseTags).forEach(categoryTags => {
        allTagIds.push(...categoryTags);
      });

      if (allTagIds.length > 0) {
        await axios.post(`/api/tags/exercise/${exerciseId}`, {
          tagIds: allTagIds
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setSuccess('Ejercicio creado exitosamente');
      setNewExerciseOpen(false);
      setNewExercise({ name: '', category: '', description: '', video_url: '' });
      setNewExerciseTags({});
      fetchExercises();
    } catch (err: any) {
      setError('Error al crear ejercicio');
      console.error('Error creating exercise:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTagEditor = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    
    // Initialize selected tags based on current exercise tags
    const currentSelectedTags: { [category: string]: number[] } = {};
    Object.keys(availableTags).forEach(category => {
      currentSelectedTags[category] = [];
      
      if (exercise.tags[category]) {
        exercise.tags[category].forEach(tagObj => {
          const tag = availableTags[category]?.find(t => t.id === tagObj.id);
          if (tag) {
            currentSelectedTags[category].push(tag.id);
          }
        });
      }
    });
    
    setSelectedTags(currentSelectedTags);
    setTagEditorOpen(true);
  };

  const handleSaveTags = async () => {
    if (!selectedExercise) return;

    try {
      setLoading(true);
      
      // Flatten all selected tag IDs
      const allTagIds: number[] = [];
      Object.values(selectedTags).forEach(categoryTags => {
        allTagIds.push(...categoryTags);
      });

      await axios.post(`/api/tags/exercise/${selectedExercise.id}`, {
        tagIds: allTagIds
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Etiquetas actualizadas exitosamente');
      setTagEditorOpen(false);
      fetchExercises();
    } catch (err: any) {
      setError('Error al actualizar etiquetas');
      console.error('Error updating tags:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTagChange = (category: string, tagId: number, selected: boolean) => {
    setSelectedTags(prev => ({
      ...prev,
      [category]: selected 
        ? [...(prev[category] || []), tagId]
        : (prev[category] || []).filter(id => id !== tagId)
    }));
  };

  const handleNewExerciseTagChange = (category: string, tagId: number, selected: boolean) => {
    setNewExerciseTags(prev => {
      const currentTags = prev[category] || [];
      
      // For single selection categories, replace the selection
      if (category === 'modality' || category === 'difficulty') {
        return {
          ...prev,
          [category]: selected ? [tagId] : []
        };
      }
      
      // For multiple selection categories, add/remove
      return {
        ...prev,
        [category]: selected 
          ? [...currentTags, tagId]
          : currentTags.filter(id => id !== tagId)
      };
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: any } = {
      muscle_group: 'primary',
      training_type: 'secondary',
      modality: 'success',
      difficulty: 'warning',
      equipment: 'info'
    };
    return colors[category] || 'default';
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      muscle_group: 'Músculo',
      training_type: 'Tipo',
      modality: 'Modalidad',
      difficulty: 'Dificultad',
      equipment: 'Equipo'
    };
    return labels[category] || category;
  };

  // Exercise edit functions
  const handleOpenExerciseEditor = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setEditExercise({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      description: exercise.description,
      video_url: exercise.video_url
    });

    // Convert current tags to the expected format
    const tagsByCategory: { [category: string]: number[] } = {};
    Object.keys(exercise.tags).forEach(category => {
      tagsByCategory[category] = exercise.tags[category].map(tag => tag.id);
    });
    setEditExerciseTags(tagsByCategory);
    setEditExerciseOpen(true);
  };

  const handleEditExerciseTagChange = (category: string, tagId: number, selected: boolean) => {
    setEditExerciseTags(prev => {
      const currentTags = prev[category] || [];
      
      // For single selection categories, replace the selection
      if (category === 'modality' || category === 'difficulty') {
        return {
          ...prev,
          [category]: selected ? [tagId] : []
        };
      }
      
      // For multiple selection categories, add/remove
      return {
        ...prev,
        [category]: selected 
          ? [...currentTags, tagId]
          : currentTags.filter(id => id !== tagId)
      };
    });
  };

  const handleUpdateExercise = async () => {
    if (!selectedExercise || !editExercise.name.trim() || !editExercise.category) {
      setError('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      setLoading(true);

      // Update exercise basic info
      const response = await axios.put(`/api/exercises/${selectedExercise.id}`, {
        name: editExercise.name.trim(),
        category: editExercise.category,
        description: editExercise.description,
        video_url: editExercise.video_url
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update tags (use the appropriate exercise ID - could be new if personalized)
      const targetExerciseId = response.data.isPersonalized ? response.data.id : selectedExercise.id;
      
      const allTagIds: number[] = [];
      Object.values(editExerciseTags).forEach(tagArray => {
        allTagIds.push(...tagArray);
      });

      await axios.post(`/api/tags/exercise/${targetExerciseId}`, {
        tagIds: allTagIds
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Check if a personalized copy was created
      if (response.data.isPersonalized) {
        setSuccess(`Copia personalizada creada exitosamente: "${response.data.name}"`);
      } else {
        setSuccess('Ejercicio actualizado exitosamente');
      }
      
      setEditExerciseOpen(false);
      setSelectedExercise(null);
      fetchExercises();
    } catch (err: any) {
      setError('Error al actualizar ejercicio: ' + (err.response?.data?.error || err.message));
      console.error('Error updating exercise:', err);
    } finally {
      setLoading(false);
    }
  };

  // Duplicate exercise function
  const handleDuplicateExercise = async (exercise: Exercise) => {
    try {
      setLoading(true);

      // Create a new exercise based on the selected one
      const duplicatedExercise = {
        name: `${exercise.name} (Copia)`,
        category: exercise.category,
        description: exercise.description,
        video_url: exercise.video_url
      };

      const response = await axios.post('/api/exercises', duplicatedExercise, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Copy tags from original exercise
      const allTagIds: number[] = [];
      Object.values(exercise.tags).forEach(tagArray => {
        allTagIds.push(...tagArray.map(tag => tag.id));
      });

      if (allTagIds.length > 0) {
        await axios.post(`/api/tags/exercise/${response.data.id}`, {
          tagIds: allTagIds
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setSuccess(`Ejercicio "${duplicatedExercise.name}" duplicado exitosamente`);
      fetchExercises();
    } catch (err: any) {
      setError('Error al duplicar ejercicio: ' + (err.response?.data?.error || err.message));
      console.error('Error duplicating exercise:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete exercise function
  const handleDeleteExercise = async () => {
    if (!selectedExercise) return;

    // Only allow deleting user's own exercises
    if (!selectedExercise.user_id) {
      setError('No se pueden eliminar ejercicios públicos');
      setDeleteDialogOpen(false);
      return;
    }

    try {
      setLoading(true);

      await axios.delete(`/api/exercises/${selectedExercise.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(`Ejercicio "${selectedExercise.name}" eliminado exitosamente`);
      setDeleteDialogOpen(false);
      setSelectedExercise(null);
      fetchExercises();
    } catch (err: any) {
      setError('Error al eliminar ejercicio: ' + (err.response?.data?.error || err.message));
      console.error('Error deleting exercise:', err);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setDeleteDialogOpen(true);
  };

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            <FitnessCenterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Biblioteca de Ejercicios
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNewExerciseOpen(true)}
          >
            Nuevo Ejercicio
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Grid container spacing={3}>
          {exercises.map((exercise) => (
            <Grid item xs={12} md={6} lg={4} key={exercise.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 0, flex: 1 }}>
                      {exercise.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={exercise.user_id ? 'Personalizado' : 'Público'}
                      color={exercise.user_id ? 'primary' : 'default'}
                      variant={exercise.user_id ? 'filled' : 'outlined'}
                      sx={{ ml: 1, fontSize: '0.7rem' }}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {exercise.description || 'Sin descripción'}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {/* Display current tags */}
                  <Box mb={2}>
                    {Object.keys(exercise.tags).map(category => (
                      exercise.tags[category].length > 0 && (
                        <Box key={category} mb={1}>
                          <Typography variant="caption" color="text.secondary">
                            {getCategoryLabel(category)}:
                          </Typography>
                          <Box mt={0.5}>
                            {exercise.tags[category].map(tag => (
                              <Chip
                                key={tag.id}
                                label={tag.value}
                                size="small"
                                color={getCategoryColor(category)}
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )
                    ))}
                    
                    {Object.keys(exercise.tags).length === 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Sin etiquetas asignadas
                      </Typography>
                    )}
                  </Box>

                  <Box display="flex" gap={1} mt={2} flexWrap="wrap">
                    <Button
                      variant="contained"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenExerciseEditor(exercise)}
                      sx={{ flex: 1, minWidth: '100px' }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<LabelIcon />}
                      onClick={() => handleOpenTagEditor(exercise)}
                      sx={{ minWidth: '90px' }}
                    >
                      Tags
                    </Button>
                    <Button
                      variant="outlined"
                      color="info"
                      startIcon={<DuplicateIcon />}
                      onClick={() => handleDuplicateExercise(exercise)}
                      sx={{ minWidth: '50px' }}
                      title="Duplicar ejercicio"
                    >
                      Duplicar
                    </Button>
                    {exercise.user_id && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => openDeleteDialog(exercise)}
                        sx={{ minWidth: '50px' }}
                        title="Eliminar ejercicio"
                      >
                        Eliminar
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {exercises.length === 0 && !loading && (
          <Paper sx={{ p: 4, textAlign: 'center', mt: 4 }}>
            <FitnessCenterIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No hay ejercicios disponibles
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Crea tu primer ejercicio para comenzar a entrenar
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setNewExerciseOpen(true)}
            >
              Crear Primer Ejercicio
            </Button>
          </Paper>
        )}

        {/* New Exercise Dialog */}
        <Dialog open={newExerciseOpen} onClose={() => setNewExerciseOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Crear Nuevo Ejercicio</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nombre del ejercicio"
              fullWidth
              variant="outlined"
              value={newExercise.name}
              onChange={(e) => setNewExercise(prev => ({ ...prev, name: e.target.value }))}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
              <InputLabel>Categoría *</InputLabel>
              <Select
                value={newExercise.category}
                onChange={(e) => setNewExercise(prev => ({ ...prev, category: e.target.value }))}
                label="Categoría *"
              >
                {exerciseCategories.map(cat => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              margin="dense"
              label="Descripción"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={newExercise.description}
              onChange={(e) => setNewExercise(prev => ({ ...prev, description: e.target.value }))}
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="dense"
              label="URL del video (opcional)"
              fullWidth
              variant="outlined"
              value={newExercise.video_url}
              onChange={(e) => setNewExercise(prev => ({ ...prev, video_url: e.target.value }))}
              placeholder="https://youtube.com/watch?v=..."
              sx={{ mb: 3 }}
            />

            {/* Tags Selection */}
            <Typography variant="h6" gutterBottom>
              Etiquetas del Ejercicio *
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Debes seleccionar al menos una etiqueta de cada categoría
            </Typography>
            
            {!availableTags || Object.keys(availableTags).length === 0 ? (
              <Box p={2} textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  Cargando etiquetas...
                </Typography>
              </Box>
            ) : (
              Object.keys(availableTags).map(category => {
              const isRequired = ['muscle_group', 'training_type', 'modality', 'difficulty', 'equipment'].includes(category);
              const isSingleSelection = category === 'modality' || category === 'difficulty';
              const selectedCount = newExerciseTags[category]?.length || 0;
              
              return (
                <Accordion key={category} defaultExpanded={isRequired}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">
                      {getCategoryLabel(category)}
                      {isRequired && ' *'}
                      {isSingleSelection && ' (único)'}
                      {selectedCount > 0 && (
                        <Chip 
                          label={selectedCount} 
                          size="small" 
                          color={getCategoryColor(category)}
                          sx={{ ml: 1 }} 
                        />
                      )}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {availableTags[category]?.map(tag => {
                        const isSelected = newExerciseTags[category]?.includes(tag.id) || false;
                        return (
                          <Chip
                            key={tag.id}
                            label={tag.value}
                            clickable
                            size="small"
                            color={isSelected ? getCategoryColor(category) : 'default'}
                            variant={isSelected ? 'filled' : 'outlined'}
                            onClick={() => handleNewExerciseTagChange(
                              category, 
                              tag.id, 
                              !isSelected
                            )}
                          />
                        );
                      }) || []}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setNewExerciseOpen(false);
              setNewExercise({ name: '', category: '', description: '', video_url: '' });
              setNewExerciseTags({});
            }}>Cancelar</Button>
            <Button onClick={handleCreateExercise} variant="contained" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Ejercicio'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Tag Editor Dialog */}
        <Dialog open={tagEditorOpen} onClose={() => setTagEditorOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Editar Etiquetas: {selectedExercise?.name}
          </DialogTitle>
          <DialogContent>
            {Object.keys(availableTags).map(category => (
              <Box key={category} mb={3}>
                <Typography variant="subtitle1" gutterBottom>
                  {getCategoryLabel(category)}
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {availableTags[category]?.map(tag => (
                    <Chip
                      key={tag.id}
                      label={tag.value}
                      clickable
                      color={selectedTags[category]?.includes(tag.id) ? getCategoryColor(category) : 'default'}
                      variant={selectedTags[category]?.includes(tag.id) ? 'filled' : 'outlined'}
                      onClick={() => handleTagChange(
                        category, 
                        tag.id, 
                        !selectedTags[category]?.includes(tag.id)
                      )}
                    />
                  )) || []}
                </Box>
              </Box>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTagEditorOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTags} variant="contained" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Etiquetas'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Exercise Dialog */}
        <Dialog open={editExerciseOpen} onClose={() => setEditExerciseOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              ✏️ Editar Ejercicio
              <Button
                onClick={() => setEditExerciseOpen(false)}
                sx={{ minWidth: 'auto', p: 1 }}
              >
                <CloseIcon />
              </Button>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedExercise && !selectedExercise.user_id && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  📋 <strong>Ejercicio Público:</strong> Al editar este ejercicio se creará una copia personalizada para ti, 
                  manteniendo el ejercicio original intacto.
                </Typography>
              </Alert>
            )}
            
            <Box sx={{ mt: 2 }}>
              {/* Basic Info Section */}
              <Typography variant="h6" gutterBottom>
                📝 Información Básica
              </Typography>
              
              <TextField
                autoFocus
                fullWidth
                label="Nombre del ejercicio"
                value={editExercise.name}
                onChange={(e) => setEditExercise(prev => ({ ...prev, name: e.target.value }))}
                sx={{ mb: 2 }}
                required
              />
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Categoría *</InputLabel>
                <Select
                  value={editExercise.category}
                  onChange={(e) => setEditExercise(prev => ({ ...prev, category: e.target.value }))}
                  label="Categoría *"
                >
                  {exerciseCategories.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Descripción"
                multiline
                rows={3}
                value={editExercise.description}
                onChange={(e) => setEditExercise(prev => ({ ...prev, description: e.target.value }))}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="URL del video (opcional)"
                value={editExercise.video_url}
                onChange={(e) => setEditExercise(prev => ({ ...prev, video_url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
                sx={{ mb: 3 }}
              />

              <Divider sx={{ my: 3 }} />

              {/* Tags Section */}
              <Typography variant="h6" gutterBottom>
                🏷️ Etiquetas del Ejercicio
              </Typography>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Selecciona las etiquetas que mejor describan este ejercicio
              </Typography>
              
              {!availableTags || Object.keys(availableTags).length === 0 ? (
                <Box p={2} textAlign="center">
                  <Typography variant="body2" color="text.secondary">
                    Cargando etiquetas...
                  </Typography>
                </Box>
              ) : (
                Object.keys(availableTags).map(category => (
                  <Accordion key={category} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">
                        {getCategoryLabel(category)} ({(editExerciseTags[category] || []).length} seleccionadas)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {availableTags[category].map(tag => {
                          const isSelected = (editExerciseTags[category] || []).includes(tag.id);
                          return (
                            <Chip
                              key={tag.id}
                              label={tag.value}
                              color={isSelected ? getCategoryColor(category) : 'default'}
                              variant={isSelected ? 'filled' : 'outlined'}
                              onClick={() => handleEditExerciseTagChange(category, tag.id, !isSelected)}
                              sx={{ cursor: 'pointer' }}
                            />
                          );
                        })}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditExerciseOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateExercise} 
              variant="contained" 
              disabled={loading || !editExercise.name.trim() || !editExercise.category}
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <DeleteIcon color="error" />
              Confirmar Eliminación
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedExercise && (
              <>
                <Typography variant="body1" gutterBottom>
                  ¿Estás seguro de que quieres eliminar el ejercicio?
                </Typography>
                <Typography variant="h6" color="error" gutterBottom>
                  "{selectedExercise.name}"
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Esta acción no se puede deshacer. El ejercicio se eliminará permanentemente 
                  de tu biblioteca personal.
                </Typography>
                {!selectedExercise.user_id && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      ⚠️ Los ejercicios públicos no se pueden eliminar. Solo puedes eliminar 
                      ejercicios que hayas creado o personalizado.
                    </Typography>
                  </Alert>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteExercise}
              disabled={loading || !selectedExercise?.user_id}
            >
              {loading ? 'Eliminando...' : 'Eliminar Ejercicio'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default Exercises;