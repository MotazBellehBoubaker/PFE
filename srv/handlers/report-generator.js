'use strict';
const ExcelJS = require('exceljs');

const C = {
    navy:      'FF0F2A4A',
    navyDark:  'FF0A1D33',
    blue:      'FF2E5BFF',
    blueLight: 'FFEAF0FF',
    white:     'FFFFFFFF',
    high:      'FFE74C3C',
    highBg:    'FFFDEDEC',
    medium:    'FFF39C12',
    mediumBg:  'FFFEF5E7',
    low:       'FF27AE60',
    lowBg:     'FFEAFAF1',
    outdated:  'FFE74C3C',
    unknown:   'FFB0B7C3',
    compliant: 'FF27AE60',
    stripe:    'FFF6F8FB',
    grey:      'FF6B7280',
    border:    'FFE2E6ED'
};
const FONT = 'Calibri';

function sectionTitle(ws, cellRef, text, span) {
    ws.mergeCells(cellRef + ':' + String.fromCharCode(cellRef.charCodeAt(0) + span - 1) + cellRef.substring(1));
    const c = ws.getCell(cellRef);
    c.value = text;
    c.font = { name: FONT, bold: true, size: 13, color: { argb: C.navy } };
    c.alignment = { vertical: 'middle' };
    return c;
}

function styleHeaderRow(row, cols) {
    row.eachCell((cell, colNumber) => {
        if (colNumber > cols) return;
        cell.font = { name: FONT, bold: true, color: { argb: C.white }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = { bottom: { style: 'medium', color: { argb: C.navyDark } } };
    });
    row.height = 24;
}

function zebraAndBorders(row, cols, isOdd) {
    row.eachCell((cell, colNumber) => {
        if (colNumber > cols) return;
        if (isOdd) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.stripe } };
        cell.border = { bottom: { style: 'hair', color: { argb: C.border } } };
        cell.font = cell.font && cell.font.bold ? cell.font : { name: FONT, size: 10.5, color: { argb: 'FF33383F' } };
    });
    row.height = 19;
}

function severityStyle(sev) {
    if (sev === 'High')   return { fg: C.high,   bg: C.highBg };
    if (sev === 'Medium') return { fg: C.medium, bg: C.mediumBg };
    if (sev === 'Low')    return { fg: C.low,    bg: C.lowBg };
    return null;
}

function pageHeader(ws, title, subtitle, cols) {
    ws.mergeCells(1, 1, 1, cols);
    const t = ws.getCell(1, 1);
    t.value = title;
    t.font = { name: FONT, bold: true, size: 16, color: { argb: C.white } };
    t.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(1).height = 34;
    for (let i = 1; i <= cols; i++) ws.getCell(1, i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };

    ws.mergeCells(2, 1, 2, cols);
    const s = ws.getCell(2, 1);
    s.value = subtitle;
    s.font = { name: FONT, italic: true, size: 9.5, color: { argb: C.white } };
    s.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(2).height = 20;
    for (let i = 1; i <= cols; i++) ws.getCell(2, i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.blue } };

    ws.getRow(3).height = 6;
}

async function buildReport(db) {
    const oScan = await db.run(
        SELECT.one.from('sentinel.db.ScanResult')
            .where({ status: 'Complete' }).orderBy({ startedAt: 'desc' })
    );
    if (!oScan) throw new Error('No completed scan found — run a scan first');

    const aViolations = await db.run(
        SELECT.from('sentinel.db.Violation').where({ scanId: oScan.ID }).orderBy({ severity: 'asc', detectedAt: 'desc' })
    );
    const aCritical = await db.run(
        SELECT.from('sentinel.db.CriticalRoleAssignment').where({ scanId: oScan.ID }).orderBy({ criticalType: 'asc' })
    );
    const aComponents = await db.run(
        SELECT.from('sentinel.db.ComplianceComponent').orderBy({ status: 'asc', name: 'asc' })
    );
    const aNotes = await db.run(
        SELECT.from('sentinel.db.SecurityNote').where({ applied: false }).orderBy({ priority: 'asc', releaseDate: 'desc' })
    );
    const aScans = await db.run(
        SELECT.from('sentinel.db.ScanResult').where({ status: 'Complete' }).orderBy({ startedAt: 'desc' }).limit(20)
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SentinelGRC';
    wb.created = new Date();

    const scanDate = (oScan.completedAt || '').substring(0, 10);
    const genTime  = new Date().toLocaleString();

    // ══════════════════════════════════════════════════════════
    //  Sheet 1: Executive Summary
    // ══════════════════════════════════════════════════════════
    const ws1 = wb.addWorksheet('Executive Summary', { views: [{ showGridLines: false }] });
    ws1.columns = [{ width: 3 }, { width: 26 }, { width: 20 }, { width: 26 }, { width: 20 }, { width: 3 }];

    ws1.mergeCells('B2:E2');
    const title = ws1.getCell('B2');
    title.value = 'SentinelGRC — Security & Compliance Report';
    title.font = { name: FONT, bold: true, size: 22, color: { argb: C.navy } };
    ws1.getRow(2).height = 36;

    ws1.mergeCells('B3:E3');
    const sub = ws1.getCell('B3');
    sub.value = 'SAP System RD1 · Development  |  Scan ' + oScan.scanCode + '  |  Generated ' + genTime;
    sub.font = { name: FONT, italic: true, size: 10.5, color: { argb: C.grey } };

    ws1.mergeCells('B4:E4');
    ws1.getCell('B4').border = { bottom: { style: 'medium', color: { argb: C.blue } } };
    ws1.getRow(4).height = 4;

    // KPI cards — 2x4 grid using colored blocks
    const kpis = [
        { label: 'Risk Score',        value: oScan.riskScore + ' / 100', color: oScan.riskScore >= 70 ? C.high : oScan.riskScore >= 40 ? C.medium : C.low },
        { label: 'Compliance Score',  value: oScan.complianceScore + '%', color: oScan.complianceScore >= 90 ? C.low : oScan.complianceScore >= 70 ? C.medium : C.high },
        { label: 'Total Violations',  value: String(oScan.violationsFound), color: C.navy },
        { label: 'Users Scanned',     value: String(oScan.usersScanned), color: C.navy },
        { label: 'High Severity',     value: String(oScan.highCount || 0), color: C.high },
        { label: 'Medium Severity',   value: String(oScan.mediumCount || 0), color: C.medium },
        { label: 'Low Severity',      value: String(oScan.lowCount || 0), color: C.low },
        { label: 'Critical Roles',    value: String(aCritical.length), color: C.high },
        { label: 'Missing Patches',   value: String(aNotes.length), color: C.medium }
    ];
    let row = 6, col = 2;
    kpis.forEach((k, i) => {
        const colLetter = String.fromCharCode(64 + col);
        const nextCol = String.fromCharCode(64 + col + 1);
        ws1.mergeCells(colLetter + row + ':' + nextCol + row);
        const cell = ws1.getCell(colLetter + row);
        cell.value = k.label;
        cell.font = { name: FONT, size: 9.5, color: { argb: C.white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: k.color } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        ws1.getRow(row).height = 18;

        ws1.mergeCells(colLetter + (row + 1) + ':' + nextCol + (row + 1));
        const vcell = ws1.getCell(colLetter + (row + 1));
        vcell.value = k.value;
        vcell.font = { name: FONT, bold: true, size: 18, color: { argb: k.color } };
        vcell.alignment = { vertical: 'middle', horizontal: 'center' };
        vcell.border = { bottom: { style: 'medium', color: { argb: k.color } }, left: { style: 'thin', color: { argb: C.border } }, right: { style: 'thin', color: { argb: C.border } } };
        ws1.getRow(row + 1).height = 32;

        col += 2;
        if (col > 4) { col = 2; row += 3; }
    });

    let r2 = row + (col === 2 ? 0 : 3) + 2;
    sectionTitle(ws1, 'B' + r2, 'Report Contents', 4);
    r2 += 1;
    ['Violations — full list from latest scan',
     'Critical Roles — SAP_ALL, Firefighter, and wildcard assignments',
     'Compliance Components — installed vs. required SP levels',
     'Security Notes — outstanding SAP patches to apply',
     'Scan History — trend across the last 20 scans'
    ].forEach(txt => {
        ws1.mergeCells('B' + r2 + ':E' + r2);
        const c = ws1.getCell('B' + r2);
        c.value = '•  ' + txt;
        c.font = { name: FONT, size: 10, color: { argb: 'FF444444' } };
        r2++;
    });

    // ══════════════════════════════════════════════════════════
    //  Sheet 2: Violations
    // ══════════════════════════════════════════════════════════
    const ws2 = wb.addWorksheet('Violations', { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] });
    ws2.columns = [
        { width: 14 }, { width: 18 }, { width: 26 }, { width: 26 }, { width: 12 }, { width: 14 }, { width: 20 }
    ];
    pageHeader(ws2, 'SoD Violations', 'Scan ' + oScan.scanCode + '  ·  ' + aViolations.length + ' total violations  ·  ' + scanDate, 7);
    const h2 = ws2.getRow(4);
    h2.values = ['User ID', 'User Name', 'Role A', 'Role B', 'Severity', 'Status', 'Detected'];
    styleHeaderRow(h2, 7);
    aViolations.forEach((v, i) => {
        const row = ws2.addRow([v.userId, v.userName, v.roleA, v.roleB, v.severity, v.status, (v.detectedAt || '').substring(0, 16).replace('T', ' ')]);
        zebraAndBorders(row, 7, i % 2 === 1);
        const st = severityStyle(v.severity);
        if (st) {
            row.getCell(5).font = { name: FONT, bold: true, color: { argb: st.fg } };
            row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: st.bg } };
            row.getCell(5).alignment = { horizontal: 'center' };
        }
    });
    ws2.autoFilter = { from: 'A4', to: 'G4' };

    // ══════════════════════════════════════════════════════════
    //  Sheet 3: Critical Roles
    // ══════════════════════════════════════════════════════════
    const ws3 = wb.addWorksheet('Critical Roles', { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] });
    ws3.columns = [{ width: 14 }, { width: 18 }, { width: 26 }, { width: 18 }];
    pageHeader(ws3, 'Critical Role Assignments', aCritical.length + ' critical assignments detected  ·  ' + scanDate, 4);
    const h3 = ws3.getRow(4);
    h3.values = ['User ID', 'User Name', 'Profile / Role', 'Critical Type'];
    styleHeaderRow(h3, 4);
    aCritical.forEach((c, i) => {
        const row = ws3.addRow([c.userId, c.userName, c.profile, c.criticalType]);
        zebraAndBorders(row, 4, i % 2 === 1);
        row.getCell(4).font = { name: FONT, bold: true, color: { argb: C.high } };
        row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.highBg } };
        row.getCell(4).alignment = { horizontal: 'center' };
    });
    ws3.autoFilter = { from: 'A4', to: 'D4' };

    // ══════════════════════════════════════════════════════════
    //  Sheet 4: Compliance Components
    // ══════════════════════════════════════════════════════════
    const ws4 = wb.addWorksheet('Compliance Components', { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] });
    ws4.columns = [{ width: 16 }, { width: 16 }, { width: 16 }, { width: 10 }, { width: 12 }, { width: 42 }];
    pageHeader(ws4, 'Compliance Components (CVERS)', oScan.complianceScore + '% compliance score  ·  ' + aComponents.length + ' components evaluated', 6);
    const h4 = ws4.getRow(4);
    h4.values = ['Component', 'Installed', 'Required', 'Delta', 'Status', 'Risk Note'];
    styleHeaderRow(h4, 6);
    aComponents.forEach((c, i) => {
        const row = ws4.addRow([c.name, c.installedVersion, c.requiredVersion, c.delta, c.status, c.riskNote]);
        zebraAndBorders(row, 6, i % 2 === 1);
        let bg = null, fg = 'FF33383F';
        if (c.status === 'Outdated')  { bg = C.highBg; fg = C.outdated; }
        if (c.status === 'Unknown')   { bg = 'FFF2F3F5'; fg = C.unknown; }
        if (c.status === 'Compliant') { bg = C.lowBg; fg = C.compliant; }
        if (bg) {
            row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            row.getCell(5).font = { name: FONT, bold: true, color: { argb: fg } };
            row.getCell(5).alignment = { horizontal: 'center' };
        }
    });
    ws4.autoFilter = { from: 'A4', to: 'F4' };

    // ══════════════════════════════════════════════════════════
    //  Sheet 5: Security Notes
    // ══════════════════════════════════════════════════════════
    const ws5 = wb.addWorksheet('Security Notes', { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] });
    ws5.columns = [{ width: 12 }, { width: 14 }, { width: 10 }, { width: 14 }, { width: 55 }, { width: 13 }, { width: 32 }];
    pageHeader(ws5, 'Missing SAP Security Notes', aNotes.length + ' notes outstanding  ·  patch data as of report generation', 7);
    const h5 = ws5.getRow(4);
    h5.values = ['Note #', 'Component', 'Priority', 'Category', 'Description', 'Released', 'Link'];
    styleHeaderRow(h5, 7);
    aNotes.forEach((n, i) => {
        const row = ws5.addRow([n.noteId, n.component, n.priority, n.category, n.description, n.releaseDate, '']);
        zebraAndBorders(row, 7, i % 2 === 1);
        if (n.priority === 'High') {
            row.getCell(3).font = { name: FONT, bold: true, color: { argb: C.high } };
            row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.highBg } };
            row.getCell(3).alignment = { horizontal: 'center' };
        }
        if (n.category === 'HotNews') {
            row.getCell(4).font = { name: FONT, bold: true, color: { argb: C.high } };
        }
        if (n.noteUrl) {
            row.getCell(7).value = { text: 'Open in SAP →', hyperlink: n.noteUrl };
            row.getCell(7).font = { name: FONT, color: { argb: C.blue }, underline: true, bold: true };
        }
    });
    ws5.autoFilter = { from: 'A4', to: 'G4' };

    // ══════════════════════════════════════════════════════════
    //  Sheet 6: Scan History
    // ══════════════════════════════════════════════════════════
    const ws6 = wb.addWorksheet('Scan History', { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] });
    ws6.columns = [{ width: 16 }, { width: 20 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 14 }];
    pageHeader(ws6, 'Scan History', 'Last ' + aScans.length + ' completed scans', 6);
    const h6 = ws6.getRow(4);
    h6.values = ['Scan Code', 'Started', 'Users Scanned', 'Violations', 'Risk Score', 'Compliance %'];
    styleHeaderRow(h6, 6);
    aScans.forEach((s, i) => {
        const row = ws6.addRow([
            s.scanCode, (s.startedAt || '').substring(0, 16).replace('T', ' '),
            s.usersScanned, s.violationsFound, s.riskScore, s.complianceScore
        ]);
        zebraAndBorders(row, 6, i % 2 === 1);
        row.getCell(5).font = { name: FONT, bold: true, color: { argb: s.riskScore >= 70 ? C.high : s.riskScore >= 40 ? C.medium : C.low } };
        row.getCell(6).font = { name: FONT, bold: true, color: { argb: s.complianceScore >= 90 ? C.low : s.complianceScore >= 70 ? C.medium : C.high } };
    });
    ws6.autoFilter = { from: 'A4', to: 'F4' };

    const buffer = await wb.xlsx.writeBuffer();
    const filename = 'SentinelGRC_Report_' + oScan.scanCode + '.xlsx';
    return { buffer, filename };
}


async function buildComplianceReport(db) {
    const aComponents = await db.run(
        SELECT.from('sentinel.db.ComplianceComponent').orderBy({ status: 'asc', name: 'asc' })
    );
    const aNotes = await db.run(
        SELECT.from('sentinel.db.SecurityNote').where({ applied: false }).orderBy({ priority: 'asc', releaseDate: 'desc' })
    );
    const oScan = await db.run(
        SELECT.one.from('sentinel.db.ScanResult').where({ status: 'Complete' }).orderBy({ startedAt: 'desc' })
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SentinelGRC';
    wb.created = new Date();
    const scanDate = oScan ? (oScan.completedAt || '').substring(0, 10) : '';
    const complianceScore = oScan ? oScan.complianceScore : '—';

    const ws1 = wb.addWorksheet('Compliance Components', { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] });
    ws1.columns = [{ width: 16 }, { width: 16 }, { width: 16 }, { width: 10 }, { width: 12 }, { width: 42 }];
    pageHeader(ws1, 'Compliance Components (CVERS)', complianceScore + '% compliance score  ·  ' + aComponents.length + ' components evaluated  ·  ' + scanDate, 6);
    const h1 = ws1.getRow(4);
    h1.values = ['Component', 'Installed', 'Required', 'Delta', 'Status', 'Risk Note'];
    styleHeaderRow(h1, 6);
    aComponents.forEach((c, i) => {
        const row = ws1.addRow([c.name, c.installedVersion, c.requiredVersion, c.delta, c.status, c.riskNote]);
        zebraAndBorders(row, 6, i % 2 === 1);
        let bg = null, fg = 'FF33383F';
        if (c.status === 'Outdated')  { bg = C.highBg; fg = C.outdated; }
        if (c.status === 'Unknown')   { bg = 'FFF2F3F5'; fg = C.unknown; }
        if (c.status === 'Compliant') { bg = C.lowBg; fg = C.compliant; }
        if (bg) {
            row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            row.getCell(5).font = { name: FONT, bold: true, color: { argb: fg } };
            row.getCell(5).alignment = { horizontal: 'center' };
        }
    });
    ws1.autoFilter = { from: 'A4', to: 'F4' };

    const ws2 = wb.addWorksheet('Security Notes', { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] });
    ws2.columns = [{ width: 12 }, { width: 14 }, { width: 10 }, { width: 14 }, { width: 55 }, { width: 13 }, { width: 32 }];
    pageHeader(ws2, 'Missing SAP Security Notes', aNotes.length + ' notes outstanding  ·  patch data as of report generation', 7);
    const h2 = ws2.getRow(4);
    h2.values = ['Note #', 'Component', 'Priority', 'Category', 'Description', 'Released', 'Link'];
    styleHeaderRow(h2, 7);
    aNotes.forEach((n, i) => {
        const row = ws2.addRow([n.noteId, n.component, n.priority, n.category, n.description, n.releaseDate, '']);
        zebraAndBorders(row, 7, i % 2 === 1);
        if (n.priority === 'High') {
            row.getCell(3).font = { name: FONT, bold: true, color: { argb: C.high } };
            row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.highBg } };
            row.getCell(3).alignment = { horizontal: 'center' };
        }
        if (n.category === 'HotNews') row.getCell(4).font = { name: FONT, bold: true, color: { argb: C.high } };
        if (n.noteUrl) {
            row.getCell(7).value = { text: 'Open in SAP →', hyperlink: n.noteUrl };
            row.getCell(7).font = { name: FONT, color: { argb: C.blue }, underline: true, bold: true };
        }
    });
    ws2.autoFilter = { from: 'A4', to: 'G4' };

    const buffer = await wb.xlsx.writeBuffer();
    const filename = 'SentinelGRC_Compliance_' + new Date().toISOString().substring(0, 10) + '.xlsx';
    return { buffer, filename };
}


async function buildViolationsReport(db, scanId) {
    let oScan;
    if (scanId) {
        oScan = await db.run(SELECT.one.from('sentinel.db.ScanResult').where({ ID: scanId }));
    } else {
        oScan = await db.run(SELECT.one.from('sentinel.db.ScanResult').where({ status: 'Complete' }).orderBy({ startedAt: 'desc' }));
    }
    if (!oScan) throw new Error('No scan found');

    const aViolations = await db.run(
        SELECT.from('sentinel.db.Violation').where({ scanId: oScan.ID }).orderBy({ severity: 'asc', detectedAt: 'desc' })
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SentinelGRC';
    wb.created = new Date();
    const scanDate = (oScan.completedAt || oScan.startedAt || '').substring(0, 10);

    const ws = wb.addWorksheet('Violations', { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] });
    ws.columns = [
        { width: 14 }, { width: 18 }, { width: 26 }, { width: 26 }, { width: 12 }, { width: 14 }, { width: 20 }
    ];
    pageHeader(ws, 'SoD Violations', 'Scan ' + oScan.scanCode + '  ·  ' + aViolations.length + ' total violations  ·  ' + scanDate, 7);
    const h = ws.getRow(4);
    h.values = ['User ID', 'User Name', 'Role A', 'Role B', 'Severity', 'Status', 'Detected'];
    styleHeaderRow(h, 7);
    aViolations.forEach((v, i) => {
        const row = ws.addRow([v.userId, v.userName, v.roleA, v.roleB, v.severity, v.status, (v.detectedAt || '').substring(0, 16).replace('T', ' ')]);
        zebraAndBorders(row, 7, i % 2 === 1);
        const st = severityStyle(v.severity);
        if (st) {
            row.getCell(5).font = { name: FONT, bold: true, color: { argb: st.fg } };
            row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: st.bg } };
            row.getCell(5).alignment = { horizontal: 'center' };
        }
    });
    ws.autoFilter = { from: 'A4', to: 'G4' };

    // Summary sheet
    const iHigh   = aViolations.filter(v => v.severity === 'High').length;
    const iMedium = aViolations.filter(v => v.severity === 'Medium').length;
    const iLow    = aViolations.filter(v => v.severity === 'Low').length;
    const ws2 = wb.addWorksheet('Summary', { views: [{ showGridLines: false }] });
    ws2.columns = [{ width: 3 }, { width: 26 }, { width: 18 }, { width: 3 }];
    ws2.mergeCells('B2:C2');
    ws2.getCell('B2').value = 'Violations Summary';
    ws2.getCell('B2').font = { name: FONT, bold: true, size: 16, color: { argb: C.navy } };
    ws2.mergeCells('B3:C3');
    ws2.getCell('B3').value = 'Scan ' + oScan.scanCode + '  ·  ' + scanDate;
    ws2.getCell('B3').font = { name: FONT, italic: true, size: 10, color: { argb: C.grey } };
    const rows = [
        ['Total Violations', aViolations.length, C.navy],
        ['High Severity', iHigh, C.high],
        ['Medium Severity', iMedium, C.medium],
        ['Low Severity', iLow, C.low]
    ];
    let rr = 5;
    rows.forEach(([label, val, color]) => {
        ws2.getCell('B' + rr).value = label;
        ws2.getCell('B' + rr).font = { name: FONT, bold: true };
        ws2.getCell('C' + rr).value = val;
        ws2.getCell('C' + rr).font = { name: FONT, bold: true, size: 14, color: { argb: color } };
        ws2.getCell('B' + rr).border = { bottom: { style: 'hair', color: { argb: C.border } } };
        ws2.getCell('C' + rr).border = { bottom: { style: 'hair', color: { argb: C.border } } };
        rr++;
    });

    const buffer = await wb.xlsx.writeBuffer();
    const filename = 'SentinelGRC_Violations_' + oScan.scanCode + '.xlsx';
    return { buffer, filename };
}


async function buildUsersReport(db) {
    const aUsers = await db.run(
        SELECT.from('sentinel.db.SapUser').orderBy({ riskScore: 'desc' })
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SentinelGRC';
    wb.created = new Date();

    const ws = wb.addWorksheet('Users & Risk', { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] });
    ws.columns = [{ width: 16 }, { width: 20 }, { width: 12 }, { width: 12 }, { width: 18 }];
    pageHeader(ws, 'Users & Risk', aUsers.length + ' SAP users evaluated  ·  ' + new Date().toLocaleDateString(), 5);
    const h = ws.getRow(4);
    h.values = ['User ID', 'User Name', 'User Type', 'Risk Score', 'Last Login'];
    styleHeaderRow(h, 5);
    aUsers.forEach((u, i) => {
        const typeLabels = { A: 'Dialog', B: 'System', C: 'Communication', S: 'Service', L: 'Reference' };
        const row = ws.addRow([
            u.userId, u.userName, typeLabels[u.userType] || u.userType || 'Dialog',
            u.riskScore || 0, (u.lastLogin || '').substring(0, 10)
        ]);
        zebraAndBorders(row, 5, i % 2 === 1);
        const score = u.riskScore || 0;
        const color = score >= 60 ? C.high : score >= 30 ? C.medium : C.low;
        const bg = score >= 60 ? C.highBg : score >= 30 ? C.mediumBg : C.lowBg;
        row.getCell(4).font = { name: FONT, bold: true, color: { argb: color } };
        row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        row.getCell(4).alignment = { horizontal: 'center' };
    });
    ws.autoFilter = { from: 'A4', to: 'E4' };

    const buffer = await wb.xlsx.writeBuffer();
    const filename = 'SentinelGRC_UsersRisk_' + new Date().toISOString().substring(0, 10) + '.xlsx';
    return { buffer, filename };
}


async function buildCriticalRolesReport(db) {
    const oScan = await db.run(
        SELECT.one.from('sentinel.db.ScanResult').where({ status: 'Complete' }).orderBy({ startedAt: 'desc' })
    );
    const aCritical = oScan
        ? await db.run(SELECT.from('sentinel.db.CriticalRoleAssignment').where({ scanId: oScan.ID }).orderBy({ criticalType: 'asc' }))
        : [];

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SentinelGRC';
    wb.created = new Date();
    const scanDate = oScan ? (oScan.completedAt || '').substring(0, 10) : '';

    const ws = wb.addWorksheet('Critical Roles', { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] });
    ws.columns = [{ width: 14 }, { width: 18 }, { width: 26 }, { width: 18 }];
    pageHeader(ws, 'Critical Role Assignments', aCritical.length + ' critical assignments detected  ·  ' + scanDate, 4);
    const h = ws.getRow(4);
    h.values = ['User ID', 'User Name', 'Profile / Role', 'Critical Type'];
    styleHeaderRow(h, 4);
    aCritical.forEach((c, i) => {
        const row = ws.addRow([c.userId, c.userName, c.profile, c.criticalType]);
        zebraAndBorders(row, 4, i % 2 === 1);
        row.getCell(4).font = { name: FONT, bold: true, color: { argb: C.high } };
        row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.highBg } };
        row.getCell(4).alignment = { horizontal: 'center' };
    });
    ws.autoFilter = { from: 'A4', to: 'D4' };

    const buffer = await wb.xlsx.writeBuffer();
    const filename = 'SentinelGRC_CriticalRoles_' + new Date().toISOString().substring(0, 10) + '.xlsx';
    return { buffer, filename };
}


async function buildSodRulesReport(db) {
    const aRules = await db.run(SELECT.from('sentinel.db.SodRule').orderBy({ riskLevel: 'asc', ruleCode: 'asc' }));

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SentinelGRC';
    wb.created = new Date();

    const ws = wb.addWorksheet('SoD Rule Matrix', { views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] });
    ws.columns = [{ width: 10 }, { width: 26 }, { width: 26 }, { width: 10 }, { width: 16 }, { width: 78 }, { width: 9 }];
    pageHeader(ws, 'SoD Rule Matrix', aRules.length + ' rules defined  ·  ' + aRules.filter(r => r.active).length + ' active', 7);
    const h = ws.getRow(4);
    h.values = ['Code', 'Role A', 'Role B', 'Severity', 'Category', 'Business Risk', 'Active'];
    styleHeaderRow(h, 7);
    aRules.forEach((r, i) => {
        const row = ws.addRow([r.ruleCode, r.roleA, r.roleB, r.riskLevel, r.category, r.riskDescription, r.active ? 'Yes' : 'No']);
        zebraAndBorders(row, 7, i % 2 === 1);
        const st = severityStyle(r.riskLevel);
        if (st) {
            row.getCell(4).font = { name: FONT, bold: true, color: { argb: st.fg } };
            row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: st.bg } };
            row.getCell(4).alignment = { horizontal: 'center' };
        }
        row.getCell(7).font = { name: FONT, bold: true, color: { argb: r.active ? C.compliant : C.unknown } };
        row.getCell(7).alignment = { horizontal: 'center' };
        // Risk descriptions run to a few hundred characters — wrap instead of clipping at the column edge
        row.getCell(6).alignment = { vertical: 'top', wrapText: true };
        row.height = 62;
    });
    ws.autoFilter = { from: 'A4', to: 'G4' };

    const buffer = await wb.xlsx.writeBuffer();
    const filename = 'SentinelGRC_SoDRules_' + new Date().toISOString().substring(0, 10) + '.xlsx';
    return { buffer, filename };
}

module.exports = { buildReport, buildComplianceReport, buildViolationsReport, buildUsersReport, buildCriticalRolesReport, buildSodRulesReport };
