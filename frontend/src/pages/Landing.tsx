import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Stack, Typography, Paper } from '@mui/material';
import { ArrowRight, MapPin, Users, Route } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Landing() {
  const { user } = useAuth();
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f8f6', color: '#163d32' }}>
      <Container maxWidth="md">
        <Stack component="header" direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 3 }}>
          <Typography variant="h6" fontWeight={800}>MeetHalf</Typography>
          <Button component={RouterLink} to={user ? '/events' : '/login'} color="inherit">
            {user ? '我的聚會' : '登入'}
          </Button>
        </Stack>
        <Box component="main" sx={{ py: { xs: 5, md: 10 } }}>
          <Typography fontWeight={700} sx={{ mb: 2 }}>不用註冊，先找到見面的地方</Typography>
          <Typography component="h1" sx={{ fontSize: { xs: '2.6rem', md: '4rem' }, fontWeight: 800, lineHeight: 1.15, maxWidth: 650 }}>
            從不同地方出發，<br />在剛好的地方見面。
          </Typography>
          <Typography sx={{ mt: 3, maxWidth: 520, color: 'text.secondary', fontSize: '1.1rem', lineHeight: 1.8 }}>
            輸入大家的出發點與交通方式，查看中點附近的聚會地點和到中點的交通時間，再一起決定去哪裡。
          </Typography>
          <Stack spacing={2} sx={{ my: 4, alignItems: 'flex-start' }}>
            <Button component={RouterLink} to="/find" variant="contained" size="large" endIcon={<ArrowRight size={20} />}
              sx={{ bgcolor: '#176b50', borderRadius: 3, px: 4, py: 1.8, '&:hover': { bgcolor: '#12543f' } }}>
              找見面地點
            </Button>
            <Button component={RouterLink} to="/events/new" color="inherit">已經決定地點？直接建立聚會</Button>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mt: 6 }}>
            {[
              { Icon: Users, title: '輸入大家的出發點', text: '地址或車站名稱都可以，不用先加好友。' },
              { Icon: Route, title: '比較交通時間', text: '每個人可以選擇大眾運輸、開車或步行。' },
              { Icon: MapPin, title: '選地點，約見面', text: '查看周邊推薦，再建立聚會與分享邀請。' },
            ].map(({ Icon, title, text }) => (
              <Paper key={title} elevation={0} sx={{ p: 3, borderRadius: 4 }}>
                <Icon size={26} aria-hidden="true" />
                <Typography component="h2" variant="h6" sx={{ mt: 2, mb: 1 }}>{title}</Typography>
                <Typography color="text.secondary">{text}</Typography>
              </Paper>
            ))}
          </Box>
          <Typography sx={{ mt: 5 }} color="text.secondary">
            常常一起出門？登入後可使用好友、聊天與個人化功能。也可以繼續以訪客使用。
          </Typography>
          <Button component={RouterLink} to="/events" sx={{ mt: 1 }}>查看聚會與輸入邀請碼</Button>
        </Box>
      </Container>
    </Box>
  );
}
