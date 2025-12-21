import { useNavigate, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import {
  AnimatedHome,
  AnimatedUsers,
  AnimatedPlus,
  AnimatedMap,
  AnimatedUser,
} from './AnimatedIcons';

interface NavItem {
  path: string;
  icon: (active: boolean) => React.ReactNode;
  isCreate?: boolean;
}

const navItems: NavItem[] = [
  {
    path: '/events',
    icon: (active) => <AnimatedHome size={20} animate={active} />,
  },
  {
    path: '/social',
    icon: (active) => <AnimatedUsers size={20} animate={active} />,
  },
  {
    path: '/events/new',
    icon: () => <AnimatedPlus size={24} />,
    isCreate: true,
  },
  {
    path: '/map',
    icon: (active) => <AnimatedMap size={20} animate={active} />,
  },
  {
    path: '/profile',
    icon: () => <AnimatedUser size={20} />,
  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/events') {
      return location.pathname === '/events' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Box
      component={motion.div}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid',
        borderColor: 'rgba(241, 245, 249, 1)',
        px: 4,
        py: 2,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      }}
    >
      {navItems.map((item) => {
        const active = isActive(item.path);

        if (item.isCreate) {
          return (
            <motion.div
              key={item.path}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(item.path)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: '#2563eb',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
                cursor: 'pointer',
              }}
            >
              {item.icon(false)}
            </motion.div>
          );
        }

        return (
          <motion.div
            key={item.path}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(item.path)}
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: active ? '#2563eb' : 'white',
              color: active ? 'white' : '#64748b',
              boxShadow: active
                ? '0 4px 12px rgba(37, 99, 235, 0.3)'
                : '0 1px 3px rgba(0,0,0,0.05)',
              border: active ? 'none' : '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {item.icon(active)}
          </motion.div>
        );
      })}
    </Box>
  );
}
