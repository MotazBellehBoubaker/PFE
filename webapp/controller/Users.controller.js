sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter"
], function (BaseController, Filter, FilterOperator, Sorter) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.Users", {

        onInit: function () {
            this.getRouter().getRoute("users").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {},

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue") || oEvent.getParameter("query") || "";
            var oTable = this.byId("usersTable");
            var oBinding = oTable.getBinding("items");
            if (sQuery) {
                oBinding.filter([new Filter({
                    filters: [
                        new Filter("name", FilterOperator.Contains, sQuery),
                        new Filter("id", FilterOperator.Contains, sQuery),
                        new Filter("dept", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                })]);
            } else {
                oBinding.filter([]);
            }
        },

        onSortChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            var oTable = this.byId("usersTable");
            var oBinding = oTable.getBinding("items");
            var bDesc = (sKey === "riskScore" || sKey === "roles");
            oBinding.sort(new Sorter(sKey, bDesc));
        },

        onUserPress: function (oEvent) {
            var sUserId = oEvent.getSource().getBindingContext("users").getProperty("id");
            this.navTo("userDetail", { userId: sUserId });
        },

        onExport: function () {
            this.showToast("Exporting users CSV…");
        }
    });
});
