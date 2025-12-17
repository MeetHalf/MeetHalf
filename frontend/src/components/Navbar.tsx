import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, MapPin, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/events')}
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <MapPin size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                MeetHalf
              </h1>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                找到完美的聚會地點
              </p>
            </div>
          </div>

          {/* Navigation */}
          {user ? (
            <div className="flex items-center gap-3">
              {/* User Info */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                  {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700 max-w-[150px] truncate">
                  {user.name || user.email}
                </span>
              </div>

              {/* Events Button */}
              {location.pathname !== '/events' && (
                <button
                  onClick={() => navigate('/events')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  <Calendar size={16} />
                  <span className="hidden sm:inline">活動</span>
                </button>
              )}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors active:scale-95"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">登出</span>
              </button>
            </div>
          ) : (
            location.pathname !== '/login' && (
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors active:scale-95"
              >
                登入
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
