import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Receipt, ChevronRight, UserCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { expenseApi } from "@/api/services";
import { useAuthStore } from "@/store/authStore";
import { useHouseholdStore } from "@/store/householdStore";
import { formatCurrency, formatDate, getInitials, getErrorMessage } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import type { Expense, SplitDetail, SplitUser } from "@/types";

function getSplitUserId(split: SplitDetail): string {
  if (typeof split.userId === "string") return split.userId;
  return (split.userId as SplitUser)._id;
}

function getSplitUserName(split: SplitDetail): string {
  if (typeof split.userId === "object") {
    const u = split.userId as SplitUser;
    return (u.firstName + " " + u.lastName).trim();
  }
  return split.userId;
}

function getPaidByName(paidBy: Expense["paidBy"]): string {
  if (typeof paidBy === "object" && paidBy !== null) {
    const u = paidBy as { firstName: string; lastName: string };
    return (u.firstName + " " + u.lastName).trim();
  }
  return "Someone";
}

function getPaidById(paidBy: Expense["paidBy"]): string {
  if (typeof paidBy === "object" && paidBy !== null) {
    return (paidBy as { _id: string })._id;
  }
  return paidBy as string;
}

function getAddedById(addedBy: Expense["addedBy"]): string {
  if (typeof addedBy === "object" && addedBy !== null) {
    return (addedBy as { _id: string })._id;
  }
  return addedBy as string;
}

function ExpenseDetail({ expense, householdOwnerId, onClose, onDeleted }: {
  expense: Expense;
  householdOwnerId: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const paidByName = getPaidByName(expense.paidBy);
  const addedById = getAddedById(expense.addedBy);
  const mySplit = expense.splitDetails.find((s) => getSplitUserId(s) === user?._id);
  const canDelete = user?._id === addedById || user?._id === householdOwnerId;

  const { mutate: deleteExpense, isPending: isDeleting } = useMutation({
    mutationFn: () => expenseApi.deleteExpense(expense._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      toast({ title: "Expense deleted" });
      onDeleted();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to delete", description: getErrorMessage(error) });
    },
  });

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
              &larr;
            </button>
            <h1 className="font-display text-xl font-bold">Expense Detail</h1>
          </div>
          {canDelete && (
            <button onClick={() => setConfirmDeleteOpen(true)} className="p-2 rounded-xl hover:bg-destructive/10 transition-colors text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <Card className="mb-4">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-lg">{expense.description}</p>
                <p className="text-muted-foreground text-sm">{formatDate(expense.createdAt)}</p>
              </div>
              <span className="font-display text-2xl font-bold text-primary">{formatCurrency(expense.totalAmount)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <UserCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Paid by</span>
              <span className="font-medium">{paidByName}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Split</span>
              <span className="font-medium capitalize">{expense.splitType}</span>
            </div>
            {mySplit && (
              <div className="mt-4 p-3 rounded-xl text-sm font-medium bg-accent text-accent-foreground">
                Your share: {formatCurrency(mySplit.amountOwed)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Split Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {expense.splitDetails.map((split, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {typeof split.userId === "object" ? getInitials((split.userId as SplitUser).firstName, (split.userId as SplitUser).lastName) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{getSplitUserName(split)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{formatCurrency(split.amountOwed)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete expense"
        description={"Are you sure you want to delete this expense? This cannot be undone."}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => deleteExpense()}
        isLoading={isDeleting}
      />
    </div>
  );
}

function ExpenseCard({ expense, onClick }: { expense: Expense; onClick: () => void }) {
  const user = useAuthStore((s) => s.user);
  const paidByName = getPaidByName(expense.paidBy);
  const paidById = getPaidById(expense.paidBy);
  const iDidntPay = paidById !== user?._id;
  const mySplit = expense.splitDetails.find((s) => getSplitUserId(s) === user?._id);

  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3.5 border-b border-border last:border-0 text-left hover:bg-muted/50 transition-colors rounded-xl px-2">
      <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
        <Receipt className="h-4 w-4 text-accent-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{expense.description}</p>
        <p className="text-xs text-muted-foreground">{paidByName} · {formatDate(expense.createdAt)}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold">{formatCurrency(expense.totalAmount)}</p>
        {mySplit && (
          <p className={"text-xs " + (iDidntPay ? "text-destructive" : "text-muted-foreground")}>
            {iDidntPay ? "-" + formatCurrency(mySplit.amountOwed) : "you paid"}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

export function TransactionsPage() {
  const { activeHouseholdId, getActiveHousehold } = useHouseholdStore();
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const householdId = activeHouseholdId;
  const activeHousehold = getActiveHousehold();
  const householdOwnerId = activeHousehold?.owner._id ?? "";

  const {
    data: expensesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["expenses", householdId],
    queryFn: ({ pageParam }) =>
      expenseApi.getExpenses(householdId!, pageParam),
    enabled: !!householdId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
  });

  const expenses = expensesData?.pages.flatMap((p) => p.expenses) ?? [];
  const total = expensesData?.pages[0]?.pagination.total ?? 0;

  if (selectedExpense) {
    return (
      <ExpenseDetail
        expense={selectedExpense}
        householdOwnerId={householdOwnerId}
        onClose={() => setSelectedExpense(null)}
        onDeleted={() => setSelectedExpense(null)}
      />
    );
  }

  return (
    <div className="pt-8 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Transactions</h1>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading...</p>}

      {!isLoading && expenses.length === 0 && (
        <div className="py-16 text-center">
          <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No expenses yet</p>
          <p className="text-muted-foreground text-sm mt-1">Add your first expense to get started</p>
        </div>
      )}

      {expenses.length > 0 && (
        <Card>
          <CardContent className="p-3">
            {expenses.map((expense) => (
              <ExpenseCard key={expense._id} expense={expense} onClick={() => setSelectedExpense(expense)} />
            ))}
          </CardContent>
        </Card>
      )}

      {hasNextPage && (
        <Button
          variant="ghost"
          className="w-full mt-3"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading..." : "Load more"}
        </Button>
      )}
    </div>
  );
}
