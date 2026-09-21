import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolDataContext';
import { useAuth } from '../../context/AuthContext';
import { PortalMessage, UserRole, RoleType } from '../../types';
import { ModalPortal } from '../../components/common/ModalPortal';
import {
  MessageSquare,
  Send,
  Inbox,
  AlertTriangle,
  FileText,
  Search,
  CheckCircle2,
  Reply,
  Trash2,
  CheckCheck
} from 'lucide-react';

interface CommunicationsHubViewProps {
  initialThreadId?: string;
}

export const CommunicationsHubView: React.FC<CommunicationsHubViewProps> = ({ initialThreadId }) => {
  const { user } = useAuth();
  const {
    portalMessages,
    sendMessage,
    replyToMessage,
    markMessageAsRead,
    markAllMessagesAsRead,
    deleteMessage,
    staff,
    parents
  } = useSchoolData();

  const [activeTab, setActiveTab] = useState<'INBOX' | 'SENT' | 'DIRECTIVES'>('INBOX');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'NORMAL' | 'URGENT' | 'OFFICIAL_DIRECTIVE'>('ALL');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId || null);

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeRecipientRole, setComposeRecipientRole] = useState<RoleType>('ALL');
  const [composeRecipientId, setComposeRecipientId] = useState<string>('ALL');
  const [composeSubject, setComposeSubject] = useState('');
  const [composePriority, setComposePriority] = useState<'NORMAL' | 'URGENT' | 'OFFICIAL_DIRECTIVE'>('NORMAL');
  const [composeContent, setComposeContent] = useState('');

  // Quick reply input state
  const [replyContent, setReplyContent] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Current active user identity for messaging
  const currentUserId = user?.id || user?.staffId || 'usr-current';
  const currentUserName = user?.name || 'Authorized Portal User';
  const currentUserRole = (user?.role || user?.activeRole || 'SUBJECT_TEACHER') as RoleType;
  const currentUserAvatar = user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

  // Group messages by threadId
  const threadsMap = useMemo(() => {
    const map = new Map<string, PortalMessage[]>();
    // Sort all messages latest first
    const sorted = [...portalMessages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    sorted.forEach(msg => {
      const existing = map.get(msg.threadId) || [];
      existing.push(msg);
      map.set(msg.threadId, existing);
    });
    return map;
  }, [portalMessages]);

  // Filter threads according to activeTab and user role/identity
  const filteredThreads = useMemo(() => {
    const threadsArray: { threadId: string; messages: PortalMessage[]; latestMessage: PortalMessage }[] = [];

    threadsMap.forEach((msgs, thId) => {
      const latest = msgs[0];

      // Tab filtering
      let tabMatch = true;
      if (activeTab === 'INBOX') {
        // Inbox includes messages where user is recipient directly, or recipient is their role, or recipient is ALL (and not sent by current user)
        const hasIncoming = msgs.some(
          m =>
            m.recipientId === currentUserId ||
            String(m.recipientRole) === String(currentUserRole) ||
            m.recipientId === 'ALL' ||
            String(m.recipientRole) === 'ALL'
        );
        tabMatch = hasIncoming;
      } else if (activeTab === 'SENT') {
        // Sent tab: any thread with at least one message sent by current user
        const hasSent = msgs.some(m => m.senderId === currentUserId || m.senderName === currentUserName);
        tabMatch = hasSent;
      } else if (activeTab === 'DIRECTIVES') {
        // Directives tab: any thread with OFFICIAL_DIRECTIVE or URGENT
        const hasDirective = msgs.some(m => m.priority === 'OFFICIAL_DIRECTIVE' || m.priority === 'URGENT');
        tabMatch = hasDirective;
      }

      if (!tabMatch) return;

      // Priority filter
      if (priorityFilter !== 'ALL' && latest.priority !== priorityFilter) {
        return;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesContent = msgs.some(
          m =>
            m.subject.toLowerCase().includes(q) ||
            m.content.toLowerCase().includes(q) ||
            m.senderName.toLowerCase().includes(q) ||
            m.recipientName.toLowerCase().includes(q)
        );
        if (!matchesContent) return;
      }

      threadsArray.push({ threadId: thId, messages: msgs, latestMessage: latest });
    });

    return threadsArray;
  }, [threadsMap, activeTab, priorityFilter, searchQuery, currentUserId, currentUserRole, currentUserName]);

  // Selected thread messages
  const activeThreadMessages = useMemo(() => {
    if (!selectedThreadId) return null;
    const msgs = threadsMap.get(selectedThreadId);
    if (!msgs) return null;
    // For conversation view, order chronologically (oldest first)
    return [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [threadsMap, selectedThreadId]);

  // Auto-select first thread if none selected
  React.useEffect(() => {
    if (!selectedThreadId && filteredThreads.length > 0) {
      setSelectedThreadId(filteredThreads[0].threadId);
    }
  }, [filteredThreads, selectedThreadId]);

  // When a thread is selected, mark received messages as read
  React.useEffect(() => {
    if (selectedThreadId && activeThreadMessages) {
      activeThreadMessages.forEach(msg => {
        if (!msg.isRead && (msg.recipientId === currentUserId || msg.recipientRole === currentUserRole || msg.recipientRole === 'ALL')) {
          markMessageAsRead(msg.id);
        }
      });
    }
  }, [selectedThreadId, activeThreadMessages, currentUserId, currentUserRole, markMessageAsRead]);

  // Available recipients list for Compose Modal
  const candidateRecipients = useMemo(() => {
    if (composeRecipientRole === 'ALL') {
      return [{ id: 'ALL', name: 'All Institutional Users & Broadcast', role: 'ALL' }];
    }
    if (composeRecipientRole === 'PARENT') {
      return [
        { id: 'ALL', name: 'All Registered Parents / Guardians (Broadcast)', role: 'PARENT' },
        ...parents.map(p => {
          const parentName = (p as any).fullName || p.fatherName || p.motherName || (p as any).name || (p as any).email || 'Parent';
          const wardCount = p.wardIds?.length || (p as any).wards?.length || 1;
          return {
            id: p.id,
            name: `${parentName} (${wardCount} ${wardCount === 1 ? 'Ward' : 'Wards'})`,
            role: 'PARENT'
          };
        })
      ];
    }
    // For staff roles
    const matchingStaff = staff.filter(s => {
      const sRole = String(s.role || '');
      const sRoles = Array.isArray((s as any).roles) ? (s as any).roles : [];
      const sTitle = String((s as any).title || '').toUpperCase();
      const compRole = String(composeRecipientRole);

      if (compRole === 'PRINCIPAL') {
        return sRole === 'PRINCIPAL' || sRoles.includes('PRINCIPAL') || sTitle.includes('PRINCIPAL');
      }
      if (compRole === 'VICE_PRINCIPAL_ACADEMICS') {
        return sRole === 'VICE_PRINCIPAL_ACADEMICS' || sRoles.includes('VICE_PRINCIPAL_ACADEMICS') || (sRole.includes('VICE_PRINCIPAL') && sTitle.includes('ACADEMIC'));
      }
      if (compRole === 'VICE_PRINCIPAL_STUDENT_AFFAIRS' || compRole === 'VICE_PRINCIPAL_ADMIN') {
        return sRole.includes('VICE_PRINCIPAL') || sRoles.some((r: string) => r.includes('VICE_PRINCIPAL'));
      }
      if (compRole === 'EXAMINATION_OFFICER' || compRole === 'EXAM_OFFICER') {
        return sRole === 'EXAM_OFFICER' || sRole === 'EXAMINATION_OFFICER' || sRoles.includes('EXAM_OFFICER') || sRoles.includes('EXAMINATION_OFFICER') || sTitle.includes('EXAM');
      }
      if (compRole === 'FORM_MASTER') {
        return sRole === 'FORM_MASTER' || sRoles.includes('FORM_MASTER') || Boolean((s as any).formMasterArmId) || Boolean((s as any).formMasterClassArmId) || sTitle.includes('FORM');
      }
      if (compRole === 'TEACHER' || compRole === 'SUBJECT_TEACHER') {
        return sRole === 'SUBJECT_TEACHER' || sRole === 'TEACHER' || sRoles.includes('TEACHER') || sRoles.includes('SUBJECT_TEACHER') || sRoles.includes('STAFF');
      }
      if (compRole === 'SUPER_ADMIN') {
        return sRole === 'SUPER_ADMIN' || sRoles.includes('SUPER_ADMIN') || sTitle.includes('ADMIN');
      }
      return false;
    });

    return [
      { id: 'ALL', name: `All ${composeRecipientRole.replace(/_/g, ' ')}s (Broadcast)`, role: composeRecipientRole },
      ...matchingStaff.map(s => {
        const extra = (s as any).formMasterArmName || (s as any).title || s.staffId || '';
        return {
          id: s.id,
          name: `${s.name} ${extra ? `(${extra})` : ''}`,
          role: s.role
        };
      })
    ];
  }, [composeRecipientRole, staff, parents]);

  // Apply Quick Template to Compose Modal
  const applyTemplate = (templateType: string) => {
    if (templateType === 'MARKSHEET_REMINDER') {
      setComposeRecipientRole('SUBJECT_TEACHER');
      setComposePriority('URGENT');
      setComposeSubject('Reminder: Outstanding Marksheet Submission & CA Endorsement');
      setComposeContent(
        'Dear Colleague,\n\nPlease be reminded that Continuous Assessment (CA1, CA2, project) and terminal exam marks are due for submission. Kindly log into the portal and complete your subject marksheets today to allow for terminal broadsheet compilation.\n\nThank you for your prompt compliance.'
      );
    } else if (templateType === 'EXAM_BRIEFING') {
      setComposeRecipientRole('SUBJECT_TEACHER');
      setComposePriority('URGENT');
      setComposeSubject('Notice: Exam Hall Invigilation Roster & Security Protocol');
      setComposeContent(
        'Dear Faculty Member,\n\nYou have been assigned to invigilation duty for the upcoming terminal examinations. Please inspect your scheduled shift under your staff portal and report to the Examination Control Room 30 minutes prior to session commencement to receive sealed exam packets.\n\nStrict invigilation standards must be maintained at all times.'
      );
    } else if (templateType === 'EXECUTIVE_DIRECTIVE') {
      setComposeRecipientRole('ALL');
      setComposePriority('OFFICIAL_DIRECTIVE');
      setComposeSubject('Executive Circular: Academic Calendar & Examination Operations');
      setComposeContent(
        'Executive Management Directive:\n\nAll departments and academic offices are hereby instructed to adhere strictly to the published end-of-term academic schedule. Results approvals and pastoral remarking must conclude within 48 hours of exam completion.\n\nBy Order of the Principal & Executive Council.'
      );
    } else if (templateType === 'PARENT_COMMUNICATION') {
      setComposeRecipientRole('PARENT');
      setComposePriority('NORMAL');
      setComposeSubject('Institutional Update: Terminal Examination Schedule & Academic Progress');
      setComposeContent(
        'Dear Esteemed Parent / Guardian,\n\nWe are pleased to notify you that the examination timetable for the current academic term is now accessible in the parent portal. Please encourage your ward to review the schedule and prepare diligently.\n\nThank you for partnering with us in nurturing excellence.'
      );
    }
  };

  const handleSendCompose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeSubject.trim() || !composeContent.trim()) return;

    let targetRecipientName = 'All Portal Users';
    const foundTarget = candidateRecipients.find(r => r.id === composeRecipientId);
    if (foundTarget) {
      targetRecipientName = foundTarget.name;
    }

    const newThreadId = `th-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    sendMessage({
      threadId: newThreadId,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      senderAvatarUrl: currentUserAvatar,
      recipientId: composeRecipientId,
      recipientName: targetRecipientName,
      recipientRole: composeRecipientRole as RoleType,
      subject: composeSubject.trim(),
      content: composeContent.trim(),
      priority: composePriority
    });

    setIsComposeOpen(false);
    setComposeSubject('');
    setComposeContent('');
    setSelectedThreadId(newThreadId);
    showNotification(`Message dispatched successfully to ${targetRecipientName}!`);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThreadId || !replyContent.trim()) return;

    replyToMessage(selectedThreadId, replyContent.trim(), {
      id: currentUserId,
      name: currentUserName,
      role: currentUserRole,
      avatarUrl: currentUserAvatar
    });

    setReplyContent('');
    showNotification('Reply sent successfully.');
  };

  // Calculate total unread messages for current user
  const totalUnreadCount = useMemo(() => {
    return portalMessages.filter(
      m =>
        !m.isRead &&
        (m.recipientId === currentUserId ||
          String(m.recipientRole) === String(currentUserRole) ||
          m.recipientId === 'ALL' ||
          String(m.recipientRole) === 'ALL')
    ).length;
  }, [portalMessages, currentUserId, currentUserRole]);

  return (
    <div className="space-y-6">
      {/* Toast Notification Bar */}
      {actionNotice && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-2xl animate-fade-in text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Institutional Communications & Directives
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Bidirectional verified correspondence across Super Admin, Principals, Form Masters, Teachers, and Parents
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {totalUnreadCount > 0 && (
            <button
              onClick={() => {
                markAllMessagesAsRead(currentUserId);
                markAllMessagesAsRead(currentUserRole);
                showNotification('All pending messages marked as read.');
              }}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4 text-indigo-500" />
              Mark All as Read ({totalUnreadCount})
            </button>
          )}

          <button
            onClick={() => setIsComposeOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm shadow-md hover:shadow-indigo-500/20 transition flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Compose Message / Directive</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Tabs, Search, and Priority Filter */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('INBOX')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'INBOX'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Inbox</span>
            {totalUnreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full">
                {totalUnreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('SENT')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'SENT'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Sent Messages</span>
          </button>

          <button
            onClick={() => setActiveTab('DIRECTIVES')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'DIRECTIVES'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Executive Directives</span>
          </button>
        </div>

        {/* Search & Priority Controls */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search correspondence..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="OFFICIAL_DIRECTIVE">Official Directive</option>
            <option value="URGENT">Urgent Priority</option>
            <option value="NORMAL">Normal</option>
          </select>
        </div>
      </div>

      {/* Main Split Layout: Left Thread List | Right Active Thread Conversation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
        {/* Left Column: Thread List */}
        <div className="lg:col-span-5 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Conversations ({filteredThreads.length})
            </span>
            <span className="text-[11px] text-slate-400">Chronological</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 max-h-[680px]">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <Inbox className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium">No messages found</p>
                <p className="text-xs mt-1 text-slate-400">Try adjusting your tab or search filter</p>
              </div>
            ) : (
              filteredThreads.map(({ threadId, messages, latestMessage }) => {
                const isSelected = selectedThreadId === threadId;
                const hasUnread = messages.some(
                  m =>
                    !m.isRead &&
                    (m.recipientId === currentUserId ||
                      String(m.recipientRole) === String(currentUserRole) ||
                      m.recipientId === 'ALL' ||
                      String(m.recipientRole) === 'ALL')
                );

                return (
                  <button
                    key={threadId}
                    onClick={() => setSelectedThreadId(threadId)}
                    className={`w-full text-left p-4 transition flex flex-col gap-2 relative ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-l-4 border-indigo-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {hasUnread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0 ring-4 ring-indigo-100 dark:ring-indigo-950" />
                        )}
                        <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {latestMessage.senderName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                          {latestMessage.senderRole.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(latestMessage.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {latestMessage.priority === 'OFFICIAL_DIRECTIVE' && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded">
                          Official Directive
                        </span>
                      )}
                      {latestMessage.priority === 'URGENT' && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded">
                          Urgent
                        </span>
                      )}
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {latestMessage.subject}
                      </p>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {latestMessage.content}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <span>To: {latestMessage.recipientName}</span>
                      <span>{messages.length} {messages.length === 1 ? 'message' : 'messages'}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Thread Messages & Reply Input */}
        <div className="lg:col-span-7 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {activeThreadMessages && activeThreadMessages.length > 0 ? (
            <>
              {/* Thread Header */}
              <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeThreadMessages[0].priority === 'OFFICIAL_DIRECTIVE' && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white rounded-md">
                        Official Executive Directive
                      </span>
                    )}
                    {activeThreadMessages[0].priority === 'URGENT' && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white rounded-md">
                        Urgent Action Required
                      </span>
                    )}
                    <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                      {activeThreadMessages[0].subject}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Participants: {Array.from(new Set(activeThreadMessages.map(m => m.senderName))).join(', ')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      activeThreadMessages.forEach(m => deleteMessage(m.id));
                      setSelectedThreadId(null);
                      showNotification('Conversation deleted.');
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                    title="Delete Conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message History Scroller */}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 max-h-[500px]">
                {activeThreadMessages.map(msg => {
                  const isMine = msg.senderId === currentUserId || msg.senderName === currentUserName;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          {isMine ? 'You' : msg.senderName}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {msg.senderRole.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                          isMine
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/60 dark:border-slate-700/60'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {msg.relatedEntity && (
                        <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          <span>
                            Linked {msg.relatedEntity.type.replace(/_/g, ' ')}: {msg.relatedEntity.label || msg.relatedEntity.name || msg.relatedEntity.id}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Reply Input Box */}
              <form
                onSubmit={handleSendReply}
                className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-end gap-3"
              >
                <div className="flex-1">
                  <textarea
                    rows={3}
                    placeholder="Type your reply here..."
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!replyContent.trim()}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm shadow-md transition flex items-center gap-2 shrink-0"
                >
                  <Reply className="w-4 h-4" />
                  <span>Reply</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
                Select a conversation
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Choose a conversation from the left pane to review communication history or reply, or compose a new directive.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compose New Message / Directive Modal */}
      <ModalPortal isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} maxWidthClass="max-w-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Dispatch New Message or Executive Directive
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Transmitted across the unified EIS ledger with real-time receipt notification
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsComposeOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              ✕
            </button>
          </div>

          {/* Quick Templates Bar */}
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
              Quick Institutional Templates
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyTemplate('MARKSHEET_REMINDER')}
                className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 rounded-lg transition"
              >
                Marksheet Reminder
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('EXAM_BRIEFING')}
                className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 rounded-lg transition"
              >
                Exam Duty Briefing
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('EXECUTIVE_DIRECTIVE')}
                className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 rounded-lg transition"
              >
                Executive Directive
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('PARENT_COMMUNICATION')}
                className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 rounded-lg transition"
              >
                Parent Advisory
              </button>
            </div>
          </div>

          <form onSubmit={handleSendCompose} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recipient Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Role Group
                </label>
                <select
                  value={composeRecipientRole}
                  onChange={e => {
                    const newRole = e.target.value as any;
                    setComposeRecipientRole(newRole);
                    setComposeRecipientId('ALL');
                  }}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="ALL">All Roles / Global Broadcast</option>
                  <option value="PRINCIPAL">Principal & Head of School</option>
                  <option value="VICE_PRINCIPAL_ACADEMICS">Vice Principal Academics</option>
                  <option value="VICE_PRINCIPAL_STUDENT_AFFAIRS">Vice Principal Student Affairs</option>
                  <option value="EXAMINATION_OFFICER">Examination Officer</option>
                  <option value="FORM_MASTER">Form Masters</option>
                  <option value="TEACHER">Subject Teachers</option>
                  <option value="PARENT">Parents / Guardians</option>
                  <option value="SUPER_ADMIN">Super Administrator</option>
                </select>
              </div>

              {/* Specific Recipient Individual */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Specific Individual
                </label>
                <select
                  value={composeRecipientId}
                  onChange={e => setComposeRecipientId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {candidateRecipients.map(cand => (
                    <option key={cand.id} value={cand.id}>
                      {cand.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority & Subject */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority Status
                </label>
                <select
                  value={composePriority}
                  onChange={e => setComposePriority(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="NORMAL">Normal Priority</option>
                  <option value="URGENT">Urgent (Red Alert)</option>
                  <option value="OFFICIAL_DIRECTIVE">Official Directive (Seal)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject / Heading
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., SSS 2 Gold: Final Marksheet Submission Deadline"
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Message Content / Directive Instructions
              </label>
              <textarea
                required
                rows={6}
                placeholder="Enter detailed directives, instructions, or queries..."
                value={composeContent}
                onChange={e => setComposeContent(e.target.value)}
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 resize-none font-sans"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-indigo-500/20 transition flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Transmit Message</span>
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>
    </div>
  );
};
