import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  IconButton,
  Avatar,
  Typography,
  Paper,
  CircularProgress,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

export default function ChatRoom() {
  const { type, id } = useParams<{ type: 'user' | 'group'; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, loadMessages, sendMessage, loading } = useChat(user?.userId, type, id);
  
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatName, setChatName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages and chat info
  useEffect(() => {
    if (user && type && id) {
      if (type === 'user') {
        loadMessages({ receiverId: id });
        // TODO: Load user info to get name
        setChatName(id);
      } else {
        loadMessages({ groupId: parseInt(id) });
        // TODO: Load group info to get name
        setChatName(`群組 ${id}`);
      }
    }
  }, [user, type, id, loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || sending) return;

    setSending(true);
    const receiverId = type === 'user' ? id : undefined;
    const groupId = type === 'group' ? parseInt(id!) : undefined;

    await sendMessage(inputMessage.trim(), receiverId, groupId);
    setInputMessage('');
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return format(date, 'HH:mm', { locale: zhTW });
      } else if (diffInHours < 24 * 7) {
        return format(date, 'EEE HH:mm', { locale: zhTW });
      } else {
        return format(date, 'MM/dd HH:mm', { locale: zhTW });
      }
    } catch {
      return '';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#f5f5f5',
      }}
    >
      {/* Header */}
      <AppBar
        position="static"
        elevation={1}
        sx={{
          bgcolor: 'white',
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => navigate('/friends')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Avatar sx={{ mr: 2 }}>
            {chatName.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {chatName}
          </Typography>
          <IconButton edge="end">
            <InfoIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Messages Area */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : messages.length > 0 ? (
          messages.map((message) => {
            const isOwn = message.senderId === user.userId;
            return (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  justifyContent: isOwn ? 'flex-end' : 'flex-start',
                  mb: 1,
                }}
              >
                {!isOwn && (
                  <Avatar
                    src={message.sender?.avatar || undefined}
                    sx={{ width: 32, height: 32, mr: 1 }}
                  >
                    {message.sender?.name?.charAt(0).toUpperCase()}
                  </Avatar>
                )}
                <Box
                  sx={{
                    maxWidth: '70%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isOwn ? 'flex-end' : 'flex-start',
                  }}
                >
                  {!isOwn && type === 'group' && (
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', mb: 0.5, px: 1 }}
                    >
                      {message.sender?.name || 'Unknown'}
                    </Typography>
                  )}
                  <Paper
                    sx={{
                      p: 1.5,
                      bgcolor: isOwn ? 'primary.main' : 'white',
                      color: isOwn ? 'white' : 'text.primary',
                      borderRadius: 2,
                      wordBreak: 'break-word',
                    }}
                    elevation={1}
                  >
                    <Typography variant="body1">{message.content}</Typography>
                  </Paper>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', mt: 0.5, px: 1 }}
                  >
                    {formatMessageTime(message.createdAt)}
                    {isOwn && message.readBy.length > 1 && ' · 已讀'}
                  </Typography>
                </Box>
              </Box>
            );
          })
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body2" color="text.secondary">
              還沒有訊息，開始聊天吧！
            </Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end',
          bgcolor: 'white',
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="輸入訊息..."
          variant="outlined"
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
            },
          }}
        />
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || sending}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            '&:disabled': {
              bgcolor: 'grey.300',
            },
          }}
        >
          {sending ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
        </IconButton>
      </Paper>
    </Box>
  );
}

