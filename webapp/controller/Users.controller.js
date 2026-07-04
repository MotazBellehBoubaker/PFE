sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/model/json/JSONModel"
], function (BaseController, Filter, FilterOperator, Sorter, JSONModel) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.Users", {

        onInit: function () {
            this.getRouter().getRoute("users").attachPatternMatched(this._onRouteMatched, this);
            this._oUsersState = new JSONModel({
                totalUsers:  0,
                avgRiskScore: 0,
                lockedUsers:  0,
                dialogUsers:  0
            });
            this.getView().setModel(this._oUsersState, "usersState");
        },

        _onRouteMatched: function () {
            var oTable = this.byId("usersTable");
            if (oTable) {
                oTable.getBinding("items").refresh();
            }
        },

        onTableUpdateFinished: function (oEvent) {
            var oModel = this.getModel("sentinelgrc");
            oModel.bindList("/SapUsers", null, null, null, {}).requestContexts(0, 5000).then(function (aContexts) {
                var iTotalUsers = aContexts.length;
                var iLocked     = 0;
                var iDialog     = 0;
                var iTotalRisk  = 0;
                aContexts.forEach(function (oCtx) {
                    var oUser = oCtx.getObject();
                    if (oUser.locked)           iLocked++;
                    if (oUser.userType === "A") iDialog++;
                    iTotalRisk += (oUser.riskScore || 0);
                });
                this._oUsersState.setProperty("/totalUsers",  iTotalUsers);
                this._oUsersState.setProperty("/lockedUsers", iLocked);
                this._oUsersState.setProperty("/dialogUsers", iDialog);
                this._oUsersState.setProperty("/avgRiskScore",
                    iTotalUsers ? Math.round(iTotalRisk / iTotalUsers) : 0);
            }.bind(this));
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue") || oEvent.getParameter("query") || "";
            var oTable  = this.byId("usersTable");
            var oBinding = oTable.getBinding("items");
            if (sQuery) {
                oBinding.filter([new Filter({
                    filters: [
                        new Filter("userName", FilterOperator.Contains, sQuery),
                        new Filter("userId",   FilterOperator.Contains, sQuery)
                    ],
                    and: false
                })]);
            } else {
                oBinding.filter([]);
            }
        },

        onSortChange: function (oEvent) {
            var sKey  = oEvent.getParameter("selectedItem").getKey();
            var oTable = this.byId("usersTable");
            var oBinding = oTable.getBinding("items");
            var bDesc = (sKey === "riskScore");
            oBinding.sort(new Sorter(sKey, bDesc));
        },

        onUserPress: function (oEvent) {
            var oCtx    = oEvent.getSource().getBindingContext("sentinelgrc");
            var sUserId = oCtx.getProperty("userId");
            this.navTo("userDetail", { userId: sUserId });
        },

        onExport: function () {
            var oModel  = this.getModel("sentinelgrc");
            var oAction = oModel.bindContext("/generateUsersReport(...)");
            this.showToast("Generating users report…");
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
        }
    });
});
