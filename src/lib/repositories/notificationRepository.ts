/**
 * Notification Repository (Phase 13)
 * ====================================
 * Data-access layer for platform notifications. Server-side only.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DbNotification } from '@/lib/supabase/types';
import type { ListOptions, ListResult, CrudResult } from './index';

export class NotificationRepository {
  async getAll(opts: ListOptions = {}): Promise<ListResult<DbNotification>> {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('notifications').select('*', { count: 'exact' });
    query = query.order(opts.orderBy ?? 'created_at', { ascending: false });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getByUser(userId: string, opts: ListOptions = {}): Promise<ListResult<DbNotification>> {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('notifications').select('*', { count: 'exact' }).eq('user_id', userId);
    query = query.order(opts.orderBy ?? 'created_at', { ascending: false });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getByRole(role: string, opts: ListOptions = {}): Promise<ListResult<DbNotification>> {
    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('recipient_role', role);
    query = query.order(opts.orderBy ?? 'created_at', { ascending: false });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async markRead(id: string): Promise<CrudResult<DbNotification>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data, error: null };
  }

  async markAllReadForUser(userId: string): Promise<{ count: number; error: Error | null }> {
    const supabase = createServerSupabaseClient();
    const { count, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    return { count: count ?? 0, error };
  }

  async create(payload: Partial<DbNotification>): Promise<CrudResult<DbNotification>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('notifications').insert(payload).select().single();
    if (error) return { data: null, error };
    return { data, error: null };
  }
}

export const notificationRepo = new NotificationRepository();
