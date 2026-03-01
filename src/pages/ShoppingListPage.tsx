import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Check, Package, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { inventoryApi } from "@/api/services";
import { useHouseholdStore } from "@/store/householdStore";
import { useToast } from "@/hooks/useToast";
import { cn, getErrorMessage } from "@/lib/utils";
import type { InventoryItem, InventoryCategory } from "@/types";

const getCategoryEmoji = (category: InventoryCategory) => {
  const map: Record<InventoryCategory, string> = {
    dairy: "🥛",
    vegetables: "🥬",
    fruits: "🍎",
    meat: "🥩",
    seafood: "🐟",
    bakery: "🍞",
    beverages: "🥤",
    snacks: "🍿",
    frozen: "🧊",
    canned: "🥫",
    condiments: "🧂",
    cleaning: "🧹",
    personal_care: "🧴",
    household: "🏠",
    other: "📦",
  };
  return map[category] ?? "📦";
};

function ShoppingItem({
  item,
  isSelected,
  onToggle,
  onMarkPurchased,
  isPurchasing,
}: {
  item: InventoryItem;
  isSelected: boolean;
  onToggle: () => void;
  onMarkPurchased: () => void;
  isPurchasing: boolean;
}) {
  const isLow = item.status === "low";

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="h-5 w-5"
        />
        <span className="text-xl">{getCategoryEmoji(item.category)}</span>
        <div>
          <p className={cn("text-sm font-medium", isSelected && "line-through text-muted-foreground")}>
            {item.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.quantity} {item.unit}
            {isLow && (
              <span className="ml-2 text-yellow-600 dark:text-yellow-400">(running low)</span>
            )}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 px-3 text-xs text-primary hover:text-primary"
        onClick={onMarkPurchased}
        disabled={isPurchasing}
      >
        <Check className="h-4 w-4 mr-1" />
        Got it
      </Button>
    </div>
  );
}

export function ShoppingListPage() {
  const { activeHouseholdId } = useHouseholdStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const householdId = activeHouseholdId;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["shopping-list", householdId],
    queryFn: () => inventoryApi.getShoppingList(householdId!),
    enabled: !!householdId,
  });

  const items = data?.items ?? [];

  // Group by category
  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<InventoryCategory, InventoryItem[]>
  );

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i._id)));
    }
  };

  const { mutate: markPurchased } = useMutation({
    mutationFn: (itemId: string) => {
      setPurchasingId(itemId);
      return inventoryApi.markPurchased(itemId);
    },
    onSuccess: (_, itemId) => {
      queryClient.invalidateQueries({ queryKey: ["shopping-list"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      toast({ title: "Marked as purchased ✓" });
      setPurchasingId(null);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed", description: getErrorMessage(error) });
      setPurchasingId(null);
    },
  });

  const { mutate: bulkPurchase, isPending: isBulkPurchasing } = useMutation({
    mutationFn: () =>
      inventoryApi.bulkMarkPurchased({
        householdId: householdId!,
        itemIds: Array.from(selectedIds),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shopping-list"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setSelectedIds(new Set());
      toast({ title: `${data.count} items marked as purchased ✓` });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed", description: getErrorMessage(error) });
    },
  });

  return (
    <div className="pt-8 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Shopping List
          </h1>
          <p className="text-muted-foreground text-sm">
            {items.length} {items.length === 1 ? "item" : "items"} to get
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl hover:bg-accent transition-colors"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {isLoading && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Loading...
        </div>
      )}

      {!isLoading && !householdId && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Join or create a household to see shopping list
        </div>
      )}

      {!isLoading && householdId && items.length === 0 && (
        <div className="py-12 text-center">
          <Package className="h-16 w-16 mx-auto text-primary/50 mb-4" />
          <p className="text-xl font-semibold mb-1">All stocked up! 🎉</p>
          <p className="text-muted-foreground text-sm">
            No items to buy right now
          </p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <>
          {/* Bulk Actions */}
          <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-xl">
            <button
              onClick={selectAll}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {selectedIds.size === items.length ? "Deselect all" : "Select all"}
            </button>
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                onClick={() => bulkPurchase()}
                disabled={isBulkPurchasing}
              >
                <Check className="h-4 w-4 mr-1" />
                {isBulkPurchasing
                  ? "..."
                  : `Mark ${selectedIds.size} purchased`}
              </Button>
            )}
          </div>

          {/* Items by Category */}
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <Card key={category}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span>{getCategoryEmoji(category as InventoryCategory)}</span>
                    <span className="capitalize">{category.replace("_", " ")}</span>
                    <span className="text-muted-foreground font-normal">
                      ({categoryItems.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryItems.map((item) => (
                    <ShoppingItem
                      key={item._id}
                      item={item}
                      isSelected={selectedIds.has(item._id)}
                      onToggle={() => toggleItem(item._id)}
                      onMarkPurchased={() => markPurchased(item._id)}
                      isPurchasing={purchasingId === item._id}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
