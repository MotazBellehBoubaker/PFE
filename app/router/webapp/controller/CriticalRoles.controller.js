sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.CriticalRoles", {

        onInit: function () {
            this.getRouter().getRoute("critical").attachPatternMatched(this._onRouteMatched, this);
            this._oCritState = new JSONModel({
                totalCount:    0,
                sapAllCount:   0,
                sysAdminCount: 0,
                uniqueUsers:   0
            });
            this.getView().setModel(this._oCritState, "critState");
        },

        _onRouteMatched: function () {
            var that = this;
            var oModel = this.getModel("sentinelgrc");
            // Find latest scan ID and filter critical roles by it
            oModel.bindList("/ScanResults", null, null, null, {
                $orderby: "startedAt desc"
            }).requestContexts(0, 1).then(function (aCtx) {
                if (!aCtx.length) return;
                var sScanId = aCtx[0].getObject().ID;
                var oTable = that.byId("criticalRolesTable");
                if (oTable && oTable.getBinding("items")) {
                    var Filter = sap.ui.model.Filter;
                    var FilterOperator = sap.ui.model.FilterOperator;
                    oTable.getBinding("items").filter([
                        new Filter("scanId", FilterOperator.EQ, sScanId)
                    ]);
                }
            });
        },

        onTableUpdateFinished: function () {
            var oBinding  = this.byId("criticalRolesTable").getBinding("items");
            var aContexts = oBinding.getCurrentContexts();
            var iTotal      = aContexts.length;
            var iSapAll     = 0;
            var iSysAdmin   = 0;
            var aUsers      = new Set();

            aContexts.forEach(function (oCtx) {
                var o = oCtx.getObject();
                aUsers.add(o.userId);
                if (o.criticalType === "SAP_ALL")    iSapAll++;
                if (o.criticalType === "S_A.SYSTEM") iSysAdmin++;
            });

            this._oCritState.setProperty("/totalCount",    iTotal);
            this._oCritState.setProperty("/sapAllCount",   iSapAll);
            this._oCritState.setProperty("/sysAdminCount", iSysAdmin);
            this._oCritState.setProperty("/uniqueUsers",   aUsers.size);
        },

        onExport: function () {
            var oModel  = this.getModel("sentinelgrc");
            var oAction = oModel.bindContext("/generateCriticalRolesReport(...)");
            this.showToast("Generating critical roles report…");
            oAction.execute().then(function () {
                var oResult = oAction.getBoundContext().getObject();
                var sBinary = atob(oResult.base64);
                var aBytes  = new Uint8Array(sBinary.length);
                for (var i = 0; i < sBinary.length; i++) aBytes[i] = sBinary.charCodeAt(i);
                var oBlob = new Blob([aBytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                var sUrl  = URL.createObjectURL(oBlob);
                var oLink = document.createElement("a");
                oLink.href = sUrl;
                oLink.download = oResult.fileName;
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
                URL.revokeObjectURL(sUrl);
                this.showToast("Report downloaded: " + oResult.fileName);
            }.bind(this)).catch(function (err) {
                sap.m.MessageBox.error("Report generation failed: " + (err.message || "unknown error"));
            });
        },

        onSubscribeAlerts: function () {
            this.showToast("Subscribed to critical role alerts");
        },

        onRequestRemoval: function (oEvent) {
            var oCtx     = oEvent.getSource().getBindingContext("sentinelgrc");
            var sUserId  = oCtx.getProperty("userId");
            var sProfile = oCtx.getProperty("profile");

            this.getModel("appState").setProperty("/pendingRemediation", {
                violationId:  "CRIT-" + sUserId,
                userId:       sUserId,
                userName:     sUserId,
                roleToRemove: sProfile,
                title:        "Remove " + sProfile + " from " + sUserId,
                priority:     "High"
            });

            this.navTo("remediation");
        },

        onUserPress: function (oEvent) {
            var oCtx    = oEvent.getSource().getBindingContext("sentinelgrc");
            var sUserId = oCtx.getProperty("userId");
            this.navTo("userDetail", { userId: sUserId });
        }
    });
});
