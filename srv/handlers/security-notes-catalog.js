'use strict';
// ─────────────────────────────────────────────────────────────────
//  SAP Security Notes catalog — real notes from SAP Support Portal
//  Export date: 2026-07-03 · 130 notes · Nov 2025 – Jun 2026
//  Fields match sentinel.db.SecurityNote (cvss is engine-only, used for sorting/capping)
// ─────────────────────────────────────────────────────────────────
const SECURITY_NOTES = [
  {
    "noteId": "3746332",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "HotNews",
    "description": "XML Signature Wrapping in SAML Authentication in SAP NetWeaver AS ABAP and ABAP Platform (CVE-2026-44748, CVSS 9.9)",
    "releaseDate": "2026-06-09",
    "noteUrl": "https://me.sap.com/notes/3746332",
    "cvss": 9.9
  },
  {
    "noteId": "3719353",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "HotNews",
    "description": "SQL Injection vulnerability in SAP Business Planning and Consolidation and SAP Business Warehouse (CVE-2026-27681, CVSS 9.9)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3719353",
    "cvss": 9.9
  },
  {
    "noteId": "3697099",
    "component": "WEBCUIF",
    "priority": "High",
    "category": "HotNews",
    "description": "Code Injection vulnerability in SAP CRM and SAP S/4HANA (Scripting Editor) (CVE-2026-0488, CVSS 9.9)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3697099",
    "cvss": 9.9
  },
  {
    "noteId": "3687749",
    "component": "SAP_FIN",
    "priority": "High",
    "category": "HotNews",
    "description": "SQL Injection Vulnerability in SAP S/4HANA Private Cloud and On-Premise (Financials \u2013 General Ledger) (CVE-2026-0501, CVSS 9.9)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3687749",
    "cvss": 9.9
  },
  {
    "noteId": "3685270",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "HotNews",
    "description": "Code Injection vulnerability in SAP Solution Manager (CVE-2025-42880, CVSS 9.9)",
    "releaseDate": "2025-12-09",
    "noteUrl": "https://me.sap.com/notes/3685270",
    "cvss": 9.9
  },
  {
    "noteId": "3717897",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "HotNews",
    "description": "Memory Corruption vulnerability in Application Server ABAP of SAP NetWeaver and ABAP Platform (CVE-2026-27671, CVSS 9.8)",
    "releaseDate": "2026-06-09",
    "noteUrl": "https://me.sap.com/notes/3717897",
    "cvss": 9.8
  },
  {
    "noteId": "3698553",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "HotNews",
    "description": "[CVE-2019-17571 ] Code Injection vulnerability in SAP Quotation Management Insurance application (FS-QUO) (CVSS 9.8)",
    "releaseDate": "2026-03-10",
    "noteUrl": "https://me.sap.com/notes/3698553",
    "cvss": 9.8
  },
  {
    "noteId": "3733064",
    "component": "WEBCUIF",
    "priority": "High",
    "category": "HotNews",
    "description": "Missing authentication check in SAP Commerce Cloud configuration (CVE-2026-34263, CVSS 9.6)",
    "releaseDate": "2026-05-15",
    "noteUrl": "https://me.sap.com/notes/3733064",
    "cvss": 9.6
  },
  {
    "noteId": "3724838",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "HotNews",
    "description": "SQL injection vulnerability in SAP S/4HANA (SAP Enterprise Search for ABAP) (CVE-2026-34260, CVSS 9.6)",
    "releaseDate": "2026-05-12",
    "noteUrl": "https://me.sap.com/notes/3724838",
    "cvss": 9.6
  },
  {
    "noteId": "3674774",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "HotNews",
    "description": "Missing Authorization check in SAP NetWeaver Application Server ABAP and ABAP Platform (CVE-2026-0509, CVSS 9.6)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3674774",
    "cvss": 9.6
  },
  {
    "noteId": "3668679",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "HotNews",
    "description": "Remote code execution in SAP Wily Introscope Enterprise Manager (WorkStation) (CVE-2026-0500, CVSS 9.6)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3668679",
    "cvss": 9.6
  },
  {
    "noteId": "3683579",
    "component": "WEBCUIF",
    "priority": "High",
    "category": "HotNews",
    "description": "Multiple vulnerabilities in Apache Tomcat within SAP Commerce Cloud (CVSS 9.6)",
    "releaseDate": "2025-12-12",
    "noteUrl": "https://me.sap.com/notes/3683579",
    "cvss": 9.6
  },
  {
    "noteId": "3748262",
    "component": "WEBCUIF",
    "priority": "High",
    "category": "HotNews",
    "description": "Potential Spring Security vulnerability within SAP Commerce Cloud and SAP Data Hub (CVE-2026-22732, CVSS 9.1)",
    "releaseDate": "2026-06-09",
    "noteUrl": "https://me.sap.com/notes/3748262",
    "cvss": 9.1
  },
  {
    "noteId": "3714585",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "HotNews",
    "description": "[ CVE-2026-27685] Insecure Deserialization in SAP NetWeaver Enterprise Portal Administration (CVSS 9.1)",
    "releaseDate": "2026-03-10",
    "noteUrl": "https://me.sap.com/notes/3714585",
    "cvss": 9.1
  },
  {
    "noteId": "3697979",
    "component": "SAP_ABA",
    "priority": "High",
    "category": "HotNews",
    "description": "Code Injection vulnerability in SAP Landscape Transformation (CVE-2026-0491, CVSS 9.1)",
    "releaseDate": "2026-01-27",
    "noteUrl": "https://me.sap.com/notes/3697979",
    "cvss": 9.1
  },
  {
    "noteId": "3694242",
    "component": "SAP_ABA",
    "priority": "High",
    "category": "HotNews",
    "description": "Code Injection vulnerability in SAP S/4HANA (Private Cloud and On-Premise) (CVE-2026-0498, CVSS 9.1)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3694242",
    "cvss": 9.1
  },
  {
    "noteId": "3685286",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "HotNews",
    "description": "Deserialization Vulnerability in SAP jConnect - SDK for ASE (CVE-2025-42928, CVSS 9.1)",
    "releaseDate": "2025-12-23",
    "noteUrl": "https://me.sap.com/notes/3685286",
    "cvss": 9.1
  },
  {
    "noteId": "3727078",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "HotNews",
    "description": "Directory Traversal vulnerability in SAP NetWeaver Application Server Java (Web Container) (CVE-2026-40128, CVSS 9.0)",
    "releaseDate": "2026-06-09",
    "noteUrl": "https://me.sap.com/notes/3727078",
    "cvss": 9.0
  },
  {
    "noteId": "3747787",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "HotNews",
    "description": "Malicious open-source packages in SAP Cloud Application Programming Model & MTA Build Tool",
    "releaseDate": "2026-05-19",
    "noteUrl": "https://me.sap.com/notes/3747787",
    "cvss": 0
  },
  {
    "noteId": "3697567",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "Program error",
    "description": "XML Signature Wrapping in SAP NetWeaver AS ABAP and ABAP Platform (CVE-2026-23687, CVSS 8.8)",
    "releaseDate": "2026-02-13",
    "noteUrl": "https://me.sap.com/notes/3697567",
    "cvss": 8.8
  },
  {
    "noteId": "3691059",
    "component": "SAP_HANA_DB",
    "priority": "High",
    "category": "Program error",
    "description": "Privilege escalation vulnerability in SAP HANA database (CVE-2026-0492, CVSS 8.8)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3691059",
    "cvss": 8.8
  },
  {
    "noteId": "3675151",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "Program error",
    "description": "OS Command Injection vulnerability in SAP Application Server for ABAP and SAP NetWeaver RFCSDK (CVE-2026-0507, CVSS 8.4)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3675151",
    "cvss": 8.4
  },
  {
    "noteId": "3732471",
    "component": "SAP_SCM",
    "priority": "High",
    "category": "Program error",
    "description": "OS Command Injection Vulnerability in SAP Forecasting & Replenishment (CVE-2026-34259, CVSS 8.2)",
    "releaseDate": "2026-05-26",
    "noteUrl": "https://me.sap.com/notes/3732471",
    "cvss": 8.2
  },
  {
    "noteId": "3684682",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "Program error",
    "description": "Sensitive Data Exposure in SAP Web Dispatcher and Internet Communication Manager (ICM) (CVE-2025-42878, CVSS 8.2)",
    "releaseDate": "2025-12-09",
    "noteUrl": "https://me.sap.com/notes/3684682",
    "cvss": 8.2
  },
  {
    "noteId": "3688703",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "Program error",
    "description": "Missing Authorization check in SAP NetWeaver Application Server ABAP and ABAP Platform (CVE-2026-0506, CVSS 8.1)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3688703",
    "cvss": 8.1
  },
  {
    "noteId": "3565506",
    "component": "SAP_FIN",
    "priority": "High",
    "category": "Program error",
    "description": "Multiple vulnerabilities in SAP Fiori App (Intercompany Balance Reconciliation) (CVE-2026-0511, CVSS 8.1)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3565506",
    "cvss": 8.1
  },
  {
    "noteId": "3640185",
    "component": "SAP_BW",
    "priority": "High",
    "category": "Program error",
    "description": "Denial of service (DOS) in SAP NetWeaver (remote service for Xcelsius) (CVE-2025-42874, CVSS 7.9)",
    "releaseDate": "2025-12-09",
    "noteUrl": "https://me.sap.com/notes/3640185",
    "cvss": 7.9
  },
  {
    "noteId": "3719502",
    "component": "SAP_SCM",
    "priority": "High",
    "category": "Program error",
    "description": "Denial of service (DOS) in SAP Supply Chain Management (CVE-2026-27689, CVSS 7.7)",
    "releaseDate": "2026-03-10",
    "noteUrl": "https://me.sap.com/notes/3719502",
    "cvss": 7.7
  },
  {
    "noteId": "3703092",
    "component": "SAP_SCM",
    "priority": "High",
    "category": "Program error",
    "description": "Denial of service (DOS) in SAP Supply Chain Management (CVE-2026-23689, CVSS 7.7)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3703092",
    "cvss": 7.7
  },
  {
    "noteId": "3705882",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "Program error",
    "description": "Missing Authorization check in SAP Solution Tools Plug-In (ST-PI) (CVE-2026-24322, CVSS 7.7)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3705882",
    "cvss": 7.7
  },
  {
    "noteId": "3678282",
    "component": "SAP_BW",
    "priority": "High",
    "category": "Program error",
    "description": "Denial of service (DOS) vulnerability in SAP\u00a0BusinessObjects BI\u00a0Platform (CVE-2026-0485, CVSS 7.5)",
    "releaseDate": "2026-03-24",
    "noteUrl": "https://me.sap.com/notes/3678282",
    "cvss": 7.5
  },
  {
    "noteId": "3654236",
    "component": "SAP_BW",
    "priority": "High",
    "category": "Program error",
    "description": "Denial of service (DOS) in SAP BusinessObjects BI Platform (CVE-2026-0490, CVSS 7.5)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3654236",
    "cvss": 7.5
  },
  {
    "noteId": "3677544",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "Program error",
    "description": "Memory Corruption vulnerability in SAP Web Dispatcher, Internet Communication Manager and SAP Content Server (CVE-2025-42877, CVSS 7.5)",
    "releaseDate": "2025-12-09",
    "noteUrl": "https://me.sap.com/notes/3677544",
    "cvss": 7.5
  },
  {
    "noteId": "3650226",
    "component": "SAP_BW",
    "priority": "High",
    "category": "Program error",
    "description": "Denial of service (DOS) in SAP Business Objects (CVE-2025-48976, CVSS 7.5)",
    "releaseDate": "2025-12-09",
    "noteUrl": "https://me.sap.com/notes/3650226",
    "cvss": 7.5
  },
  {
    "noteId": "3747484",
    "component": "WEBCUIF",
    "priority": "High",
    "category": "Program error",
    "description": "Multiple vulnerabilities in Apache Tomcat within SAP Commerce Cloud (CVE-2026-29145, CVSS 7.4)",
    "releaseDate": "2026-06-09",
    "noteUrl": "https://me.sap.com/notes/3747484",
    "cvss": 7.4
  },
  {
    "noteId": "3692405",
    "component": "WEBCUIF",
    "priority": "High",
    "category": "Program error",
    "description": "Race Condition in SAP Commerce Cloud (CVE-2025-12383, CVSS 7.4)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3692405",
    "cvss": 7.4
  },
  {
    "noteId": "3674246",
    "component": "SAP_BW",
    "priority": "High",
    "category": "Program error",
    "description": "Open Redirect vulnerability in SAP BusinessObjects Business Intelligence Platform (CVE-2026-0508, CVSS 7.3)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3674246",
    "cvss": 7.3
  },
  {
    "noteId": "3735546",
    "component": "SAP_BASIS",
    "priority": "High",
    "category": "Program error",
    "description": "Missing Authorization check in Application Server ABAP of SAP NetWeaver and ABAP Platform (CVE-2026-44751, CVSS 7.1)",
    "releaseDate": "2026-06-09",
    "noteUrl": "https://me.sap.com/notes/3735546",
    "cvss": 7.1
  },
  {
    "noteId": "3731908",
    "component": "SAP_ABA",
    "priority": "High",
    "category": "Program error",
    "description": "Missing Authorization check in SAP ERP and SAP S/4 HANA (Private Cloud and On-Premise) (CVE-2026-34256, CVSS 7.1)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3731908",
    "cvss": 7.1
  },
  {
    "noteId": "3672151",
    "component": "SAP_FIN",
    "priority": "High",
    "category": "Program error",
    "description": "Missing Authorization Check in SAP S/4 HANA Private Cloud (Financials General Ledger) (CVE-2025-42876, CVSS 7.1)",
    "releaseDate": "2025-12-09",
    "noteUrl": "https://me.sap.com/notes/3672151",
    "cvss": 7.1
  },
  {
    "noteId": "3748819",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing caller identification check-in for ODP Data Replication APIs (CVE-2026-44754, CVSS 6.6)",
    "releaseDate": "2026-06-09",
    "noteUrl": "https://me.sap.com/notes/3748819",
    "cvss": 6.6
  },
  {
    "noteId": "3591163",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authentication check in SAP NetWeaver Internet Communication Framework (CVE-2025-42875, CVSS 6.6)",
    "releaseDate": "2025-12-09",
    "noteUrl": "https://me.sap.com/notes/3591163",
    "cvss": 6.6
  },
  {
    "noteId": "3751691",
    "component": "SAP_ABA",
    "priority": "Medium",
    "category": "Program error",
    "description": "SQL Injection vulnerability in SAP S/4HANA (CVE-2026-44744, CVSS 6.5)",
    "releaseDate": "2026-06-09",
    "noteUrl": "https://me.sap.com/notes/3751691",
    "cvss": 6.5
  },
  {
    "noteId": "3730019",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "OS Command Injection vulnerability in SAP NetWeaver Application Server for ABAP and ABAP Platform (CVE-2026-40135, CVSS 6.5)",
    "releaseDate": "2026-05-12",
    "noteUrl": "https://me.sap.com/notes/3730019",
    "cvss": 6.5
  },
  {
    "noteId": "3680767",
    "component": "SAP_HR",
    "priority": "Medium",
    "category": "Program error",
    "description": "Information Disclosure vulnerability in SAP Human Capital Management for SAP S/4HANA (CVE-2026-34264, CVSS 6.5)",
    "releaseDate": "2026-04-17",
    "noteUrl": "https://me.sap.com/notes/3680767",
    "cvss": 6.5
  },
  {
    "noteId": "3715177",
    "component": "SAP_AP",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP S/4HANA Backend OData Service (Manage Reference Structures) (CVE-2026-27678, CVSS 6.5)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3715177",
    "cvss": 6.5
  },
  {
    "noteId": "3715097",
    "component": "SAP_AP",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP S/4HANA OData Service (Manage Reference Equipment) (CVE-2026-27677, CVSS 6.5)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3715097",
    "cvss": 6.5
  },
  {
    "noteId": "3696239",
    "component": "SAP_BW",
    "priority": "Medium",
    "category": "Program error",
    "description": "Denial of Service Vulnerability in SAP BusinessObjects Business Intelligence Platform (CVE-2025-64775, CVSS 6.5)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3696239",
    "cvss": 6.5
  },
  {
    "noteId": "3705094",
    "component": "SAP_HR",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP Business Analytics and SAP Content  Management (CVE-2026-34261, CVSS 6.5)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3705094",
    "cvss": 6.5
  },
  {
    "noteId": "3716767",
    "component": "SAP_AP",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP S/4HANA Frontend OData Service (Manage Reference Structures) (CVE-2026-27679, CVSS 6.5)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3716767",
    "cvss": 6.5
  },
  {
    "noteId": "3695912",
    "component": "SAP_BW",
    "priority": "Medium",
    "category": "Program error",
    "description": "Denial of service (DOS) vulnerability in SAP BusinessObjects Business Intelligence Platform (AdminTools) (CVE-2026-24324, CVSS 6.5)",
    "releaseDate": "2026-02-24",
    "noteUrl": "https://me.sap.com/notes/3695912",
    "cvss": 6.5
  },
  {
    "noteId": "3672622",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP NetWeaver Application Server ABAP and SAP S/4HANA (CVE-2026-0484, CVSS 6.5)",
    "releaseDate": "2026-02-24",
    "noteUrl": "https://me.sap.com/notes/3672622",
    "cvss": 6.5
  },
  {
    "noteId": "3662324",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Information Disclosure vulnerability in Application Server ABAP (CVE-2025-42904, CVSS 6.5)",
    "releaseDate": "2025-12-09",
    "noteUrl": "https://me.sap.com/notes/3662324",
    "cvss": 6.5
  },
  {
    "noteId": "3689080",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Server-Side Request Forgery (SSRF) in SAP NetWeaver Application Server for ABAP (CVE-2026-24316, CVSS 6.4)",
    "releaseDate": "2026-03-24",
    "noteUrl": "https://me.sap.com/notes/3689080",
    "cvss": 6.4
  },
  {
    "noteId": "3697355",
    "component": "SAP_ABA",
    "priority": "Medium",
    "category": "Program error",
    "description": "SQL Injection Vulnerability in SAP NetWeaver (Feedback Notification) (CVE-2026-27684, CVSS 6.4)",
    "releaseDate": "2026-03-10",
    "noteUrl": "https://me.sap.com/notes/3697355",
    "cvss": 6.4
  },
  {
    "noteId": "3703856",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP NetWeaver Application Server for ABAP (CVE-2026-24309, CVSS 6.4)",
    "releaseDate": "2026-03-10",
    "noteUrl": "https://me.sap.com/notes/3703856",
    "cvss": 6.4
  },
  {
    "noteId": "3681523",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP ERP Central Component and SAP S/4HANA (SAP EHS Management) (CVE-2026-0503, CVSS 6.4)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3681523",
    "cvss": 6.4
  },
  {
    "noteId": "3718083",
    "component": "SAP_AP",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP S/4HANA Condition Maintenance (CVE-2026-40133, CVSS 6.3)",
    "releaseDate": "2026-05-12",
    "noteUrl": "https://me.sap.com/notes/3718083",
    "cvss": 6.3
  },
  {
    "noteId": "3692004",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Open Redirect vulnerability in SAP NetWeaver Application Server ABAP (CVE-2026-34257, CVSS 6.1)",
    "releaseDate": "2026-06-23",
    "noteUrl": "https://me.sap.com/notes/3692004",
    "cvss": 6.1
  },
  {
    "noteId": "3723655",
    "component": "SAP_BW",
    "priority": "Medium",
    "category": "Program error",
    "description": "Reflected Cross-Site Scripting (XSS) vulnerability in SAP NetWeaver AS Java (JDBC Test Servlet) (CVE-2026-44746, CVSS 6.1)",
    "releaseDate": "2026-06-09",
    "noteUrl": "https://me.sap.com/notes/3723655",
    "cvss": 6.1
  },
  {
    "noteId": "3727717",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Cross-Site Scripting (XSS) vulnerability in Business Server Pages Application (TAF_APPLAUNCHER) (CVE-2026-40137, CVSS 6.1)",
    "releaseDate": "2026-05-12",
    "noteUrl": "https://me.sap.com/notes/3727717",
    "cvss": 6.1
  },
  {
    "noteId": "3719397",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Code Injection vulnerability in SAP NetWeaver Application Server Java (Web Dynpro Java) (CVE-2026-27674, CVSS 6.1)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3719397",
    "cvss": 6.1
  },
  {
    "noteId": "3645228",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Cross-Site Scripting (XSS) vulnerability in SAP Supplier Relationship Management (SICF Handler in SRM Catalog) (CVE-2026-0512, CVSS 6.1)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3645228",
    "cvss": 6.1
  },
  {
    "noteId": "3693543",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "DOM-based Cross-Site Scripting (XSS) Vulnerability in SAP Business One (Job Service) (CVE-2026-0489, CVSS 6.1)",
    "releaseDate": "2026-03-10",
    "noteUrl": "https://me.sap.com/notes/3693543",
    "cvss": 6.1
  },
  {
    "noteId": "3688319",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Open Redirection vulnerability in Business Server Pages Application (TAF_APPLAUNCHER) (CVE-2026-24328, CVSS 6.1)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3688319",
    "cvss": 6.1
  },
  {
    "noteId": "3678417",
    "component": "SAP_ABA",
    "priority": "Medium",
    "category": "Program error",
    "description": "Multiple vulnerabilities in BSP Applications of SAP Document Management System (CVE-2026-0505, CVSS 6.1)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3678417",
    "cvss": 6.1
  },
  {
    "noteId": "3666061",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Cross-Site Scripting (XSS) vulnerability in SAP Business Connector (CVE-2026-0514, CVSS 6.1)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3666061",
    "cvss": 6.1
  },
  {
    "noteId": "3687372",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Cross-Site Scripting (XSS) vulnerability in SAP NetWeaver Enterprise Portal (CVE-2026-0499, CVSS 6.1)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3687372",
    "cvss": 6.1
  },
  {
    "noteId": "3662622",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Cross-Site Scripting (XSS) vulnerability in SAP NetWeaver Enterprise Portal (CVE-2025-42872, CVSS 6.1)",
    "releaseDate": "2025-12-09",
    "noteUrl": "https://me.sap.com/notes/3662622",
    "cvss": 6.1
  },
  {
    "noteId": "3503138",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Information Disclosure vulnerability in SAP NetWeaver Application Server ABAP (applications based on SAP GUI for HTML) (CVE-2025-0059, CVSS 6.0)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3503138",
    "cvss": 6.0
  },
  {
    "noteId": "3703385",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP Business Warehouse (Service API) (CVE-2026-27686, CVSS 5.9)",
    "releaseDate": "2026-03-10",
    "noteUrl": "https://me.sap.com/notes/3703385",
    "cvss": 5.9
  },
  {
    "noteId": "3689543",
    "component": "WEBCUIF",
    "priority": "Medium",
    "category": "Program error",
    "description": "Race condition vulnerability in SAP Commerce Cloud (CVE-2026-23684, CVSS 5.9)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3689543",
    "cvss": 5.9
  },
  {
    "noteId": "3676970",
    "component": "SAP_ABA",
    "priority": "Medium",
    "category": "Program error",
    "description": "Denial of Service (DoS) in SAPUI5 framework (Markdown-it component) (CVE-2025-42873, CVSS 5.9)",
    "releaseDate": "2025-12-09",
    "noteUrl": "https://me.sap.com/notes/3676970",
    "cvss": 5.9
  },
  {
    "noteId": "3701020",
    "component": "SAP_HR",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP S/4HANA HCM Portugal and SAP ERP HCM Portugal (CVE-2026-27687, CVSS 5.8)",
    "releaseDate": "2026-03-10",
    "noteUrl": "https://me.sap.com/notes/3701020",
    "cvss": 5.8
  },
  {
    "noteId": "3679346",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Information Disclosure Vulnerability in SAP Business One (B1 Client Memory Dump Files) (CVE-2026-24319, CVSS 5.8)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3679346",
    "cvss": 5.8
  },
  {
    "noteId": "3708457",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Insecure Storage Protection vulnerability in SAP Customer Checkout 2.0 (CVE-2026-24311, CVSS 5.6)",
    "releaseDate": "2026-03-10",
    "noteUrl": "https://me.sap.com/notes/3708457",
    "cvss": 5.6
  },
  {
    "noteId": "3659117",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP Enterprise Search for ABAP (CVE-2025-42891, CVSS 5.5)",
    "releaseDate": "2025-12-09",
    "noteUrl": "https://me.sap.com/notes/3659117",
    "cvss": 5.5
  },
  {
    "noteId": "3721959",
    "component": "SAP_FIN",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization Check in SAP Strategic Enterprise Management (BSP application Balanced Scorecard Wizard) (CVE-2026-40132, CVSS 5.4)",
    "releaseDate": "2026-05-12",
    "noteUrl": "https://me.sap.com/notes/3721959",
    "cvss": 5.4
  },
  {
    "noteId": "3667593",
    "component": "SAP_BW",
    "priority": "Medium",
    "category": "Program error",
    "description": "Cross Site Request Forgery (CSRF) in SAP BusinessObjects Business Intelligence Platform (CVE-2026-0502, CVSS 5.4)",
    "releaseDate": "2026-05-12",
    "noteUrl": "https://me.sap.com/notes/3667593",
    "cvss": 5.4
  },
  {
    "noteId": "3651390",
    "component": "SAP_BW",
    "priority": "Medium",
    "category": "Program error",
    "description": "Server-Side Request Forgery (SSRF) in  SAP BusinessObjects Business Intelligence Platform (CVE-2025-42896, CVSS 5.4)",
    "releaseDate": "2025-12-09",
    "noteUrl": "https://me.sap.com/notes/3651390",
    "cvss": 5.4
  },
  {
    "noteId": "3687771",
    "component": "WEBCUIF",
    "priority": "Medium",
    "category": "Program error",
    "description": "Information Disclosure vulnerability in SAP Commerce Cloud (CVE-2026-24321, CVSS 5.3)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3687771",
    "cvss": 5.3
  },
  {
    "noteId": "3710111",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing authorization check in SAP Business Workflow (CVE-2026-24312, CVSS 5.2)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3710111",
    "cvss": 5.2
  },
  {
    "noteId": "3730639",
    "component": "SAP_HANA_DB",
    "priority": "Medium",
    "category": "Program error",
    "description": "Information Disclosure Vulnerability in SAP HANA Cockpit and HANA Database Explorer (CVE-2026-34262, CVSS 5.0)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3730639",
    "cvss": 5.0
  },
  {
    "noteId": "3707930",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP Solution Tools Plug-In (ST-PI) (CVE-2026-24313, CVSS 5.0)",
    "releaseDate": "2026-03-10",
    "noteUrl": "https://me.sap.com/notes/3707930",
    "cvss": 5.0
  },
  {
    "noteId": "3704740",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP NetWeaver Application Server for ABAP (CVE-2026-27688, CVSS 5.0)",
    "releaseDate": "2026-03-10",
    "noteUrl": "https://me.sap.com/notes/3704740",
    "cvss": 5.0
  },
  {
    "noteId": "3699761",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "DLL Hijacking vulnerability in SAP GUI for Windows with active GuiXT (CVE-2026-24317, CVSS 5.0)",
    "releaseDate": "2026-03-10",
    "noteUrl": "https://me.sap.com/notes/3699761",
    "cvss": 5.0
  },
  {
    "noteId": "3691645",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization Check in ABAP based SAP systems (CVE-2026-0486, CVSS 5.0)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3691645",
    "cvss": 5.0
  },
  {
    "noteId": "3703813",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization Check in SAP S/4HANA (Private Cloud and On-Premise) (CVE-2026-27673, CVSS 4.9)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3703813",
    "cvss": 4.9
  },
  {
    "noteId": "3610322",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP NetWeaver Application Server for ABAP (CVE-2025-42961, CVSS 4.9)",
    "releaseDate": "2025-11-25",
    "noteUrl": "https://me.sap.com/notes/3610322",
    "cvss": 4.9
  },
  {
    "noteId": "3716450",
    "component": "WEBCUIF",
    "priority": "Medium",
    "category": "Program error",
    "description": "Potential Improper Certificate Validation in SAP Commerce Cloud (Apache Log4j) (CVE-2025-68161, CVSS 4.8)",
    "releaseDate": "2026-05-12",
    "noteUrl": "https://me.sap.com/notes/3716450",
    "cvss": 4.8
  },
  {
    "noteId": "3697256",
    "component": "SAP_BW",
    "priority": "Medium",
    "category": "Program error",
    "description": "Cross Site Scripting (XSS) vulnerability in SAP BusinessObjects Enterprise (Central Management Console) (CVE-2026-24325, CVSS 4.8)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3697256",
    "cvss": 4.8
  },
  {
    "noteId": "3715280",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Cross-Site Scripting (XSS) vulnerability in SAP Wily Introscope Enterprise Manager (CVE-2026-44757, CVSS 4.7)",
    "releaseDate": "2026-06-09",
    "noteUrl": "https://me.sap.com/notes/3715280",
    "cvss": 4.7
  },
  {
    "noteId": "3728690",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Reflected Cross-Site Scripting (XSS) vulnerability in SAP NetWeaver Application Server ABAP (Applications based on Business Server Pages) (CVE-2026-27682, CVSS 4.7)",
    "releaseDate": "2026-05-12",
    "noteUrl": "https://me.sap.com/notes/3728690",
    "cvss": 4.7
  },
  {
    "noteId": "3726583",
    "component": "SAP_HANA_DB",
    "priority": "Medium",
    "category": "Program error",
    "description": "Content Spoofing vulnerability in SAPUI5 (Search UI) (CVE-2026-34258, CVSS 4.7)",
    "releaseDate": "2026-05-12",
    "noteUrl": "https://me.sap.com/notes/3726583",
    "cvss": 4.7
  },
  {
    "noteId": "3396109",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Cross-Site Scripting (XSS) vulnerability in SAP NetWeaver Business Client for HTML (CVE-2024-22128, CVSS 4.7)",
    "releaseDate": "2026-02-24",
    "noteUrl": "https://me.sap.com/notes/3396109",
    "cvss": 4.7
  },
  {
    "noteId": "3638716",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Open Redirect Vulnerability in SAP Supplier Relationship Management (SICF Handler in SRM Catalog) (CVE-2026-0513, CVSS 4.7)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3638716",
    "cvss": 4.7
  },
  {
    "noteId": "3687285",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Insecure Deserialization vulnerability in SAP NetWeaver (JMS service) (CVE-2026-23685, CVSS 4.4)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3687285",
    "cvss": 4.4
  },
  {
    "noteId": "3687096",
    "component": "SAP_BW",
    "priority": "Medium",
    "category": "Program error",
    "description": "Email Spoofing vulnerability in SAP Business Objects Business Intelligence Platform (CVE-2026-44755, CVSS 4.3)",
    "releaseDate": "2026-06-09",
    "noteUrl": "https://me.sap.com/notes/3687096",
    "cvss": 4.3
  },
  {
    "noteId": "3673181",
    "component": "SAP_ABA",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP MDG (Review Match Groups Application) (CVE-2026-44750, CVSS 4.3)",
    "releaseDate": "2026-06-09",
    "noteUrl": "https://me.sap.com/notes/3673181",
    "cvss": 4.3
  },
  {
    "noteId": "3433366",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Information Disclosure vulnerability in SAP Gateway (CVE-2026-44749, CVSS 4.3)",
    "releaseDate": "2026-05-26",
    "noteUrl": "https://me.sap.com/notes/3433366",
    "cvss": 4.3
  },
  {
    "noteId": "3718508",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization Check in SAP Incentive and Commission Management (CVE-2026-40134, CVSS 4.3)",
    "releaseDate": "2026-05-13",
    "noteUrl": "https://me.sap.com/notes/3718508",
    "cvss": 4.3
  },
  {
    "noteId": "3735359",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Code Injection vulnerability in SAP Application Server ABAP for SAP NetWeaver and ABAP Platform (CVE-2026-40129, CVSS 4.3)",
    "releaseDate": "2026-05-12",
    "noteUrl": "https://me.sap.com/notes/3735359",
    "cvss": 4.3
  },
  {
    "noteId": "3713521",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Denial of service (DoS) in SAP Financial Consolidation (CVE-2026-40136, CVSS 4.3)",
    "releaseDate": "2026-05-12",
    "noteUrl": "https://me.sap.com/notes/3713521",
    "cvss": 4.3
  },
  {
    "noteId": "3703276",
    "component": "SAP_SCM",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in Material Master Application (CVE-2026-27672, CVSS 4.3)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3703276",
    "cvss": 4.3
  },
  {
    "noteId": "3711682",
    "component": "SAP_AP",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP S/4HANA OData Service (Manage Technical Object Structures) (CVE-2026-27676, CVSS 4.3)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3711682",
    "cvss": 4.3
  },
  {
    "noteId": "3530544",
    "component": "SAP_FIN",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP S4CORE (Manage Journal Entries) (CVE-2025-42899, CVSS 4.3)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3530544",
    "cvss": 4.3
  },
  {
    "noteId": "3700960",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "[Multiple CVEs] Denial of Service due to Outdated OpenSSL Version in SAP NetWeaver AS Java (Adobe Document Services) (CVSS 4.3)",
    "releaseDate": "2026-03-10",
    "noteUrl": "https://me.sap.com/notes/3700960",
    "cvss": 4.3
  },
  {
    "noteId": "3646297",
    "component": "SAP_FIN",
    "priority": "Medium",
    "category": "Program error",
    "description": "Information Disclosure vulnerability in SAP S/4HANA (Manage Payment Media) (CVE-2026-24314, CVSS 4.3)",
    "releaseDate": "2026-02-24",
    "noteUrl": "https://me.sap.com/notes/3646297",
    "cvss": 4.3
  },
  {
    "noteId": "3680390",
    "component": "SAP_FIN",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization Check in SAP Strategic Enterprise Management (Balanced Scorecard in BSP Application) (CVE-2026-24327, CVSS 4.3)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3680390",
    "cvss": 4.3
  },
  {
    "noteId": "3678009",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing authorization check in SAP S/4HANA Defense & Security (Disconnected Operations) (CVE-2026-24326, CVSS 4.3)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3678009",
    "cvss": 4.3
  },
  {
    "noteId": "3215823",
    "component": "SAP_AP",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP Fiori App (Manage Service Entry Sheets - Lean Services) (CVE-2026-23688, CVSS 4.3)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3215823",
    "cvss": 4.3
  },
  {
    "noteId": "3680416",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in a function module in SAP Support Tools Plug-In (CVE-2026-23681, CVSS 4.3)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3680416",
    "cvss": 4.3
  },
  {
    "noteId": "3122486",
    "component": "SAP_FIN",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP Fiori App (Intercompany Balance Reconciliation) (CVE-2026-23683, CVSS 4.3)",
    "releaseDate": "2026-01-27",
    "noteUrl": "https://me.sap.com/notes/3122486",
    "cvss": 4.3
  },
  {
    "noteId": "3677111",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in Business Server Pages Application (Product Designer Web UI) (CVE-2026-0497, CVSS 4.3)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3677111",
    "cvss": 4.3
  },
  {
    "noteId": "3655229",
    "component": "SAP_FIN",
    "priority": "Medium",
    "category": "Program error",
    "description": "Cross-Site Request Forgery (CSRF) vulnerability in SAP Fiori App (Intercompany Balance Reconciliation) (CVE-2026-0493, CVSS 4.3)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3655229",
    "cvss": 4.3
  },
  {
    "noteId": "3655227",
    "component": "SAP_FIN",
    "priority": "Medium",
    "category": "Program error",
    "description": "Information Disclosure vulnerability in SAP Fiori App (Intercompany Balance Reconciliation) (CVE-2026-0494, CVSS 4.3)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3655227",
    "cvss": 4.3
  },
  {
    "noteId": "3626440",
    "component": "SAP_BASIS",
    "priority": "Medium",
    "category": "Program error",
    "description": "Missing Authorization check in SAP NetWeaver and ABAP Platform (CVE-2025-42986, CVSS 4.3)",
    "releaseDate": "2025-11-25",
    "noteUrl": "https://me.sap.com/notes/3626440",
    "cvss": 4.3
  },
  {
    "noteId": "3682699",
    "component": "SAP_ABA",
    "priority": "Medium",
    "category": "Program error",
    "description": "Path Traversal Vulnerability in SAP Fiori (launchpad) (CVE-2026-24315, CVSS 4.2)",
    "releaseDate": "2026-06-09",
    "noteUrl": "https://me.sap.com/notes/3682699",
    "cvss": 4.2
  },
  {
    "noteId": "3702191",
    "component": "SAP_BW",
    "priority": "Medium",
    "category": "Program error",
    "description": "Insecure Session Management vulnerability in SAP BusinessObjects Business Intelligence Platform (CVE-2026-24318, CVSS 4.2)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3702191",
    "cvss": 4.2
  },
  {
    "noteId": "3698216",
    "component": "SAP_BW",
    "priority": "Medium",
    "category": "Program error",
    "description": "Reflected cross site scripting vulnerability in SAP BusinessObjects Business Intelligence Platform (CVE-2026-27683, CVSS 4.1)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3698216",
    "cvss": 4.1
  },
  {
    "noteId": "3657998",
    "component": "SAP_BASIS",
    "priority": "Low",
    "category": "Program error",
    "description": "Insufficient Input Handling in JNDI Operations of SAP Identity Management (CVE-2026-0504, CVSS 3.8)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3657998",
    "cvss": 3.8
  },
  {
    "noteId": "3706000",
    "component": "SAP_BW",
    "priority": "Low",
    "category": "Program error",
    "description": "Security Misconfiguration vulnerability in SAP Business Objects (CVE-2026-44743, CVSS 3.7)",
    "releaseDate": "2026-06-09",
    "noteUrl": "https://me.sap.com/notes/3706000",
    "cvss": 3.7
  },
  {
    "noteId": "3694383",
    "component": "SAP_BASIS",
    "priority": "Low",
    "category": "Program error",
    "description": "Missing Authorization check in SAP NetWeaver Application Server for ABAP (CVE-2026-24310, CVSS 3.5)",
    "releaseDate": "2026-03-10",
    "noteUrl": "https://me.sap.com/notes/3694383",
    "cvss": 3.5
  },
  {
    "noteId": "3726962",
    "component": "SAP_HANA_DB",
    "priority": "Low",
    "category": "Program error",
    "description": "SQL Injection vulnerability in SAP HANA Deployment Infrastructure (HDI) deploy library (CVE-2026-40131, CVSS 3.4)",
    "releaseDate": "2026-05-12",
    "noteUrl": "https://me.sap.com/notes/3726962",
    "cvss": 3.4
  },
  {
    "noteId": "3673213",
    "component": "SAP_BASIS",
    "priority": "Low",
    "category": "Program error",
    "description": "CRLF Injection vulnerability in SAP NetWeaver Application Server Java (CVE-2026-23686, CVSS 3.4)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3673213",
    "cvss": 3.4
  },
  {
    "noteId": "3726899",
    "component": "SAP_BASIS",
    "priority": "Low",
    "category": "Program error",
    "description": "Potential vulnerability in Apache Log4j library used by SAP NetWeaver AS Java (CVE-2025-68161, CVSS 3.3)",
    "releaseDate": "2026-06-09",
    "noteUrl": "https://me.sap.com/notes/3726899",
    "cvss": 3.3
  },
  {
    "noteId": "3665042",
    "component": "SAP_BASIS",
    "priority": "Low",
    "category": "Program error",
    "description": "CSS Injection vulnerability in SAP NetWeaver Application Server ABAP (CVE-2026-27680, CVSS 3.1)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3665042",
    "cvss": 3.1
  },
  {
    "noteId": "3678313",
    "component": "SAP_BASIS",
    "priority": "Low",
    "category": "Program error",
    "description": "Memory Corruption vulnerability in SAP NetWeaver and ABAP Platform (Application Server ABAP) (CVE-2026-24320, CVSS 3.1)",
    "releaseDate": "2026-02-10",
    "noteUrl": "https://me.sap.com/notes/3678313",
    "cvss": 3.1
  },
  {
    "noteId": "3593356",
    "component": "SAP_BASIS",
    "priority": "Low",
    "category": "Program error",
    "description": "Obsolete Encryption Algorithm Used in NW AS Java UME User Mapping (CVE-2026-0510, CVSS 3.0)",
    "releaseDate": "2026-01-13",
    "noteUrl": "https://me.sap.com/notes/3593356",
    "cvss": 3.0
  },
  {
    "noteId": "3723097",
    "component": "SAP_ABA",
    "priority": "Low",
    "category": "Program error",
    "description": "Code Injection vulnerability in SAP Landscape Transformation (CVE-2026-27675, CVSS 2.0)",
    "releaseDate": "2026-04-14",
    "noteUrl": "https://me.sap.com/notes/3723097",
    "cvss": 2.0
  }
];

module.exports = { SECURITY_NOTES };
