import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Checkbox,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useFriends } from '../hooks/useFriends';
import api from '../api/axios';

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateGroupDialog({ open, onClose }: CreateGroupDialogProps) {
  const navigate = useNavigate();
  const { friends, loadFriends, loading } = useFriends();
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      loadFriends();
    }
  }, [open, loadFriends]);

  const handleToggleFriend = (userId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedFriends.length === 0) {
      return;
    }

    try {
      setCreating(true);
      // Create group via groups API
      const response = await api.post('/events', {
        name: groupName.trim(),
        groupId: null, // Will be created as a chat group
      });

      const groupId = response.data.event?.groupId;
      
      if (groupId) {
        // Navigate to group chat
        navigate(`/chat/group/${groupId}`);
        onClose();
      }
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedFriends([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>建立群組</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="群組名稱"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          sx={{ mb: 3, mt: 1 }}
        />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          選擇好友 ({selectedFriends.length})
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : friends.length > 0 ? (
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {friends.map((friend) => (
              <ListItem
                key={friend.userId}
                button
                onClick={() => handleToggleFriend(friend.userId)}
              >
                <Checkbox
                  checked={selectedFriends.includes(friend.userId)}
                  edge="start"
                />
                <ListItemAvatar>
                  <Avatar src={friend.avatar || undefined}>
                    {friend.name.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={friend.name} secondary={friend.userId} />
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              還沒有好友，請先加入好友
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!groupName.trim() || selectedFriends.length === 0 || creating}
        >
          {creating ? '建立中...' : '建立'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

