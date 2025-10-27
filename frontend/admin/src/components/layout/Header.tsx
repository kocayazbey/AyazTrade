'use client';

import { useState, useEffect } from 'react';
import { Menu, Search, Bell, Settings, User } from 'lucide-react';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get user from localStorage
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  return (
    <header className="h-16 bg-white border-b border-ios-gray-200 flex items-center justify-between px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-2 rounded-ios hover:bg-ios-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-ios-gray-700" />
        </button>

        {/* Search Bar */}
        <div className="hidden md:flex items-center gap-2 w-96">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ios-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ara..."
              className="w-full pl-10 pr-4 py-2 rounded-ios border border-ios-gray-300 focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent bg-ios-gray-50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative p-2 rounded-ios hover:bg-ios-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-ios-gray-700" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-ios-red rounded-full" />
        </button>

        {/* Settings */}
        <button className="p-2 rounded-ios hover:bg-ios-gray-100 transition-colors">
          <Settings className="w-5 h-5 text-ios-gray-700" />
        </button>

        {/* User Menu */}
        <div className="flex items-center gap-2 pl-3 border-l border-ios-gray-200">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-ios-gray-900">{user?.firstName || user?.email || 'User'}</p>
            <p className="text-xs text-ios-gray-500 capitalize">{user?.role || 'Admin'}</p>
          </div>
          <button className="p-1.5 rounded-full bg-gradient-to-br from-ios-blue to-ios-indigo">
            <User className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </header>
  );
}

