import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  IconButton,
  InputAdornment,
  List,
  CircularProgress,
  Fade,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  GroupAdd as GroupAddIcon,
  PersonAdd as PersonAddIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import ConversationItem from '../components/ConversationItem';
import AddFriendDrawer from '../components/AddFriendDrawer';
import CreateGroupDialog from '../components/CreateGroupDialog';
import FriendListDialog from '../components/FriendListDialog';

export default function Friends() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, loadConversations, loading } = useChat(user?.userId);

  const [searchQuery, setSearchQuery] = useState('');
  const [addFriendDrawerOpen, setAddFriendDrawerOpen] = useState(false);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [friendListDialogOpen, setFriendListDialogOpen] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationClick = (type: 'user' | 'group', id: string | number) => {
    navigate(`/chat/${type}/${id}`);
  };

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Header */}
        <Fade in={true} timeout={600}>
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 'bold', mb: 3 }}
            >
              好友
            </Typography>

            {/* Search Bar & Action Buttons */}
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                placeholder="搜尋好友或聊天記錄..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<GroupAddIcon />}
                  onClick={() => setCreateGroupDialogOpen(true)}
                  sx={{ flex: 1, minWidth: '140px' }}
                >
                  建立群組
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  onClick={() => setAddFriendDrawerOpen(true)}
                  sx={{ flex: 1, minWidth: '140px' }}
                >
                  加入好友
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PeopleIcon />}
                  onClick={() => setFriendListDialogOpen(true)}
                  sx={{ flex: 1, minWidth: '140px' }}
                >
                  查看好友
                </Button>
              </Box>
            </Box>
          </Box>
        </Fade>

        {/* Conversations List */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredConversations.length > 0 ? (
          <Fade in={true} timeout={800}>
            <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
              {filteredConversations.map((conversation) => (
                <ConversationItem
                  key={`${conversation.type}-${conversation.id}`}
                  conversation={conversation}
                  onClick={() => handleConversationClick(conversation.type, conversation.id)}
                />
              ))}
            </List>
          </Fade>
        ) : (
          <Fade in={true} timeout={800}>
            <Box sx={{ textAlign: 'center', py: 12 }}>
              <Typography variant="h1" sx={{ fontSize: '4rem', mb: 2 }}>
                💬
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                還沒有聊天記錄
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                開始加入好友或建立群組來聊天吧
              </Typography>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => setAddFriendDrawerOpen(true)}
              >
                加入好友
              </Button>
            </Box>
          </Fade>
        )}
      </Container>

      {/* Dialogs & Drawers */}
      <AddFriendDrawer
        open={addFriendDrawerOpen}
        onClose={() => setAddFriendDrawerOpen(false)}
      />
      <CreateGroupDialog
        open={createGroupDialogOpen}
        onClose={() => setCreateGroupDialogOpen(false)}
      />
      <FriendListDialog
        open={friendListDialogOpen}
        onClose={() => setFriendListDialogOpen(false)}
      />
    </Box>
  );
}

