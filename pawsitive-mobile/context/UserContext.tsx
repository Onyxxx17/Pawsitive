import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserProfile = {
  id: string;
  email: string;          // from Supabase auth — read-only / locked
  name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  notification_preferences: Record<string, any>;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdate = {
  name?: string;
  avatar_url?: string;
  phone_number?: string;
  notification_preferences?: Record<string, any>;
  timezone?: string;
};

type UserContextType = {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<{ error: string | null }>;
  uploadAvatar: (localUri: string) => Promise<{ url: string | null; error: string | null }>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const UserContext = createContext<UserContextType>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  updateProfile: async () => ({ error: null }),
  uploadAvatar: async () => ({ url: null, error: null }),
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch profile from `profiles` table ─────────────────────────────────────
  const fetchProfile = useCallback(async (sess: Session) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, phone_number, notification_preferences, timezone, created_at, updated_at')
      .eq('id', sess.user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Row doesn't exist yet — insert a blank one (Supabase trigger may not be set)
      const { data: inserted } = await supabase
        .from('profiles')
        .insert({ id: sess.user.id })
        .select()
        .single();

      if (inserted) {
        setProfile({ ...inserted, email: sess.user.email ?? '' });
      }
      return;
    }

    if (data) {
      setProfile({ ...data, email: sess.user.email ?? '' });
    }
  }, []);

  // ── Listen to auth state ─────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      if (sess) fetchProfile(sess).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) fetchProfile(sess);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ── Public: re-fetch ─────────────────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    if (session) await fetchProfile(session);
  }, [session, fetchProfile]);

  // ── Public: update profile fields ───────────────────────────────────────────
  const updateProfile = useCallback(async (updates: ProfileUpdate): Promise<{ error: string | null }> => {
    if (!session) return { error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, ...updates, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) return { error: error.message };

    setProfile((prev) => prev ? { ...prev, ...data } : null);
    return { error: null };
  }, [session]);

  // ── Public: upload avatar to Supabase Storage ────────────────────────────────
  const uploadAvatar = useCallback(async (localUri: string): Promise<{ url: string | null; error: string | null }> => {
    if (!session) return { url: null, error: 'Not authenticated' };

    try {
      const response = await fetch(localUri);
      const blob = await response.blob();
      const ext = localUri.split('.').pop() ?? 'jpg';
      const path = `${session.user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` });

      if (uploadError) return { url: null, error: uploadError.message };

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`; // cache-bust

      // Persist to profile row
      await updateProfile({ avatar_url: publicUrl });

      return { url: publicUrl, error: null };
    } catch (err: any) {
      return { url: null, error: err.message ?? 'Upload failed' };
    }
  }, [session, updateProfile]);

  return (
    <UserContext.Provider value={{ session, profile, loading, refreshProfile, updateProfile, uploadAvatar }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
