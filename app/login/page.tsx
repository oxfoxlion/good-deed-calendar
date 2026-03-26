"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const { currentUser, login, register, isLoading } = useAuth();
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [registerNickname, setRegisterNickname] = useState("");
  const [registerPin, setRegisterPin] = useState("");
  const [isLoginPinVisible, setIsLoginPinVisible] = useState(false);
  const [isRegisterPinVisible, setIsRegisterPinVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    const result = await login({ nickname, pin });
    if (!result.ok) {
      setErrorMessage(result.error ?? "登入失敗");
    }
    setIsSubmitting(false);
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    const result = await register({ nickname: registerNickname, pin: registerPin });
    if (!result.ok) {
      setErrorMessage(result.error ?? "註冊失敗");
    }
    setIsSubmitting(false);
  }

  return (
    <DashboardShell
      eyebrow="ACCESS"
      title="登入 / 註冊"
      description="使用暱稱與 6 位數 PIN 登入，或建立新的帳號。"
    >
      {isLoading ? (
        <Card className="border-border/80 bg-card/85">
          <CardContent className="p-6 text-sm text-muted-foreground">正在讀取登入狀態...</CardContent>
        </Card>
      ) : currentUser.isLoggedIn ? (
        <Card className="border-border/80 bg-card/85">
          <CardHeader>
            <CardTitle>目前已登入</CardTitle>
            <CardDescription>你可以直接前往個人介面查看紀錄，或到設定頁修改帳號資料。</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border-border/80 bg-card/85">
            <CardHeader>
              <CardTitle>登入</CardTitle>
              <CardDescription>使用暱稱與 6 位數 PIN 登入。</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="login-nickname">
                    暱稱
                  </label>
                  <Input
                    id="login-nickname"
                    maxLength={10}
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="login-pin">
                    6 位數 PIN
                  </label>
                  <div className="relative">
                    <Input
                      id="login-pin"
                      type={isLoginPinVisible ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={6}
                      className="pr-10"
                      value={pin}
                      onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full"
                      aria-label={isLoginPinVisible ? "隱藏 PIN" : "顯示 PIN"}
                      onClick={() => setIsLoginPinVisible((current) => !current)}
                    >
                      {isLoginPinVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </div>
                <Button className="rounded-2xl" disabled={isSubmitting} type="submit">
                  登入
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/85">
            <CardHeader>
              <CardTitle>註冊</CardTitle>
              <CardDescription>建立新的暱稱帳號與 6 位數 PIN。</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="register-nickname">
                    暱稱
                  </label>
                  <Input
                    id="register-nickname"
                    maxLength={10}
                    value={registerNickname}
                    onChange={(event) => setRegisterNickname(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="register-pin">
                    6 位數 PIN
                  </label>
                  <div className="relative">
                    <Input
                      id="register-pin"
                      type={isRegisterPinVisible ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={6}
                      className="pr-10"
                      value={registerPin}
                      onChange={(event) =>
                        setRegisterPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full"
                      aria-label={isRegisterPinVisible ? "隱藏 PIN" : "顯示 PIN"}
                      onClick={() => setIsRegisterPinVisible((current) => !current)}
                    >
                      {isRegisterPinVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </div>
                <Button className="rounded-2xl" disabled={isSubmitting} type="submit">
                  註冊
                </Button>
              </form>
            </CardContent>
          </Card>

          {errorMessage ? (
            <Card className="border-destructive/30 bg-destructive/5 xl:col-span-2">
              <CardContent className="p-4 text-sm text-destructive">{errorMessage}</CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </DashboardShell>
  );
}
