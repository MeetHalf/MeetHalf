import {
  ListItem,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Badge,
  Typography,
  Box,
} from '@mui/material';
import { Group as GroupIcon } from '@mui/icons-material';
import { Conversation } from '../types/chat';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface ConversationItemProps {
  conversation: Conversation;
  onClick: () => void;
}

export default function ConversationItem({ conversation, onClick }: ConversationItemProps) {
  const { type, name, avatar, lastMessage, unreadCount } = conversation;

  const formatTimestamp = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: zhTW,
      });
    } catch {
      return '';
    }
  };

  return (
    <ListItem disablePadding>
      <ListItemButton onClick={onClick}>
        <ListItemAvatar>
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            overlap="circular"
          >
            <Avatar
              src={avatar || undefined}
              sx={{
                width: 56,
                height: 56,
                bgcolor: type === 'group' ? 'primary.main' : 'secondary.main',
              }}
            >
              {type === 'group' ? (
                <GroupIcon />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </Avatar>
          </Badge>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: unreadCount > 0 ? 'bold' : 'normal',
                  color: 'text.primary',
                }}
              >
                {name}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatTimestamp(lastMessage.createdAt)}
              </Typography>
            </Box>
          }
          secondary={
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: unreadCount > 0 ? 500 : 'normal',
              }}
            >
              {lastMessage.sender?.name && type === 'group' ? `${lastMessage.sender.name}: ` : ''}
              {lastMessage.content}
            </Typography>
          }
        />
      </ListItemButton>
    </ListItem>
  );
}

