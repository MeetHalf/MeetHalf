import { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  IconButton,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon, Message as MessageIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useFriends } from '../hooks/useFriends';

interface FriendListDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function FriendListDialog({ open, onClose }: FriendListDialogProps) {
  const navigate = useNavigate();
  const { friends, loadFriends, deleteFriend, loading } = useFriends();

  useEffect(() => {
    if (open) {
      loadFriends();
    }
  }, [open, loadFriends]);

  const handleDeleteFriend = async (friendId: string, friendName: string) => {
    if (window.confirm(`確定要刪除好友 ${friendName} 嗎？`)) {
      await deleteFriend(friendId);
    }
  };

  const handleSendMessage = (friendId: string) => {
    navigate(`/chat/user/${friendId}`);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>好友列表</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : friends.length > 0 ? (
          <List>
            {friends.map((friend) => (
              <ListItem
                key={friend.userId}
                secondaryAction={
                  <Box>
                    <IconButton
                      edge="end"
                      onClick={() => handleSendMessage(friend.userId)}
                      sx={{ mr: 1 }}
                    >
                      <MessageIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteFriend(friend.userId, friend.name)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemAvatar>
                  <Avatar src={friend.avatar || undefined}>
                    {friend.name.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={friend.name}
                  secondary={friend.userId}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              還沒有好友
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>關閉</Button>
      </DialogActions>
    </Dialog>
  );
}

