'use strict';

const http  = require('http');
const https = require('https');

const DESTINATION_PROXY_URL = process.env.DESTINATION_PROXY_URL || '';
const HTTP_PROXY            = process.env.HTTP_PROXY            || '';
const SENTINEL_SRV          = 'ZSENTINEL_SRV_SRV';

// ─────────────────────────────────────────────────────────────────
// HTTP GET via BAS proxy → Destination Service → SCC → S/4HANA
// This is the only approach that works in BAS dev space for
// on-premise destinations.
// ─────────────────────────────────────────────────────────────────
function httpGetViaProxy(sFullUrl) {
    return new Promise((resolve, reject) => {
        // Parse proxy address
        const oProxy   = new URL(HTTP_PROXY);
        const proxyHost = oProxy.hostname;
        const proxyPort = parseInt(oProxy.port, 10);

        // The request goes TO the proxy, but with the full URL as path
        const oOptions = {
            host:    proxyHost,
            port:    proxyPort,
            method:  'GET',
            path:    sFullUrl,
            headers: {
                'Host':   new URL(sFullUrl).host,
                'Accept': 'application/json'
            }
        };

        const req = http.request(oOptions, (res) => {
            let sData = '';
            res.on('data', chunk => sData += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(sData));
                    } catch (e) {
                        reject(new Error(`JSON parse error: ${e.message}`));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${sData.slice(0, 200)}`));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(60000, () => {
            req.destroy(new Error('Request timeout after 60s'));
        });
        req.end();
    });
}

// ─────────────────────────────────────────────────────────────────
// Build the full URL through the BAS destination proxy
// ─────────────────────────────────────────────────────────────────
function buildUrl(sEntitySet, oParams = {}) {
    const sBase   = `${DESTINATION_PROXY_URL}/destinations/RD1_MO`;
    const sPath   = `/sap/opu/odata/sap/${SENTINEL_SRV}/${sEntitySet}`;
    const sQuery  = new URLSearchParams({ ...oParams, '$format': 'json' }).toString();
    return `${sBase}${sPath}?${sQuery}`;
}

// ─────────────────────────────────────────────────────────────────
// Core call
// ─────────────────────────────────────────────────────────────────
async function callSentinelSrv(sEntitySet, oParams = {}) {
    try {
        const sUrl   = buildUrl(sEntitySet, oParams);
        console.log(`[S4Connector] GET ${sUrl}`);
        const oData  = await httpGetViaProxy(sUrl);
        return oData?.d?.results || oData?.value || [];
    } catch (err) {
        console.error(`[S4Connector] Error calling ${sEntitySet}:`, err.message);
        throw new Error(`S/4HANA extraction failed for ${sEntitySet}: ${err.message}`);
    }
}

// ─────────────────────────────────────────────────────────────────
//  Extract users from USR02 via UserSet
// ─────────────────────────────────────────────────────────────────
async function extractUsers() {
    console.log('[S4Connector] Extracting users from UserSet (USR02)...');
    const aRaw = await callSentinelSrv('UserSet', { $top: 10000 });
    const aUsers = aRaw.map(u => ({
        userId:    u.Bname,
        userName:  u.Bname,
        userType:  u.Ustyp  || 'A',
        locked:    u.Uflag === '64' || false,
        lastLogin: u.Trdat  ? parseAbapDate(u.Trdat)  : null,
        validFrom: u.Gltgv  ? parseAbapDate(u.Gltgv)  : null,
        validTo:   u.Gltgb  ? parseAbapDate(u.Gltgb)  : null
    })).filter(u => u.userId && u.userId.trim());
    console.log(`[S4Connector] Extracted ${aUsers.length} users`);
    return aUsers;
}

// ─────────────────────────────────────────────────────────────────
//  Extract role assignments from AGR_USERS via RoleAssignmentSet
// ─────────────────────────────────────────────────────────────────
async function extractRoleAssignments() {
    console.log('[S4Connector] Extracting role assignments...');
    const aRaw = await callSentinelSrv('RoleAssignmentSet', { $top: 50000 });
    const aAssignments = aRaw.map(r => ({
        userId:   r.Uname,
        roleId:   r.AgrName,
        fromDate: r.FromDat ? parseAbapDate(r.FromDat) : null,
        toDate:   r.ToDat   ? parseAbapDate(r.ToDat)   : null
    })).filter(r => r.userId && r.roleId);
    console.log(`[S4Connector] Extracted ${aAssignments.length} role assignments`);
    return aAssignments;
}

// ─────────────────────────────────────────────────────────────────
//  Extract critical profiles from UST04 via ProfileSet
// ─────────────────────────────────────────────────────────────────
async function extractCriticalProfiles() {
    console.log('[S4Connector] Extracting critical profiles...');
    const aRaw = await callSentinelSrv('ProfileSet', { $top: 5000 });
    const aCritical = ['SAP_ALL', 'SAP_NEW', 'S_A.ADMIN', 'S_A.DEVELOP', 'S_A.SYSTEM'];
    const aResult = aRaw
        .filter(r => aCritical.some(c => r.Profilename && r.Profilename.startsWith(c)))
        .map(r => ({
            userId:       r.Bname,
            profile:      r.Profilename,
            criticalType: r.Profilename.startsWith('SAP_ALL')    ? 'SAP_ALL'
                        : r.Profilename.startsWith('SAP_NEW')    ? 'SAP_NEW'
                        : r.Profilename.startsWith('S_A.SYSTEM') ? 'S_A.SYSTEM'
                        : 'SUPER_PROFILE'
        }));
    console.log(`[S4Connector] Found ${aResult.length} critical profile assignments`);
    return aResult;
}

// ─────────────────────────────────────────────────────────────────
//  Extract component versions from CVERS via ComponentSet
// ─────────────────────────────────────────────────────────────────
async function extractComponentVersions() {
    console.log('[S4Connector] Extracting component versions...');
    const aRaw = await callSentinelSrv('ComponentSet', { $top: 500 });
    const aVersions = aRaw.map(v => ({
        name:    v.Componentname,
        current: `${v.Release}.${String(v.Extrelease || '0000').padStart(4,'0')}`,
        sp:      parseInt(v.Extrelease || 0, 10),
        type:    v.CompType
    })).filter(v => v.name && v.name.trim());
    console.log(`[S4Connector] Extracted ${aVersions.length} component versions`);
    return aVersions;
}

// ─────────────────────────────────────────────────────────────────
//  Detect firefighter roles (pattern-based)
// ─────────────────────────────────────────────────────────────────
function extractFirefighterRoles(aRoleAssignments) {
    const aPatterns = [/FF_/i, /FIREFIGHT/i, /EMERGENCY/i, /BREAK_GLASS/i, /SUPERUSER/i];
    return aRoleAssignments
        .filter(r => aPatterns.some(p => p.test(r.roleId)))
        .map(r => ({
            userId:       r.userId,
            profile:      r.roleId,
            criticalType: 'FIREFIGHTER'
        }));
}

// ─────────────────────────────────────────────────────────────────
//  Helper: parse ABAP date string YYYYMMDD to JS Date
// ─────────────────────────────────────────────────────────────────
function parseAbapDate(sDate) {
    if (!sDate || sDate.trim() === '00000000' || sDate.trim() === '99991231') return null;
    const s = sDate.toString().replace(/\D/g, '');
    if (s.length !== 8) return null;
    return new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`);
}

module.exports = {
    extractUsers,
    extractRoleAssignments,
    extractCriticalProfiles,
    extractComponentVersions,
    extractFirefighterRoles
};
