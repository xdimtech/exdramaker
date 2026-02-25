import React from "react";

import { useAtom } from "../../app-jotai";
import { authModalOpenAtom } from "../../auth/authAtoms";

import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";

import "./AuthModal.scss";

export const AuthModal: React.FC = () => {
  const [mode, setMode] = useAtom(authModalOpenAtom);

  if (!mode) {
    return null;
  }

  return (
    <div className="auth-modal-overlay" onClick={() => setMode(null)}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="auth-modal__close"
          onClick={() => setMode(null)}
          aria-label="Close"
        >
          ✕
        </button>
        {mode === "signIn" ? (
          <SignInForm onSwitchToSignUp={() => setMode("signUp")} />
        ) : (
          <SignUpForm onSwitchToSignIn={() => setMode("signIn")} />
        )}
      </div>
    </div>
  );
};
