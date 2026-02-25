# Supabase 接入方案：Sign Up / Sign In

## 一、背景与目标

当前 Excalidraw App 的登录态通过 `excplus-auth` cookie 静态检测（`isExcalidrawPlusSignedUser`），仅用于判断是否为 Excalidraw+ 付费用户，没有真正的身份认证体系。

**目标：** 在不破坏现有功能的前提下，接入 Supabase Auth，实现：

- 邮箱 + 密码 注册 / 登录
- GitHub / Google OAuth 第三方登录（可选）
- 登录态响应式感知（Jotai atom）
- 登录后在 MainMenu 显示用户信息 / 退出按钮
- Session 持久化（刷新页面不丢失登录态）

---

## 二、技术选型

| 方面      | 选择                                              |
| --------- | ------------------------------------------------- |
| Auth 服务 | Supabase Auth（`@supabase/supabase-js` v2）       |
| 状态管理  | Jotai（与现有体系一致，使用 `app-jotai.ts`）      |
| UI 组件   | 自定义 React 组件（Modal 形式，SCSS Module 样式） |
| 样式规范  | 与现有 `.scss` 文件保持一致                       |

---

## 三、目录结构变更

```
excalidraw-app/
├── auth/
│   ├── supabaseClient.ts          # Supabase 客户端单例
│   ├── authAtoms.ts               # Jotai atoms: user, session, loading
│   ├── useAuth.ts                 # 自定义 hook：登录/注册/退出逻辑
│   └── authTypes.ts               # 类型定义
├── components/
│   ├── AuthModal/
│   │   ├── AuthModal.tsx          # 登录/注册 Modal 容器
│   │   ├── AuthModal.scss         # Modal 样式
│   │   ├── SignInForm.tsx         # 登录表单
│   │   ├── SignUpForm.tsx         # 注册表单
│   │   └── OAuthButtons.tsx       # GitHub/Google 按钮（可选）
│   └── UserMenu.tsx               # 已登录态的用户菜单项
└── app_constants.ts               # 新增 SUPABASE_AUTH_KEY 常量
```

---

## 四、实现步骤

### Step 1：安装依赖

```bash
# 在 excalidraw-app 目录下
yarn add @supabase/supabase-js
```

### Step 2：环境变量配置

在 `excalidraw-app/.env.development`（及生产环境）中添加：

```env
VITE_APP_SUPABASE_URL=https://your-project.supabase.co
VITE_APP_SUPABASE_ANON_KEY=your-anon-key
```

> **注意：** anon key 是公开安全的前端密钥，不是 service_role key。

### Step 3：Supabase 客户端单例

**文件：** `excalidraw-app/auth/supabaseClient.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // localStorage 持久化 session
    autoRefreshToken: true, // 自动刷新 token
    detectSessionInUrl: true, // 处理 OAuth 回调 URL
  },
});
```

### Step 4：Jotai Auth Atoms

**文件：** `excalidraw-app/auth/authAtoms.ts`

```typescript
import { atom } from "../app-jotai";
import type { User, Session } from "@supabase/supabase-js";

// 当前登录用户（null = 未登录）
export const userAtom = atom<User | null>(null);

// 当前 session
export const sessionAtom = atom<Session | null>(null);

// Auth 初始化加载中
export const authLoadingAtom = atom<boolean>(true);

// 便捷派生：是否已登录
export const isSignedInAtom = atom((get) => get(userAtom) !== null);

// Auth Modal 显示状态
export const authModalOpenAtom = atom<"signIn" | "signUp" | null>(null);
```

### Step 5：useAuth Hook

**文件：** `excalidraw-app/auth/useAuth.ts`

```typescript
import { useEffect, useCallback } from "react";
import { useAtom, useSetAtom } from "../app-jotai";
import { supabase } from "./supabaseClient";
import {
  userAtom,
  sessionAtom,
  authLoadingAtom,
  authModalOpenAtom,
} from "./authAtoms";

export const useAuthInit = () => {
  const setUser = useSetAtom(userAtom);
  const setSession = useSetAtom(sessionAtom);
  const setLoading = useSetAtom(authLoadingAtom);

  useEffect(() => {
    // 初始化时获取当前 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 监听 auth 状态变化
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
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
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setModal(null);
    },
    [setModal],
  );

  return { signUpWithEmail };
};

export const useSignOut = () => {
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return { signOut };
};
```

### Step 6：Auth Modal 组件

**文件：** `excalidraw-app/components/AuthModal/AuthModal.tsx`

```typescript
import React from "react";
import { useAtom } from "../../app-jotai";
import { authModalOpenAtom } from "../../auth/authAtoms";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";
import "./AuthModal.scss";

export const AuthModal: React.FC = () => {
  const [mode, setMode] = useAtom(authModalOpenAtom);

  if (!mode) return null;

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
```

**SignInForm / SignUpForm** 核心结构（以 SignInForm 为例）：

```typescript
// excalidraw-app/components/AuthModal/SignInForm.tsx
import React, { useState } from "react";
import { useSignIn } from "../../auth/useAuth";

export const SignInForm: React.FC<{ onSwitchToSignUp: () => void }> = ({
  onSwitchToSignUp,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signInWithEmail } = useSignIn();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err: any) {
      setError(err.message ?? "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>登录</h2>
      {error && <p className="auth-form__error">{error}</p>}
      <label>
        邮箱
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </label>
      <label>
        密码
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? "登录中..." : "登录"}
      </button>
      <p>
        没有账号？{" "}
        <button type="button" onClick={onSwitchToSignUp}>
          注册
        </button>
      </p>
    </form>
  );
};
```

### Step 7：MainMenu 集成

修改 `excalidraw-app/components/AppMainMenu.tsx`，将原有跳转外部链接的 Sign in/Sign up 替换为打开 Modal：

```typescript
// 替换原有的 MainMenu.ItemLink sign-up/sign-in
import { useAtomValue, useSetAtom } from "../../app-jotai";
import { isSignedInAtom, authModalOpenAtom } from "../../auth/authAtoms";
import { useSignOut } from "../../auth/useAuth";
import { userAtom } from "../../auth/authAtoms";

// 在组件内：
const isSignedIn = useAtomValue(isSignedInAtom);
const user = useAtomValue(userAtom);
const setAuthModal = useSetAtom(authModalOpenAtom);
const { signOut } = useSignOut();

// 菜单项：
{
  isSignedIn ? (
    <>
      <MainMenu.Item onSelect={() => signOut()}>
        退出登录（{user?.email}）
      </MainMenu.Item>
    </>
  ) : (
    <>
      <MainMenu.Item
        icon={loginIcon}
        onSelect={() => setAuthModal("signIn")}
        className="highlighted"
      >
        登录
      </MainMenu.Item>
      <MainMenu.Item icon={loginIcon} onSelect={() => setAuthModal("signUp")}>
        注册
      </MainMenu.Item>
    </>
  );
}
```

### Step 8：App.tsx 挂载

在 `excalidraw-app/App.tsx` 的根组件中：

1. 调用 `useAuthInit()` 初始化 Auth 监听
2. 挂载 `<AuthModal />` 组件

```typescript
// 在 ExcalidrawWrapper 组件中添加
import { useAuthInit } from "./auth/useAuth";
import { AuthModal } from "./components/AuthModal/AuthModal";

function ExcalidrawWrapper() {
  useAuthInit(); // 初始化 Auth 状态监听

  return (
    <>
      <Excalidraw ... />
      <AuthModal />   {/* 全局 Modal */}
    </>
  );
}
```

---

## 五、Supabase 后台配置

1. 在 Supabase Dashboard → Authentication → Providers 中启用：

   - **Email** provider（默认开启）
   - **GitHub** / **Google**（可选 OAuth）

2. 在 **URL Configuration** 中设置：

   - Site URL: `http://localhost:3000`（开发）
   - Redirect URLs: `http://localhost:3000/**`

3. 根据需要关闭邮箱验证（开发调试阶段可在 Email provider 中禁用 "Confirm email"）

---

## 六、数据流图

```
App 启动
  └── useAuthInit()
        └── supabase.auth.getSession()
              ├── 有 session → userAtom = User, isSignedIn = true
              └── 无 session → userAtom = null, isSignedIn = false

用户点击"登录"
  └── setAuthModal("signIn")
        └── <AuthModal> 显示 SignInForm

用户提交表单
  └── signInWithEmail(email, password)
        └── supabase.auth.signInWithPassword()
              ├── 成功 → onAuthStateChange 触发 → userAtom 更新 → Modal 关闭
              └── 失败 → 显示错误信息

Auth 状态变化（刷新、token 过期等）
  └── onAuthStateChange 回调
        └── userAtom / sessionAtom 自动更新
```

---

## 七、文件改动清单

| 文件 | 操作 | 说明 |
| --- | --- | --- |
| `excalidraw-app/auth/supabaseClient.ts` | 新建 | Supabase 单例 |
| `excalidraw-app/auth/authAtoms.ts` | 新建 | Jotai auth atoms |
| `excalidraw-app/auth/useAuth.ts` | 新建 | Auth hooks |
| `excalidraw-app/auth/authTypes.ts` | 新建 | 类型定义 |
| `excalidraw-app/components/AuthModal/AuthModal.tsx` | 新建 | Modal 容器 |
| `excalidraw-app/components/AuthModal/AuthModal.scss` | 新建 | Modal 样式 |
| `excalidraw-app/components/AuthModal/SignInForm.tsx` | 新建 | 登录表单 |
| `excalidraw-app/components/AuthModal/SignUpForm.tsx` | 新建 | 注册表单 |
| `excalidraw-app/components/UserMenu.tsx` | 新建（可选） | 用户头像菜单 |
| `excalidraw-app/components/AppMainMenu.tsx` | 修改 | 替换外链为 Modal 触发 |
| `excalidraw-app/App.tsx` | 修改 | 挂载 useAuthInit + AuthModal |
| `excalidraw-app/.env.development` | 修改 | 添加 Supabase env vars |
| `excalidraw-app/package.json` | 修改 | 添加 @supabase/supabase-js |

---

## 八、测试计划

### 单元测试

- [ ] `authAtoms.ts`：isSignedInAtom 派生值正确
- [ ] `useAuth.ts`：signInWithEmail 成功/失败路径
- [ ] `SignInForm.tsx`：表单提交、错误展示、loading 状态
- [ ] `SignUpForm.tsx`：同上

### 集成测试

- [ ] 注册新用户 → session 建立 → isSignedIn = true
- [ ] 登录已有用户 → session 恢复
- [ ] 退出登录 → userAtom = null → UI 恢复未登录态
- [ ] 刷新页面 → session 自动恢复

### E2E 测试

- [ ] 完整注册流程（邮箱 + 密码）
- [ ] 完整登录流程
- [ ] 退出后重新登录
- [ ] Modal 关闭（点击遮罩 / ✕ 按钮）

---

## 九、注意事项

1. **不破坏现有 `isExcalidrawPlusSignedUser`**：该常量继续保留用于 Excalidraw+ 判断，Supabase auth 是独立的系统。

2. **Jotai Provider 作用域**：auth atoms 使用项目现有的 `app-jotai.ts` 导出的 atom，确保与 Excalidraw 内部的 Jotai scope 隔离。

3. **SSR/CSR**：项目是纯 CSR（Vite + React），无需处理 SSR 的 session 传递问题。

4. **Token 安全**：Supabase JS SDK 默认将 session 存储在 localStorage（`sb-*` 键），不需要手动管理。

5. **生产环境**：需在 Supabase Dashboard 配置正确的生产域名 Redirect URL，避免 OAuth 回调失败。
