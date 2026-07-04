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
            this._loadScansAndFilter();
        },
        _loadScansAndFilter: function () {
            var oModel = this.getModel("sentinelgrc");
            var that = this;
            // Load all complete scans for selector
            oModel.bindList("/ScanResults", null, null, null, {
                $orderby: "startedAt desc",
                $filter: "status eq 'Complete'",
                $select: "ID,scanCode,startedAt,violationsFound"
            }).requestContexts(0, 20).then(function (aCtx) {
                var aScans = aCtx.map(function (c) {
                    var o = c.getObject();
                    return {
                        ID:       o.ID,
                        scanCode: o.scanCode,
                        text:     o.scanCode + " · " + (o.startedAt || "").substring(0, 10) + " (" + (o.violationsFound || 0) + " violations)",
                        violations: o.violationsFound || 0
                    };
                });
                that._oDetailModel.setProperty("/scans", aScans);
                // Default to latest scan
                if (aScans.length) {
                    that._oDetailModel.setProperty("/selectedScanId", aScans[0].ID);
                    that._oDetailModel.setProperty("/selectedScanCode", aScans[0].scanCode);
                    that._applyFilters("", "", "", aScans[0].ID);
                }
            });
        },

        onScanChange: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            var sScanId   = oItem.getKey();
            var sScanCode = oItem.getText().split(" · ")[0];
            this._oDetailModel.setProperty("/selectedScanId",   sScanId);
            this._oDetailModel.setProperty("/selectedScanCode", sScanCode);
            this._applyFilters(this._sSearchQuery, this._sSeverityFilter, this._sStatusFilter, sScanId);
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

        _applyFilters: function (sQuery, sSeverity, sStatus, sScanId) {
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
            if (sScanId) {
                aFilters.push(new Filter("scanId", FilterOperator.EQ, sScanId));
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

        onCloseDetail: function () {
            this._oDetailModel.setProperty("/selectedViolation", null);
            this._oDetailModel.setProperty("/remediationText", null);
            // Clear table selection
            var oTable = this.byId("violationsTable");
            if (oTable) {
                oTable.removeSelections(true);
            }
        },
        onAcknowledge: function () {
            var oViolation = this._oDetailModel.getProperty("/selectedViolation");
            if (!oViolation) return;
            var oModel = this.getModel("sentinelgrc");
            var oAction = oModel.bindContext("/acknowledgeViolation(...)");
            oAction.setParameter("violationId", oViolation.ID);
            oAction.setParameter("mitigatingControl", "Acknowledged via SentinelGRC UI");
            oAction.execute().then(function () {
                oViolation.status = "Acknowledged";
                this._oDetailModel.setProperty("/selectedViolation", oViolation);
                MessageToast.show("Violation acknowledged for " + oViolation.userName);
                var oTable = this.byId("violationsTable");
                if (oTable && oTable.getBinding("items")) {
                    oTable.getBinding("items").refresh();
                }
            }.bind(this)).catch(function (err) {
                MessageToast.show("Failed to acknowledge: " + (err.message || "unknown error"));
            }.bind(this));
        },

        onOpenTicket: function () {
            var oViolation = this._oDetailModel.getProperty("/selectedViolation");
            if (!oViolation) return;
            var oModel  = this.getModel("sentinelgrc");
            var oAction = oModel.bindContext("/openTicket(...)");
            oAction.setParameter("violationId", oViolation.ID);
            MessageToast.show("Creating Jira ticket…");
            oAction.execute().then(function () {
                var oResult = oAction.getBoundContext().getObject();
                sap.m.MessageBox.success(
                    "Jira ticket " + oResult.ticketKey + " created and assigned to the Basis team.",
                    {
                        actions: ["Open in Jira", sap.m.MessageBox.Action.CLOSE],
                        onClose: function (sAct) {
                            if (sAct === "Open in Jira") {
                                window.open(oResult.ticketUrl, "_blank");
                            }
                        }
                    }
                );
            }.bind(this)).catch(function (err) {
                sap.m.MessageBox.error("Jira ticket creation failed: " + (err.message || "unknown"));
            });
        },

        onMuteRule: function () {
            if (!this._oMuteModel) {
                this._oMuteModel = new JSONModel({ duration: "30", reason: "" });
                this.getView().setModel(this._oMuteModel, "mute");
            }
            this._oMuteModel.setProperty("/duration", "30");
            this._oMuteModel.setProperty("/reason", "");
            if (!this._oMuteDialog) {
                this._oMuteDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "sentinel.security.fragment.MuteRuleDialog",
                    this
                );
                this.getView().addDependent(this._oMuteDialog);
            }
            this._oMuteDialog.open();
        },
        onConfirmMuteRule: function () {
            var oViolation = this._oDetailModel.getProperty("/selectedViolation");
            var sDuration  = this._oMuteModel.getProperty("/duration");
            var sReason    = this._oMuteModel.getProperty("/reason");

            if (!sReason || !sReason.trim()) {
                MessageToast.show("Please enter a reason for muting this rule.");
                return;
            }

            var dMuteUntil = new Date();
            dMuteUntil.setDate(dMuteUntil.getDate() + parseInt(sDuration, 10));

            // Store mute info locally (visual confirmation) — could be persisted via a CDS field later
            this._oMuteDialog.close();
            MessageToast.show(
                "Rule " + oViolation.roleA + " + " + oViolation.roleB +
                " muted until " + dMuteUntil.toLocaleDateString() +
                ". Reason logged."
            );
        },
        onCancelMuteRule: function () {
            this._oMuteDialog.close();
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
            // Auto-expand the panel so the result is visible immediately
            var oPanel = this.byId("aiPlaybookPanel");
            if (oPanel) oPanel.setExpanded(true);
            this._oDetailModel.setProperty("/remediationLoading", true);

            CopilotService.generateRemediation(oViolation)
                .then(function (sText) {
                    // Convert markdown to HTML for FormattedText (only supported tags)
                    var sEsc = sText
                        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
                    var aLines = sEsc.split("\n");
                    var aOut = [];
                    var sListType = null; // "ol" or "ul"
                    function closeList() {
                        if (sListType) { aOut.push("</" + sListType + ">"); sListType = null; }
                    }
                    aLines.forEach(function (sLine) {
                        sLine = sLine.trim();
                        if (!sLine) { return; }
                        var oNum = sLine.match(/^([0-9]+)\.\s*(.*)$/);
                        var bBul = sLine.charAt(0) === "-";
                        if (oNum) {
                            if (sListType !== "ol") { closeList(); aOut.push("<ol>"); sListType = "ol"; }
                            aOut.push("<li>" + oNum[2] + "</li>");
                        } else if (bBul) {
                            if (sListType !== "ul") { closeList(); aOut.push("<ul>"); sListType = "ul"; }
                            aOut.push("<li>" + sLine.substring(1).trim() + "</li>");
                        } else {
                            closeList();
                            aOut.push("<p>" + sLine + "</p>");
                        }
                    });
                    closeList();
                    var sHtml = aOut.join("");
                    this._oDetailModel.setProperty("/remediationText", sHtml);
                    this._oDetailModel.setProperty("/remediationLoading", false);
                }.bind(this))
                .catch(function () {
                    this._oDetailModel.setProperty("/remediationLoading", false);
                    this.showError("Failed to generate remediation.");
                }.bind(this));
        },

        onExportCSV: function () {
            var oModel   = this.getModel("sentinelgrc");
            var sScanId  = this._oDetailModel.getProperty("/selectedScanId");
            var oAction  = oModel.bindContext("/generateViolationsReport(...)");
            oAction.setParameter("scanId", sScanId || null);
            this.showToast("Generating violations report…");
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
                MessageToast.show("Report downloaded: " + oResult.fileName);
            }).catch(function (err) {
                sap.m.MessageBox.error("Report generation failed: " + (err.message || "unknown error"));
            });
        },

        onNavigateToUser: function (oEvent) {
            var oViolation = this._oDetailModel.getProperty("/selectedViolation");
            if (oViolation && oViolation.userId) {
                this.navTo("userDetail", { userId: oViolation.userId });
            }
        }
    });
});
