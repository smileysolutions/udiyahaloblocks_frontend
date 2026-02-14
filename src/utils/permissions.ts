import type { User } from "../api/types";

export const can = (user: User | null, perm: keyof User["permissions"]) => {
  if (!user) return false;
  if (user.role === "Technical Team") return true;
  return !!user.permissions?.[perm];
};
