import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Home, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { householdApi } from "@/api/services";
import { useHouseholdStore } from "@/store/householdStore";
import { useToast } from "@/hooks/useToast";
import { getErrorMessage } from "@/lib/utils";

const createSchema = z.object({ name: z.string().min(2, "Name must be at least 2 characters") });
const joinSchema = z.object({ inviteCode: z.string().min(1, "Invite code is required") });

type CreateData = z.infer<typeof createSchema>;
type JoinData = z.infer<typeof joinSchema>;

export function OnboardingPage() {
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const navigate = useNavigate();
  const addHousehold = useHouseholdStore((s) => s.addHousehold);
  const { toast } = useToast();

  const createForm = useForm<CreateData>({ resolver: zodResolver(createSchema) });
  const joinForm = useForm<JoinData>({ resolver: zodResolver(joinSchema) });

  const createMutation = useMutation({
    mutationFn: (data: CreateData) => householdApi.create(data.name),
    onSuccess: (data) => {
      addHousehold(data.household);
      navigate("/dashboard");
    },
    onError: (error) => toast({ variant: "destructive", title: "Failed to create household", description: getErrorMessage(error) }),
  });

  const joinMutation = useMutation({
    mutationFn: (data: JoinData) => householdApi.join(data.inviteCode),
    onSuccess: (data) => {
      addHousehold(data.household);
      navigate("/dashboard");
    },
    onError: (error) => toast({ variant: "destructive", title: "Failed to join household", description: getErrorMessage(error) }),
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-bold">Set up your household</h1>
          <p className="text-muted-foreground text-sm mt-1">Create a new one or join an existing household</p>
        </div>

        {!mode && (
          <div className="grid grid-cols-2 gap-3">
            <Card
              className="p-5 cursor-pointer hover:border-primary transition-colors text-center"
              onClick={() => setMode("create")}
            >
              <Home className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-medium text-sm">Create</p>
              <p className="text-muted-foreground text-xs mt-1">Start a new household</p>
            </Card>
            <Card
              className="p-5 cursor-pointer hover:border-primary transition-colors text-center"
              onClick={() => setMode("join")}
            >
              <Users className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-medium text-sm">Join</p>
              <p className="text-muted-foreground text-xs mt-1">Use an invite code</p>
            </Card>
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Household name</Label>
              <Input id="name" placeholder="e.g. The Flat on King St" {...createForm.register("name")} />
              {createForm.formState.errors.name && (
                <p className="text-destructive text-xs">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create household"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setMode(null)}>
              Back
            </Button>
          </form>
        )}

        {mode === "join" && (
          <form onSubmit={joinForm.handleSubmit((data) => joinMutation.mutate(data))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inviteCode">Invite code</Label>
              <Input id="inviteCode" placeholder="e.g. a3f9bc12" {...joinForm.register("inviteCode")} />
              {joinForm.formState.errors.inviteCode && (
                <p className="text-destructive text-xs">{joinForm.formState.errors.inviteCode.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={joinMutation.isPending}>
              {joinMutation.isPending ? "Joining..." : "Join household"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setMode(null)}>
              Back
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
