/**
 * User Repository (Phase 13)
 * ============================
 * Data-access layer for user accounts. Server-side only.
 * This mirrors the existing Phase 10 in-memory user store as a persistent
 * backing store. Authentication continues to use session cookies.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { DbUser } from '@/lib/supabase/types';
import type { User, UserRole } from '@/types';
import type { ListOptions, ListResult, CrudResult } from './index';

function toAppUser(db: DbUser): User {
  return {
    id: db.id,
    name: db.name,
    email: db.email,
    role: db.role as UserRole,
    phone: db.phone ?? '',
    aadhaarOrGovId: db.aadhaar_or_gov_id ?? '',
    avatarUrl: db.avatar_url ?? undefined,
    department: db.department ?? undefined,
    designation: db.designation ?? undefined,
    jurisdictionDistrict: db.jurisdiction_district ?? undefined,
    badgeNumber: db.badge_number ?? undefined,
  };
}

function toDbUser(user: Partial<User> & Pick<User, 'id' | 'name' | 'email' | 'role'>): Partial<DbUser> {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? null,
    aadhaar_or_gov_id: user.aadhaarOrGovId ?? null,
    avatar_url: user.avatarUrl ?? null,
    department: user.department ?? null,
    designation: user.designation ?? null,
    jurisdiction_district: user.jurisdictionDistrict ?? null,
    badge_number: user.badgeNumber ?? null,
  };
}

export class UserRepository {
  async getAll(opts: ListOptions = {}): Promise<ListResult<User>> {
    const supabase = createServerSupabaseClient();
    let query = supabase.from('users').select('*', { count: 'exact' });
    query = query.order(opts.orderBy ?? 'created_at', { ascending: false });
    const pageFrom = opts.offset ?? 0;
    if (opts.limit || opts.offset) query = query.range(pageFrom, pageFrom + (opts.limit ?? 1000) - 1);

    const { data, error, count } = await query;
    if (error) return { data: [], count: null, error };
    return { data: data?.map(toAppUser) ?? [], count, error: null };
  }

  async getById(id: string): Promise<CrudResult<User>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) return { data: null, error };
    return { data: toAppUser(data), error: null };
  }

  async getByEmail(email: string): Promise<CrudResult<User>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error) return { data: null, error };
    return { data: toAppUser(data), error: null };
  }

  async create(user: User & { accountStatus?: 'ACTIVE' | 'DISABLED' }): Promise<CrudResult<User>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .insert({
        ...toDbUser(user),
        account_status: user.accountStatus ?? 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: toAppUser(data), error: null };
  }

  async updateRole(id: string, role: UserRole): Promise<CrudResult<User>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: toAppUser(data), error: null };
  }

  async updateStatus(id: string, accountStatus: 'ACTIVE' | 'DISABLED'): Promise<CrudResult<User>> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .update({ account_status: accountStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error };
    return { data: toAppUser(data), error: null };
  }
}

export const userRepository = new UserRepository();
