import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Plus, Pencil, Trash2, Star, Home, Briefcase, X } from "lucide-react";
import { DashCard, EmptyState } from "@/components/dashboard/DashboardShell";
import { type Address, useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/addresses")({
  head: () => ({ meta: [{ title: "Saved Addresses — OxiGen" }, { name: "robots", content: "noindex" }] }),
  component: AddressesPage,
});

function AddressesPage() {
  const { addresses, addAddress, updateAddress, deleteAddress } = useStore();
  const [open, setOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const setDefault = async (id: string) => {
    const success = await updateAddress(id, { isDefault: true });
    if (success) {
      toast.success("Default address updated");
    }
  };

  const remove = async (id: string) => {
    const success = await deleteAddress(id);
    if (success) {
      toast("Address removed");
    }
  };

  const handleSave = async (addr: Omit<Address, "id">) => {
    if (editingAddress) {
      const success = await updateAddress(editingAddress.id, addr);
      if (success) {
        setOpen(false);
        setEditingAddress(null);
      }
    } else {
      const success = await addAddress(addr);
      if (success) {
        setOpen(false);
      }
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {addresses.length} saved address{addresses.length !== 1 ? "es" : ""}
        </p>
        <button
          onClick={() => {
            setEditingAddress(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25"
        >
          <Plus className="h-4 w-4" /> Add Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState icon={MapPin} title="No saved addresses" desc="Add your first delivery address to speed up checkout." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((a) => {
            const Icon = a.label.toLowerCase().includes("office") ? Briefcase : Home;
            return (
              <DashCard key={a.id} className={a.isDefault ? "ring-2 ring-primary/40" : ""}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-display font-bold text-ink">{a.label}</p>
                      {a.isDefault && (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                          <Star className="h-3 w-3 fill-current" /> Default
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-ink">
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-muted-foreground">{a.phone}</p>
                  <p>{a.line1}</p>
                  <p>{a.city}, {a.province} {a.postal}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-3">
                  {!a.isDefault && (
                    <button onClick={() => setDefault(a.id)} className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-white">
                      <Star className="h-3.5 w-3.5" /> Set Default
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingAddress(a);
                      setOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-white"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button onClick={() => remove(a.id)} className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </DashCard>
            );
          })}
        </div>
      )}

      {open && (
        <AddressModal
          address={editingAddress}
          onClose={() => {
            setOpen(false);
            setEditingAddress(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function AddressModal({
  onClose,
  onSave,
  address,
}: {
  onClose: () => void;
  onSave: (a: Omit<Address, "id">) => void;
  address: Address | null;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl glass p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold text-ink">
            {address ? "Edit Address" : "Add Address"}
          </h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/70 text-ink" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            onSave({
              label: String(f.get("label") || "Home"),
              name: String(f.get("name") || ""),
              phone: String(f.get("phone") || ""),
              line1: String(f.get("line1") || ""),
              city: String(f.get("city") || ""),
              province: String(f.get("province") || ""),
              postal: String(f.get("postal") || ""),
            });
          }}
        >
          <Field name="label" label="Label" placeholder="Home / Office" defaultValue={address?.label} />
          <Field name="name" label="Full Name" defaultValue={address?.name} required />
          <Field name="phone" label="Phone Number" defaultValue={address?.phone} required />
          <Field name="line1" label="Street Address" defaultValue={address?.line1} required />
          <div className="grid grid-cols-2 gap-3">
            <Field name="city" label="City" defaultValue={address?.city} required />
            <Field name="province" label="Province" defaultValue={address?.province} required />
          </div>
          <Field name="postal" label="Postal Code" defaultValue={address?.postal} />
          <button type="submit" className="mt-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-3 text-sm font-semibold text-white">
            Save Address
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-xl bg-white/70 px-3 text-sm text-ink outline-none ring-1 ring-inset ring-border transition focus:ring-primary"
      />
    </label>
  );
}
