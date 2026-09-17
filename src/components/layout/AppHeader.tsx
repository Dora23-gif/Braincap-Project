import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchoolData } from '../../context/SchoolDataContext';
import { StatusBeacon } from '../common/StatusBeacon';
import { RoleSwitcher } from '../common/RoleSwitcher';
import { ThemeToggle } from '../common/ThemeToggle';
import { LogOut, Menu, Bell, MessageSquare, CheckCheck, Send, AlertTriangle, KeyRound, ChevronDown, User } from 'lucide-react';
import { ChangePasswordModal } from '../common/ChangePasswordModal';

interface AppHeaderProps {
  onToggleSidebar?: () => void;
  onNavigate?: (view: string) => void;
  onOpenChangePassword?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onToggleSidebar, onNavigate, onOpenChangePassword }) => {
  const { user, logout } = useAuth();
  const { portalMessages, markMessageAsRead, markAllMessagesAsRead } = useSchoolData();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?.id || user?.staffId || '';
  const currentUserRole = user?.activeRole || '';

  // Calculate unread messages intended for this user or their role
  const msgList = Array.isArray(portalMessages) ? portalMessages : [];
  const unreadMessages = msgList.filter(
    m =>
      !m.isRead &&
      (m.recipientId === currentUserId ||
        m.recipientRole === currentUserRole ||
        m.recipientId === 'ALL' ||
        m.recipientRole === 'ALL')
  );

  // Latest messages for dropdown preview
  const recentMessages = msgList.slice(0, 5);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 h-16 bg-white/85 dark:bg-[#070B14]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 px-3 sm:px-6 flex items-center transition-colors duration-300 shadow-2xs w-full max-w-full">
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        {/* Left branding & mobile toggle */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors touch-target flex items-center justify-center cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <img src="/crest.svg" alt="Everest Crest" className="w-7 h-9 sm:w-9 sm:h-11 object-contain drop-shadow-xs" />
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
            </div>
            <div className="min-w-0">
              <div className="font-serif-title font-bold text-slate-950 dark:text-white text-xs sm:text-base tracking-wide flex items-center gap-1.5 leading-tight truncate">
                EVEREST <span className="text-amber-600 dark:text-cyan-400 font-sans text-xs sm:text-sm font-semibold tracking-normal hidden sm:inline">INTERNATIONAL</span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 tracking-wider font-semibold uppercase hidden md:block">
                Academic Command Portal
              </div>
            </div>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="hidden lg:block">
            <StatusBeacon />
          </div>

          <ThemeToggle />

          {/* Real-time Message / Directive Notifications Popover */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              title="Communications & Directives"
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-sm">
                  {unreadMessages.length > 9 ? '9+' : unreadMessages.length}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Directives & Messages
                    </span>
                    {unreadMessages.length > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full">
                        {unreadMessages.length} new
                      </span>
                    )}
                  </div>
                  {unreadMessages.length > 0 && (
                    <button
                      onClick={() => {
                        markAllMessagesAsRead(currentUserId);
                        markAllMessagesAsRead(currentUserRole);
                      }}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {recentMessages.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No communications on ledger yet.
                    </div>
                  ) : (
                    recentMessages.map(msg => {
                      const isUnread =
                        !msg.isRead &&
                        (msg.recipientId === currentUserId ||
                          msg.recipientRole === currentUserRole ||
                          msg.recipientId === 'ALL' ||
                          msg.recipientRole === 'ALL');

                      return (
                        <div
                          key={msg.id}
                          onClick={() => {
                            if (isUnread) markMessageAsRead(msg.id);
                            setIsNotifOpen(false);
                            onNavigate?.('communications');
                          }}
                          className={`p-3 transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 flex flex-col gap-1 ${
                            isUnread ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                              )}
                              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {msg.senderName}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                {msg.senderRole.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {msg.priority === 'OFFICIAL_DIRECTIVE' && (
                              <span className="px-1 text-[8px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded">
                                Directive
                              </span>
                            )}
                            {msg.priority === 'URGENT' && (
                              <span className="px-1 text-[8px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded">
                                Urgent
                              </span>
                            )}
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                              {msg.subject}
                            </p>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {msg.content}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 text-center">
                  <button
                    onClick={() => {
                      setIsNotifOpen(false);
                      onNavigate?.('communications');
                    }}
                    className="w-full py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Open Full Communications Hub →
                  </button>
                </div>
              </div>
            )}
          </div>

          <RoleSwitcher />

          {/* User Profile avatar & Sign out */}
          <div className="relative flex items-center gap-1.5 sm:gap-2 pl-2 border-l border-slate-200/80 dark:border-white/10" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-left"
              title="User Account & Security"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-amber-500/30 dark:border-cyan-500/40 shadow-xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                  {user.name.charAt(0)}
                </div>
              )}
              <div className="hidden 2xl:block text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">{user.name}</div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 font-mono-tabular leading-none">{user.identifier}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden 2xl:block" />
            </button>

            {/* Quick Change Password Icon Button */}
            <button
              onClick={() => {
                if (onOpenChangePassword) {
                  onOpenChangePassword();
                } else {
                  setIsChangePasswordOpen(true);
                }
              }}
              title="Change Account Password"
              className="flex p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors touch-target items-center justify-center cursor-pointer touch-manipulation"
            >
              <KeyRound className="w-4 h-4" />
            </button>

            {/* Profile Dropdown Popover */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {user.email || 'No email registered'}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                      {user.activeRole.replace(/_/g, ' ')}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-mono-tabular text-[10px]">
                      {user.identifier}
                    </span>
                  </div>
                </div>

                <div className="p-2 space-y-1 text-xs">
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (onOpenChangePassword) {
                        onOpenChangePassword();
                      } else {
                        setIsChangePasswordOpen(true);
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition cursor-pointer touch-manipulation"
                  >
                    <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Change My Password</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold transition cursor-pointer touch-manipulation"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!onOpenChangePassword && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
        />
      )}
    </header>
  );
};
