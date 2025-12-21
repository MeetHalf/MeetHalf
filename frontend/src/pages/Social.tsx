import { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  Chat as ChatIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

// 模擬好友數據
const mockFriends = [
  { id: 1, name: '小明', avatar: '🧑', status: 'online', lastSeen: '剛剛' },
  { id: 2, name: '小華', avatar: '👩', status: 'offline', lastSeen: '30 分鐘前' },
  { id: 3, name: '阿強', avatar: '👨', status: 'online', lastSeen: '剛剛' },
];

// 模擬聊天數據
const mockChats = [
  { id: 1, name: '週五火鍋聚會', type: 'event', lastMessage: '小明：我快到了！', time: '5 分鐘前', unread: 2 },
  { id: 2, name: '小華', type: 'private', lastMessage: '明天見！', time: '1 小時前', unread: 0 },
  { id: 3, name: '大學同學群', type: 'group', lastMessage: '阿強：+1', time: '昨天', unread: 5 },
];

// 模擬好友申請
const mockRequests = [
  { id: 1, name: '小美', avatar: '👧', message: '我是你的高中同學' },
];

export default function Social() {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: 'calc(100vh - 140px)', pb: 4 }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: 'white', 
        borderBottom: '1px solid',
        borderColor: 'divider',
        px: 3, 
        pt: 3, 
        pb: 2 
      }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b', mb: 2 }}>
          社交
        </Typography>
        
        {/* 搜尋欄 */}
        <TextField
          fullWidth
          placeholder="搜尋好友或聊天..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94a3b8' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: '#f1f5f9',
              '& fieldset': { border: 'none' },
            },
          }}
        />

        {/* Tabs */}
        <Tabs 
          value={tabValue} 
          onChange={(_, v) => setTabValue(v)}
          sx={{ 
            mt: 2,
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
            },
          }}
        >
          <Tab label="好友" />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                聊天
                {mockChats.filter(c => c.unread > 0).length > 0 && (
                  <Chip 
                    label={mockChats.reduce((sum, c) => sum + c.unread, 0)} 
                    size="small" 
                    color="error" 
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                申請
                {mockRequests.length > 0 && (
                  <Chip 
                    label={mockRequests.length} 
                    size="small" 
                    color="primary" 
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            } 
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <Box sx={{ px: 2 }}>
        {/* 好友列表 */}
        <TabPanel value={tabValue} index={0}>
          <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
            <List disablePadding>
              {mockFriends.map((friend, index) => (
                <ListItem
                  key={friend.id}
                  divider={index < mockFriends.length - 1}
                  secondaryAction={
                    <IconButton edge="end" sx={{ color: '#3b82f6' }}>
                      <ChatIcon />
                    </IconButton>
                  }
                  sx={{ py: 2 }}
                >
                  <ListItemAvatar>
                    <Box sx={{ position: 'relative' }}>
                      <Avatar sx={{ bgcolor: '#e2e8f0', fontSize: '1.5rem' }}>
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
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 600 }}>{friend.name}</Typography>
                    }
                    secondary={friend.lastSeen}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
          
          {/* 加好友按鈕 */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <IconButton
              sx={{
                bgcolor: '#3b82f6',
                color: 'white',
                width: 56,
                height: 56,
                '&:hover': { bgcolor: '#2563eb' },
              }}
            >
              <PersonAddIcon />
            </IconButton>
            <Typography sx={{ mt: 1, color: '#64748b', fontSize: '0.875rem' }}>
              加好友
            </Typography>
          </Box>
        </TabPanel>

        {/* 聊天列表 */}
        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
            <List disablePadding>
              {mockChats.map((chat, index) => (
                <ListItem
                  key={chat.id}
                  divider={index < mockChats.length - 1}
                  sx={{ py: 2, cursor: 'pointer', '&:hover': { bgcolor: '#f8fafc' } }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ 
                      bgcolor: chat.type === 'event' ? '#dbeafe' : 
                               chat.type === 'group' ? '#dcfce7' : '#f1f5f9',
                      color: chat.type === 'event' ? '#3b82f6' : 
                             chat.type === 'group' ? '#22c55e' : '#64748b',
                    }}>
                      {chat.type === 'event' ? '📍' : 
                       chat.type === 'group' ? '👥' : chat.name[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontWeight: 600 }}>{chat.name}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {chat.time}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography 
                          sx={{ 
                            fontSize: '0.875rem', 
                            color: '#64748b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '200px',
                          }}
                        >
                          {chat.lastMessage}
                        </Typography>
                        {chat.unread > 0 && (
                          <Chip 
                            label={chat.unread} 
                            size="small" 
                            color="error" 
                            sx={{ height: 20, minWidth: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </TabPanel>

        {/* 好友申請 */}
        <TabPanel value={tabValue} index={2}>
          {mockRequests.length > 0 ? (
            <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
              <List disablePadding>
                {mockRequests.map((request, index) => (
                  <ListItem
                    key={request.id}
                    divider={index < mockRequests.length - 1}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton 
                          size="small" 
                          sx={{ bgcolor: '#22c55e', color: 'white', '&:hover': { bgcolor: '#16a34a' } }}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          sx={{ bgcolor: '#f1f5f9', color: '#64748b' }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                    sx={{ py: 2 }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#e2e8f0', fontSize: '1.5rem' }}>
                        {request.avatar}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography sx={{ fontWeight: 600 }}>{request.name}</Typography>
                      }
                      secondary={request.message}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography sx={{ fontSize: '3rem', mb: 2 }}>🎉</Typography>
              <Typography sx={{ color: '#64748b' }}>沒有待處理的好友申請</Typography>
            </Box>
          )}
        </TabPanel>
      </Box>
    </Box>
  );
}

