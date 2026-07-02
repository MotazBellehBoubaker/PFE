sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sentinel/security/service/CopilotService",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (BaseController, CopilotService, Filter, FilterOperator, JSONModel, MessageToast, MessageBox) {
    "use strict";
    return BaseController.extend("sentinel.security.controller.Rules", {

        onInit: function () {
            this.getRouter().getRoute("rules").attachPatternMatched(this._onRouteMatched, this);
            this._oEditorModel = new JSONModel({
                rule: null,
                open: false,
                isNew: false,
                aiLoading: false,
                aiDescription: ""
            });
            this.getView().setModel(this._oEditorModel, "editor");
        },

        _onRouteMatched: function () {
            // Refresh rules table
            var oTable = this.byId("rulesTable");
            if (oTable && oTable.getBinding("items")) {
                oTable.getBinding("items").refresh();
            }
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue") || oEvent.getParameter("query") || "";
            var oTable = this.byId("rulesTable");
            if (!oTable) return;
            var oBinding = oTable.getBinding("items");
            if (sQuery) {
                oBinding.filter([new Filter({
                    filters: [
                        new Filter("roleA",           FilterOperator.Contains, sQuery),
                        new Filter("roleB",           FilterOperator.Contains, sQuery),
                        new Filter("riskDescription", FilterOperator.Contains, sQuery),
                        new Filter("ruleCode",        FilterOperator.Contains, sQuery)
                    ],
                    and: false
                })]);
            } else {
                oBinding.filter([]);
            }
        },

        onNewRule: function () {
            // Generate next rule code
            var oTable = this.byId("rulesTable");
            var iCount = oTable ? (oTable.getBinding("items").getLength() || 10) : 10;
            var sCode  = "SOD-" + String(iCount + 1).padStart(3, "0");

            this._oEditorModel.setProperty("/rule", {
                ruleCode:        sCode,
                roleA:           "",
                roleB:           "",
                riskLevel:       "High",
                riskDescription: "",
                category:        "Finance",
                active:          true
            });
            this._oEditorModel.setProperty("/isNew", true);
            this._openRuleEditor();
        },

        onEditRule: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("sentinelgrc");
            var oObj = oCtx.getObject();
            this._oEditorModel.setProperty("/rule", {
                ID:              oObj.ID,
                ruleCode:        oObj.ruleCode,
                roleA:           oObj.roleA,
                roleB:           oObj.roleB,
                riskLevel:       oObj.riskLevel,
                riskDescription: oObj.riskDescription,
                category:        oObj.category,
                active:          oObj.active
            });
            this._oEditorModel.setProperty("/isNew", false);
            this._oCurrentCtx = oCtx;
            this._openRuleEditor();
        },

        _openRuleEditor: function () {
            if (!this._oRuleEditorDialog) {
                this._oRuleEditorDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "sentinel.security.fragment.RuleEditor",
                    this
                );
                this.getView().addDependent(this._oRuleEditorDialog);
            }
            this._oRuleEditorDialog.open();
        },

        onSaveRule: function () {
            var oRule   = this._oEditorModel.getProperty("/rule");
            var bIsNew  = this._oEditorModel.getProperty("/isNew");
            var oModel  = this.getModel("sentinelgrc");

            // Validate
            if (!oRule.roleA || !oRule.roleB || !oRule.ruleCode) {
                MessageBox.error("Please fill in Rule Code, Role A and Role B.");
                return;
            }

            if (bIsNew) {
                // CREATE
                var oListBinding = oModel.bindList("/SodRules");
                oListBinding.create({
                    ruleCode:        oRule.ruleCode,
                    roleA:           oRule.roleA,
                    roleB:           oRule.roleB,
                    riskLevel:       oRule.riskLevel,
                    riskDescription: oRule.riskDescription,
                    category:        oRule.category || "Finance",
                    active:          oRule.active !== false
                });
                oModel.submitBatch("$auto").then(function () {
                    MessageToast.show("Rule " + oRule.ruleCode + " created successfully");
                    this._oRuleEditorDialog.close();
                    if (this.byId("rulesTable").getBinding("items")) {
                        this.byId("rulesTable").getBinding("items").refresh();
                    }
                }.bind(this)).catch(function (err) {
                    MessageBox.error("Failed to create rule: " + (err.message || err));
                });
            } else {
                // UPDATE via PATCH
                var oCtxBinding = oModel.bindContext("/SodRules('" + oRule.ID + "')");
                oCtxBinding.requestObject().then(function () {
                    return fetch("/security-service/SodRules('" + oRule.ID + "')", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            roleA:           oRule.roleA,
                            roleB:           oRule.roleB,
                            riskLevel:       oRule.riskLevel,
                            riskDescription: oRule.riskDescription,
                            category:        oRule.category,
                            active:          oRule.active
                        })
                    });
                }).then(function () {
                    MessageToast.show("Rule " + oRule.ruleCode + " updated");
                    this._oRuleEditorDialog.close();
                    this.byId("rulesTable").getBinding("items").refresh();
                }.bind(this)).catch(function (err) {
                    MessageBox.error("Failed to update rule: " + (err.message || err));
                });
            }
        },

        onCancelRule: function () {
            this._oRuleEditorDialog.close();
        },

        onToggleRule: function (oEvent) {
            var oSwitch = oEvent.getSource();
            var bActive = oSwitch.getState();
            var oCtx    = oSwitch.getBindingContext("sentinelgrc");
            var sID     = oCtx.getProperty("ID");
            var sCode   = oCtx.getProperty("ruleCode");

            fetch("/security-service/SodRules('" + sID + "')", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: bActive })
            }).then(function () {
                MessageToast.show("Rule " + sCode + (bActive ? " activated" : " deactivated"));
            }).catch(function () {
                MessageToast.show("Failed to update rule status");
                oSwitch.setState(!bActive); // revert
            });
        },

        onDeleteRule: function (oEvent) {
            var oCtx  = oEvent.getSource().getBindingContext("sentinelgrc");
            var sCode = oCtx.getProperty("ruleCode");
            var sID   = oCtx.getProperty("ID");

            MessageBox.confirm("Delete rule " + sCode + "? This cannot be undone.", {
                onClose: function (sAction) {
                    if (sAction !== "OK") return;
                    fetch("/security-service/SodRules('" + sID + "')", {
                        method: "DELETE"
                    }).then(function () {
                        MessageToast.show("Rule " + sCode + " deleted");
                        this.byId("rulesTable").getBinding("items").refresh();
                    }.bind(this)).catch(function () {
                        MessageBox.error("Failed to delete rule");
                    });
                }.bind(this)
            });
        },

        onAuthorWithAI: function () {
            var oRule = this._oEditorModel.getProperty("/rule") || {};
            if (!oRule.roleA || !oRule.roleB) {
                MessageToast.show("Fill in Role A and Role B first to generate AI description.");
                return;
            }
            this._oEditorModel.setProperty("/aiLoading", true);
            CopilotService.generateRuleDescription({
                roleA:     oRule.roleA,
                roleB:     oRule.roleB,
                riskLevel: oRule.riskLevel
            }).then(function (sDesc) {
                this._oEditorModel.setProperty("/rule/riskDescription", sDesc);
                this._oEditorModel.setProperty("/aiLoading", false);
                MessageToast.show("AI description generated");
            }.bind(this)).catch(function () {
                this._oEditorModel.setProperty("/aiLoading", false);
                MessageToast.show("AI generation failed");
            }.bind(this));
        },

        onExportYAML: function () {
            var oTable   = this.byId("rulesTable");
            var aCtxs    = oTable.getBinding("items").getCurrentContexts();
            var aRules   = aCtxs.map(function (c) { return c.getObject(); });
            var sYAML    = "# SentinelGRC SoD Rules Export\n# Generated: " + new Date().toISOString() + "\nrules:\n";
            aRules.forEach(function (r) {
                sYAML += "  - code: " + r.ruleCode + "\n" +
                         "    roleA: " + r.roleA + "\n" +
                         "    roleB: " + r.roleB + "\n" +
                         "    severity: " + r.riskLevel + "\n" +
                         "    active: " + r.active + "\n" +
                         "    description: \"" + (r.riskDescription || "") + "\"\n";
            });
            var oBlob = new Blob([sYAML], { type: "text/yaml" });
            var sUrl  = URL.createObjectURL(oBlob);
            var oLink = document.createElement("a");
            oLink.href = sUrl;
            oLink.download = "sentinelgrc-sod-rules.yaml";
            oLink.click();
            URL.revokeObjectURL(sUrl);
            MessageToast.show("SoD rules exported as YAML");
        }
    });
});
