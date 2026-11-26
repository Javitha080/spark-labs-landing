import { describe, it, expect } from "vitest";
import { CMS_ACCESS_ROLES, PAGE_PERMISSION_MAP, ROLE_PERMISSIONS, getCMSLandingPath } from "./rbac";
import { ALL_NAV_ITEMS } from "@/components/admin/adminNavItems";

describe("RBAC and Admin navigation sync", () => {
  it("keeps ALL_NAV_ITEMS in sync with PAGE_PERMISSION_MAP", () => {
    for (const item of ALL_NAV_ITEMS) {
      expect(PAGE_PERMISSION_MAP[item.path]).toBe(item.permission);
    }
  });

  it("lands every CMS role on a page it actually has permission to view", () => {
    for (const role of CMS_ACCESS_ROLES) {
      expect(role).not.toBeNull();
      const landing = getCMSLandingPath(role);
      const requiredPerm = PAGE_PERMISSION_MAP[landing];
      expect(requiredPerm).toBeTruthy();

      const perms = ROLE_PERMISSIONS[role!];
      const allowed = perms.includes("all") || perms.includes(requiredPerm);
      expect(allowed).toBe(true);
    }
  });
});
