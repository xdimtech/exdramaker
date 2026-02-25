import {
  loginIcon,
  ExcalLogo,
  eyeIcon,
} from "@excalidraw/excalidraw/components/icons";
import { MainMenu } from "@excalidraw/excalidraw/index";
import React, { useCallback, useState } from "react";

import { isDevEnv } from "@excalidraw/common";

import type { Theme } from "@excalidraw/element/types";

import { useAtomValue, useSetAtom } from "../app-jotai";
import { authModalOpenAtom, isSignedInAtom, userAtom } from "../auth/authAtoms";
import { useSignOut } from "../auth/useAuth";
import { LanguageList } from "../app-language/LanguageList";

import { saveDebugState } from "./DebugCanvas";

export const AppMainMenu: React.FC<{
  onCollabDialogOpen: () => any;
  isCollaborating: boolean;
  isCollabEnabled: boolean;
  theme: Theme | "system";
  setTheme: (theme: Theme | "system") => void;
  refresh: () => void;
}> = React.memo((props) => {
  const isSignedIn = useAtomValue(isSignedInAtom);
  const user = useAtomValue(userAtom);
  const setAuthModal = useSetAtom(authModalOpenAtom);
  const { signOut } = useSignOut();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "退出登录失败，请重试");
    } finally {
      setSigningOut(false);
    }
  }, [signOut]);

  return (
    <MainMenu>
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.DefaultItems.SaveToActiveFile />
      <MainMenu.DefaultItems.Export />
      <MainMenu.DefaultItems.SaveAsImage />
      {props.isCollabEnabled &&
        import.meta.env.VITE_SHOW_LIVE_COLLABORATION !== "false" && (
          <MainMenu.DefaultItems.LiveCollaborationTrigger
            isCollaborating={props.isCollaborating}
            onSelect={() => props.onCollabDialogOpen()}
          />
        )}
      <MainMenu.DefaultItems.CommandPalette className="highlighted" />
      <MainMenu.DefaultItems.SearchMenu />
      <MainMenu.DefaultItems.Help />
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.Separator />
      {import.meta.env.VITE_SHOW_EXCALIDRAW_PLUS !== "false" && (
        <MainMenu.ItemLink
          icon={ExcalLogo}
          href={`${
            import.meta.env.VITE_APP_PLUS_LP
          }/plus?utm_source=excalidraw&utm_medium=app&utm_content=hamburger`}
          className=""
        >
          Excalidraw+
        </MainMenu.ItemLink>
      )}
      {import.meta.env.VITE_SHOW_DISCORD !== "false" && (
        <MainMenu.DefaultItems.Socials />
      )}
      {isSignedIn ? (
        <MainMenu.Item
          icon={loginIcon}
          onSelect={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? "退出中..." : `退出登录（${user?.email}）`}
        </MainMenu.Item>
      ) : (
        <>
          <MainMenu.Item
            icon={loginIcon}
            onSelect={() => setAuthModal("signIn")}
            className="highlighted"
          >
            登录
          </MainMenu.Item>
          <MainMenu.Item
            icon={loginIcon}
            onSelect={() => setAuthModal("signUp")}
          >
            注册
          </MainMenu.Item>
        </>
      )}
      {isDevEnv() && (
        <MainMenu.Item
          icon={eyeIcon}
          onSelect={() => {
            if (window.visualDebug) {
              delete window.visualDebug;
              saveDebugState({ enabled: false });
            } else {
              window.visualDebug = { data: [] };
              saveDebugState({ enabled: true });
            }
            props?.refresh();
          }}
        >
          Visual Debug
        </MainMenu.Item>
      )}
      <MainMenu.Separator />
      <MainMenu.DefaultItems.Preferences />
      <MainMenu.DefaultItems.ToggleTheme
        allowSystemTheme
        theme={props.theme}
        onSelect={props.setTheme}
      />
      <MainMenu.ItemCustom>
        <LanguageList style={{ width: "100%" }} />
      </MainMenu.ItemCustom>
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
});
