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
  CheckCheck,
  X,
  Sparkles,
  Users,
  UserCheck,
  Check,
  ShieldCheck,
  AlertCircle,
  Ban,
  UserPlus
} from 'lucide-react';

export interface RoleOption {
  role: RoleType;
  label: string;
  category: 'STAFF' | 'EXTERNAL';
}

export const normalizeRole = (role?: string | null): string => {
  if (!role) return '';
  const r = String(role).trim().toUpperCase();
  if (r.startsWith('VICE_PRINCIPAL')) return 'VICE_PRINCIPAL';
  if (r === 'EXAM_OFFICER' || r === 'EXAMINATION_OFFICER') return 'EXAMINATION_OFFICER';
  if (r === 'TEACHER' || r === 'SUBJECT_TEACHER') return 'SUBJECT_TEACHER';
  if (r === 'SUPER_ADMIN' || r === 'ADMIN') return 'SUPER_ADMIN';
  if (r === 'FORM_MASTER') return 'FORM_MASTER';
  if (r === 'PRINCIPAL') return 'PRINCIPAL';
  if (r === 'PARENT') return 'PARENT';
  if (r === 'STUDENT') return 'STUDENT';
  return r;
};

export const rolesMatch = (r1?: string | null, r2?: string | null): boolean => {
  return normalizeRole(r1) === normalizeRole(r2);
};

export const ROLE_OPTIONS: RoleOption[] = [
  { role: 'PRINCIPAL', label: 'Principal', category: 'STAFF' },
  { role: 'VICE_PRINCIPAL', label: 'Vice Principal', category: 'STAFF' },
  { role: 'EXAMINATION_OFFICER', label: 'Exam Officer', category: 'STAFF' },
  { role: 'FORM_MASTER', label: 'Form Masters', category: 'STAFF' },
  { role: 'SUBJECT_TEACHER', label: 'Subject Teachers', category: 'STAFF' },
  { role: 'SUPER_ADMIN', label: 'Super Admin', category: 'STAFF' },
  { role: 'PARENT', label: 'Parents / Guardians', category: 'EXTERNAL' },
  { role: 'STUDENT', label: 'Students', category: 'EXTERNAL' },
];

const STAFF_ROLES: RoleType[] = [
  'PRINCIPAL',
  'VICE_PRINCIPAL',
  'EXAMINATION_OFFICER',
  'FORM_MASTER',
  'SUBJECT_TEACHER',
  'SUPER_ADMIN'
];

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
    parents,
    students
  } = useSchoolData();

  const [activeTab, setActiveTab] = useState<'INBOX' | 'SENT' | 'DIRECTIVES'>('INBOX');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'NORMAL' | 'URGENT' | 'OFFICIAL_DIRECTIVE'>('ALL');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId || null);

  // Compose Modal State: Starts completely unclicked (empty) by default so the user is in full control
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<RoleType[]>([]);
  const [selectedIndividualIds, setSelectedIndividualIds] = useState<string[]>([]);
  const [individualSearchQuery, setIndividualSearchQuery] = useState('');
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

  // Extract all roles possessed by the current user (e.g. dual-role Form Master + Subject Teacher, or activeRole)
  const currentUserRoles = useMemo(() => {
    const roles: string[] = [];
    if (user?.role) roles.push(user.role);
    if (user?.activeRole) roles.push(user.activeRole);
    if (Array.isArray((user as any)?.assignedRoles)) roles.push(...(user as any).assignedRoles);
    if (Array.isArray((user as any)?.roles)) roles.push(...(user as any).roles);
    return Array.from(new Set(roles));
  }, [user]);

  // Group messages by threadId and deduplicate identical message entries within each thread
  const threadsMap = useMemo(() => {
    const map = new Map<string, PortalMessage[]>();
    const sorted = [...portalMessages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    sorted.forEach(msg => {
      const existing = map.get(msg.threadId) || [];
      // Deduplicate messages with identical content and sender within thread
      const isDuplicate = existing.some(
        ex => ex.id === msg.id || (
          ex.senderId === msg.senderId &&
          ex.content.trim() === msg.content.trim() &&
          Math.abs(new Date(ex.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 10000
        )
      );
      if (!isDuplicate) {
        existing.push(msg);
        map.set(msg.threadId, existing);
      }
    });
    return map;
  }, [portalMessages]);

  // Check if a message is intended for the current user (respecting multi-role, role aliases, and exclusions)
  const isMessageForCurrentUser = (m: PortalMessage): boolean => {
    // 1. Direct recipient match by user id / staff id
    if (m.recipientId && m.recipientId !== 'ALL' && (m.recipientId === currentUserId || (user?.staffId && m.recipientId === user.staffId))) {
      return true;
    }

    // 2. Multi-role targeting with role exclusions & alias normalization
    const targetRoles = m.relatedEntity?.targetRoles;
    if (Array.isArray(targetRoles) && targetRoles.length > 0) {
      const normTargets = targetRoles.map(normalizeRole);
      const roleMatch = currentUserRoles.some(ur => normTargets.includes(normalizeRole(ur)));
      const indMatch = Array.isArray(m.relatedEntity?.targetIndividualIds) && (
        m.relatedEntity.targetIndividualIds.includes(currentUserId) ||
        (Boolean(user?.staffId) && m.relatedEntity.targetIndividualIds.includes(user!.staffId!))
      );
      return roleMatch || indMatch;
    }

    // 3. Multi-individual targeting
    const targetUsers = m.relatedEntity?.targetIndividualIds;
    if (Array.isArray(targetUsers) && targetUsers.length > 0) {
      return targetUsers.includes(currentUserId) || (Boolean(user?.staffId) && targetUsers.includes(user!.staffId!));
    }

    // 4. Legacy single recipientRole match with alias normalization
    if (m.recipientRole && currentUserRoles.some(ur => rolesMatch(ur, m.recipientRole))) {
      return true;
    }
    if (m.recipientRole === 'ALL' || m.recipientId === 'ALL') {
      return true;
    }

    return false;
  };

  // Filter threads according to activeTab and user role/identity
  const filteredThreads = useMemo(() => {
    const threadsArray: { threadId: string; messages: PortalMessage[]; latestMessage: PortalMessage }[] = [];

    threadsMap.forEach((msgs, thId) => {
      const latest = msgs[0];

      let tabMatch = true;
      if (activeTab === 'INBOX') {
        const hasIncoming = msgs.some(m => isMessageForCurrentUser(m));
        tabMatch = hasIncoming;
      } else if (activeTab === 'SENT') {
        const hasSent = msgs.some(m => m.senderId === currentUserId || m.senderName === currentUserName);
        tabMatch = hasSent;
      } else if (activeTab === 'DIRECTIVES') {
        const hasDirective = msgs.some(m => (m.priority === 'OFFICIAL_DIRECTIVE' || m.priority === 'URGENT') && isMessageForCurrentUser(m));
        tabMatch = hasDirective;
      }

      if (!tabMatch) return;

      if (priorityFilter !== 'ALL' && latest.priority !== priorityFilter) {
        return;
      }

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
  }, [threadsMap, activeTab, priorityFilter, searchQuery, currentUserId, currentUserRoles, currentUserName]);

  // Selected thread messages
  const activeThreadMessages = useMemo(() => {
    if (!selectedThreadId) return null;
    const msgs = threadsMap.get(selectedThreadId);
    if (!msgs) return null;
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
        if (!msg.isRead && isMessageForCurrentUser(msg)) {
          markMessageAsRead(msg.id);
        }
      });
    }
  }, [selectedThreadId, activeThreadMessages, currentUserId, currentUserRoles, markMessageAsRead]);

  // Master directory of all individual accounts across Staff, Parents, and Students
  const allAvailableIndividuals = useMemo(() => {
    const list: { id: string; name: string; role: RoleType; category: 'STAFF' | 'PARENT' | 'STUDENT'; subtitle: string }[] = [];

    // 1. Staff Members
    (staff || []).forEach(s => {
      const extra = (s as any).formMasterArmName || (s as any).title || s.staffId || '';
      list.push({
        id: s.id,
        name: s.name,
        role: (s.role || 'SUBJECT_TEACHER') as RoleType,
        category: 'STAFF',
        subtitle: `Staff • ${s.title || s.role || 'Faculty'}${extra ? ` (${extra})` : ''}`
      });
    });

    // 2. Parents / Guardians
    (parents || []).forEach(p => {
      const parentName = (p as any).fullName || p.fatherName || p.motherName || (p as any).name || (p as any).email || 'Parent';
      const wardCount = p.wardIds?.length || (p as any).wards?.length || 1;
      list.push({
        id: p.id,
        name: parentName,
        role: 'PARENT',
        category: 'PARENT',
        subtitle: `Parent • ${wardCount} ${wardCount === 1 ? 'Ward' : 'Wards'}`
      });
    });

    // 3. Students
    (students || []).forEach(st => {
      list.push({
        id: st.id,
        name: st.name || `${st.firstName} ${st.lastName}`,
        role: 'STUDENT',
        category: 'STUDENT',
        subtitle: `Student • ${st.admissionNumber || ''} (${st.currentClassArmName || ''})`
      });
    });

    return list;
  }, [staff, parents, students]);

  // Filtered candidate individuals based on search
  const filteredCandidates = useMemo(() => {
    if (!individualSearchQuery.trim()) {
      return allAvailableIndividuals.slice(0, 15);
    }
    const q = individualSearchQuery.toLowerCase();
    return allAvailableIndividuals.filter(
      cand => cand.name.toLowerCase().includes(q) || cand.subtitle.toLowerCase().includes(q) || cand.role.toLowerCase().includes(q)
    ).slice(0, 25);
  }, [allAvailableIndividuals, individualSearchQuery]);

  // Toggle role in selectedRoles
  const handleToggleRole = (role: RoleType) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  // Quick Select Presets
  const handleSelectAllStaff = () => {
    setSelectedRoles([...STAFF_ROLES]);
  };

  const handleSelectAllPortal = () => {
    setSelectedRoles(ROLE_OPTIONS.map(ro => ro.role));
  };

  const handleClearAllRoles = () => {
    setSelectedRoles([]);
  };

  // Toggle individual selection
  const handleAddIndividual = (id: string) => {
    if (!selectedIndividualIds.includes(id)) {
      setSelectedIndividualIds(prev => [...prev, id]);
    }
    setIndividualSearchQuery('');
  };

  const handleRemoveIndividual = (id: string) => {
    setSelectedIndividualIds(prev => prev.filter(i => i !== id));
  };

  // Quick Templates
  const applyTemplate = (templateType: string) => {
    if (templateType === 'MARKSHEET_REMINDER') {
      setSelectedRoles(['SUBJECT_TEACHER', 'FORM_MASTER']);
      setSelectedIndividualIds([]);
      setComposePriority('URGENT');
      setComposeSubject('Reminder: Outstanding Marksheet Submission & CA Endorsement');
      setComposeContent(
        'Dear Colleague,\n\nPlease be reminded that Continuous Assessment (CA1, CA2, project) and terminal exam marks are due for submission. Kindly log into the portal and complete your subject marksheets today to allow for terminal broadsheet compilation.\n\nThank you for your prompt compliance.'
      );
    } else if (templateType === 'EXAM_BRIEFING') {
      setSelectedRoles(['PRINCIPAL', 'VICE_PRINCIPAL', 'EXAMINATION_OFFICER', 'SUBJECT_TEACHER', 'FORM_MASTER']);
      setSelectedIndividualIds([]);
      setComposePriority('URGENT');
      setComposeSubject('Notice: Exam Hall Invigilation Roster & Security Protocol');
      setComposeContent(
        'Dear Faculty Member,\n\nYou have been assigned to invigilation duty for the upcoming terminal examinations. Please inspect your scheduled shift under your staff portal and report to the Examination Control Room 30 minutes prior to session commencement to receive sealed exam packets.\n\nStrict invigilation standards must be maintained at all times.'
      );
    } else if (templateType === 'EXECUTIVE_DIRECTIVE') {
      setSelectedRoles([...STAFF_ROLES]);
      setSelectedIndividualIds([]);
      setComposePriority('OFFICIAL_DIRECTIVE');
      setComposeSubject('Executive Circular: Academic Calendar & Examination Operations');
      setComposeContent(
        'Executive Management Directive:\n\nAll departments and academic offices are hereby instructed to adhere strictly to the published end-of-term academic schedule. Results approvals and pastoral remarking must conclude within 48 hours of exam completion.\n\nBy Order of the Principal & Executive Council.'
      );
    } else if (templateType === 'PARENT_COMMUNICATION') {
      setSelectedRoles(['PARENT']);
      setSelectedIndividualIds([]);
      setComposePriority('NORMAL');
      setComposeSubject('Institutional Update: Terminal Examination Schedule & Academic Progress');
      setComposeContent(
        'Dear Esteemed Parent / Guardian,\n\nWe are pleased to notify you that the examination timetable for the current academic term is now accessible in the parent portal. Please encourage your ward to review the schedule and prepare diligently.\n\nThank you for partnering with us in nurturing excellence.'
      );
    }
  };

  // Targeted & Excluded Roles computation for real-time validation & badge display
  const targetedRolesList = useMemo(() => {
    return ROLE_OPTIONS.filter(ro => selectedRoles.includes(ro.role));
  }, [selectedRoles]);

  const excludedRolesList = useMemo(() => {
    return ROLE_OPTIONS.filter(ro => !selectedRoles.includes(ro.role));
  }, [selectedRoles]);

  const handleSendCompose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeSubject.trim() || !composeContent.trim()) return;

    if (selectedRoles.length === 0 && selectedIndividualIds.length === 0) {
      showNotification('Please select at least one recipient role group or individual account.');
      return;
    }

    // Build audience summary
    let audienceSummary = '';
    if (selectedRoles.length === ROLE_OPTIONS.length) {
      audienceSummary = 'All Portal Users (Global Broadcast)';
    } else if (selectedRoles.length > 0) {
      audienceSummary = targetedRolesList.map(r => r.label).join(', ');
    }

    if (selectedIndividualIds.length > 0) {
      const indNames = selectedIndividualIds
        .map(id => allAvailableIndividuals.find(ind => ind.id === id)?.name || id)
        .slice(0, 3)
        .join(', ');
      const extraCount = selectedIndividualIds.length - 3;
      const indSummary = extraCount > 0 ? `${indNames} +${extraCount} more` : indNames;
      audienceSummary = audienceSummary ? `${audienceSummary} • Individual(s): ${indSummary}` : `Direct: ${indSummary}`;
    }

    const newThreadId = `th-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const primaryRole: RoleType = selectedRoles.length === 1 ? selectedRoles[0] : 'ALL';
    const primaryRecipientId = selectedRoles.length === 0 && selectedIndividualIds.length === 1 ? selectedIndividualIds[0] : 'ALL';

    sendMessage({
      threadId: newThreadId,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      senderAvatarUrl: currentUserAvatar,
      recipientId: primaryRecipientId,
      recipientName: audienceSummary,
      recipientRole: primaryRole,
      subject: composeSubject.trim(),
      content: composeContent.trim(),
      priority: composePriority,
      relatedEntity: {
        type: 'GENERAL',
        targetRoles: selectedRoles,
        targetIndividualIds: selectedIndividualIds,
        audienceSummary: audienceSummary
      }
    });

    setIsComposeOpen(false);
    setComposeSubject('');
    setComposeContent('');
    setSelectedThreadId(newThreadId);
    showNotification(`Message dispatched successfully to ${audienceSummary}!`);
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
    return portalMessages.filter(m => !m.isRead && isMessageForCurrentUser(m)).length;
  }, [portalMessages, currentUserId, currentUserRoles]);

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
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Sticky Modal Header */}
          <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm shrink-0">
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  Dispatch Message / Directive
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate hidden xs:block sm:block">
                  Transmitted across the unified EIS ledger with real-time receipt notification
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsComposeOpen(false)}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition shrink-0 ml-2"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <form id="compose-message-form" onSubmit={handleSendCompose} className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 overscroll-contain">
            {/* Quick Templates Bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Quick Institutional Templates</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => applyTemplate('MARKSHEET_REMINDER')}
                  className="whitespace-nowrap px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg shadow-2xs transition shrink-0"
                >
                  📋 Marksheet Reminder
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('EXAM_BRIEFING')}
                  className="whitespace-nowrap px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg shadow-2xs transition shrink-0"
                >
                  📝 Exam Duty Briefing
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('EXECUTIVE_DIRECTIVE')}
                  className="whitespace-nowrap px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg shadow-2xs transition shrink-0"
                >
                  ⚖️ Executive Directive
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('PARENT_COMMUNICATION')}
                  className="whitespace-nowrap px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg shadow-2xs transition shrink-0"
                >
                  👨‍👩‍👧 Parent Advisory
                </button>
              </div>
            </div>
            {/* 1. Multi-Role Recipient Selection */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span>Target Recipient Role Groups</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Select one or multiple roles to receive this communication. Roles not selected are strictly excluded.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSelectAllStaff}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1"
                    title="Select Principal, Vice Principal, Form Masters, Teachers, Exam Officer, Super Admin (Excludes Parents & Students)"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>All Staff Only (Exclude Parents)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllPortal}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
                  >
                    All Portal Users
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllRoles}
                    className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Role Toggle Chips - Clean, compact, elegant pill buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {ROLE_OPTIONS.map(opt => {
                  const isSelected = selectedRoles.includes(opt.role);
                  return (
                    <button
                      key={opt.role}
                      type="button"
                      onClick={() => handleToggleRole(opt.role)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-white text-indigo-600'
                            : 'border border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Live Target & Exclusion Summary Bar */}
              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <strong>Targeting:</strong>{' '}
                    {targetedRolesList.length > 0
                      ? targetedRolesList.map(r => r.label).join(', ')
                      : 'None selected'}
                  </span>
                </div>

                {excludedRolesList.length > 0 && (
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/80 dark:border-rose-900/50">
                    <Ban className="w-3 h-3 shrink-0" />
                    <span>
                      <strong>Excluded:</strong> {excludedRolesList.map(r => r.label).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Specific Individual Accounts Multi-Select */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Specific Individual Accounts</span>
                  <span className="text-slate-400 font-normal text-[11px]">(Optional — Target specific persons directly)</span>
                </label>
                {selectedIndividualIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIndividualIds([])}
                    className="text-[11px] text-rose-500 hover:text-rose-600 font-medium transition"
                  >
                    Clear Selected ({selectedIndividualIds.length})
                  </button>
                )}
              </div>

              {/* Selected Individuals Chips */}
              {selectedIndividualIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[38px]">
                  {selectedIndividualIds.map(id => {
                    const person = allAvailableIndividuals.find(p => p.id === id);
                    if (!person) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 animate-in fade-in duration-100"
                      >
                        <UserCheck className="w-3 h-3 text-indigo-500" />
                        <span>{person.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIndividual(id)}
                          className="hover:text-rose-600 p-0.5 rounded transition"
                          title="Remove recipient"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Individual Search & Add Dropdown */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search faculty, form masters, parents, or students by name..."
                      value={individualSearchQuery}
                      onChange={e => setIndividualSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                    {individualSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setIndividualSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Candidate Dropdown when searching */}
                {individualSearchQuery.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 p-1.5 space-y-0.5">
                    {filteredCandidates.length > 0 ? (
                      filteredCandidates.map(cand => {
                        const isAdded = selectedIndividualIds.includes(cand.id);
                        return (
                          <button
                            key={cand.id}
                            type="button"
                            onClick={() => handleAddIndividual(cand.id)}
                            disabled={isAdded}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                              isAdded
                                ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800'
                                : 'hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-900 dark:text-white'
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="font-semibold">{cand.name}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2">
                                {cand.subtitle}
                              </span>
                            </div>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                              {isAdded ? 'Added' : '+ Add'}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No individuals found matching &quot;{individualSearchQuery}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Priority & Subject */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Priority Status
                </label>
                <select
                  value={composePriority}
                  onChange={e => setComposePriority(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-850 outline-none transition"
                >
                  <option value="NORMAL">🟢 Normal Priority</option>
                  <option value="URGENT">🔴 Urgent (High Priority)</option>
                  <option value="OFFICIAL_DIRECTIVE">⚖️ Official Directive</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Subject / Heading <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Academic Staff Briefing: Examination Hall Roster & Protocol"
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-850 outline-none transition"
                />
              </div>
            </div>

            {/* 4. Message Content */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Message Content / Directive Instructions <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Enter detailed directives, instructions, or queries..."
                value={composeContent}
                onChange={e => setComposeContent(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-normal text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-850 outline-none resize-none transition"
              />
            </div>
          </form>

          {/* Sticky Bottom Action Bar */}
          <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 z-10">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {selectedRoles.length > 0 || selectedIndividualIds.length > 0 ? (
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                  Ready: {selectedRoles.length} role{selectedRoles.length === 1 ? '' : 's'}
                  {selectedIndividualIds.length > 0 ? `, ${selectedIndividualIds.length} direct` : ''}
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Select recipient(s)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="compose-message-form"
                disabled={selectedRoles.length === 0 && selectedIndividualIds.length === 0}
                className="px-4 sm:px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit Message</span>
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};
