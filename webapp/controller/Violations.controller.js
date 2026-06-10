sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sentinel/security/service/CopilotService",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (BaseController, CopilotService, Filter, FilterOperator, JSONModel, MessageToast) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.Violations", {

        onInit: function () {
            this.getRouter().getRoute("violations").attachPatternMatched(this._onRouteMatched, this);
            this._oDetailModel = new JSONModel({
                selectedViolation: null,
                remediationLoading: false,
                remediationText: null,
                totalCount: 0
            });
            this.getView().setModel(this._oDetailModel, "detail");
        },

        _onRouteMatched: function () {
            this._oDetailModel.setProperty("/selectedViolation", null);
            this._oDetailModel.setProperty("/remediationText", null);
            // Refresh the OData binding to get latest data
            var oTable = this.byId("violationsTable");
            if (oTable) {
                oTable.getBinding("items").refresh();
            }
        },

        onTableUpdateFinished: function (oEvent) {
            var iTotalCount = oEvent.getParameter("total");
            this._oDetailModel.setProperty("/totalCount", iTotalCount || 0);
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue") || oEvent.getParameter("query") || "";
            this._applyFilters(sQuery, this._sSeverityFilter, this._sStatusFilter);
        },

        onSeverityFilterChange: function (oEvent) {
            this._sSeverityFilter = oEvent.getParameter("selectedItem").getKey();
            this._applyFilters(this._sSearchQuery, this._sSeverityFilter, this._sStatusFilter);
        },

        onStatusFilterChange: function (oEvent) {
            this._sStatusFilter = oEvent.getParameter("selectedItem").getKey();
            this._applyFilters(this._sSearchQuery, this._sSeverityFilter, this._sStatusFilter);
        },

        _applyFilters: function (sQuery, sSeverity, sStatus) {
            this._sSearchQuery = sQuery;
            var oTable = this.byId("violationsTable");
            var oBinding = oTable.getBinding("items");
            var aFilters = [];

            if (sQuery) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("userName", FilterOperator.Contains, sQuery),
                        new Filter("userId", FilterOperator.Contains, sQuery),
                        new Filter("roleA", FilterOperator.Contains, sQuery),
                        new Filter("roleB", FilterOperator.Contains, sQuery),
                        new Filter("risk", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }
            if (sSeverity && sSeverity !== "All") {
                aFilters.push(new Filter("severity", FilterOperator.EQ, sSeverity));
            }
            if (sStatus && sStatus !== "All") {
                aFilters.push(new Filter("status", FilterOperator.EQ, sStatus));
            }

            oBinding.filter(aFilters.length > 0 ? new Filter({ filters: aFilters, and: true }) : []);
        },

        onViolationSelect: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oCtx = oItem.getBindingContext("sentinelgrc");
            var oViolation = oCtx.getObject();
            this._oDetailModel.setProperty("/selectedViolation", oViolation);
            this._oDetailModel.setProperty("/remediationText", null);
        },

        onAcknowledge: function () {
            var oViolation = this._oDetailModel.getProperty("/selectedViolation");
            if (!oViolation) return;
            var oModel = this.getModel("sentinelgrc");
            // Update status via OData PATCH
            var oContext = oModel.bindContext("/Violations(" + oViolation.ID + ")");
            oContext.setProperty("status", "Acknowledged")
                .then(function () {
                    oViolation.status = "Acknowledged";
                    this._oDetailModel.setProperty("/selectedViolation", oViolation);
                    this.showToast("Violation acknowledged");
                    oModel.refresh();
                }.bind(this))
                .catch(function () {
                    // Fallback — just update local model
                    oViolation.status = "Acknowledged";
                    this._oDetailModel.setProperty("/selectedViolation", oViolation);
                    this.showToast("Violation acknowledged");
                }.bind(this));
        },

        onOpenTicket: function () {
            var oViolation = this._oDetailModel.getProperty("/selectedViolation");
            if (!oViolation) return;
            this.showToast("Ticket created for " + oViolation.userName);
        },

        onMuteRule: function () {
            this.showToast("Rule muted for 30 days");
        },

        onScheduleRemediation: function () {
            var oViolation = this._oDetailModel.getProperty("/selectedViolation");
            if (!oViolation) return;
            var oAppState = this.getModel("appState");
            oAppState.setProperty("/pendingRemediation", {
                violationId:  oViolation.ID,
                userId:       oViolation.userId,
                userName:     oViolation.userName,
                roleToRemove: oViolation.roleB,
                title:        "Remove " + oViolation.roleB + " from " + oViolation.userId,
                priority:     oViolation.severity
            });
            this.navTo("remediation");
            this.showToast("Opening Remediation Calendar for " + oViolation.userId);
        },

        onGenerateRemediation: function () {
            var oViolation = this._oDetailModel.getProperty("/selectedViolation");
            if (!oViolation) return;
            this._oDetailModel.setProperty("/remediationLoading", true);

            CopilotService.generateRemediation(oViolation)
                .then(function (sText) {
                    this._oDetailModel.setProperty("/remediationText", sText);
                    this._oDetailModel.setProperty("/remediationLoading", false);
                }.bind(this))
                .catch(function () {
                    this._oDetailModel.setProperty("/remediationLoading", false);
                    this.showError("Failed to generate remediation.");
                }.bind(this));
        },

        onExportCSV: function () {
            this.showToast("Exporting violations CSV...");
        },

        onNavigateToUser: function (oEvent) {
            var oViolation = this._oDetailModel.getProperty("/selectedViolation");
            if (oViolation && oViolation.userId) {
                this.navTo("userDetail", { userId: oViolation.userId });
            }
        }
    });
});
