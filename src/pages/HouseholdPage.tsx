import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Check, Home, Users, Plus, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { householdApi } from "@/api/services";
import { getInitials, formatDate, getErrorMessage, cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useHouseholdStore } from "@/store/householdStore";
import { useToast } from "@/hooks/useToast";

const createSchema = z.object({ name: z.string().min(2, "Name must be at least 2 characters") });
const joinSchema = z.object({ inviteCode: z.string().min(1, "Invite code is required") });

type CreateData = z.infer<typeof createSchema>;
type JoinData = z.infer<typeof joinSchema>;

export function HouseholdPage() {
  const user = useAuthStore((s) => s.user);
  const { households, activeHouseholdId, setHouseholds, setActiveHousehold, addHousehold, getActiveHousehold } = useHouseholdStore();
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createForm = useForm<CreateData>({ resolver: zodResolver(createSchema) });
  const joinForm = useForm<JoinData>({ resolver: zodResolver(joinSchema) });

  // Fetch all households
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["households", user?._id],
    queryFn: () => householdApi.getAll(),
    enabled: !!user?._id,
  });

  // Sync to store
  useEffect(() => {
    if (data?.households) {
      setHouseholds(data.households);
    }
  }, [data, setHouseholds]);

  const activeHousehold = getActiveHousehold();

  const createMutation = useMutation({
    mutationFn: (data: CreateData) => householdApi.create(data.name),
    onSuccess: (result) => {
      addHousehold(result.household);
      queryClient.invalidateQueries({ queryKey: ["households"] });
      toast({ title: "Household created!" });
      setMode(null);
      createForm.reset();
    },
    onError: (error) => toast({ variant: "destructive", title: "Failed to create household", description: getErrorMessage(error) }),
  });

  const joinMutation = useMutation({
    mutationFn: (data: JoinData) => householdApi.join(data.inviteCode),
    onSuccess: (result) => {
      addHousehold(result.household);
      queryClient.invalidateQueries({ queryKey: ["households"] });
      toast({ title: "Joined household!" });
      setMode(null);
      joinForm.reset();
    },
    onError: (error) => toast({ variant: "destructive", title: "Failed to join household", description: getErrorMessage(error) }),
  });

  const copyInviteCode = async () => {
    if (!activeHousehold?.inviteCode) return;
    await navigator.clipboard.writeText(activeHousehold.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pt-8 pb-4 animate-fade-in">
      <h1 className="font-display text-2xl font-bold mb-6">Households</h1>

      {isLoading && <p className="text-muted-foreground text-sm">Loading...</p>}

      {isError && (
        <div className="py-16 text-center">
          <p className="text-destructive text-sm mb-2">Failed to load households</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      )}

      {/* Create/Join forms */}
      {mode === "create" && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Create New Household</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Household name</Label>
                <Input id="name" placeholder="e.g. The Flat on King St" {...createForm.register("name")} />
                {createForm.formState.errors.name && (
                  <p className="text-destructive text-xs">{createForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setMode(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {mode === "join" && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Join Household</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={joinForm.handleSubmit((data) => joinMutation.mutate(data))} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="inviteCode">Invite code</Label>
                <Input id="inviteCode" placeholder="e.g. a3f9bc12" {...joinForm.register("inviteCode")} />
                {joinForm.formState.errors.inviteCode && (
                  <p className="text-destructive text-xs">{joinForm.formState.errors.inviteCode.message}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setMode(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={joinMutation.isPending}>
                  {joinMutation.isPending ? "Joining..." : "Join"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Show list of ALL households */}
      {!isLoading && !isError && !mode && (
        <div className="space-y-4">
          {/* Household list */}
          {households.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Your Households ({households.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {households.map((household) => (
                  <button
                    key={household._id}
                    onClick={() => setActiveHousehold(household._id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left",
                      household._id === activeHouseholdId ? "bg-accent" : "hover:bg-muted"
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Home className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{household.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {household.members.length} member{household.members.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {household._id === activeHouseholdId && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium shrink-0">
                        Active
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Add more households */}
          <div className="grid grid-cols-2 gap-3">
            <Card
              className="p-4 cursor-pointer hover:border-primary transition-colors text-center"
              onClick={() => setMode("create")}
            >
              <Plus className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-medium text-sm">Create New</p>
            </Card>
            <Card
              className="p-4 cursor-pointer hover:border-primary transition-colors text-center"
              onClick={() => setMode("join")}
            >
              <Users className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-medium text-sm">Join Another</p>
            </Card>
          </div>

          {/* Active household details */}
          {activeHousehold && (
            <>
              <h2 className="font-display text-lg font-semibold mt-6 mb-3">
                {activeHousehold.name}
              </h2>

              {/* Invite code */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Invite Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                    <span className="font-mono font-semibold text-lg tracking-widest">
                      {activeHousehold.inviteCode}
                    </span>
                    <Button variant="ghost" size="icon" onClick={copyInviteCode}>
                      {copied ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Share this code with housemates to invite them
                  </p>
                </CardContent>
              </Card>

              {/* Members */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Members ({activeHousehold.members.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {activeHousehold.members.map((member) => (
                    <div key={member._id} className="flex items-center gap-3 py-2">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(member.firstName, member.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                      {member._id === activeHousehold.owner._id && (
                        <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-medium">
                          Owner
                        </span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Info */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">
                      {formatDate(activeHousehold.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* No households yet */}
          {households.length === 0 && (
            <div className="py-8 text-center">
              <Home className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No households yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Create a new household or join one using an invite code
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
