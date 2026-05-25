using { sentinel.db as db } from '../db/schema';

// ═══════════════════════════════════════════════════════════════════
//  SecurityService — Main OData API for SentinelGRC UI
// ═══════════════════════════════════════════════════════════════════

@impl: './handlers/security-handler'
service SecurityService @(path: '/security-service') {

    // ── Read-only projections (extracted from S/4HANA) ────────────
    @readonly entity SapUsers               as projection on db.SapUser;
    @readonly entity RoleAssignments        as projection on db.RoleAssignment;
    @readonly entity ScanResults            as projection on db.ScanResult;
    @readonly entity CriticalRoleAssignments as projection on db.CriticalRoleAssignment;
    @readonly entity ComplianceComponents   as projection on db.ComplianceComponent;
    @readonly entity AuditLogs              as projection on db.AuditLog;

    // ── Writable entities (managed by SentinelGRC) ────────────────
    entity SodRules             as projection on db.SodRule;
    entity Violations           as projection on db.Violation;
    entity RemediationTasks     as projection on db.RemediationTask;
    entity SecurityNotes        as projection on db.SecurityNote;

    // ── Actions ───────────────────────────────────────────────────

    // Trigger a full scan: extract → analyse → persist → return scan ID
    action triggerScan() returns {
        scanId      : String;
        violations  : Integer;
        riskScore   : Integer;
        duration    : Integer;
    };

    // Acknowledge a violation with optional mitigating control
    action acknowledgeViolation(
        violationId       : UUID;
        mitigatingControl : String
    ) returns Boolean;

    // Resolve a violation (Basis confirmed the fix)
    action resolveViolation(violationId : UUID) returns Boolean;

    // Create or update a remediation task
    action saveRemediationTask(
        violationId  : String;
        userId       : String;
        roleToRemove : String;
        title        : String;
        notes        : String;
        assignedTo   : String;
        priority     : String;
        scheduledDate: Timestamp;
        dueDate      : Timestamp
    ) returns RemediationTasks;

    // Mark a remediation task as done
    action completeRemediationTask(
        taskId      : UUID;
        completedBy : String
    ) returns Boolean;

    // Get current system risk score (latest scan)
    function getCurrentRiskScore() returns {
        riskScore       : Integer;
        complianceScore : Integer;
        openViolations  : Integer;
        criticalRoles   : Integer;
        lastScanAt      : Timestamp;
        lastScanId      : String;
    };

    // Get violation summary by severity for charts
    function getViolationSummary() returns LargeString;

    // Get compliance trend for last N scans
    function getComplianceTrend(limit: Integer) returns LargeString;
}
