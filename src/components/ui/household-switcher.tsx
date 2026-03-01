import { ChevronDown, Home, Check, Plus, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useHouseholdStore } from "@/store/householdStore";
import { useAuthStore } from "@/store/authStore";
import { householdApi } from "@/api/services";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";

export function HouseholdSwitcher() {
  const user = useAuthStore((s) => s.user);
  const { households, activeHouseholdId, setActiveHousehold, setHouseholds } = useHouseholdStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch households to ensure switcher has data
  const { data } = useQuery({
    queryKey: ["households", user?._id],
    queryFn: () => householdApi.getAll(),
    enabled: !!user?._id,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Sync to store when data arrives
  useEffect(() => {
    if (data?.households && data.households.length > 0) {
      setHouseholds(data.households);
    }
  }, [data, setHouseholds]);

  const activeHousehold = households.find((h) => h._id === activeHouseholdId);

  // Create household mutation
  const { mutate: createHousehold, isPending: isCreating } = useMutation({
    mutationFn: (name: string) => householdApi.create(name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["households"] });
      setActiveHousehold(data.household._id);
      setShowCreateDialog(false);
      setNewHouseholdName("");
      toast({ title: "Household created!", description: `Welcome to ${data.household.name}` });
    },
    onError: () => {
      toast({ title: "Failed to create household", variant: "destructive" });
    },
  });

  // Join household mutation
  const { mutate: joinHousehold, isPending: isJoining } = useMutation({
    mutationFn: (code: string) => householdApi.join(code),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["households"] });
      setActiveHousehold(data.household._id);
      setShowJoinDialog(false);
      setInviteCode("");
      toast({ title: "Joined household!", description: `Welcome to ${data.household.name}` });
    },
    onError: () => {
      toast({ title: "Invalid invite code", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (newHouseholdName.trim()) {
      createHousehold(newHouseholdName.trim());
    }
  };

  const handleJoin = () => {
    if (inviteCode.trim()) {
      joinHousehold(inviteCode.trim());
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent/80 transition-colors"
        >
          <Home className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-[120px]">
            {activeHousehold?.name ?? "Select Household"}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            {/* Dropdown */}
            <div className="absolute top-full mt-2 left-0 right-0 min-w-[200px] bg-background border border-border rounded-xl shadow-lg z-50 overflow-hidden">
              {households.length > 0 ? (
                households.map((household) => (
                  <button
                    key={household._id}
                    onClick={() => {
                      setActiveHousehold(household._id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors",
                      household._id === activeHouseholdId && "bg-accent"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{household.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {household.members.length} member{household.members.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {household._id === activeHouseholdId && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  No households yet
                </div>
              )}
              
              {/* Divider */}
              <div className="border-t border-border" />
              
              {/* Create Household */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateDialog(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors"
              >
                <Plus className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Create Household</span>
              </button>
              
              {/* Join Household */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowJoinDialog(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors"
              >
                <UserPlus className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Join Household</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Create Household Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>Create New Household</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="household-name">Household Name</Label>
              <Input
                id="household-name"
                placeholder="e.g., Home, Apartment 4B"
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleCreate}
              disabled={!newHouseholdName.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create Household"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Household Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>Join Household</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Ask the household owner for the invite code
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={handleJoin}
              disabled={!inviteCode.trim() || isJoining}
            >
              {isJoining ? "Joining..." : "Join Household"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
