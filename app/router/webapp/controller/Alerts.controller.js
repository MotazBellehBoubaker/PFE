sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.Alerts", {

        onInit: function () {
            this.getRouter().getRoute("alerts").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {},

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue") || oEvent.getParameter("query") || "";
            var oList = this.byId("alertsList");
            if (!oList) return;
            var oBinding = oList.getBinding("items");
            if (sQuery) {
                oBinding.filter([new Filter("subject", FilterOperator.Contains, sQuery)]);
            } else {
                oBinding.filter([]);
            }
        },

        onSeverityFilter: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            var oList = this.byId("alertsList");
            if (!oList) return;
            var oBinding = oList.getBinding("items");
            if (sKey && sKey !== "All") {
                oBinding.filter([new Filter("severity", FilterOperator.EQ, sKey)]);
            } else {
                oBinding.filter([]);
            }
        },

        onManageRoutes: function () {
            this.showToast("Opening alert route manager…");
        }
    });
});
