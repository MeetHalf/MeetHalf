import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  showNavbar?: boolean;
  showFooter?: boolean;
}

export default function Layout({ 
  children, 
  showNavbar = false, 
  showFooter = false 
}: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {showNavbar && <Navbar />}
      <main className="flex-grow">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}

// Simple Navbar component (can be expanded)
function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">MeetHalf</h1>
      </div>
    </header>
  );
}

// Simple Footer component
function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 px-6 py-4">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} MeetHalf. Made with ❤️
        </p>
      </div>
    </footer>
  );
}
