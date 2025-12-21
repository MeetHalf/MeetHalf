import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Avatar,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { Search, MessageCircle, UserPlus, Users, UserCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useFriends } from '../hooks/useFriends';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import ConversationItem from '../components/ConversationItem';
import AddFriendDrawer from '../components/AddFriendDrawer';
import CreateGroupDialog from '../components/CreateGroupDialog';
import FriendListDialog from '../components/FriendListDialog';

export default function Social() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'chats'>('friends');
  const [addFriendDrawerOpen, setAddFriendDrawerOpen] = useState(false);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [friendListDialogOpen, setFriendListDialogOpen] = useState(false);

  // 使用真實 API
  const { friends, loading: friendsLoading, error: friendsError, loadFriends } = useFriends();
  const {
    conversations,
    loading: chatsLoading,
    error: chatsError,
    loadConversations,
  } = useChat(user?.userId);

  // 載入資料
  useEffect(() => {
    console.log('[Social] useEffect triggered', { user: user?.userId, activeTab });
    if (user) {
      console.log('[Social] User exists, loading data...', { activeTab });
      if (activeTab === 'friends') {
        loadFriends().catch((err) => {
          console.error('[Social] Failed to load friends:', err);
        });
      } else {
        loadConversations().catch((err) => {
          console.error('[Social] Failed to load conversations:', err);
        });
      }
    } else {
      console.warn('[Social] No user found, skipping API calls');
    }
  }, [user, activeTab, loadFriends, loadConversations]);

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: zhTW,
      });
    } catch {
      return '';
    }
  };

  const handleFriendClick = (friendUserId: string) => {
    navigate(`/chat/user/${friendUserId}`);
  };

  const handleConversationClick = (type: 'user' | 'group', id: string | number) => {
    navigate(`/chat/${type}/${id}`);
  };

  const loading = activeTab === 'friends' ? friendsLoading : chatsLoading;
  const error = activeTab === 'friends' ? friendsError : chatsError;

  // Filter data based on search query
  const filteredFriends = friends.filter((friend) =>
    searchQuery
      ? friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.email.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const filteredConversations = conversations.filter((chat) =>
    searchQuery
      ? chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

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
          placeholder={activeTab === 'friends' ? 'Search friends...' : 'Search conversations...'}
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

        {/* Action Buttons (only show for friends tab) */}
        {activeTab === 'friends' && user && (
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
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

        {/* Tabs */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {['friends', 'chats'].map((tab) => (
            <Box
              key={tab}
              onClick={() => setActiveTab(tab as 'friends' | 'chats')}
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: 4,
                bgcolor: activeTab === tab ? '#0f172a' : 'white',
                color: activeTab === tab ? 'white' : '#64748b',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                border: activeTab === tab ? 'none' : '1px solid #f1f5f9',
                transition: 'all 0.2s ease',
                '&:active': { transform: 'scale(0.98)' },
              }}
            >
              {tab === 'friends' ? 'Friends' : 'Chats'}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        {/* 未登入提示 */}
        {!user && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 4 }}>
            請先登入以查看好友和聊天記錄
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
        ) : activeTab === 'friends' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {filteredFriends.length > 0 ? (
              filteredFriends.map((friend) => (
                <Box
                  key={friend.userId}
                  onClick={() => handleFriendClick(friend.userId)}
                  sx={{
                    bgcolor: 'white',
                    p: 2,
                    borderRadius: '1.5rem',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:active': { transform: 'scale(0.99)' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      src={friend.avatar || undefined}
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: '#dbeafe',
                        fontSize: '1.25rem',
                        borderRadius: 4,
                      }}
                    >
                      {friend.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {friend.name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                        {friend.email}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 3,
                      bgcolor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                      transition: 'all 0.2s ease',
                      '&:hover': { bgcolor: '#dbeafe', color: '#2563eb' },
                    }}
                  >
                    <MessageCircle size={18} />
                  </Box>
                </Box>
              ))
            ) : (
              <Box sx={{ textAlign: 'center', py: 12 }}>
                <Typography sx={{ fontSize: '4rem', mb: 2 }}>👥</Typography>
                <Typography sx={{ fontWeight: 700, color: '#64748b' }}>No friends yet</Typography>
                <Typography sx={{ color: '#94a3b8', mt: 1, mb: 3 }}>
                  Add friends to start chatting
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
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conversation) => (
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
              ))
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
        )}
      </Box>

      {/* Dialogs & Drawers */}
      <AddFriendDrawer open={addFriendDrawerOpen} onClose={() => setAddFriendDrawerOpen(false)} />
      <CreateGroupDialog
        open={createGroupDialogOpen}
        onClose={() => setCreateGroupDialogOpen(false)}
      />
      <FriendListDialog open={friendListDialogOpen} onClose={() => setFriendListDialogOpen(false)} />
    </Box>
  );
}
