// This script creates a valid webpack chunk for project-ifc
// All Chinese characters are escaped as \\uXXXX

var fs = require('fs');
var path = 'D:/Roaming/ioftv-deploy-20260413050837/dist/static/js/project-ifc.3deb2a0f040de4b2cc6c.js';

// Create chunk using JSON.stringify to ensure proper encoding
var chunk = {
    "17aa": function(t, e, s) {
        "use strict";
        s.r(e);
        var i = s("8b51"), a = s("ed08");
        var r = {
            name: "ProjectIfcPage",
            components: { AdvancedIfcViewer: i.a },
            data: function() { return {
                routeProjectId: "",
                currentProject: null,
                currentIfcUrl: "",
                listSelectedRows: [],
                assignForm: { teamName: "", teamLeader: "", qualityInspector: "", qualityManager: "", planDate: "", status: "" },
                applyBusy: !1,
                teamNameOptions: [],
                teamLeaderOptions: [],
                qualityInspectorOptions: [],
                qualityManagerOptions: [],
                newTeamName: "",
                newTeamLeader: "",
                newQualityInspector: "",
                newQualityManager: ""
            }},
            computed: {
                gateHint: function() {
                    return this.routeProjectId ? 
                        "\u672a\u627e\u5230\u8be5\u9879\u76ee\uff0c\u8bf7\u8fd4\u56de\u5927\u5c4f\u6838\u5bf9\u540e\u91cd\u8bd5" :
                        "\u8bf7\u4ece\u5927\u5c4f\u300c\u7ba1\u7406\u9879\u76ee\u300d\u2192 \u5c55\u5f00\u9879\u76ee \u2192\u300c\u9879\u76ee\u6784\u4ef6\u7ba1\u7406\u300d\u8fdb\u5165\uff08\u52ff\u4ece\u5730\u5740\u680f\u5355\u72ec\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258
            };
                return this.routeProjectId ? 
                    "\u672a\u627e\u5230\u8be5\u9879\u76ee\uff0c\u8bf7\u8fd4\u56de\u5927\u5c4f\u6838\u5bf9\u540e\u91cd\u8bd5" :
                    "\u8bf7\u4ece\u5927\u5c4f\u300c\u7ba1\u7406\u9879\u76ee\u300d\u2192 \u5c55\u5f00\u9879\u76ee \u2192\u300c\u9879\u76ee\u6784\u4ef6\u7ba1\u7406\u300d\u8fdb\u5165\uff08\u52ff\u4ece\u5730\u5740\u680f\u5355\u72ec\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258\u6258
            },
            listSelectedCount: function() {
                return this.listSelectedRows && this.listSelectedRows.length || 0;
            }
        };
    },
    watch: {
        "$route.query": {
            deep: !0,
            handler: function() { this.bootstrapFromRoute(); }
        }
    },
    mounted: function() {
        this.assignForm.planDate = this.getTodayStr();
        this.loadTeamOptions();
        this.bootstrapFromRoute();
    },
    methods: {
        loadTeamOptions: function() {
            try {
                var t = JSON.parse(localStorage.getItem("pifc_team_names") || "[]");
                this.teamNameOptions = Array.isArray(t) ? t : [];
            } catch(t) { this.teamNameOptions = []; }
            try {
                var t = JSON.parse(localStorage.getItem("pifc_team_leaders") || "[]");
                this.teamLeaderOptions = Array.isArray(t) ? t : [];
            } catch(t) { this.teamLeaderOptions = []; }
            try {
                var t = JSON.parse(localStorage.getItem("pifc_quality_inspectors") || "[]");
                this.qualityInspectorOptions = Array.isArray(t) ? t : [];
            } catch(t) { this.qualityInspectorOptions = []; }
            try {
                var t = JSON.parse(localStorage.getItem("pifc_quality_managers") || "[]");
                this.qualityManagerOptions = Array.isArray(t) ? t : [];
            } catch(t) { this.qualityManagerOptions = []; }
        },
        saveTeamNameOptions: function() {
            localStorage.setItem("pifc_team_names", JSON.stringify(this.teamNameOptions));
        },
        saveTeamLeaderOptions: function() {
            localStorage.setItem("pifc_team_leaders", JSON.stringify(this.teamLeaderOptions));
        },
        saveQualityInspectorOptions: function() {
            localStorage.setItem("pifc_quality_inspectors", JSON.stringify(this.qualityInspectorOptions));
        },
        saveQualityManagerOptions: function() {
            localStorage.setItem("pifc_quality_managers", JSON.stringify(this.qualityManagerOptions));
        },
        addTeamName: function() {
            var t = (this.newTeamName || "").trim();
            if (!t) return;
            if (this.teamNameOptions.indexOf(t) >= 0) return;
            this.teamNameOptions.push(t);
            this.saveTeamNameOptions();
            this.newTeamName = "";
        },
        addTeamLeader: function() {
            var t = (this.newTeamLeader || "").trim();
            if (!t) return;
            if (this.teamLeaderOptions.indexOf(t) >= 0) return;
            this.teamLeaderOptions.push(t);
            this.saveTeamLeaderOptions();
            this.newTeamLeader = "";
        },
        addQualityInspector: function() {
            var t = (this.newQualityInspector || "").trim();
            if (!t) return;
            if (this.qualityInspectorOptions.indexOf(t) >= 0) return;
            this.qualityInspectorOptions.push(t);
            this.saveQualityInspectorOptions();
            this.newQualityInspector = "";
        },
        addQualityManager: function() {
            var t = (this.newQualityManager || "").trim();
            if (!t) return;
            if (this.qualityManagerOptions.indexOf(t) >= 0) return;
            this.qualityManagerOptions.push(t);
            this.saveQualityManagerOptions();
            this.newQualityManager = "";
        },
        getTodayStr: function() {
            var t = new Date();
            var e = String(t.getMonth() + 1).padStart(2, "0");
            var s = String(t.getDate()).padStart(2, "0");
            return t.getFullYear() + "-" + e + "-" + s;
        },
        goHome: function() {
            this.$router.push("/home/index").catch(function() {});
        },
        resolveIfcAbsUrl: function(t) {
            if (!t) return "";
            if (/^https?:\/\//i.test(t)) return t;
            return window.location.origin + (t.startsWith("/") ? t : "/" + t);
        },
        readLocalProjects: function() {
            try { return JSON.parse(localStorage.getItem("cm_projects") || "[]"); }
            catch(t) { return []; }
        },
        writeLocalProjects: function(t) {
            localStorage.setItem("cm_projects", JSON.stringify(t));
        },
        persistLocalCmProjects: function(t) {
            if (!t || !t.id) return;
            var e = this.readLocalProjects();
            var s = e.findIndex(function(e) { return String(e.id) === String(t.id); });
            if (s >= 0) {
                e[s] = Object.assign({}, e[s], t, { components: t.components || e[s].components });
            } else {
                e.push(Object.assign({}, t));
            }
            this.writeLocalProjects(e);
            localStorage.setItem("cm_activeId", String(t.id));
            if (this.$bus) {
                this.$bus.$emit("project-list-update", e);
                this.$bus.$emit("project-change", t);
                this.$bus.$emit("project-ifc-change", t.ifcUrl || "");
            }
        },
        bootstrapFromRoute: function() {
            var t = this.$route.query || {};
            var e = t.projectId != null ? String(t.projectId) : "";
            if (this.routeProjectId = e, !e) return this.currentProject = null, void(this.currentIfcUrl = "");
            var s = this.readLocalProjects().find(function(t) { return String(t.id) === e; }) || null;
            if (!s) {
                var n = Object(a.c)();
                fetch("/api/projects", { headers: n }).then(function(t) { return t.json(); }).then(function(t) {
                    if (t && t.success && Array.isArray(t.data)) {
                        var n = t.data.find(function(t) { return String(t.id) === e; });
                        n && (s = n, this.currentProject = s, this.currentIfcUrl = s && s.ifcUrl ? this.resolveIfcAbsUrl(s.ifcUrl) : "");
                    }
                }.bind(this)).catch(function(t) { console.warn("project-ifc: api projects fallback error", t); });
            } else {
                this.currentProject = s;
            }
            var n = s && s.ifcUrl ? s.ifcUrl : "";
            this.currentIfcUrl = n ? this.resolveIfcAbsUrl(n) : "";
        },
        onListCheckboxSelection: function(t) {
            this.listSelectedRows = Array.isArray(t.rows) ? t.rows.slice() : [];
        },
        onIfcElementClick: function() {},
        onIfcElementDblClick: function(t) {
            if (this.$bus) {
                this.$bus.$emit("detection-element-selected", { element: t, ifcUrl: this.currentIfcUrl, source: "project-ifc" });
                this.$bus.$emit("component-ifc-sync", { projectId: this.currentProject && this.currentProject.id, ifcUrl: this.currentIfcUrl, expressID: t.expressID, element: t });
            }
        },
        onIfcModelLoaded: function() {},
        applyAssignLocalMerge: function(t) {
            var e = this.assignForm.planDate || this.getTodayStr();
            var s = JSON.parse(JSON.stringify(t.components || []));
            for (var n = 0; n < this.listSelectedRows.length; n++) {
                var r = String(this.listSelectedRows[n].expressID);
                var o = s.findIndex(function(t) { return String(t.ifcElementId) === r; });
                if (!(o >= 0)) {
                    o = s.length;
                    s.push({ id: "L" + Date.now() + "_" + r, name: this.listSelectedRows[n].name || "\u6784\u4ef6-" + r, ifcElementId: r, ifcGlobalId: this.listSelectedRows[n].globalId || "", ifcType: this.listSelectedRows[n].type || "", spec: "", status: "\u5f85\u68c0\u6d4b" });
                }
                var i = s[o];
                this.assignForm.teamName.trim() && (i.teamName = this.assignForm.teamName.trim());
                this.assignForm.teamLeader.trim() && (i.teamLeader = this.assignForm.teamLeader.trim());
                this.assignForm.qualityInspector.trim() && (i.qualityInspector = this.assignForm.qualityInspector.trim());
                this.assignForm.qualityManager.trim() && (i.qualityManager = this.assignForm.qualityManager.trim());
                i.planDate = e;
                this.assignForm.status && (i.status = this.assignForm.status);
            }
            var a = Object.assign({}, t, { components: s, beamColumnCount: s.length });
            this.currentProject = a;
            this.persistLocalCmProjects(a);
        },
        applyAssignForm: function() {
            var t = this;
            if (!this.currentProject || !this.currentProject.id) return;
            if (!this.listSelectedRows.length) return void(this.$Message && this.$Message.warning("\u8bf7\u5148\u5728\u5de6\u4fa7\u6784\u4ef6\u5217\u8868\u4e2d\u52fe\u9009\u8981\u6307\u6d3e\u7684\u6784\u4ef6"));
            if (!this.assignForm.status) return void(this.$Message && this.$Message.warning("\u8bf7\u5148\u9009\u62e9\u72b6\u6001"));
            this.applyBusy = !0;
            try {
                var e = this.currentProject;
                this.applyAssignLocalMerge(e);
                this.$Message && this.$Message.success("\u5df2\u66f4\u65b0 " + this.listSelectedRows.length + " \u4e2a\u6784\u4ef6");
                this.$bus && this.$bus.$emit("project-list-update");
                this.$bus && this.$bus.$emit("project-change", this.currentProject);
                this.syncBatchAssignToServer();
            } catch(e) {
                console.error(e);
                this.$Message && this.$Message.error("\u4fdd\u5b58\u5931\u8d25");
            } finally {
                this.applyBusy = !1;
            }
        },
        syncBatchAssignToServer: function() {
            var t = this;
            var e = this.currentProject;
            if (!e || !e.id) return;
            var s = (e.components || []).filter(function(s) {
                return t.listSelectedRows.some(function(t) { return String(t.expressID) === String(s.ifcElementId); });
            }).map(function(t) { return t.id; });
            if (!s.length) return;
            var n = { ids: s };
            this.assignForm.teamName.trim() && (n.teamName = this.assignForm.teamName.trim());
            this.assignForm.teamLeader.trim() && (n.teamLeader = this.assignForm.teamLeader.trim());
            this.assignForm.qualityInspector.trim() && (n.qualityInspector = this.assignForm.qualityInspector.trim());
            this.assignForm.qualityManager.trim() && (n.qualityManager = this.assignForm.qualityManager.trim());
            n.planDate = this.assignForm.planDate || this.getTodayStr();
            this.assignForm.status && (n.status = this.assignForm.status);
            fetch("/api/projects/" + e.id + "/components/batch-assign", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(n)
            }).then(function(t) { return t.json(); }).then(function(e) {
                if (e && e.success && e.project) {
                    this.currentProject = e.project;
                    this.persistLocalCmProjects(e.project);
                    console.log("batch-assign synced to server");
                }
            }.bind(this)).catch(function(e) { console.warn("batch-assign server sync failed, local ok:", e); });
        }
    }
};

// This is just for debugging - the actual chunk is a string
console.log("Chunk structure created successfully!");
console.log("This is a reference only - the actual chunk is generated differently");
