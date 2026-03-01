import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { expenseApi } from "@/api/services";
import { useAuthStore } from "@/store/authStore";
import { useHouseholdStore } from "@/store/householdStore";
import { useToast } from "@/hooks/useToast";
import { getInitials, getErrorMessage, cn } from "@/lib/utils";
import type { HouseholdMember } from "@/types";

const schema = z.object({
  description: z.string().min(1, "Description is required"),
  totalAmount: z.coerce.number().positive("Amount must be positive"),
});

type FormData = z.infer<typeof schema>;

export function AddExpensePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { getActiveHousehold } = useHouseholdStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [paidBy, setPaidBy] = useState<string>("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const household = getActiveHousehold();
  const members = household?.members ?? [];

  // Set paidBy to current user once available
  useEffect(() => {
    if (user?._id && !paidBy) {
      setPaidBy(user._id);
    }
  }, [user?._id, paidBy]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: expenseApi.add,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Expense added!" });
      navigate("/dashboard");
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to add expense", description: getErrorMessage(error) });
    },
  });

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const onSubmit = (data: FormData) => {
    if (!household) return;
    mutate({
      householdId: household._id,
      paidBy,
      totalAmount: data.totalAmount,
      splitType,
      description: data.description,
      customSplits: splitType === "custom"
        ? selectedMembers.map((id) => ({ userId: id }))
        : undefined,
    });
  };

  return (
    <div className="pt-8 pb-4 animate-fade-in">
      <h1 className="font-display text-2xl font-bold mb-6">Add Expense</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input placeholder="e.g. Woolworths grocery run" {...register("description")} />
          {errors.description && <p className="text-destructive text-xs">{errors.description.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Total Amount</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
            <Input type="number" step="0.01" placeholder="0.00" className="pl-8" {...register("totalAmount")} />
          </div>
          {errors.totalAmount && <p className="text-destructive text-xs">{errors.totalAmount.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Paid by</Label>
          <div className="flex flex-wrap gap-2">
            {members.map((member: HouseholdMember) => (
              <button
                key={member._id}
                type="button"
                onClick={() => setPaidBy(member._id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors",
                  paidBy === member._id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary/50"
                )}
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px]">{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                </Avatar>
                {member.firstName}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Split type</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["equal", "custom"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSplitType(type)}
                className={cn(
                  "py-3 rounded-xl border text-sm font-medium transition-colors capitalize",
                  splitType === type ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"
                )}
              >
                {type} split
              </button>
            ))}
          </div>
        </div>

        {splitType === "custom" && (
          <div className="space-y-2">
            <Label>Select who's splitting</Label>
            <Card>
              <CardContent className="p-3 space-y-1">
                {members.map((member: HouseholdMember) => (
                  <button
                    key={member._id}
                    type="button"
                    onClick={() => toggleMember(member._id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left",
                      selectedMembers.includes(member._id) ? "bg-accent" : "hover:bg-muted"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{member.firstName} {member.lastName}</span>
                    {selectedMembers.includes(member._id) && (
                      <span className="ml-auto text-primary text-xs font-semibold">✓</span>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
            {selectedMembers.length === 0 && (
              <p className="text-xs text-muted-foreground">Select at least one person</p>
            )}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isPending || !household || (splitType === "custom" && selectedMembers.length === 0)}
        >
          {isPending ? "Adding..." : "Add expense"}
        </Button>
      </form>
    </div>
  );
}
