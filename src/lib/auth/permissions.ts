// Auto-generated: RBAC permissions ported from NextCRM
// Defines 3 roles (admin/manager/user) via Better-Auth's createAccessControl
import { createAccessControl } from "better-auth/plugins/access"

const statements = {
    user: ["create", "read", "update", "delete", "changeRole", "activate", "deactivate"],
    crm: ["create", "read", "update", "delete"],
    project: ["create", "read", "update", "delete"],
    report: ["read", "export"],
    settings: ["read", "update"],
} as const

export const ac = createAccessControl(statements)

export const admin = ac.newRole({
    user: ["create", "read", "update", "delete", "changeRole", "activate", "deactivate"],
    crm: ["create", "read", "update", "delete"],
    project: ["create", "read", "update", "delete"],
    report: ["read", "export"],
    settings: ["read", "update"],
})

export const manager = ac.newRole({
    user: ["read"],
    crm: ["create", "read", "update", "delete"],
    project: ["create", "read", "update", "delete"],
    report: ["read", "export"],
    settings: ["read"],
})

export const user = ac.newRole({
    user: ["read"],
    crm: ["read"],
    project: ["read"],
    report: ["read"],
    settings: ["read"],
})

// Helper functions for openCRM's 2-layer RBAC integration
export type AppRole = "admin" | "manager" | "user"

export function isAdminRole(role: string): boolean {
    return role === "admin"
}

export function isManagerOrAdminRole(role: string): boolean {
    return role === "manager" || role === "admin"
}

// Maps openCRM's userType (admin/standard) + role to a unified AppRole
export function resolveAppRole(userType: string, role?: string): AppRole {
    if (userType === "admin") return "admin"
    return (role as AppRole) ?? "user"
}
