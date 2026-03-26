"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, UserRound } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function NicknameSettingsForm({
  initialNickname,
  onSubmit,
}: {
  initialNickname: string;
  onSubmit: (input: { nickname: string }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [nicknameDraft, setNicknameDraft] = useState(initialNickname);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await onSubmit({ nickname: nicknameDraft });
    if (!result.ok) {
      setErrorMessage(result.error ?? "更新暱稱失敗");
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage("暱稱已更新");
    setIsSubmitting(false);
  }

  return (
    <Card className="border-border/80 bg-card/85">
      <CardHeader>
        <CardTitle>修改暱稱</CardTitle>
        <CardDescription>可更新目前帳號顯示的暱稱，長度上限 10 字。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="settings-nickname">
              新暱稱
            </label>
            <Input
              id="settings-nickname"
              maxLength={10}
              value={nicknameDraft}
              onChange={(event) => setNicknameDraft(event.target.value)}
            />
          </div>
          <Button className="rounded-2xl" disabled={isSubmitting} type="submit">
            儲存暱稱
          </Button>
        </form>

        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        {successMessage ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PinSettingsForm({
  onSubmit,
}: {
  onSubmit: (input: { currentPin: string; newPin: string }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [isCurrentPinVisible, setIsCurrentPinVisible] = useState(false);
  const [isNewPinVisible, setIsNewPinVisible] = useState(false);
  const [isConfirmPinVisible, setIsConfirmPinVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (newPin !== confirmNewPin) {
      setErrorMessage("新 PIN 與確認 PIN 不一致");
      setIsSubmitting(false);
      return;
    }

    const result = await onSubmit({ currentPin, newPin });
    if (!result.ok) {
      setErrorMessage(result.error ?? "更新 PIN 失敗");
      setIsSubmitting(false);
      return;
    }

    setCurrentPin("");
    setNewPin("");
    setConfirmNewPin("");
    setSuccessMessage("PIN 已更新");
    setIsSubmitting(false);
  }

  return (
    <Card className="border-border/80 bg-card/85">
      <CardHeader>
        <CardTitle>修改 PIN</CardTitle>
        <CardDescription>需先輸入目前 PIN，再設定新的 6 位數 PIN。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="settings-current-pin">
              目前 PIN
            </label>
            <div className="relative">
              <Input
                id="settings-current-pin"
                type={isCurrentPinVisible ? "text" : "password"}
                inputMode="numeric"
                maxLength={6}
                className="pr-10"
                value={currentPin}
                onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full"
                aria-label={isCurrentPinVisible ? "隱藏目前 PIN" : "顯示目前 PIN"}
                onClick={() => setIsCurrentPinVisible((current) => !current)}
              >
                {isCurrentPinVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="settings-new-pin">
              新 PIN
            </label>
            <div className="relative">
              <Input
                id="settings-new-pin"
                type={isNewPinVisible ? "text" : "password"}
                inputMode="numeric"
                maxLength={6}
                className="pr-10"
                value={newPin}
                onChange={(event) => setNewPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full"
                aria-label={isNewPinVisible ? "隱藏新 PIN" : "顯示新 PIN"}
                onClick={() => setIsNewPinVisible((current) => !current)}
              >
                {isNewPinVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="settings-confirm-new-pin">
              確認新 PIN
            </label>
            <div className="relative">
              <Input
                id="settings-confirm-new-pin"
                type={isConfirmPinVisible ? "text" : "password"}
                inputMode="numeric"
                maxLength={6}
                className="pr-10"
                value={confirmNewPin}
                onChange={(event) =>
                  setConfirmNewPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full"
                aria-label={isConfirmPinVisible ? "隱藏確認 PIN" : "顯示確認 PIN"}
                onClick={() => setIsConfirmPinVisible((current) => !current)}
              >
                {isConfirmPinVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>

          <Button className="rounded-2xl" disabled={isSubmitting} type="submit">
            更新 PIN
          </Button>
        </form>

        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        {successMessage ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { currentUser, isLoading, updateNickname, updatePin } = useAuth();

  return (
    <DashboardShell
      eyebrow="ACCOUNT SETTINGS"
      title="設定"
      description="集中修改帳號暱稱與 6 位數 PIN。"
    >
      {isLoading ? (
        <Card className="border-border/80 bg-card/85">
          <CardContent className="p-6 text-sm text-muted-foreground">正在讀取登入狀態...</CardContent>
        </Card>
      ) : !currentUser.isLoggedIn ? (
        <Card className="border-border/80 bg-card/85">
          <CardHeader>
            <CardTitle>需要先登入</CardTitle>
            <CardDescription>設定頁只提供已登入帳號使用，請先到個人介面登入或註冊。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="rounded-2xl">
              <Link href="/profile">
                <UserRound className="size-4" />
                前往個人介面
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <NicknameSettingsForm
            key={`nickname-${currentUser.id}-${currentUser.nickname}`}
            initialNickname={currentUser.nickname}
            onSubmit={updateNickname}
          />
          <PinSettingsForm onSubmit={updatePin} />
        </div>
      )}
    </DashboardShell>
  );
}
