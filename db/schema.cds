namespace sentinel.db;

using { cuid, managed } from '@sap/cds/common';
using {
    sentinel.db.Severity,
    sentinel.db.ViolationStatus,
    sentinel.db.UserType,
    sentinel.db.ScanTrigger,
    sentinel.db.ScanStatus,
    sentinel.db.RemediationStatus,
    sentinel.db.RemediationPriority,
    sentinel.db.ComplianceStatus
} from './enums';


// ═══════════════════════════════════════════════════════════════════
//  SodRule — The SoD conflict rule matrix (seeded from CSV)
// ═══════════════════════════════════════════════════════════════════

@title: 'SoD Rule'
entity SodRule : cuid {
    @title: 'Rule Code'
    ruleCode        : String(20)  @mandatory;

    @title: 'Role A'
    roleA           : String(30)  @mandatory;

    @title: 'Role B'
    roleB           : String(30)  @mandatory;

    @title: 'Risk Level'
    riskLevel       : Severity    @mandatory;

    @title: 'Risk Description'
    riskDescription : String(500);

    @title: 'Category'
    category        : String(50);  // Finance, Procurement, Basis...

    @title: 'Active'
    active          : Boolean     default true;
}


// ═══════════════════════════════════════════════════════════════════
//  SapUser — Extracted from S/4HANA USR02
// ═══════════════════════════════════════════════════════════════════

@title: 'SAP User'
entity SapUser : managed {
    @title: 'User ID (BNAME)'
    key userId      : String(12);

    @title: 'Full Name'
    userName        : String(80);

    @title: 'User Type'
    userType        : UserType;

    @title: 'Locked'
    locked          : Boolean   default false;

    @title: 'Last Login'
    lastLogin       : DateTime;

    @title: 'Valid From'
    validFrom       : Date;

    @title: 'Valid To'
    validTo         : Date;

    @title: 'Department'
    department      : String(80);

    @title: 'Risk Score'
    riskScore       : Integer   default 0;

    // Navigations
    roleAssignments : Association to many RoleAssignment on roleAssignments.userId = userId;
    violations      : Association to many Violation      on violations.userId      = userId;
}


// ═══════════════════════════════════════════════════════════════════
//  RoleAssignment — Extracted from S/4HANA AGR_USERS
// ═══════════════════════════════════════════════════════════════════

@title: 'Role Assignment'
entity RoleAssignment : managed {
    key userId      : String(12);
    key roleId      : String(30);

    @title: 'From Date'
    fromDate        : Date;

    @title: 'To Date'
    toDate          : Date;

    @title: 'Org Level'
    orgLevel        : String(12);
}


// ═══════════════════════════════════════════════════════════════════
//  ScanResult — One entry per triggered scan
// ═══════════════════════════════════════════════════════════════════

@title: 'Scan Result'
entity ScanResult : cuid, managed {
    @title: 'Scan ID'
    scanCode        : String(20);

    @title: 'Started At'
    startedAt       : Timestamp  @mandatory;

    @title: 'Completed At'
    completedAt     : Timestamp;

    @title: 'Duration (seconds)'
    durationSec     : Integer;

    @title: 'Trigger'
    trigger         : ScanTrigger  default 'Manual';

    @title: 'Status'
    status          : ScanStatus   default 'Running';

    @title: 'Users Scanned'
    usersScanned    : Integer  default 0;

    @title: 'Violations Found'
    violationsFound : Integer  default 0;

    @title: 'Risk Score'
    riskScore       : Integer  default 0;

    @title: 'Compliance Score'
    complianceScore : Integer  default 0;

    @title: 'High Violations'
    highCount       : Integer  default 0;

    @title: 'Medium Violations'
    mediumCount     : Integer  default 0;

    @title: 'Low Violations'
    lowCount        : Integer  default 0;

    // Violations found in this scan
    violations      : Association to many Violation on violations.scanId = ID;
}


// ═══════════════════════════════════════════════════════════════════
//  Violation — SoD conflict detected for a user
// ═══════════════════════════════════════════════════════════════════

@title: 'Violation'
entity Violation : cuid, managed {
    @title: 'Scan'
    scanId          : UUID;

    @title: 'User ID'
    userId          : String(12)  @mandatory;

    @title: 'User Name'
    userName        : String(80);

    @title: 'Department'
    dept            : String(80);

    @title: 'Role A'
    roleA           : String(30)  @mandatory;

    @title: 'Role B'
    roleB           : String(30)  @mandatory;

    @title: 'SoD Rule'
    ruleId          : UUID;

    @title: 'Risk Description'
    risk            : String(500);

    @title: 'Severity'
    severity        : Severity    @mandatory;

    @title: 'Status'
    status          : ViolationStatus  default 'Open';

    @title: 'Detected At'
    detectedAt      : Timestamp;

    @title: 'Acknowledged By'
    acknowledgedBy  : String(80);

    @title: 'Mitigating Control'
    mitigatingControl : String(500);

    // Navigation
    scan            : Association to ScanResult on scan.ID = scanId;
}


// ═══════════════════════════════════════════════════════════════════
//  CriticalRoleAssignment — SAP_ALL / firefighter profiles
// ═══════════════════════════════════════════════════════════════════

@title: 'Critical Role Assignment'
entity CriticalRoleAssignment : cuid, managed {
    @title: 'Scan ID'
    scanId          : UUID;

    @title: 'User ID'
    userId          : String(12)  @mandatory;

    @title: 'User Name'
    userName        : String(80);

    @title: 'Profile / Role'
    profile         : String(30)  @mandatory;

    @title: 'Critical Type'
    criticalType    : String(20);  // SAP_ALL, FIREFIGHTER, WILDCARD

    @title: 'Severity'
    severity        : Severity    default 'High';

    @title: 'Status'
    status          : ViolationStatus  default 'Open';
}


// ═══════════════════════════════════════════════════════════════════
//  ComplianceComponent — CVERS-based component version tracking
// ═══════════════════════════════════════════════════════════════════

@title: 'Compliance Component'
entity ComplianceComponent : managed {
    @title: 'Component Name'
    key name            : String(20);

    @title: 'Installed Version'
    installedVersion    : String(20);

    @title: 'Required Version'
    requiredVersion     : String(20);

    @title: 'Delta (missing patches)'
    delta               : Integer  default 0;

    @title: 'Status'
    status              : ComplianceStatus  default 'Unknown';

    @title: 'Risk Note'
    riskNote            : String(500);

    @title: 'Last Checked'
    lastChecked         : Timestamp;
}


// ═══════════════════════════════════════════════════════════════════
//  RemediationTask — Calendar-based remediation scheduling
// ═══════════════════════════════════════════════════════════════════

@title: 'Remediation Task'
entity RemediationTask : cuid, managed {
    @title: 'Task Code'
    taskCode        : String(20);

    @title: 'Violation ID'
    violationId     : String(20);

    @title: 'Affected User ID'
    userId          : String(12);

    @title: 'Affected User Name'
    userName        : String(80);

    @title: 'Role / Profile to Remove'
    roleToRemove    : String(30);

    @title: 'Action Title'
    title           : String(500)  @mandatory;

    @title: 'Notes'
    notes           : String(1000);

    @title: 'Assigned To'
    assignedTo      : String(80);

    @title: 'Priority'
    priority        : RemediationPriority  default 'High';

    @title: 'Status'
    status          : RemediationStatus    default 'Scheduled';

    @title: 'Scheduled Date'
    scheduledDate   : Timestamp  @mandatory;

    @title: 'Due Date'
    dueDate         : Timestamp;

    @title: 'Completed At'
    completedAt     : Timestamp;

    @title: 'Completed By'
    completedBy     : String(80);
}


// ═══════════════════════════════════════════════════════════════════
//  SecurityNote — Missing SAP security notes tracking
// ═══════════════════════════════════════════════════════════════════

@title: 'Security Note'
entity SecurityNote : managed {
    @title: 'Note ID'
    key noteId      : String(20);

    @title: 'Component'
    component       : String(20);

    @title: 'Priority'
    priority        : Severity;

    @title: 'Category'
    category        : String(50);

    @title: 'Description'
    description     : String(500);

    @title: 'Release Date'
    releaseDate     : Date;

    @title: 'Applied'
    applied         : Boolean  default false;

    @title: 'Note URL'
    noteUrl         : String(200);

    @title: 'Applied At'
    appliedAt       : Timestamp;
}

// ═══════════════════════════════════════════════════════════════════
//  ScheduleConfig — controls automated scan scheduling
// ═══════════════════════════════════════════════════════════════════
@title: 'Scan Schedule'
entity ScheduleConfig : managed {
    key ID          : String(10) default 'default';

    @title: 'Enabled'
    enabled         : Boolean  default false;

    @title: 'Cron Expression'
    cronExpression  : String(50) default '0 */6 * * *';

    @title: 'Last Run'
    lastRun         : Timestamp;

    @title: 'Next Run'
    nextRun         : Timestamp;
}


// ═══════════════════════════════════════════════════════════════════
//  AuditLog — Every significant action logged
// ═══════════════════════════════════════════════════════════════════

@title: 'Audit Log'
entity AuditLog : cuid {
    @title: 'Timestamp'
    timestamp       : Timestamp  @mandatory;

    @title: 'Action'
    action          : String(50)  @mandatory;  // SCAN, ACKNOWLEDGE, REMEDIATE, LOGIN

    @title: 'Entity Type'
    entityType      : String(30);

    @title: 'Entity ID'
    entityId        : String(36);

    @title: 'Performed By'
    performedBy     : String(80);

    @title: 'Details'
    details         : LargeString;

    @title: 'IP Address'
    ipAddress       : String(45);
}
