import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchoolData } from '../../context/SchoolDataContext';
import { StatusBeacon } from '../common/StatusBeacon';
import { RoleSwitcher } from '../common/RoleSwitcher';
import { ThemeToggle } from '../common/ThemeToggle';
import { Menu, Bell, MessageSquare, CheckCheck, Send, AlertTriangle } from 'lucide-react';

interface AppHeaderProps {
  onToggleSidebar?: () => void;
  onNavigate?: (view: string) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onToggleSidebar, onNavigate }) => {
  const { user } = useAuth();
  const {
    portalMessages,
    markMessageAsRead,
    markAllMessagesAsRead,
    appNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useSchoolData();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState<'NOTIFICATIONS' | 'MESSAGES'>('NOTIFICATIONS');
  const notifRef = useRef<HTMLDivElement>(null);

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

  // Role-scoped notifications calculation
  const notifList = Array.isArray(appNotifications) ? appNotifications : [];
  const relevantNotifications = notifList.filter(n => {
    if (currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'PRINCIPAL') return true;
    if (n.userId && n.userId === currentUserId) return true;
    if (n.role && (n.role === currentUserRole || n.role === 'ALL')) return true;
    if (!n.role && !n.userId) return true;
    return false;
  });

  const unreadNotifications = relevantNotifications.filter(n => !n.isRead);
  const totalUnreadCount = unreadMessages.length + unreadNotifications.length;

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'ACADEMICS':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'ATTENDANCE':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'DIRECTIVE':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'GOVERNANCE':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'ADMISSION':
        return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
      case 'COMMUNICATION':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
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
              title="Notifications & Communications Hub"
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {totalUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-sm">
                  {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Dual-Tab Segmented Header */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-900/80 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveNotifTab('NOTIFICATIONS')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                        activeNotifTab === 'NOTIFICATIONS'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Alerts</span>
                      {unreadNotifications.length > 0 && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold bg-indigo-600 text-white rounded-full">
                          {unreadNotifications.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveNotifTab('MESSAGES')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                        activeNotifTab === 'MESSAGES'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Directives</span>
                      {unreadMessages.length > 0 && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-600 text-white rounded-full">
                          {unreadMessages.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Secondary action row */}
                  <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activeNotifTab === 'NOTIFICATIONS' ? 'Live Activity & System Events' : 'Role-Based Messages & Directives'}
                    </span>
                    {activeNotifTab === 'NOTIFICATIONS' ? (
                      unreadNotifications.length > 0 && (
                        <button
                          onClick={() => {
                            markAllNotificationsAsRead();
                          }}
                          className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Mark all read
                        </button>
                      )
                    ) : (
                      unreadMessages.length > 0 && (
                        <button
                          onClick={() => {
                            markAllMessagesAsRead(currentUserId);
                            markAllMessagesAsRead(currentUserRole);
                          }}
                          className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Mark all read
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Content Area */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {activeNotifTab === 'NOTIFICATIONS' ? (
                    relevantNotifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                        No active notifications for your role.
                      </div>
                    ) : (
                      relevantNotifications.map(notif => {
                        return (
                          <div
                            key={notif.id}
                            onClick={() => {
                              if (!notif.isRead) markNotificationAsRead(notif.id);
                              setIsNotifOpen(false);
                              if (notif.linkView) {
                                onNavigate?.(notif.linkView);
                              }
                            }}
                            className={`p-3 transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 flex flex-col gap-1.5 ${
                              !notif.isRead ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {!notif.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                                )}
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getCategoryBadgeClass(
                                    notif.category
                                  )}`}
                                >
                                  {notif.category}
                                </span>
                                {notif.priority === 'CRITICAL' && (
                                  <span className="px-1 text-[8px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded">
                                    Critical
                                  </span>
                                )}
                                {notif.priority === 'URGENT' && (
                                  <span className="px-1 text-[8px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded">
                                    Urgent
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {new Date(notif.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">
                              {notif.title}
                            </p>

                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                              {notif.message}
                            </p>

                            {notif.actorName && (
                              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                                <span>By {notif.actorName}</span>
                                {notif.linkView && (
                                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                    Click to inspect →
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )
                  ) : (
                    recentMessages.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
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
                    )
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
        </div>
      </div>
    </header>
  );
};
