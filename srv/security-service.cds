using { sentinel.db as db } from '../db/schema';

@impl: './handlers/security-handler'
service SecurityService @(path: '/security-service') {

    @readonly entity SapUsers                as projection on db.SapUser;
    @readonly entity RoleAssignments         as projection on db.RoleAssignment;
    @readonly entity ScanResults             as projection on db.ScanResult;
    @readonly entity CriticalRoleAssignments as projection on db.CriticalRoleAssignment;
    @readonly entity ComplianceComponents    as projection on db.ComplianceComponent;
    @readonly entity AuditLogs              as projection on db.AuditLog;

    entity SodRules         as projection on db.SodRule;
    entity Violations       as projection on db.Violation;
    entity RemediationTasks as projection on db.RemediationTask;
    entity SecurityNotes    as projection on db.SecurityNote;

    action triggerScan() returns {
        scanId     : String;
        violations : Integer;
        riskScore  : Integer;
        duration   : Integer;
    };

    action acknowledgeViolation(violationId: UUID, mitigatingControl: String) returns Boolean;
    action openTicket(violationId: UUID) returns { ticketKey: String; ticketUrl: String; };
    action applyNote(noteId: String) returns Boolean;
    action generateReport() returns { fileName: String; base64: LargeString; };
    action generateComplianceReport() returns { fileName: String; base64: LargeString; };
    action generateViolationsReport(scanId: UUID) returns { fileName: String; base64: LargeString; };
    action generateUsersReport() returns { fileName: String; base64: LargeString; };
    action generateCriticalRolesReport() returns { fileName: String; base64: LargeString; };
    action generateSodRulesReport() returns { fileName: String; base64: LargeString; };
    action recalculateRiskScores() returns { updated: Integer; };
    action openNoteTicket(noteId: String) returns { ticketKey: String; ticketUrl: String; };
    action resolveViolation(violationId: UUID) returns Boolean;

    action saveRemediationTask(
        violationId   : String,
        userId        : String,
        roleToRemove  : String,
        title         : String,
        notes         : String,
        assignedTo    : String,
        priority      : String,
        scheduledDate : Timestamp,
        dueDate       : Timestamp
    ) returns RemediationTasks;

    action completeRemediationTask(taskId: UUID, completedBy: String) returns Boolean;

    function getCurrentRiskScore() returns {
        riskScore       : Integer;
        complianceScore : Integer;
        openViolations  : Integer;
        criticalRoles   : Integer;
        lastScanAt      : Timestamp;
        lastScanId      : String;
    };

    function getViolationSummary() returns LargeString;
    function getComplianceTrend(limit: Integer) returns LargeString;
    function userInfo() returns { name: String; email: String; given_name: String; family_name: String; isAnalyst: Boolean; role: String; };
}


