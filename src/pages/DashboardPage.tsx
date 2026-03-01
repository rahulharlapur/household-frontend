import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, RefreshCw, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { expenseApi, householdApi } from "@/api/services";
import { useAuthStore } from "@/store/authStore";
import { useHouseholdStore } from "@/store/householdStore";
import { formatCurrency, getInitials, getErrorMessage, cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import type { Debt, Settlement } from "@/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function DebtCard({
  debt,
  currentUserId,
  onSettle,
  onSettleAll,
  isSettling,
}: {
  debt: Debt;
  currentUserId: string;
  onSettle: (debtorId: string, creditorId: string, otherName: string, amount: number) => void;
  onSettleAll: (debtorId: string, creditorId: string, otherName: string, amount: number) => void;
  isSettling: boolean;
}) {
  const youOwe = debt.from.id === currentUserId;
  const youAreOwed = debt.to.id === currentUserId;
  if (!youOwe && !youAreOwed) return null;

  const debtorId = debt.from.id;
  const creditorId = debt.to.id;
  const otherName = youOwe ? debt.to.name : debt.from.name;

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0 transition-transform duration-200 hover:scale-[1.01] active:scale-[1.01] rounded-lg hover:bg-muted/50 -mx-2 px-2">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs">
            {getInitials(
              otherName.split(" ")[0] ?? "",
              otherName.split(" ")[1] ?? "",
            )}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{otherName}</p>
          <p className="text-xs text-muted-foreground">
            {youOwe ? "You owe" : "Owes you"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`font-semibold text-sm ${youOwe ? "text-destructive" : "text-primary"}`}
        >
          {youOwe ? "-" : "+"}
          {formatCurrency(debt.amount)}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => onSettle(debtorId, creditorId, otherName, debt.amount)}
          disabled={isSettling}
        >
          Settle
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 px-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          onClick={() => onSettleAll(debtorId, creditorId, otherName, debt.amount)}
          disabled={isSettling}
        >
          {isSettling ? "..." : "Settle All"}
        </Button>
      </div>
    </div>
  );
}

function SettlementCard({ settlement, currentUserId }: { settlement: Settlement; currentUserId: string }) {
  const youPaid = settlement.fromUser._id === currentUserId;
  const fromName = `${settlement.fromUser.firstName} ${settlement.fromUser.lastName}`.trim();
  const settledByName = `${settlement.settledBy.firstName}`.trim();
  const youRecorded = settlement.settledBy._id === currentUserId;
  const date = new Date(settlement.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0 transition-transform duration-200 hover:scale-[1.01] active:scale-[1.01] rounded-lg hover:bg-muted/50 -mx-2 px-2">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs">
            {getInitials(settlement.fromUser.firstName, settlement.fromUser.lastName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">
            {youPaid ? `You paid ${settlement.toUser.firstName}` : `${fromName} paid ${youPaid ? "you" : settlement.toUser.firstName}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {date} · recorded by {youRecorded ? "you" : settledByName}
          </p>
        </div>
      </div>
      <span className={`font-semibold text-sm ${youPaid ? "text-muted-foreground" : "text-primary"}`}>
        {youPaid ? "-" : "+"}
        {formatCurrency(settlement.amount)}
      </span>
    </div>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { activeHouseholdId, setHouseholds } = useHouseholdStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [pendingSettle, setPendingSettle] = useState<{
    debtorId: string;
    creditorId: string;
    otherName: string;
    maxAmount: number;
  } | null>(null);

  // Fetch all households user belongs to
  const { data: householdsData } = useQuery({
    queryKey: ["households", user?._id],
    queryFn: () => householdApi.getAll(),
    enabled: !!user?._id,
  });

  // Sync households to store
  useEffect(() => {
    if (householdsData?.households) {
      setHouseholds(householdsData.households);
    }
  }, [householdsData, setHouseholds]);

  const householdId = activeHouseholdId;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["balances", householdId],
    queryFn: () => expenseApi.getBalances(householdId!),
    enabled: !!householdId,
    refetchInterval: 30000,
  });

  const myBalance = data?.balances?.[user?._id ?? ""] ?? 0;
  const myDebts =
    data?.debts?.filter(
      (d) =>
        (d.from.id === user?._id || d.to.id === user?._id) && d.amount > 0,
    ) ?? [];

  // Fetch settlement history
  const { data: settlementsData, isLoading: settlementsLoading } = useQuery({
    queryKey: ["settlements", householdId],
    queryFn: () => expenseApi.getSettlements(householdId!, 1, 10),
    enabled: !!householdId && showHistory,
  });

  const { mutate: settle, isPending: isSettling } = useMutation({
    mutationFn: ({ debtorId, creditorId, amount }: { debtorId: string; creditorId: string; amount: number }) =>
      expenseApi.settle({
        householdId: householdId!,
        fromUserId: debtorId,
        toUserId: creditorId,
        amount,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      toast({ title: `Recorded ${formatCurrency(variables.amount)} payment ✓` });
      setPendingSettle(null);
      setCustomAmount("");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to settle",
        description: getErrorMessage(error),
      });
    },
  });

  const { mutate: settleAll, isPending: isSettlingAll } = useMutation({
    mutationFn: ({ debtorId, creditorId }: { debtorId: string; creditorId: string }) =>
      expenseApi.settleAll({
        householdId: householdId!,
        debtorId,
        creditorId,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      toast({ title: `Settled ${formatCurrency(data.amount)} ✓` });
      setPendingSettle(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to settle",
        description: getErrorMessage(error),
      });
    },
  });

  const handleSettle = (debtorId: string, creditorId: string, otherName: string, maxAmount: number) => {
    setPendingSettle({ debtorId, creditorId, otherName, maxAmount });
    setCustomAmount(maxAmount.toFixed(2));
    setSettleModalOpen(true);
  };

  const handleSettleAll = (debtorId: string, creditorId: string, otherName: string, maxAmount: number) => {
    setPendingSettle({ debtorId, creditorId, otherName, maxAmount });
    setConfirmOpen(true);
  };

  const submitCustomSettle = () => {
    const amount = parseFloat(customAmount);
    if (pendingSettle && !isNaN(amount) && amount > 0) {
      settle({ debtorId: pendingSettle.debtorId, creditorId: pendingSettle.creditorId, amount });
      setSettleModalOpen(false);
    }
  };

  const firstName = user?.firstName ?? "there";

  return (
    <div className="pt-8 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-muted-foreground text-sm">Good day,</p>
          <h1 className="font-display text-2xl font-bold">{firstName} 👋</h1>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 rounded-xl hover:bg-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4 text-muted-foreground transition-transform", isFetching && "animate-spin")} />
        </button>
      </div>

      <Card
        className={`mb-5 ${myBalance >= 0 ? "bg-primary" : "bg-destructive"} border-0 text-white transition-transform duration-200 hover:scale-[1.02] active:scale-[1.02] cursor-pointer`}
      >
        <CardContent className="p-6">
          <p className="text-white/70 text-sm mb-1">Your net balance</p>
          <div className="flex items-end gap-2">
            <span className="font-display text-4xl font-bold">
              {formatCurrency(Math.abs(myBalance))}
            </span>
            {myBalance > 0 ? (
              <TrendingUp className="h-5 w-5 mb-1 opacity-80" />
            ) : myBalance < 0 ? (
              <TrendingDown className="h-5 w-5 mb-1 opacity-80" />
            ) : (
              <Minus className="h-5 w-5 mb-1 opacity-80" />
            )}
          </div>
          <p className="text-white/70 text-sm mt-1">
            {myBalance > 0
              ? "You are owed money"
              : myBalance < 0
                ? "You owe money"
                : "All settled up!"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Balances</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4 mr-1" />
              {showHistory ? "Hide History" : "History"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Loading...
            </div>
          )}
          {!isLoading && !householdId && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Join or create a household to see balances
            </div>
          )}
          {!isLoading && householdId && myDebts.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">
                All settled up! 🎉
              </p>
            </div>
          )}
          {isError && (
            <div className="py-8 text-center">
              <p className="text-destructive text-sm mb-2">
                Failed to load balances
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          )}
          {myDebts.map((debt) => (
            <DebtCard
              key={`${debt.from.id}-${debt.to.id}`}
              debt={debt}
              currentUserId={user?._id ?? ""}
              onSettle={handleSettle}
              onSettleAll={handleSettleAll}
              isSettling={isSettling || isSettlingAll}
            />
          ))}
        </CardContent>
      </Card>

      {showHistory && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Settlement History</CardTitle>
          </CardHeader>
          <CardContent>
            {settlementsLoading && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Loading...
              </div>
            )}
            {!settlementsLoading && (!settlementsData?.settlements || settlementsData.settlements.length === 0) && (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">No settlements yet</p>
              </div>
            )}
            {settlementsData?.settlements?.map((settlement) => (
              <SettlementCard
                key={settlement._id}
                settlement={settlement}
                currentUserId={user?._id ?? ""}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Settle All"
        description={`Record full payment of ${formatCurrency(pendingSettle?.maxAmount ?? 0)} with ${pendingSettle?.otherName ?? "this person"}?`}
        confirmLabel="Yes, settle all"
        cancelLabel="Cancel"
        onConfirm={() => pendingSettle && settleAll({ debtorId: pendingSettle.debtorId, creditorId: pendingSettle.creditorId })}
        isLoading={isSettlingAll}
      />

      <Dialog open={settleModalOpen} onOpenChange={setSettleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Enter the amount to settle with {pendingSettle?.otherName ?? "this person"}.
              Max: {formatCurrency(pendingSettle?.maxAmount ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                max={pendingSettle?.maxAmount}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSettleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={submitCustomSettle}
                disabled={isSettling || !customAmount || parseFloat(customAmount) <= 0}
              >
                {isSettling ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
