import { atom } from "../app-jotai";

import type { Session, User } from "@supabase/supabase-js";

import type { AuthModalMode } from "./authTypes";

export const userAtom = atom<User | null>(null);

export const sessionAtom = atom<Session | null>(null);

export const authLoadingAtom = atom<boolean>(true);

export const isSignedInAtom = atom((get) => get(userAtom) !== null);

export const authModalOpenAtom = atom<AuthModalMode>(null);
