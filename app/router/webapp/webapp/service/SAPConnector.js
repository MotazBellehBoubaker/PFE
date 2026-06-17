sap.ui.define([
    "sap/ui/model/json/JSONModel"
], function (JSONModel) {
    "use strict";

    /**
     * SAPConnector – handles all calls to SAP S/4HANA via BTP Destination Service.
     * In development mode (USE_MOCK = true) it returns mock data from JSON files.
     * In production mode it calls the BTP Destination configured in manifest.json.
     */

    var USE_MOCK = true; // Set to false when BTP Destination is configured

    var BTP_DESTINATION = "S4H_PROD_SYSTEM"; // Name of the BTP Destination

    var SAP_TABLES = {
        users:          "/sap/opu/odata/sap/SENTINEL_SRV/Users",
        roleAssignments:"/sap/opu/odata/sap/SENTINEL_SRV/RoleAssignments",
        profiles:       "/sap/opu/odata/sap/SENTINEL_SRV/Profiles",
        authObjects:    "/sap/opu/odata/sap/SENTINEL_SRV/AuthObjects",
        components:     "/sap/opu/odata/sap/SENTINEL_SRV/Components"
    };

    function fetchFromSAP(sEndpoint) {
        return fetch("/destinations/" + BTP_DESTINATION + sEndpoint + "?$format=json", {
            headers: { "Accept": "application/json" }
        })
        .then(function (r) {
            if (!r.ok) throw new Error("SAP call failed: " + r.status);
            return r.json();
        })
        .then(function (d) {
            return d.d ? d.d.results || d.d : d;
        });
    }

    function fetchMock(sPath) {
        return new Promise(function (resolve, reject) {
            var oModel = new JSONModel();
            oModel.loadData(sap.ui.require.toUrl("sentinel/security") + "/" + sPath);
            oModel.attachRequestCompleted(function () { resolve(oModel.getData()); });
            oModel.attachRequestFailed(function () { reject(new Error("Mock load failed: " + sPath)); });
        });
    }

    return {

        /**
         * Fetch all SAP users from USR02
         * @returns {Promise<Array>}
         */
        getUsers: function () {
            if (USE_MOCK) {
                return fetchMock("model/mockdata/users.json").then(function (d) { return d.users; });
            }
            return fetchFromSAP(SAP_TABLES.users);
        },

        /**
         * Fetch all role assignments from AGR_USERS
         * @returns {Promise<Array>}
         */
        getRoleAssignments: function () {
            if (USE_MOCK) {
                return Promise.resolve([]);
            }
            return fetchFromSAP(SAP_TABLES.roleAssignments);
        },

        /**
         * Fetch profile assignments from UST04
         * @returns {Promise<Array>}
         */
        getProfiles: function () {
            if (USE_MOCK) {
                return Promise.resolve([]);
            }
            return fetchFromSAP(SAP_TABLES.profiles);
        },

        /**
         * Fetch component versions from CVERS
         * @returns {Promise<Array>}
         */
        getComponents: function () {
            if (USE_MOCK) {
                return fetchMock("model/mockdata/compliance.json").then(function (d) { return d.components; });
            }
            return fetchFromSAP(SAP_TABLES.components);
        },

        /**
         * Test BTP Destination connectivity
         * @returns {Promise<object>} {connected: boolean, latency: number}
         */
        testConnection: function () {
            var iStart = Date.now();
            if (USE_MOCK) {
                return new Promise(function (resolve) {
                    setTimeout(function () { resolve({ connected: true, latency: 142 }); }, 800);
                });
            }
            return fetchFromSAP("/sap/opu/odata/sap/SENTINEL_SRV/$metadata")
                .then(function () { return { connected: true, latency: Date.now() - iStart }; })
                .catch(function () { return { connected: false, latency: 0 }; });
        }
    };
});
