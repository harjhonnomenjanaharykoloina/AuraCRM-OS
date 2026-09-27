export const ALLOWED_LEAD_TRANSITIONS: Record<string, string[]> = {
    New: ["Contacted", "Qualified", "Unqualified", "Rejected", "Converted"],
    Contacted: ["Qualified", "Unqualified", "Rejected", "Converted"],
    Qualified: ["Converted", "Rejected"],
    Unqualified: [],
    Converted: [],
    Rejected: [],
};

export function validateLeadStatusTransition(currentStatus: string, newStatus: string): { valid: boolean; error?: string } {
    if (!currentStatus || currentStatus === newStatus) return { valid: true };
    const allowed = ALLOWED_LEAD_TRANSITIONS[currentStatus];
    if (!allowed) return { valid: false, error: `Unknown current status: ${currentStatus}` };
    if (!allowed.includes(newStatus)) return { valid: false, error: `Cannot transition from '${currentStatus}' to '${newStatus}'` };
    return { valid: true };
}
