import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Alert,
  Button,
  Container,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import { Add as AddIcon, Info as InfoIcon } from '@mui/icons-material';
import GroupCard from '../components/GroupCard';
import { groupsApi, Group } from '../api/groups';
import { useAuth } from '../hooks/useAuth';

export default function Groups() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Fetch groups on component mount
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await groupsApi.getGroups();
      setGroups(response.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      setCreating(true);
      const response = await groupsApi.createGroup({ name: newGroupName.trim() });
      setGroups(prev => [response.group, ...prev]);
      setCreateDialogOpen(false);
      setNewGroupName('');
      setSnackbarMessage('Group created successfully!');
      setSnackbarOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleGroupClick = (groupId: number) => {
    navigate(`/groups/${groupId}`);
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 'calc(100vh - 200px)' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: 'calc(100vh - 200px)', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header Section */}
        <Fade in={true} timeout={600}>
          <Box>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 4,
              flexWrap: 'wrap',
              gap: 2
            }}>
              <Box>
                <Typography 
                  variant="h3" 
                  component="h1"
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'text.primary',
                    mb: 1
                  }}
                >
                  我的群組
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  管理您的聚會群組，規劃完美的聚會地點
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{
                  px: 3,
                  py: 1.5,
                  boxShadow: 2,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                建立新群組
              </Button>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 4,
                  borderRadius: 2,
                }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}
          </Box>
        </Fade>

        {/* Groups Grid */}
        {groups.length > 0 ? (
          <Grid container spacing={3}>
            {groups.map((group, index) => (
              <Grid item xs={12} sm={6} lg={4} key={group.id}>
                <Fade in={true} timeout={800 + index * 200}>
                  <div>
                    <GroupCard
                      id={group.id}
                      name={group.name}
                      memberCount={group._count?.members || group.members.length}
                      createdAt={group.createdAt}
                      onClick={() => handleGroupClick(group.id)}
                    />
                  </div>
                </Fade>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Fade in={true} timeout={800}>
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 12,
                px: 2
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  bgcolor: 'grey.100',
                  mb: 3,
                }}
              >
                <Typography variant="h1" sx={{ fontSize: '4rem' }}>
                  📭
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                還沒有群組
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                建立第一個群組來開始使用 MeetHalf
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{
                  px: 4,
                  py: 1.5,
                }}
              >
                建立新群組
              </Button>
            </Box>
          </Fade>
        )}

        {/* Quick Stats (Optional) */}
        {groups.length > 0 && (
          <Fade in={true} timeout={1200}>
            <Box 
              sx={{ 
                mt: 6, 
                p: 3, 
                bgcolor: 'background.paper',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-around',
                flexWrap: 'wrap',
                gap: 3
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 0.5 }}>
                  {groups.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  群組總數
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main', mb: 0.5 }}>
                  {groups.reduce((sum, g) => sum + (g._count?.members || g.members.length), 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  成員總數
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'warning.main', mb: 0.5 }}>
                  {groups.length > 0 ? Math.max(...groups.map(g => g._count?.members || g.members.length)) : 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  最大群組人數
                </Typography>
              </Box>
            </Box>
          </Fade>
        )}
      </Container>

      {/* Create Group Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>建立新群組</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="群組名稱"
            fullWidth
            variant="outlined"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newGroupName.trim()) {
                handleCreateGroup();
              }
            }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            取消
          </Button>
          <Button 
            onClick={handleCreateGroup}
            variant="contained"
            disabled={!newGroupName.trim() || creating}
            startIcon={creating ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {creating ? '建立中...' : '建立'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
}

