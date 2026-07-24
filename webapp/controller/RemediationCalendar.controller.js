sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/library",
    "sap/ui/core/date/UI5Date",
    "sap/m/MessageToast",
    "sap/ui/core/Item"
], function (
    BaseController, JSONModel, Fragment, DateFormat,
    coreLibrary, UI5Date, MessageToast, Item
) {
    "use strict";

    var ValueState = coreLibrary.ValueState;

    // Helper to create a date — same as SAP sample's UI5Date.getInstance
    function d(y, mo, day, h, mi) {
        return UI5Date.getInstance(y, mo, day, h || 0, mi || 0, 0);
    }

    return BaseController.extend("sentinel.security.controller.RemediationCalendar", {

        onInit: function () {
            this.getRouter().getRoute("remediation")
                .attachPatternMatched(this._onRouteMatched, this);
            this._initModel();
        },

        // ── Build model with inline dates — exact SAP sample approach ────
        _initModel: function () {
            var oModel = new JSONModel();
            oModel.setData({
                startDate: d(2026, 4, 19, 8, 0),  // May 19 2026
                people: [
                    {
                        name: "Motaz Belleh Boubaker",
                        role: "SAP Security Intern",
                        pic:  "sap-icon://employee",
                        appointments: [
                            {
                                id:           "REM-001",
                                start:        d(2026, 4, 20, 9, 0),
                                end:          d(2026, 4, 20, 10, 0),
                                title:        "Remove Z_PAYM_APPROVE from JKOWAL",
                                info:         "SoD Violation VIO-031-001 · High · Finance",
                                violationId:  "VIO-031-001",
                                userId:       "JKOWAL",
                                userName:     "Jan Kowalski",
                                roleToRemove: "Z_PAYM_APPROVE",
                                priority:     "High",
                                status:       "Scheduled",
                                type:         "Type01",
                                tentative:    false
                            },
                            {
                                id:           "REM-002",
                                start:        d(2026, 4, 20, 11, 0),
                                end:          d(2026, 4, 20, 12, 0),
                                title:        "Remove Z_PO_APPROVE from AMUELL",
                                info:         "SoD Violation VIO-031-002 · High · Procurement",
                                violationId:  "VIO-031-002",
                                userId:       "AMUELL",
                                userName:     "Anna Müller",
                                roleToRemove: "Z_PO_APPROVE",
                                priority:     "High",
                                status:       "Scheduled",
                                type:         "Type01",
                                tentative:    false
                            },
                            {
                                id:           "REM-003",
                                start:        d(2026, 4, 19, 14, 0),
                                end:          d(2026, 4, 19, 15, 0),
                                title:        "Remove SAP_ALL from MROSSI",
                                info:         "Critical role · SAP_ALL on production business user",
                                violationId:  "CRIT-002",
                                userId:       "MROSSI",
                                userName:     "Marco Rossi",
                                roleToRemove: "SAP_ALL",
                                priority:     "High",
                                status:       "In Progress",
                                type:         "Type02",
                                tentative:    false
                            }
                        ],
                        headers: [
                            {
                                start: d(2026, 4, 19, 0, 0),
                                end:   d(2026, 4, 19, 23, 59),
                                title: "Urgent day",
                                type:  "Type07"
                            }
                        ]
                    },
                    {
                        name: "Anna Schmidt",
                        role: "Basis Administrator",
                        pic:  "sap-icon://employee",
                        appointments: [
                            {
                                id:           "REM-004",
                                start:        d(2026, 4, 21, 9, 0),
                                end:          d(2026, 4, 21, 10, 30),
                                title:        "Remove Z_PAYM_RUN from TBECKR",
                                info:         "SoD Violation VIO-031-003 · High · AP",
                                violationId:  "VIO-031-003",
                                userId:       "TBECKR",
                                userName:     "Thomas Becker",
                                roleToRemove: "Z_PAYM_RUN",
                                priority:     "High",
                                status:       "Scheduled",
                                type:         "Type01",
                                tentative:    false
                            },
                            {
                                id:           "REM-005",
                                start:        d(2026, 4, 15, 10, 0),
                                end:          d(2026, 4, 15, 11, 0),
                                title:        "Revoke Z_ROLE_ASSIGN from SLINDQ",
                                info:         "SoD Violation VIO-031-004 · Privilege escalation",
                                violationId:  "VIO-031-004",
                                userId:       "SLINDQ",
                                userName:     "Sara Lindqvist",
                                roleToRemove: "Z_ROLE_ASSIGN",
                                priority:     "Medium",
                                status:       "Done",
                                type:         "Type08",
                                tentative:    false
                            }
                        ],
                        headers: []
                    }
                ]
            });
            this.getView().setModel(oModel, "remCal");
            // Build tasks table after model is set
            setTimeout(function () { this._buildTasksTable(); }.bind(this), 100);
        },

        _onRouteMatched: function () {
            setTimeout(function () { this._buildTasksTable(); }.bind(this), 100);

            var oPending = this.getModel("appState").getProperty("/pendingRemediation");
            if (oPending) {
                this.getModel("appState").setProperty("/pendingRemediation", null);
                // Delay to ensure view + fragment are ready
                setTimeout(function () {
                    this._openCreateDialog("create_prefilled", oPending);
                }.bind(this), 500);
            }
        },

        // ── Appointment select — exact SAP sample pattern ────────────────
        handleAppointmentSelect: function (oEvent) {
            var oAppointment  = oEvent.getParameter("appointment");
            var aAppointments = oEvent.getParameter("appointments");

            if (oAppointment) {
                this._handleSingleAppointment(oAppointment);
            } else if (aAppointments) {
                // group — ignore for now
            }
        },

        _handleSingleAppointment: function (oAppointment) {
            var oView = this.getView();
            if (!oAppointment) return;

            if (!oAppointment.getSelected()) {
                if (this._pDetailsPopover) {
                    this._pDetailsPopover.then(function (oP) { oP.close(); });
                }
                return;
            }

            if (!this._pDetailsPopover) {
                this._pDetailsPopover = Fragment.load({
                    id: oView.getId(),
                    name: "sentinel.security.fragment.RemediationDetails",
                    controller: this
                }).then(function (oP) {
                    oView.addDependent(oP);
                    return oP;
                });
            }

            this._pDetailsPopover.then(function (oP) {
                // Use binding context from the appointment — same as SAP sample
                oP.setBindingContext(oAppointment.getBindingContext("remCal"), "remCal");
                oP.openBy(oAppointment);
            }.bind(this));
        },

        // ── Interval click → open create with prefilled dates ────────────
        handleAppointmentAddWithContext: function (oEvent) {
            this.oClickEventParameters = {
                startDate: oEvent.getParameter("startDate"),
                endDate:   oEvent.getParameter("endDate"),
                row:       oEvent.getParameter("row")
            };
            this._openCreateDialog("create_with_context", null);
        },

        // ── Toolbar add button ───────────────────────────────────────────
        handleAppointmentCreate: function () {
            this._openCreateDialog("create", null);
        },

        // ── Open create dialog ───────────────────────────────────────────
        _openCreateDialog: function (sType, oPrefill) {
            var oView = this.getView();
            if (!this._pCreateDialog) {
                this._pCreateDialog = Fragment.load({
                    id: oView.getId(),
                    name: "sentinel.security.fragment.RemediationCreate",
                    controller: this
                }).then(function (oD) {
                    oView.addDependent(oD);
                    return oD;
                });
            }
            this._pCreateDialog.then(function (oD) {
                oD._sDialogType = sType;
                this._clearCreateDialog();

                if (sType === "create_with_context" && this.oClickEventParameters) {
                    // Pre-fill dates from interval click
                    this.byId("startDate").setDateValue(this.oClickEventParameters.startDate);
                    this.byId("endDate").setDateValue(this.oClickEventParameters.endDate);
                    // Pre-select the row's person
                    if (this.oClickEventParameters.row) {
                        var sName = this.oClickEventParameters.row.getTitle();
                        var aPeople = oView.getModel("remCal").getProperty("/people");
                        var oSel = this.byId("selectPerson");
                        aPeople.forEach(function (p, i) {
                            if (p.name === sName) oSel.setSelectedIndex(i);
                        });
                    }
                    delete this.oClickEventParameters;

                } else if ((sType === "create_prefilled" || sType === "create") && oPrefill) {
                    // Auto-fill ALL fields from the calling page context
                    this.byId("violationRef").setValue(oPrefill.violationId   || "");
                    this.byId("affectedUser").setValue(oPrefill.userId         || "");
                    this.byId("roleToRemove").setValue(oPrefill.roleToRemove   || "");
                    this.byId("inputTitle").setValue(oPrefill.title            || "");
                    this.byId("moreInfo").setValue(oPrefill.info               || "");
                    this.byId("selectPriority").setSelectedKey(oPrefill.priority || "High");

                    // Pre-select issue type so the user sees context
                    var oTypeSelect = this.byId("issueTypeSelect");
                    if (oTypeSelect) {
                        if (oPrefill.violationId && oPrefill.violationId.startsWith("COMP")) {
                            oTypeSelect.setSelectedKey("compliance");
                        } else if (oPrefill.violationId && oPrefill.violationId.startsWith("CRIT")) {
                            oTypeSelect.setSelectedKey("critical");
                        } else if (oPrefill.violationId) {
                            oTypeSelect.setSelectedKey("violation");
                        }
                    }

                    // Set dates: tomorrow 09:00 → 10:00
                    var oStart = UI5Date.getInstance();
                    oStart.setDate(oStart.getDate() + 1); oStart.setHours(9, 0, 0, 0);
                    var oEnd = UI5Date.getInstance();
                    oEnd.setDate(oEnd.getDate() + 1); oEnd.setHours(10, 0, 0, 0);
                    this.byId("startDate").setDateValue(oStart);
                    this.byId("endDate").setDateValue(oEnd);
                    this.byId("startDate").setValueState(ValueState.None);
                    this.byId("endDate").setValueState(ValueState.None);
                }
                oD.open();
            }.bind(this));
        },

        _clearCreateDialog: function () {
            // Set default dates: tomorrow 09:00 → 10:00
            var oStart = UI5Date.getInstance();
            oStart.setDate(oStart.getDate() + 1);
            oStart.setHours(9, 0, 0, 0);
            var oEnd = UI5Date.getInstance();
            oEnd.setDate(oEnd.getDate() + 1);
            oEnd.setHours(10, 0, 0, 0);

            this.byId("startDate").setDateValue(oStart);
            this.byId("endDate").setDateValue(oEnd);
            this.byId("startDate").setValueState(ValueState.None);
            this.byId("endDate").setValueState(ValueState.None);
            this.byId("inputTitle").setValue("");
            this.byId("moreInfo").setValue("");
            this.byId("violationRef").setValue("");
            this.byId("affectedUser").setValue("");
            this.byId("roleToRemove").setValue("");
            this.byId("selectPriority").setSelectedKey("High");
            this.byId("issueTypeSelect").setSelectedKey("");
            var oPicker = this.byId("issueSelect");
            if (oPicker) { oPicker.setVisible(false); oPicker.destroyItems(); }
            var oLabel = this.byId("issuePickerLabel");
            if (oLabel) oLabel.setVisible(false);
            var oSel = this.byId("selectPerson");
            if (oSel && oSel.getItems().length > 0) oSel.setSelectedItem(oSel.getItems()[0]);
        },

        // ── Issue type selector ──────────────────────────────────────────
        onIssueTypeChanged: function (oEvent) {
            var sKey    = oEvent.getParameter("selectedItem").getKey();
            var oPicker = this.byId("issueSelect");
            var oLabel  = this.byId("issuePickerLabel");
            if (!oPicker || !oLabel) return;
            oPicker.destroyItems();
            oPicker.addItem(new Item({ key: "", text: "-- Select --" }));

            if (!sKey || sKey === "manual") {
                oPicker.setVisible(false); oLabel.setVisible(false); return;
            }
            oPicker.setVisible(true); oLabel.setVisible(true);

            if (sKey === "violation") {
                oLabel.setText("Select Violation:");
                var aV = (this.getModel("violations") ? this.getModel("violations").getProperty("/violations") : []) || [];
                aV.forEach(function (v) {
                    oPicker.addItem(new Item({ key: "v|" + v.id, text: v.id + " · " + v.userId + " · " + v.roleB + " (" + v.severity + ")" }));
                });
            } else if (sKey === "compliance") {
                oLabel.setText("Select Outdated Component:");
                var aC = (this.getView().getModel("compliance") ? this.getView().getModel("compliance").getProperty("/components") : []) || [];
                aC.filter(function (c) { return c.status === "Outdated"; }).forEach(function (c) {
                    oPicker.addItem(new Item({ key: "c|" + c.name, text: c.name + " · " + c.delta + " missing patches" }));
                });
            } else if (sKey === "critical") {
                oLabel.setText("Select Critical Role:");
                var aR = (this.getModel("criticalRoles") ? this.getModel("criticalRoles").getProperty("/criticalRoles") : []) || [];
                aR.forEach(function (r) {
                    oPicker.addItem(new Item({ key: "r|" + r.userId + "|" + r.profile, text: r.userName + " · " + r.profile }));
                });
            }
        },

        onIssueSelected: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            if (!sKey) return;
            var sParts = sKey.split("|"), sType = sParts[0];
            if (sType === "v") {
                var aV = (this.getModel("violations") ? this.getModel("violations").getProperty("/violations") : []) || [];
                var oV = aV.find(function (v) { return v.id === sParts[1]; });
                if (oV) {
                    this.byId("violationRef").setValue(oV.id);
                    this.byId("affectedUser").setValue(oV.userId);
                    this.byId("roleToRemove").setValue(oV.roleB);
                    this.byId("inputTitle").setValue("Remove " + oV.roleB + " from " + oV.userId);
                    this.byId("selectPriority").setSelectedKey(oV.severity);
                }
            } else if (sType === "c") {
                var aC = (this.getView().getModel("compliance") ? this.getView().getModel("compliance").getProperty("/components") : []) || [];
                var oC = aC.find(function (c) { return c.name === sParts[1]; });
                if (oC) {
                    this.byId("violationRef").setValue("COMP-" + oC.name);
                    this.byId("affectedUser").setValue("BASISADM");
                    this.byId("roleToRemove").setValue(oC.name);
                    this.byId("inputTitle").setValue("Apply " + oC.delta + " missing patches for " + oC.name);
                    this.byId("selectPriority").setSelectedKey("High");
                }
            } else if (sType === "r") {
                var aR = (this.getModel("criticalRoles") ? this.getModel("criticalRoles").getProperty("/criticalRoles") : []) || [];
                var oR = aR.find(function (r) { return r.userId === sParts[1] && r.profile === sParts[2]; });
                if (oR) {
                    this.byId("violationRef").setValue("CRIT-" + oR.userId);
                    this.byId("affectedUser").setValue(oR.userId);
                    this.byId("roleToRemove").setValue(oR.profile);
                    this.byId("inputTitle").setValue("Remove " + oR.profile + " from " + oR.userName);
                    this.byId("selectPriority").setSelectedKey("High");
                }
            }
        },

        // ── Save — forces calendar refresh via setProperty ───────────────
      handleDialogSaveButton: async function () {
            var oStartDate = this.byId("startDate");
            var oEndDate   = this.byId("endDate");

            if (!oStartDate.getDateValue()) { oStartDate.setValueState(ValueState.Error); return; }
            if (!oEndDate.getDateValue())   { oEndDate.setValueState(ValueState.Error);   return; }
            if (oStartDate.getValueState() === ValueState.Error) return;
            if (oEndDate.getValueState()   === ValueState.Error) return;

            var oModel     = this.getView().getModel("remCal");
            var iPersonIdx = this.byId("selectPerson").getSelectedIndex();
            if (iPersonIdx < 0) iPersonIdx = 0;
            var sPriority  = this.byId("selectPriority").getSelectedKey() || "High";
            var mType      = { "High": "Type01", "Medium": "Type03", "Low": "Type08" };
            var sAssignedTo = this.byId("selectPerson").getSelectedItem()
                ? this.byId("selectPerson").getSelectedItem().getText() : "Basis Admin";

            var oStart = oStartDate.getDateValue();
            var oEnd   = oEndDate.getDateValue();

            var oODataModel = this.getOwnerComponent().getModel();
            var oAction = oODataModel.bindContext("/saveRemediationTask(...)");
            oAction.setParameter("violationId",   this.byId("violationRef").getValue() || "");
            oAction.setParameter("userId",        this.byId("affectedUser").getValue() || "");
            oAction.setParameter("roleToRemove",  this.byId("roleToRemove").getValue() || "");
            oAction.setParameter("title",         this.byId("inputTitle").getValue() || "Remediation Task");
            oAction.setParameter("notes",         this.byId("moreInfo").getValue() || "");
            oAction.setParameter("assignedTo",    sAssignedTo);
            oAction.setParameter("priority",      sPriority);
            oAction.setParameter("scheduledDate", oStart.toISOString());
            oAction.setParameter("dueDate",       oEnd.toISOString());

            var oSavedTask;
            try {
                await oAction.execute();
                oSavedTask = oAction.getBoundContext().getObject();
            } catch (oError) {
                MessageToast.show("Failed to save remediation task: " + (oError.message || "unknown error"));
                return;
            }

            var oNewTask = {
                id:           oSavedTask.taskCode || ("REM-" + Date.now().toString().slice(-5)),
                start:        UI5Date.getInstance(oStart.getTime()),
                end:          UI5Date.getInstance(oEnd.getTime()),
                title:        oSavedTask.title,
                info:         oSavedTask.notes || "",
                violationId:  oSavedTask.violationId || "",
                userId:       oSavedTask.userId || "",
                userName:     oSavedTask.userId || "",
                roleToRemove: oSavedTask.roleToRemove || "",
                priority:     oSavedTask.priority,
                status:       oSavedTask.status,
                type:         mType[sPriority] || "Type01",
                tentative:    false
            };
            var sAppsPath = "/people/" + iPersonIdx + "/appointments";
            var aApps = oModel.getProperty(sAppsPath) || [];
            aApps.push(oNewTask);
            oModel.setProperty(sAppsPath, aApps);
            var aPeople = oModel.getProperty("/people");
            oModel.setProperty("/people", aPeople.slice());
            this._pCreateDialog.then(function (oD) { oD.close(); });
            this._buildTasksTable();
            MessageToast.show("Task " + oNewTask.id + " scheduled for " + sAssignedTo);
        },

        handleDialogCancelButton: function () {
            if (this._pCreateDialog) {
                this._pCreateDialog.then(function (oD) { oD.close(); });
            }
        },

        handleCreateChange: function (oEvent) {
            var oPicker = oEvent.getSource();
            oPicker.setValueState(oPicker.getDateValue() ? ValueState.None : ValueState.Error);
        },

        // ── Edit button from details popover ─────────────────────────────
        handleEditButton: function () {
            if (!this._pDetailsPopover) return;
            this._pDetailsPopover.then(function (oP) {
                var oCtx = oP.getBindingContext("remCal");
                if (!oCtx) return;
                var oTask = this.getView().getModel("remCal").getProperty(oCtx.getPath());
                oP.close();
                this._openCreateDialog("edit", null);
                this._pCreateDialog.then(function () {
                    this.byId("inputTitle").setValue(oTask.title        || "");
                    this.byId("moreInfo").setValue(oTask.info           || "");
                    this.byId("startDate").setDateValue(oTask.start     || null);
                    this.byId("endDate").setDateValue(oTask.end         || null);
                    this.byId("violationRef").setValue(oTask.violationId || "");
                    this.byId("affectedUser").setValue(oTask.userId     || "");
                    this.byId("roleToRemove").setValue(oTask.roleToRemove || "");
                    this.byId("selectPriority").setSelectedKey(oTask.priority || "High");
                    this.byId("startDate").setValueState(ValueState.None);
                    this.byId("endDate").setValueState(ValueState.None);
                }.bind(this));
            }.bind(this));
        },

        // ── Delete ───────────────────────────────────────────────────────
        handleDeleteAppointment: function () {
            if (!this._pDetailsPopover) return;
            this._pDetailsPopover.then(function (oP) {
                var oCtx = oP.getBindingContext("remCal");
                if (!oCtx) return;
                var sPath  = oCtx.getPath();
                var oModel = this.getView().getModel("remCal");
                // Path: /people/0/appointments/2
                var aParts = sPath.split("/");
                var iPI    = parseInt(aParts[2], 10);
                var iAI    = parseInt(aParts[4], 10);
                var aApps  = oModel.getProperty("/people/" + iPI + "/appointments");
                aApps.splice(iAI, 1);
                oModel.setProperty("/people/" + iPI + "/appointments", aApps);
                var aPeople = oModel.getProperty("/people");
                oModel.setProperty("/people", aPeople.slice());
                oP.close();
                this._buildTasksTable();
                MessageToast.show("Task deleted");
            }.bind(this));
        },

        // ── Mark Done ────────────────────────────────────────────────────
        handleMarkDone: function () {
            if (!this._pDetailsPopover) return;
            this._pDetailsPopover.then(function (oP) {
                var oCtx   = oP.getBindingContext("remCal");
                if (!oCtx) return;
                var oModel = this.getView().getModel("remCal");
                oModel.setProperty(oCtx.getPath() + "/status", "Done");
                oModel.setProperty(oCtx.getPath() + "/type",   "Type08");
                var aPeople = oModel.getProperty("/people");
                oModel.setProperty("/people", aPeople.slice());
                oP.close();
                this._buildTasksTable();
                MessageToast.show("Task marked as Done");
            }.bind(this));
        },

        // ── Tasks table ──────────────────────────────────────────────────
        _buildTasksTable: function () {
            var oTable = this.byId("allTasksList");
            if (!oTable) return;
            oTable.removeAllItems();

            var oModel  = this.getView().getModel("remCal");
            if (!oModel) return;
            var oFmt    = DateFormat.getDateTimeInstance({ style: "medium" });
            var aPeople = oModel.getProperty("/people") || [];
            var nSched = 0, nInProg = 0, nDone = 0;

            aPeople.forEach(function (oPerson) {
                (oPerson.appointments || []).forEach(function (oTask) {
                    if (oTask.status === "Done")        nDone++;
                    else if (oTask.status === "In Progress") nInProg++;
                    else                                nSched++;

                    var sDate = oTask.start ? oFmt.format(oTask.start) : "—";
                    var sPrio = oTask.priority === "High" ? "Error" : oTask.priority === "Medium" ? "Warning" : "None";
                    var sStt  = oTask.status  === "Done" ? "Success" : oTask.status === "In Progress" ? "Warning" : "None";

                    oTable.addItem(new sap.m.ColumnListItem({
                        highlight: sPrio,
                        cells: [
                            new sap.m.Text({ text: oTask.id || "—" }).addStyleClass("sentinelMono"),
                            new sap.m.ObjectStatus({ text: oTask.priority, state: sPrio }),
                            new sap.m.VBox({ items: [
                                new sap.m.Text({ text: oTask.title || "—", wrapping: false }),
                                new sap.m.Text({ text: oTask.info  || "",  wrapping: false }).addStyleClass("sapUiSmallText")
                            ]}),
                            new sap.m.ObjectIdentifier({ title: oTask.userName || oTask.userId || "—", text: oTask.userId || "" }),
                            new sap.m.Text({ text: oTask.violationId || "—" }).addStyleClass("sentinelMono"),
                            new sap.m.Text({ text: sDate }).addStyleClass("sentinelMono"),
                            new sap.m.Text({ text: oPerson.name }),
                            new sap.m.ObjectStatus({ text: oTask.status || "Scheduled", state: sStt })
                        ]
                    }));
                });
            });

            // Update KPI tiles
            var oNumSched = this.byId("numScheduled");
            var oNumProg  = this.byId("numInProgress");
            var oNumDone  = this.byId("numDone");
            if (oNumSched) oNumSched.setValue(nSched);
            if (oNumProg)  oNumProg.setValue(nInProg);
            if (oNumDone)  oNumDone.setValue(nDone);
        },

        // ── Export ───────────────────────────────────────────────────────
        onExport: function () { MessageToast.show("Exporting remediation calendar..."); },

        // ── Formatters ───────────────────────────────────────────────────
        formatDate: function (oDate) {
            if (!oDate) return "";
            return DateFormat.getDateTimeInstance({ style: "medium" }).format(oDate);
        },

        formatStatusState: function (sStatus) {
            return sStatus === "Done" ? "Success" : sStatus === "In Progress" ? "Warning" : "None";
        }
    });
});
