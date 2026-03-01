import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Shield, Copy, Check, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authApi } from "@/api/services";
import { useAuthStore } from "@/store/authStore";
import { useHouseholdStore } from "@/store/householdStore";
import { getInitials, getErrorMessage } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/hooks/useToast";

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, tokens, clearAuth } = useAuthStore();
  const { households, activeHouseholdId } = useHouseholdStore();
  const [copied, setCopied] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();

  const activeHousehold = households.find((h) => h._id === activeHouseholdId);

  const { mutate: logout, isPending } = useMutation({
    mutationFn: () => authApi.logout(tokens?.refreshToken ?? ""),
    onSettled: () => {
      clearAuth();
      navigate("/login");
    },
  });

  const { mutate: changePassword, isPending: isChangingPassword } = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast({ title: "Password changed successfully!" });
      setShowPasswordDialog(false);
      resetPasswordForm();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to change password", description: getErrorMessage(error) });
    },
  });

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords don't match" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Password must be at least 6 characters" });
      return;
    }
    changePassword();
  };

  const copyInviteCode = () => {
    if (activeHousehold?.inviteCode) {
      navigator.clipboard.writeText(activeHousehold.inviteCode);
      setCopied(true);
      toast({ title: "Invite code copied!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="pt-8 pb-4 animate-fade-in">
      <h1 className="font-display text-2xl font-bold mb-6">Settings</h1>

      {/* Profile */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-lg">
                {getInitials(user?.firstName ?? "", user?.lastName ?? "")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-base">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Household Invite Code */}
      {activeHousehold && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              {activeHousehold.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Invite Code</p>
                <p className="font-mono font-semibold tracking-wider">{activeHousehold.inviteCode}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyInviteCode}
                className="h-9 w-9 p-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Share this code with others to invite them to your household
            </p>
          </CardContent>
        </Card>
      )}

      {/* Options */}
      <Card className="mb-6">
        <CardContent className="p-2">
          <button className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-muted transition-colors text-left">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Edit profile</span>
          </button>
          <button 
            className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-muted transition-colors text-left"
            onClick={() => setShowPasswordDialog(true)}
          >
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Change password</span>
          </button>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
        size="lg"
        onClick={() => logout()}
        disabled={isPending}
      >
        <LogOut className="h-4 w-4 mr-2" />
        {isPending ? "Signing out..." : "Sign out"}
      </Button>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={(open) => {
        setShowPasswordDialog(open);
        if (!open) resetPasswordForm();
      }}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleChangePassword}
              disabled={!currentPassword || !newPassword || !confirmPassword || isChangingPassword}
            >
              {isChangingPassword ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
