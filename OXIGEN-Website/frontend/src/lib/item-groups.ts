import type { ItemGroup } from "@/lib/admin-api";

/**
 * Helpers for the Category / Item Group dropdown.
 *
 * ERPNext's Item Group is a tree whose root is `All Item Groups`. The backend
 * already filters that root out, but a stray root entry still reaches the UI in
 * some flows, and ERPNext rejects any document linked to a group it does not
 * know about (`LinkValidationError: Could not find Item Group: …`).
 *
 * The old code fell back to a hardcoded `"General"` whenever the list was empty
 * or a value was unset. No such group exists in ERPNext, so creating a product
 * before the groups had loaded failed with a 500. The helpers below never
 * invent a group: they return the first *real* option, or an empty string so the
 * caller can block submission with a clear message instead.
 */

const ROOT_GROUP = "All Item Groups";

/** True for a group that can actually be assigned to an Item. */
export function isSelectableGroup(group: ItemGroup): boolean {
  const name = group.item_group_name || group.name;
  return Boolean(name) && name !== ROOT_GROUP;
}

/**
 * The groups an Item may be assigned to, in the order ERPNext returned them.
 */
export function selectableGroups(groups: ItemGroup[] | undefined): ItemGroup[] {
  return (groups ?? []).filter(isSelectableGroup);
}

/**
 * The value to preselect for a new Item: the current form value when it is a
 * real group, otherwise the first selectable one, otherwise `""`.
 */
export function resolveGroupValue(
  groups: ItemGroup[] | undefined,
  current?: string | null,
): string {
  const usable = selectableGroups(groups);
  const names = usable.map((g) => g.item_group_name || g.name);

  if (current && names.includes(current)) return current;
  return names[0] ?? "";
}

/** A human-readable reason the form cannot be submitted yet, or null. */
export function groupValidationError(
  groups: ItemGroup[] | undefined,
  value?: string | null,
): string | null {
  const names = selectableGroups(groups).map((g) => g.item_group_name || g.name);

  if (names.length === 0) {
    return "No Item Group is available in ERPNext. Create one before adding products.";
  }

  if (!value || !names.includes(value)) {
    return "Select a valid Category (Item Group).";
  }

  return null;
}
