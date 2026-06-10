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
            var oBinding = this.byId("usersTable").getBinding("items");
            var aContexts = oBinding.getCurrentContexts();
            var iTotalUsers  = aContexts.length;
            var iLocked      = 0;
            var iDialog      = 0;
            var iTotalRisk   = 0;

            aContexts.forEach(function (oCtx) {
                var oUser = oCtx.getObject();
                if (oUser.locked)            iLocked++;
                if (oUser.userType === "A")  iDialog++;
                iTotalRisk += (oUser.riskScore || 0);
            });

            this._oUsersState.setProperty("/totalUsers",   iTotalUsers);
            this._oUsersState.setProperty("/lockedUsers",  iLocked);
            this._oUsersState.setProperty("/dialogUsers",  iDialog);
            this._oUsersState.setProperty("/avgRiskScore",
                iTotalUsers ? Math.round(iTotalRisk / iTotalUsers) : 0);
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
            this.showToast("Exporting users CSV...");
        }
    });
});
