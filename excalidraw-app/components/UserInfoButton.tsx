import React, { useEffect, useRef, useState } from "react";

import { useAtomValue, useSetAtom } from "../app-jotai";
import { authModalOpenAtom, isSignedInAtom, userAtom } from "../auth/authAtoms";
import { useSignOut } from "../auth/useAuth";

import "./UserInfoButton.scss";

export const UserInfoButton: React.FC = () => {
  const isSignedIn = useAtomValue(isSignedInAtom);
  const user = useAtomValue(userAtom);
  const setAuthModal = useSetAtom(authModalOpenAtom);
  const { signOut } = useSignOut();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) {
      return;
    }
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  if (!isSignedIn) {
    return (
      <button
        type="button"
        className="UserInfoButton UserInfoButton--login"
        onClick={() => setAuthModal("signIn")}
      >
        LOGIN
      </button>
    );
  }

  const initial = user?.email ? user.email.charAt(0).toUpperCase() : "?";

  const handleSignOut = async () => {
    setDropdownOpen(false);
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      // ignore — auth state will remain unchanged
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="UserInfoButton UserInfoButton--user" ref={containerRef}>
      <button
        type="button"
        className="UserInfoButton__avatar"
        onClick={() => setDropdownOpen((prev) => !prev)}
        title={user?.email ?? ""}
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
      >
        {initial}
      </button>

      {dropdownOpen && (
        <div className="UserInfoButton__dropdown" role="menu">
          <div className="UserInfoButton__email">{user?.email}</div>
          <div className="UserInfoButton__divider" />
          <button
            type="button"
            className="UserInfoButton__signout"
            onClick={handleSignOut}
            disabled={signingOut}
            role="menuitem"
          >
            {signingOut ? "退出中..." : "退出登录"}
          </button>
        </div>
      )}
    </div>
  );
};
