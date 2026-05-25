sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sentinel/security/service/CopilotService",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, CopilotService, JSONModel, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.UserDetail", {

        onInit: function () {
            this.getRouter().getRoute("userDetail").attachPatternMatched(this._onRouteMatched, this);
            this._oUserModel = new JSONModel({ user: null, userViolations: [], roles: [] });
            this.getView().setModel(this._oUserModel, "userDetail");
        },

        _onRouteMatched: function (oEvent) {
            var sUserId = oEvent.getParameter("arguments").userId;
            this._loadUser(sUserId);
        },

        _loadUser: function (sUserId) {
            var aUsers = this.getModel("users").getProperty("/users");
            var oUser = aUsers.find(function (u) { return u.id === sUserId; });
            if (!oUser) { this.navBack(); return; }

            var aViolations = this.getModel("violations").getProperty("/violations");
            var aUserViolations = aViolations.filter(function (v) { return v.userId === sUserId; });

            this._oUserModel.setProperty("/user", oUser);
            this._oUserModel.setProperty("/userViolations", aUserViolations);
            this._oUserModel.setProperty("/roles", this._getMockRoles(sUserId, oUser.roles));
        },

        _getMockRoles: function (sUserId, iCount) {
            var aRoles = [];
            var aRoleNames = ["Z_VEND_CREATE", "Z_PO_CREATE", "Z_GL_POST", "Z_REPORT_FIN", "Z_CUST_MASTER", "Z_ASSET_CREATE", "Z_HR_PAYROLL", "Z_BUDGET_VIEW", "Z_SO_CREATE", "Z_PRICE_MAINT", "Z_GOODS_REC", "Z_JE_POST", "Z_TRANSPORT", "Z_CATALOG_VIEW"];
            for (var i = 0; i < Math.min(iCount, aRoleNames.length); i++) {
                aRoles.push({
                    role: aRoleNames[i],
                    desc: "Business role — " + aRoleNames[i].replace("Z_", "").replace(/_/g, " ").toLowerCase(),
                    granted: "2025-0" + (i + 1 < 10 ? "0" + (i + 1) : i + 1) + "-15",
                    lastUsed: i < 3 ? "Today" : i < 6 ? "This week" : "30+ days ago",
                    critical: i < 2
                });
            }
            return aRoles;
        },

        onNavBack: function () {
            this.navTo("users");
        },

        onAskCopilot: function () {
            var oUser = this._oUserModel.getProperty("/user");
            var oAppState = this.getModel("appState");
            oAppState.setProperty("/copilotOpen", true);
            oAppState.setProperty("/copilotInitialMessage", "Why is " + oUser.name + " (" + oUser.id + ") high risk and how can we reduce it?");
        },

        onExportReport: function () {
            var oUser = this._oUserModel.getProperty("/user");
            this.showToast("Generating report for " + oUser.name + "…");
        },

        onViolationPress: function (oEvent) {
            this.navTo("violations");
        }
    });
});
