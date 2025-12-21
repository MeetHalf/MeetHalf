import { Box } from '@mui/material';
import Navbar from './Navbar';
import Footer from './Footer';
import TabBar from './TabBar';
import { useAuth } from '../hooks/useAuth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          // Add padding at bottom on mobile when tab bar is visible
          pb: user ? { xs: '64px', md: 0 } : 0,
        }}
      >
        {children}
      </Box>
      <Footer />
      <TabBar />
    </Box>
  );
}

