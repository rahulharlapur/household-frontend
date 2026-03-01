import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Edit,
  PackageMinus,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inventoryApi } from "@/api/services";
import { useHouseholdStore } from "@/store/householdStore";
import { useToast } from "@/hooks/useToast";
import { cn, formatDate, getErrorMessage } from "@/lib/utils";
import type { InventoryItem, InventoryCategory, InventoryStatus } from "@/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const CATEGORIES: { value: InventoryCategory; label: string; emoji: string }[] = [
  { value: "dairy", label: "Dairy", emoji: "🥛" },
  { value: "vegetables", label: "Vegetables", emoji: "🥬" },
  { value: "fruits", label: "Fruits", emoji: "🍎" },
  { value: "meat", label: "Meat", emoji: "🥩" },
  { value: "seafood", label: "Seafood", emoji: "🐟" },
  { value: "bakery", label: "Bakery", emoji: "🍞" },
  { value: "beverages", label: "Beverages", emoji: "🥤" },
  { value: "snacks", label: "Snacks", emoji: "🍿" },
  { value: "frozen", label: "Frozen", emoji: "🧊" },
  { value: "canned", label: "Canned", emoji: "🥫" },
  { value: "condiments", label: "Condiments", emoji: "🧂" },
  { value: "cleaning", label: "Cleaning", emoji: "🧹" },
  { value: "personal_care", label: "Personal Care", emoji: "🧴" },
  { value: "household", label: "Household", emoji: "🏠" },
  { value: "other", label: "Other", emoji: "📦" },
];

const getCategoryEmoji = (category: InventoryCategory) =>
  CATEGORIES.find((c) => c.value === category)?.emoji ?? "📦";

const getStatusColor = (status: InventoryStatus) => {
  switch (status) {
    case "available":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "low":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "empty":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }
};

function ItemCard({
  item,
  onEdit,
  onMarkLow,
  onMarkEmpty,
  onDelete,
}: {
  item: InventoryItem;
  onEdit: () => void;
  onMarkLow: () => void;
  onMarkEmpty: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-xl">{getCategoryEmoji(item.category)}</span>
        <div>
          <p className="text-sm font-medium">{item.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {item.quantity} {item.unit}
            </span>
            {item.lastPurchased && (
              <>
                <span>·</span>
                <span>Last: {formatDate(item.lastPurchased)}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
            getStatusColor(item.status)
          )}
        >
          {item.status}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {item.status === "available" && (
              <DropdownMenuItem onClick={onMarkLow}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Mark Low
              </DropdownMenuItem>
            )}
            {item.status !== "empty" && (
              <DropdownMenuItem onClick={onMarkEmpty}>
                <PackageMinus className="h-4 w-4 mr-2" />
                Mark Empty
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function InventoryPage() {
  const { activeHouseholdId } = useHouseholdStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "all">("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<InventoryCategory>("other");
  const [formQuantity, setFormQuantity] = useState("1");
  const [formUnit, setFormUnit] = useState("pcs");
  const [formNotes, setFormNotes] = useState("");

  const householdId = activeHouseholdId;

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", householdId, categoryFilter, statusFilter],
    queryFn: () =>
      inventoryApi.getItems(householdId!, {
        category: categoryFilter === "all" ? undefined : categoryFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 100,
      }),
    enabled: !!householdId,
  });

  const items = data?.items ?? [];
  const filteredItems = search
    ? items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  // Group by category
  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<InventoryCategory, InventoryItem[]>
  );

  const { mutate: addItem, isPending: isAdding } = useMutation({
    mutationFn: () =>
      inventoryApi.addItem({
        householdId: householdId!,
        name: formName,
        category: formCategory,
        quantity: Number(formQuantity),
        unit: formUnit,
        notes: formNotes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["shopping-list"] });
      toast({ title: "Item added" });
      closeModal();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to add", description: getErrorMessage(error) });
    },
  });

  const { mutate: updateItem, isPending: isUpdating } = useMutation({
    mutationFn: () =>
      inventoryApi.updateItem(editItem!._id, {
        name: formName,
        category: formCategory,
        quantity: Number(formQuantity),
        unit: formUnit,
        notes: formNotes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["shopping-list"] });
      toast({ title: "Item updated" });
      closeModal();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to update", description: getErrorMessage(error) });
    },
  });

  const { mutate: markEmpty } = useMutation({
    mutationFn: (itemId: string) => inventoryApi.markEmpty(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["shopping-list"] });
      toast({ title: "Marked as empty" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed", description: getErrorMessage(error) });
    },
  });

  const { mutate: markLow } = useMutation({
    mutationFn: (itemId: string) => inventoryApi.markLow(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["shopping-list"] });
      toast({ title: "Marked as low" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed", description: getErrorMessage(error) });
    },
  });

  const { mutate: deleteItemMutation, isPending: isDeleting } = useMutation({
    mutationFn: (itemId: string) => inventoryApi.deleteItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["shopping-list"] });
      toast({ title: "Item deleted" });
      setDeleteItem(null);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to delete", description: getErrorMessage(error) });
    },
  });

  const closeModal = () => {
    setAddModalOpen(false);
    setEditItem(null);
    setFormName("");
    setFormCategory("other");
    setFormQuantity("1");
    setFormUnit("pcs");
    setFormNotes("");
  };

  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormQuantity(String(item.quantity));
    setFormUnit(item.unit);
    setFormNotes(item.notes ?? "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    if (editItem) {
      updateItem();
    } else {
      addItem();
    }
  };

  return (
    <div className="pt-8 pb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm">Track your household items</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/shopping-list")}>
            <ShoppingCart className="h-4 w-4 mr-1" />
            Shop
          </Button>
          <Button size="sm" onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Select
          value={categoryFilter}
          onValueChange={(v: string) => setCategoryFilter(v as InventoryCategory | "all")}
        >
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.emoji} {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v: string) => setStatusFilter(v as InventoryStatus | "all")}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="empty">Empty</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Items List */}
      {isLoading && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Loading...
        </div>
      )}

      {!isLoading && !householdId && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Join or create a household to manage inventory
        </div>
      )}

      {!isLoading && householdId && filteredItems.length === 0 && (
        <div className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No items found</p>
          <Button
            variant="link"
            size="sm"
            className="mt-2"
            onClick={() => setAddModalOpen(true)}
          >
            Add your first item
          </Button>
        </div>
      )}

      {!isLoading && filteredItems.length > 0 && (
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
                  <ItemCard
                    key={item._id}
                    item={item}
                    onEdit={() => openEdit(item)}
                    onMarkLow={() => markLow(item._id)}
                    onMarkEmpty={() => markEmpty(item._id)}
                    onDelete={() => setDeleteItem(item)}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={addModalOpen || !!editItem} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Milk 2L"
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formCategory} onValueChange={(v: string) => setFormCategory(v as InventoryCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.emoji} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select value={formUnit} onValueChange={setFormUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">pcs</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="mL">mL</SelectItem>
                    <SelectItem value="pack">pack</SelectItem>
                    <SelectItem value="box">box</SelectItem>
                    <SelectItem value="bottle">bottle</SelectItem>
                    <SelectItem value="can">can</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={isAdding || isUpdating}>
              {isAdding || isUpdating ? "Saving..." : editItem ? "Update" : "Add Item"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={() => setDeleteItem(null)}
        title="Delete Item"
        description={`Are you sure you want to delete "${deleteItem?.name}"?`}
        confirmLabel="Delete"
        onConfirm={() => deleteItem && deleteItemMutation(deleteItem._id)}
        isLoading={isDeleting}
      />
    </div>
  );
}
