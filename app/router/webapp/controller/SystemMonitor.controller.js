sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, MessageToast) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.SystemMonitor", {

        onInit: function () {
            this.getRouter().getRoute("systemMonitor").attachPatternMatched(this._onRouteMatched, this);

            // Load the mock dataset (real values + simulated critical values)
            var oModel = new JSONModel();
            oModel.loadData(sap.ui.require.toUrl("sentinel/security/model/mockdata/systemHealth.json"));
            oModel.attachRequestCompleted(function () {
                var oData = oModel.getData();
                oData.mode = "healthy";
                oData.settingsWarnInput = oData.thresholds ? oData.thresholds.warnPercent : 85;
                oData.settingsCritInput = oData.thresholds ? oData.thresholds.criticalPercent : 95;
                oData.settingsLogGrowthInput = oData.assumedGrowth ? oData.assumedGrowth.hanaLogMBPerDay : 500;
                oData.settingsDataGrowthInput = oData.assumedGrowth ? oData.assumedGrowth.hanaDataMBPerDay : 2000;
                oData.systemInfo.capturedAt = this._formatNow();
                oModel.setData(oData);
                this._applyMode();
            }.bind(this));

            this.getView().setModel(oModel, "sysHealth");
        },

        _formatNow: function () {
            var d = new Date();
            var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
            return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear() +
                   " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
        },

        _onRouteMatched: function () {
            // Re-apply mode and refresh the captured timestamp on every visit
            var oModel = this.getView().getModel("sysHealth");
            if (oModel && oModel.getData() && oModel.getData().mode) {
                oModel.setProperty("/systemInfo/capturedAt", this._formatNow());
                this._applyMode();
            }
        },

        // ──────────────────────────────────────────────────────────────
        //  Mode toggle: healthy (real snapshot) ↔ critical (simulated)
        // ──────────────────────────────────────────────────────────────
        onModeChange: function (oEvent) {
            var sMode = oEvent.getParameter("item").getKey();
            var oModel = this.getView().getModel("sysHealth");
            oModel.setProperty("/mode", sMode);
            this._applyMode();
            MessageToast.show(sMode === "critical"
                ? "Displaying simulated critical state"
                : "Displaying live captured state");
        },

        _applyMode: function () {
            var oModel = this.getView().getModel("sysHealth");
            var oData = oModel.getData();
            var sMode = oData.mode || "healthy";
            var oSrc = oData[sMode];
            if (!oSrc) return;

            // Filesystems: sort by used% desc, and copy to top-level for the table
            var aFs = (oSrc.filesystems || []).slice().sort(function (a, b) {
                return b.usedPercent - a.usedPercent;
            });

            // Locate /hana/log — the star of the show
            var oHanaLog = aFs.find(function (f) { return f.name === "/hana/log"; })
                        || { sizeMB: 0, freeMB: 0, usedPercent: 0 };
            var iHLUsed = oHanaLog.usedPercent;
            var sHLState, sHLIcon, sHLText, sHLProgState;
            if (iHLUsed >= 95) {
                sHLState = "Error";
                sHLIcon = "sap-icon://error";
                sHLText = "CRITICAL — HANA freeze imminent";
                sHLProgState = "Error";
            } else if (iHLUsed >= 85) {
                sHLState = "Warning";
                sHLIcon = "sap-icon://alert";
                sHLText = "Warning — act now, 90% is emergency";
                sHLProgState = "Warning";
            } else {
                sHLState = "Success";
                sHLIcon = "sap-icon://accept";
                sHLText = "Healthy";
                sHLProgState = "Success";
            }

            // Count at-risk filesystems (over warn threshold)
            var iAtRisk = aFs.filter(function (f) { return f.usedPercent >= (f.warnThreshold || 85); }).length;

            // Memory helpers (convert MB → GB with 1 decimal)
            var iPhysMB = oSrc.memory.physicalMB;
            var iFreeMB = oSrc.memory.freeMB;
            var iCacheMB = Math.max(0, (oSrc.memory.freeInclCacheMB || 0) - iFreeMB);
            var iUsedMB = Math.max(0, iPhysMB - iFreeMB - iCacheMB);
            var oMemView = {
                physicalMB:     iPhysMB,
                physicalGB:     (iPhysMB / 1024).toFixed(1),
                freeMB:         iFreeMB,
                freeGB:         (iFreeMB / 1024).toFixed(1),
                usedMB:         iUsedMB,
                usedGB:         (iUsedMB / 1024).toFixed(1),
                cacheMB:        iCacheMB,
                cacheGB:        (iCacheMB / 1024).toFixed(1),
                freePercent:    oSrc.memory.freePercent,
                swapTotalMB:    oSrc.memory.swapTotalMB,
                swapFreeMB:     oSrc.memory.swapFreeMB,
                pageInKBs:      oSrc.memory.pageInKBs,
                pageOutKBs:     oSrc.memory.pageOutKBs
            };

            // Data for the memory donut chart
            var aMemChart = [
                { label: "Used",        valueMB: iUsedMB  },
                { label: "FS Cache",    valueMB: iCacheMB },
                { label: "Free",        valueMB: iFreeMB  }
            ];

            // Overall status message
            var sOverallMsg, sOverallType;
            if (iHLUsed >= 95 || iAtRisk >= 3 || oMemView.freePercent < 5) {
                sOverallMsg = "System is in a CRITICAL state — immediate intervention required. /hana/log or memory pressure will cause HANA to become unavailable.";
                sOverallType = "Error";
            } else if (iHLUsed >= 85 || iAtRisk >= 1 || oMemView.freePercent < 10) {
                sOverallMsg = "System has warning signals — /hana/log or filesystem headroom needs attention before it becomes critical.";
                sOverallType = "Warning";
            } else {
                sOverallMsg = "System is healthy — all filesystems within thresholds, memory and CPU nominal.";
                sOverallType = "Success";
            }

            // Push all derived values into the model
            oModel.setProperty("/filesystems", aFs);
            oModel.setProperty("/currentCPU", oSrc.cpu);
            oModel.setProperty("/currentMem", oMemView);
            oModel.setProperty("/memChartData", aMemChart);
            oModel.setProperty("/atRiskCount", iAtRisk);
            oModel.setProperty("/hanaLog", {
                usedPercent:    iHLUsed,
                freeGB:         (oHanaLog.freeMB / 1024).toFixed(1),
                totalGB:        (oHanaLog.sizeMB / 1024).toFixed(1),
                statusText:     sHLText,
                statusState:    sHLState,
                statusIcon:     sHLIcon,
                progressState:  sHLProgState
            });
            oModel.setProperty("/overallMessage", sOverallMsg);
            oModel.setProperty("/overallType", sOverallType);
        },

        // ──────────────────────────────────────────────────────────────
        //  Trend-based projection: linear extrapolation from the known
        //  daily growth rate of each HANA-critical volume. Not machine
        //  learning — a straightforward "at this rate, X happens on Y".
        // ──────────────────────────────────────────────────────────────
        _computePredictions: function () {
            var oModel = this.getView().getModel("sysHealth");
            var oData = oModel.getData();
            var aFs = oModel.getProperty("/filesystems") || [];
            var oThresholds = oData.thresholds || { warnPercent: 85, criticalPercent: 95 };
            var oGrowth = oData.assumedGrowth || { hanaLogMBPerDay: 500, hanaDataMBPerDay: 2000 };
            var dNow = new Date();

            // Only /hana/log and /hana/data have a user-adjustable growth
            // assumption — these are the two volumes that actually fill up
            // over time. Everything else is left out of the forecast.
            var mRates = {
                "/hana/log":  oGrowth.hanaLogMBPerDay,
                "/hana/data": oGrowth.hanaDataMBPerDay
            };

            var aPredictions = aFs
                .filter(function (fs) { return mRates.hasOwnProperty(fs.name); })
                .map(function (fs) {
                    var iRate = mRates[fs.name];
                    var iUsedMB = fs.sizeMB * (fs.usedPercent / 100);
                    var iWarnMB = fs.sizeMB * (oThresholds.warnPercent / 100);
                    var iCritMB = fs.sizeMB * (oThresholds.criticalPercent / 100);

                    if (!iRate || iRate <= 0) {
                        return {
                            name: fs.name,
                            warnDate: "—",
                            critDate: "—",
                            message: fs.name + " is at " + fs.usedPercent + "% used. Set an assumed daily growth rate below to see a projected timeline.",
                            severity: "Information"
                        };
                    }

                    var iDaysToWarn = Math.ceil((iWarnMB - iUsedMB) / iRate);
                    var iDaysToCrit = Math.ceil((iCritMB - iUsedMB) / iRate);

                    var sWarnDate = iDaysToWarn <= 0 ? "already exceeded" : this._addDays(dNow, iDaysToWarn);
                    var sCritDate = iDaysToCrit <= 0 ? "already exceeded" : this._addDays(dNow, iDaysToCrit);

                    var sMessage;
                    if (iDaysToCrit <= 0) {
                        sMessage = fs.name + " has already exceeded the Critical threshold (" +
                            oThresholds.criticalPercent + "%) at the assumed growth rate. Verify current usage and free space immediately.";
                    } else if (iDaysToWarn <= 0) {
                        sMessage = fs.name + " has already exceeded the Warn threshold (" +
                            oThresholds.warnPercent + "%). At an assumed growth rate of " + (iRate / 1024).toFixed(2) +
                            " GB/day, it would reach the Critical threshold (" + oThresholds.criticalPercent +
                            "%) around " + sCritDate + ".";
                    } else {
                        sMessage = "At an assumed growth rate of " + (iRate / 1024).toFixed(2) +
                            " GB/day (adjustable below), " + fs.name + " is projected to reach the Warn threshold (" +
                            oThresholds.warnPercent + "%) around " + sWarnDate + " and the Critical threshold (" +
                            oThresholds.criticalPercent + "%) around " + sCritDate +
                            ". An email alert fires automatically the moment either threshold is actually crossed.";
                    }

                    return {
                        name: fs.name,
                        daysToWarn: iDaysToWarn,
                        daysToCrit: iDaysToCrit,
                        warnDate: sWarnDate,
                        critDate: sCritDate,
                        message: sMessage,
                        severity: iDaysToCrit <= 0 ? "Error" : iDaysToWarn <= 0 ? "Error" : iDaysToWarn <= 14 ? "Warning" : "Information"
                    };
                }, this);

            oModel.setProperty("/predictions", aPredictions);
        },

                _parseCapturedDate: function (sTimestamp) {
            // Format: "20.07.2026 15:29:06" (DD.MM.YYYY HH:mm:ss)
            var aParts = sTimestamp.split(" ")[0].split(".");
            return new Date(parseInt(aParts[2], 10), parseInt(aParts[1], 10) - 1, parseInt(aParts[0], 10));
        },

        _addDays: function (oDate, iDays) {
            var oResult = new Date(oDate.getTime());
            oResult.setDate(oResult.getDate() + iDays);
            var aMonths = ["January","February","March","April","May","June","July","August","September","October","November","December"];
            return aMonths[oResult.getMonth()] + " " + oResult.getDate() + ", " + oResult.getFullYear();
        },

        // ──────────────────────────────────────────────────────────────
        //  Threshold settings — Save button at the bottom of the page
        // ──────────────────────────────────────────────────────────────
        onSaveThresholds: function () {
            var oModel = this.getView().getModel("sysHealth");
            var iWarn = oModel.getProperty("/settingsWarnInput");
            var iCrit = oModel.getProperty("/settingsCritInput");

            if (iWarn >= iCrit) {
                MessageToast.show("Warn threshold must be lower than Critical threshold");
                return;
            }

            oModel.setProperty("/thresholds/warnPercent", iWarn);
            oModel.setProperty("/thresholds/criticalPercent", iCrit);
            this._applyMode();
            MessageToast.show("Thresholds updated — Warn " + iWarn + "% · Critical " + iCrit + "%");
        },

        // ──────────────────────────────────────────────────────────────
        //  Export — delegate to the existing srv-side ExcelJS reporter
        //  (we send the currently-displayed dataset as the payload)
        // ──────────────────────────────────────────────────────────────
        onExportSystemHealth: function () {
            MessageToast.show("System Monitor export coming soon — for now, screenshot for evidence");
        }

    });
});
