import { useCallback, useEffect } from "react";

import { useSetAtom } from "../app-jotai";

import {
  authLoadingAtom,
  authModalOpenAtom,
  sessionAtom,
  userAtom,
} from "./authAtoms";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

export const useAuthInit = () => {
  const setUser = useSetAtom(userAtom);
  const setSession = useSetAtom(sessionAtom);
  const setLoading = useSetAtom(authLoadingAtom);

  useEffect(() => {
    // 如果没有配置 Supabase，跳过认证初始化
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setSession, setLoading]);
};

export const useSignIn = () => {
  const setModal = useSetAtom(authModalOpenAtom);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        throw new Error("Supabase is not configured");
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }
      setModal(null);
    },
    [setModal],
  );

  return { signInWithEmail };
};

export const useSignUp = () => {
  const setModal = useSetAtom(authModalOpenAtom);

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        throw new Error("Supabase is not configured");
      }
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        throw error;
      }
      setModal(null);
    },
    [setModal],
  );

  return { signUpWithEmail };
};

export const useSignInWithGoogle = () => {
  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      throw new Error("Supabase is not configured");
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      throw error;
    }
  }, []);

  return { signInWithGoogle };
};

export const useSignOut = () => {
  const signOut = useCallback(async () => {
    if (!supabase) {
      throw new Error("Supabase is not configured");
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }, []);

  return { signOut };
};
