'use client';

/**
 * /resident/notifications — Citizen Notification Center (Phase 10)
 * =================================================================
 * In-app notification center for citizen alerts, case status changes,
 * government decisions, and residency approvals.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Lock,
  Sparkles,
  ArrowRight,
  Clock,
  ExternalLink,
  CheckCircle2,
  Info,
  Layers,
  XCircle,
  RefreshCw,
} from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/context/AuthContext';
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllMyNotificationsAsRead,
} from '@/lib/citizen/notificationService';
import { type CitizenNotification } from '@/types/citizenNotification';

export default function ResidentNotificationsPage() {
  return (
    <ProtectedRoute>
      <ResidentNotificationsContent />
    </ProtectedRoute>
  );
}

function ResidentNotificationsContent() {
  const router = useRouter();
  const { sessionUser, authStatus } = useAuth();
  const [notifications, setNotifications] = React.useState<CitizenNotification[]>([]);
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadNotifications = React.useCallback(async () => {
    try {
      const items = await getMyNotifications(50);
      setNotifications(items);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    if (authStatus === 'authenticated') {
      loadNotifications();
    }
  }, [authStatus, loadNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllMyNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const filtered = React.useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getSeverityIcon = (sev: CitizenNotification['severity'], type: CitizenNotification['type']) => {
    if (type === 'GOVERNMENT_DECISION' || type === 'VERIFICATION_APPROVED' || type === 'CLAIM_APPROVED') {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
    if (sev === 'CRITICAL' || type === 'CLAIM_REJECTED' || type === 'VERIFICATION_REJECTED') {
      return <XCircle className="h-4 w-4 text-rose-500" />;
    }
    if (sev === 'WARNING' || type === 'VERIFICATION_REQUIRES_CORRECTION') {
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
    return <Info className="h-4 w-4 text-cyan-500" />;
  };

  const getSeverityBadge = (sev: CitizenNotification['severity']) => {
    switch (sev) {
      case 'CRITICAL':
        return <Badge variant="destructive" className="text-[10px]">CRITICAL</Badge>;
      case 'WARNING':
        return <Badge variant="secondary" className="border-amber-200 bg-amber-50 text-amber-800 text-[10px]">ALERT</Badge>;
      case 'SUCCESS':
        return <Badge variant="secondary" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px]">COMPLETED</Badge>;
      default:
        return <Badge variant="secondary" className="border-cyan-200 bg-cyan-50 text-cyan-800 text-[10px]">INFO</Badge>;
    }
  };

  const formatTimestamp = (d: Date) => {
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="CITIZEN NOTIFICATIONS · PHASE 10"
        title="Notification Centre"
        description="Real-time alerts on your property claims, cadastral verifications, dispute cases, and government determinations."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefreshing(true);
                loadNotifications();
              }}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Mark All Read
            </Button>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="mt-6 flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === 'unread'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-400">
          Showing {filtered.length} notification{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Notification List */}
      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            description={
              filter === 'unread'
                ? 'You have caught up with all your alerts and workflow notices.'
                : 'When government verification decisions, case updates, or claim reviews occur, they will appear here.'
            }
          />
        ) : (
          filtered.map((item) => (
            <Card
              key={item.id}
              className={`transition-all border ${
                item.read
                  ? 'border-slate-200 bg-white'
                  : 'border-cyan-200 bg-cyan-50/40 shadow-sm'
              }`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 rounded-lg bg-white p-2 border border-slate-200 shadow-2xs">
                    {getSeverityIcon(item.severity, item.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                          {item.title}
                        </h4>
                        {getSeverityBadge(item.severity)}
                        {!item.read && (
                          <span className="h-2 w-2 rounded-full bg-cyan-500" />
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatTimestamp(item.createdAt)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {item.linkUrl && (
                        <Link
                          href={item.linkUrl}
                          onClick={() => handleMarkRead(item.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-cyan-700 hover:text-cyan-800 hover:underline"
                        >
                          Open record <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}

                      {!item.read && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(item.id)}
                          className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
