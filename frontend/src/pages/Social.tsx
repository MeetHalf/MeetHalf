import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Avatar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Chat as ChatIcon,
  Zap as ZapIcon,
} from '@mui/icons-material';

// 模擬好友數據
const mockFriends = [
  { id: 1, name: '小明', avatar: '🧑', status: 'online', lastSeen: '剛剛' },
  { id: 2, name: '小華', avatar: '👩', status: 'offline', lastSeen: '30 分鐘前' },
  { id: 3, name: '阿強', avatar: '👨', status: 'online', lastSeen: '剛剛' },
  { id: 4, name: '小美', avatar: '👧', status: 'online', lastSeen: '5 分鐘前' },
];

// 模擬聊天數據
const mockChats = [
  { id: 1, name: '週五火鍋聚會', type: 'event', lastMessage: '小明：我快到了！', time: '5 分鐘前', unread: 2 },
  { id: 2, name: '小華', type: 'private', lastMessage: '明天見！', time: '1 小時前', unread: 0 },
  { id: 3, name: '大學同學群', type: 'group', lastMessage: '阿強：+1', time: '昨天', unread: 5 },
];

export default function Social() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'chats'>('friends');

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
          placeholder="Search friends..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
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
                '&:active': { transform: 'scale(0.95)' },
              }}
            >
              {tab === 'friends' ? 'Friends' : 'Chats'}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        {activeTab === 'friends' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {mockFriends.map((friend) => (
              <Box
                key={friend.id}
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
                  '&:active': { transform: 'scale(0.98)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: friend.status === 'online' ? '#dcfce7' : '#f1f5f9',
                        fontSize: '1.5rem',
                        borderRadius: 4,
                      }}
                    >
                      {friend.avatar}
                    </Avatar>
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: friend.status === 'online' ? '#22c55e' : '#94a3b8',
                        border: '2px solid white',
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: '#0f172a' }}>
                      {friend.name}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                      {friend.lastSeen}
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
                    '&:hover': { bgcolor: '#dbeafe', color: '#2563eb' },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ChatIcon sx={{ fontSize: 18 }} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {mockChats.map((chat) => (
              <Box
                key={chat.id}
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
                  '&:active': { transform: 'scale(0.98)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: chat.type === 'event' ? '#dbeafe' : chat.type === 'group' ? '#dcfce7' : '#f1f5f9',
                      fontSize: '1.25rem',
                      borderRadius: 4,
                    }}
                  >
                    {chat.type === 'event' ? '📍' : chat.type === 'group' ? '👥' : chat.name[0]}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {chat.name}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 180,
                      }}
                    >
                      {chat.lastMessage}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '0.625rem', color: '#94a3b8', fontWeight: 600 }}>
                    {chat.time}
                  </Typography>
                  {chat.unread > 0 && (
                    <Box
                      sx={{
                        minWidth: 18,
                        height: 18,
                        borderRadius: 10,
                        bgcolor: '#ef4444',
                        color: 'white',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 0.5,
                      }}
                    >
                      {chat.unread}
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
