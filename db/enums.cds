namespace sentinel.db;

// ─── Violation severity ───────────────────────────────────────────
type Severity : String enum {
    High;
    Medium;
    Low;
}

// ─── Violation status ─────────────────────────────────────────────
type ViolationStatus : String enum {
    Open;
    Acknowledged;
    Resolved;
    Mitigated;
}

// ─── User type (from S/4HANA USR02.USTYP) ────────────────────────
type UserType : String enum {
    A;   // Dialog
    B;   // BDC
    C;   // Communication
    S;   // System
    L;   // Reference
}

// ─── Scan trigger type ────────────────────────────────────────────
type ScanTrigger : String enum {
    Manual;
    Scheduled;
    API;
}

// ─── Scan status ──────────────────────────────────────────────────
type ScanStatus : String enum {
    Running;
    Complete;
    Failed;
}

// ─── Remediation task status ──────────────────────────────────────
type RemediationStatus : String enum {
    Scheduled;
    InProgress;
    Done;
    Cancelled;
}

// ─── Remediation priority ─────────────────────────────────────────
type RemediationPriority : String enum {
    High;
    Medium;
    Low;
}

// ─── Component compliance status ─────────────────────────────────
type ComplianceStatus : String enum {
    Compliant;
    Outdated;
    Unknown;
}
