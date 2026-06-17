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
            var oTable = this.byId("criticalRolesTable");
            if (oTable) {
                oTable.getBinding("items").refresh();
            }
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
            this.showToast("Exporting critical roles CSV...");
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
