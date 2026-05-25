'use strict';

const cds  = require('@sap/cds');
const axios = require('axios');

// ── Destination name must match what you created in BTP cockpit ───
const S4_DESTINATION = process.env.S4_DESTINATION_NAME || 'S4HANA_ON_PREM';

// ─────────────────────────────────────────────────────────────────
// Core HTTP call to S/4HANA OData via BTP Destination Service
// ─────────────────────────────────────────────────────────────────
async function callS4OData(sEntity, oParams = {}) {
    try {
        // In production: use cds.connect.to with the destination
        const srv = await cds.connect.to(S4_DESTINATION);

        const sUrl = `/sap/opu/odata/sap/${sEntity}`;
        const result = await srv.get(sUrl, { params: oParams });
        return result?.d?.results || result?.value || [];

    } catch (err) {
        console.error(`[S4Connector] Error calling ${sEntity}:`, err.message);
        throw new Error(`S/4HANA extraction failed for ${sEntity}: ${err.message}`);
    }
}

// ─────────────────────────────────────────────────────────────────
//  Extract all dialog users from USR02
//  Returns: [{ BNAME, USTYP, UFLAG, TRDAT, GLTGV, GLTGB, ANAME }]
// ─────────────────────────────────────────────────────────────────
async function extractUsers() {
    console.log('[S4Connector] Extracting users from USR02...');

    const aRaw = await callS4OData('API_USERDETAILS_SRV/A_UserDetail', {
        $filter: "UserType eq 'A'",          // Dialog users only
        $select: 'UserID,UserType,IsLocked,LastLogonDate,ValidFrom,ValidTo',
        $top:    10000
    });

    const aUsers = aRaw.map(u => ({
        userId:    u.UserID     || u.BNAME,
        userName:  u.UserName   || u.BNAME,
        userType:  u.UserType   || u.USTYP  || 'A',
        locked:    u.IsLocked   === true || u.UFLAG === '64' || false,
        lastLogin: u.LastLogonDate ? new Date(u.LastLogonDate) : null,
        validFrom: u.ValidFrom  ? new Date(u.ValidFrom) : null,
        validTo:   u.ValidTo    ? new Date(u.ValidTo)   : null
    }));

    console.log(`[S4Connector] Extracted ${aUsers.length} users`);
    return aUsers;
}

// ─────────────────────────────────────────────────────────────────
//  Extract role assignments from AGR_USERS
//  Returns: [{ UNAME, AGR_NAME, FROM_DAT, TO_DAT }]
// ─────────────────────────────────────────────────────────────────
async function extractRoleAssignments() {
    console.log('[S4Connector] Extracting role assignments from AGR_USERS...');

    const aRaw = await callS4OData('API_ROLEASSIGNMENT_SRV/A_RoleAssignment', {
        $select: 'UserID,RoleName,ValidFrom,ValidTo',
        $top:    50000
    });

    const aAssignments = aRaw.map(r => ({
        userId:   r.UserID   || r.UNAME,
        roleId:   r.RoleName || r.AGR_NAME,
        fromDate: r.ValidFrom ? new Date(r.ValidFrom) : null,
        toDate:   r.ValidTo   ? new Date(r.ValidTo)   : null
    })).filter(r => r.userId && r.roleId);

    console.log(`[S4Connector] Extracted ${aAssignments.length} role assignments`);
    return aAssignments;
}

// ─────────────────────────────────────────────────────────────────
//  Extract critical profiles from UST04 (SAP_ALL, SAP_NEW, etc.)
//  Returns: [{ BNAME, PROFILE }]
// ─────────────────────────────────────────────────────────────────
async function extractCriticalProfiles() {
    console.log('[S4Connector] Checking for critical profiles via UST04...');

    const aCriticalProfiles = ['SAP_ALL', 'SAP_NEW', 'S_A.ADMIN', 'S_A.DEVELOP'];

    const aRaw = await callS4OData('API_PROFILEASSIGNMENT_SRV/A_ProfileAssignment', {
        $filter: aCriticalProfiles.map(p => `Profile eq '${p}'`).join(' or '),
        $select: 'UserID,Profile',
        $top:    1000
    });

    const aResult = aRaw.map(r => ({
        userId:      r.UserID  || r.BNAME,
        profile:     r.Profile,
        criticalType: r.Profile.startsWith('SAP_ALL') ? 'SAP_ALL'
                    : r.Profile.startsWith('SAP_NEW')  ? 'SAP_NEW'
                    : 'SUPER_PROFILE'
    }));

    console.log(`[S4Connector] Found ${aResult.length} critical profile assignments`);
    return aResult;
}

// ─────────────────────────────────────────────────────────────────
//  Extract component versions from CVERS
//  Returns: [{ COMPONENT, RELEASE, SP }]
// ─────────────────────────────────────────────────────────────────
async function extractComponentVersions() {
    console.log('[S4Connector] Extracting component versions from CVERS...');

    const aRaw = await callS4OData('API_SYSTEM_INFO_SRV/A_InstalledProductVersion', {
        $select: 'ProductName,Release,SupportPackageLevel',
        $top:    200
    });

    const aVersions = aRaw.map(v => ({
        name:    v.ProductName           || v.COMPONENT,
        current: `${v.Release}.${String(v.SupportPackageLevel || 0).padStart(4,'0')}`,
        sp:      parseInt(v.SupportPackageLevel || 0, 10)
    }));

    console.log(`[S4Connector] Extracted ${aVersions.length} component versions`);
    return aVersions;
}

// ─────────────────────────────────────────────────────────────────
//  Detect firefighter roles from AGR_USERS (pattern-based)
// ─────────────────────────────────────────────────────────────────
async function extractFirefighterRoles(aRoleAssignments) {
    const aPatterns = [/FF_/i, /FIREFIGHT/i, /EMERGENCY/i, /BREAK_GLASS/i, /SUPERUSER/i];

    return aRoleAssignments
        .filter(r => aPatterns.some(p => p.test(r.roleId)))
        .map(r => ({
            userId:      r.userId,
            profile:     r.roleId,
            criticalType: 'FIREFIGHTER'
        }));
}

module.exports = {
    extractUsers,
    extractRoleAssignments,
    extractCriticalProfiles,
    extractComponentVersions,
    extractFirefighterRoles
};
