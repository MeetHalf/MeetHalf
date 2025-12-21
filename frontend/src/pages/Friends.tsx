import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { Search, UserPlus, Users, UserCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import ConversationItem from '../components/ConversationItem';
import AddFriendDrawer from '../components/AddFriendDrawer';
import CreateGroupDialog from '../components/CreateGroupDialog';
import FriendListDialog from '../components/FriendListDialog';

export default function Friends() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    conversations,
    loading,
    error,
    loadConversations,
  } = useChat(user?.userId);

  const [searchQuery, setSearchQuery] = useState('');
  const [addFriendDrawerOpen, setAddFriendDrawerOpen] = useState(false);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [friendListDialogOpen, setFriendListDialogOpen] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations().catch((err) => {
        console.error('[Friends] Failed to load conversations:', err);
      });
    }
  }, [user, loadConversations]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationClick = (type: 'user' | 'group', id: string | number) => {
    navigate(`/chat/${type}/${id}`);
  };

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: 'calc(100vh - 140px)', pb: 12 }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #f1f5f9', px: 3, pt: 2, pb: 3 }}>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', mb: 3 }}>
          Squad
        </Typography>

        {/* 搜尋欄 */}
        <TextField
          fullWidth
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={20} style={{ color: '#94a3b8' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 4,
              bgcolor: '#f1f5f9',
              '& fieldset': { border: 'none' },
            },
          }}
        />

        {/* Action Buttons */}
        {user && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              onClick={() => setCreateGroupDialogOpen(true)}
              startIcon={<Users size={18} />}
              sx={{
                flex: 1,
                minWidth: '120px',
                borderRadius: 4,
                bgcolor: '#f1f5f9',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.875rem',
                py: 1.5,
                textTransform: 'none',
                '&:hover': { bgcolor: '#e2e8f0' },
              }}
            >
              建立群組
            </Button>
            <Button
              onClick={() => setAddFriendDrawerOpen(true)}
              startIcon={<UserPlus size={18} />}
              sx={{
                flex: 1,
                minWidth: '120px',
                borderRadius: 4,
                bgcolor: '#f1f5f9',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.875rem',
                py: 1.5,
                textTransform: 'none',
                '&:hover': { bgcolor: '#e2e8f0' },
              }}
            >
              加入好友
            </Button>
            <Button
              onClick={() => setFriendListDialogOpen(true)}
              startIcon={<UserCheck size={18} />}
              sx={{
                flex: 1,
                minWidth: '120px',
                borderRadius: 4,
                bgcolor: '#f1f5f9',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.875rem',
                py: 1.5,
                textTransform: 'none',
                '&:hover': { bgcolor: '#e2e8f0' },
              }}
            >
              查看好友
            </Button>
          </Box>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        {/* 未登入提示 */}
        {!user && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 4 }}>
            請先登入以查看聊天記錄
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 4 }} onClose={() => {}}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredConversations.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filteredConversations.map((conversation) => (
              <Box
                key={`${conversation.type}-${conversation.id}`}
                onClick={() => handleConversationClick(conversation.type, conversation.id)}
                sx={{
                  bgcolor: 'white',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': { bgcolor: '#f8fafc' },
                  '&:first-of-type': {
                    borderTopLeftRadius: '1.5rem',
                    borderTopRightRadius: '1.5rem',
                  },
                  '&:last-of-type': {
                    borderBottomLeftRadius: '1.5rem',
                    borderBottomRightRadius: '1.5rem',
                    borderBottom: 'none',
                  },
                }}
              >
                <ConversationItem
                  conversation={conversation}
                  onClick={() => handleConversationClick(conversation.type, conversation.id)}
                />
              </Box>
            ))}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 12 }}>
            <Typography sx={{ fontSize: '4rem', mb: 2 }}>💬</Typography>
            <Typography sx={{ fontWeight: 700, color: '#64748b' }}>
              No conversations yet
            </Typography>
            <Typography sx={{ color: '#94a3b8', mt: 1, mb: 3 }}>
              Start a chat with your friends
            </Typography>
            <Button
              onClick={() => setAddFriendDrawerOpen(true)}
              startIcon={<UserPlus size={18} />}
              sx={{
                borderRadius: 4,
                bgcolor: '#0f172a',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.875rem',
                px: 3,
                py: 1.5,
                textTransform: 'none',
                '&:hover': { bgcolor: '#1e293b' },
              }}
            >
              加入好友
            </Button>
          </Box>
        )}
      </Box>

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

