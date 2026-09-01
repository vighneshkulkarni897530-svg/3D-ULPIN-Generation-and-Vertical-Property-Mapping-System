/**
 * Workflow Task Repository (Phase 13)
 * =====================================
 * Data-access layer for workflow task assignments. Server-side only.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DbWorkflowTask } from '@/lib/supabase/types';
import type { ListOptions, ListResult, CrudResult } from './index';

export class WorkflowRepository {
  async getAll(opts: ListOptions = {}): Promise<ListResult<DbWorkflowTask>> {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('workflow_tasks').select('*', { count: 'exact' });
    query = query.order(opts.orderBy ?? 'created_at', { ascending: false });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getById(id: string): Promise<CrudResult<DbWorkflowTask>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('workflow_tasks').select('*').eq('id', id).single();
    if (error) return { data: null, error };
    return { data, error: null };
  }

  async getByStatus(status: string): Promise<ListResult<DbWorkflowTask>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('workflow_tasks')
      .select('*', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async getByAssignees(assigneeIds: string[]): Promise<ListResult<DbWorkflowTask>> {
    const supabase = createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from('workflow_tasks')
      .select('*', { count: 'exact' })
      .in('assigned_officer_id', assigneeIds);
    if (error) return { data: [], count: null, error };
    return { data: data ?? [], count, error: null };
  }

  async create(payload: Partial<DbWorkflowTask>): Promise<CrudResult<DbWorkflowTask>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('workflow_tasks').insert(payload).select().single();
    if (error) return { data: null, error };
    return { data, error: null };
  }

  async update(id: string, patch: Partial<DbWorkflowTask>): Promise<CrudResult<DbWorkflowTask>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('workflow_tasks')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data, error: null };
  }
}

export const workflowRepo = new WorkflowRepository();
