import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  IconButton,
  Avatar,
  Typography,
  CircularProgress,
} from '@mui/material';
import { ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

export default function ChatRoom() {
  const { type, id } = useParams<{ type: 'user' | 'group'; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, conversations, loadMessages, loadConversations, sendMessage, markConversationAsRead, loading } = useChat(user?.userId, type, id);
  
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [chatName, setChatName] = useState('');
  const [chatAvatar, setChatAvatar] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations to get chat name and avatar
  useEffect(() => {
    if (user) {
      loadConversations().catch((err) => {
        console.error('[ChatRoom] Failed to load conversations:', err);
      });
    }
  }, [user, loadConversations]);

  // Find conversation info from conversations list
  useEffect(() => {
    if (conversations.length > 0 && type && id) {
      const conversation = conversations.find((conv) => {
        if (type === 'user') {
          return conv.type === 'user' && conv.id === id;
        } else {
          return conv.type === 'group' && conv.id === parseInt(id);
        }
      });

      if (conversation) {
        setChatName(conversation.name);
        setChatAvatar(conversation.avatar);
      } else {
        // Fallback to ID if conversation not found
        setChatName(type === 'user' ? id : `群組 ${id}`);
        setChatAvatar(null);
      }
    }
  }, [conversations, type, id]);

  // Load messages and mark as read
  useEffect(() => {
    if (user && type && id) {
      const loadData = async () => {
        if (type === 'user') {
          await loadMessages({ receiverId: id });
          await markConversationAsRead({ receiverId: id });
        } else {
          await loadMessages({ groupId: parseInt(id) });
          await markConversationAsRead({ groupId: parseInt(id) });
        }
      };
      loadData();
    }
  }, [user, type, id, loadMessages, markConversationAsRead]);

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
        bgcolor: '#f8fafc',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: 'white',
          borderBottom: '1px solid #f1f5f9',
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <IconButton
          onClick={() => navigate('/friends')}
          sx={{
            color: '#64748b',
            '&:hover': { bgcolor: '#f1f5f9' },
          }}
        >
          <ArrowLeft size={20} />
        </IconButton>
        <Avatar
          src={chatAvatar || undefined}
          sx={{
            width: 40,
            height: 40,
            bgcolor: type === 'group' ? '#dcfce7' : '#dbeafe',
            fontSize: '1rem',
            borderRadius: 4,
            color: type === 'group' ? '#15803d' : '#2563eb',
            fontWeight: 700,
          }}
        >
          {chatName.charAt(0).toUpperCase()}
        </Avatar>
        <Typography
          sx={{
            flexGrow: 1,
            fontWeight: 700,
            color: '#0f172a',
            fontSize: '1rem',
          }}
        >
          {chatName}
        </Typography>
      </Box>

      {/* Messages Area */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
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
                  alignItems: 'flex-end',
                  gap: 1,
                }}
              >
                {!isOwn && (
                  <Avatar
                    src={message.sender?.avatar || undefined}
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: '#dbeafe',
                      fontSize: '0.75rem',
                      borderRadius: 3,
                      color: '#2563eb',
                      fontWeight: 700,
                    }}
                  >
                    {message.sender?.name?.charAt(0).toUpperCase() || '?'}
                  </Avatar>
                )}
                <Box
                  sx={{
                    maxWidth: '75%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isOwn ? 'flex-end' : 'flex-start',
                  }}
                >
                  {!isOwn && type === 'group' && (
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        fontWeight: 500,
                        mb: 0.5,
                        px: 1,
                      }}
                    >
                      {message.sender?.name || 'Unknown'}
                    </Typography>
                  )}
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: isOwn ? '#2563eb' : '#f1f5f9',
                      color: isOwn ? 'white' : '#0f172a',
                      borderRadius: isOwn ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                      wordBreak: 'break-word',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        lineHeight: 1.5,
                        color: isOwn ? 'white' : '#0f172a',
                      }}
                    >
                      {message.content}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.625rem',
                      color: '#94a3b8',
                      mt: 0.5,
                      px: 1,
                      fontWeight: 500,
                    }}
                  >
                    {formatMessageTime(message.createdAt)}
                    {isOwn && message.readBy.length > 1 && ' · 已讀'}
                  </Typography>
                </Box>
              </Box>
            );
          })
        ) : (
          <Box sx={{ textAlign: 'center', py: 12 }}>
            <Typography sx={{ fontSize: '4rem', mb: 2 }}>💬</Typography>
            <Typography sx={{ fontWeight: 700, color: '#64748b' }}>
              還沒有訊息
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8', mt: 1 }}>
              開始聊天吧！
            </Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'white',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          gap: 1.5,
          alignItems: 'flex-end',
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
              borderRadius: 4,
              bgcolor: '#f1f5f9',
              '& fieldset': {
                border: 'none',
              },
              '&:hover fieldset': {
                border: 'none',
              },
              '&.Mui-focused fieldset': {
                border: '1px solid #2563eb',
              },
            },
          }}
        />
        <IconButton
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || sending}
          sx={{
            bgcolor: inputMessage.trim() ? '#2563eb' : '#e2e8f0',
            color: inputMessage.trim() ? 'white' : '#94a3b8',
            width: 40,
            height: 40,
            borderRadius: 3,
            '&:hover': {
              bgcolor: inputMessage.trim() ? '#1d4ed8' : '#e2e8f0',
            },
            '&:disabled': {
              bgcolor: '#e2e8f0',
              color: '#94a3b8',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {sending ? (
            <CircularProgress size={20} sx={{ color: 'inherit' }} />
          ) : (
            <Send size={18} />
          )}
        </IconButton>
      </Box>
    </Box>
  );
}

