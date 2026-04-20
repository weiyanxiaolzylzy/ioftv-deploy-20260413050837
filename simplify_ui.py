import re

# Read the file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Original file length: {len(content)}")

# 1. Update data(): remove combinations, selectedComboId, newComboLabel, add teamOptions, newTeamName
old_data = 'combinations:[],selectedComboId:"",newComboLabel:""'
new_data = 'teamOptions:[],newTeamName:""'
content = content.replace(old_data, new_data)
print("Updated data()")

# 2. Update mounted(): remove loadAssignPresets
old_mounted = 'this.assignForm.planDate=this.getTodayStr(),this.loadAssignPresets(),this.bootstrapFromRoute()'
new_mounted = 'this.assignForm.planDate=this.getTodayStr(),this.loadTeamOptions(),this.bootstrapFromRoute()'
content = content.replace(old_mounted, new_mounted)
print("Updated mounted()")

# 3. Replace methods: remove preset methods, add team methods
# Find and replace the methods section
old_methods = '''onPresetSelectChange(){this.selectedComboId&&this.applySelectedCombo()},loadAssignPresets(){try{const t=JSON.parse(localStorage.getItem("pifc_assign_presets_v1")||"{}");this.combinations=Array.isArray(t.combinations)?t.combinations:[]}catch(t){this.combinations=[]}},saveAssignPresets(){localStorage.setItem("pifc_assign_presets_v1",JSON.stringify({combinations:this.combinations}))},applySelectedCombo(){const t=this.combinations.find(t=>t.id===this.selectedComboId);t&&(this.assignForm.teamName=t.teamName||"",this.assignForm.teamLeader=t.teamLeader||"",this.assignForm.qualityInspector=t.qualityInspector||"",this.assignForm.qualityManager=t.qualityManager||"",this.$Message&&this.$Message.success("已套用固定配置（班组 + 班组长 + 质检员 + 质量员）"))},deleteSelectedCombo(){this.selectedComboId&&(this.combinations=this.combinations.filter(t=>t.id!==this.selectedComboId),this.selectedComboId="",this.saveAssignPresets(),this.$Message&&this.$Message.success("已删除该套固定配置"))},saveCurrentCombination(){const t=(this.newComboLabel||"").trim();if(!t)return void(this.$Message&&this.$Message.warning("请填写配置名称"));const e=(this.assignForm.teamName||"").trim(),s=(this.assignForm.teamLeader||"").trim(),i=(this.assignForm.qualityInspector||"").trim(),a=(this.assignForm.qualityManager||"").trim();e&&s&&i&&a?this.combinations.length>=50?this.$Message&&this.$Message.warning("固定配置已达上限 50 套，请先删除部分"):(this.combinations.push({id:"c_"+Date.now(),label:t,teamName:e,teamLeader:s,qualityInspector:i,qualityManager:a}),this.newComboLabel="",this.saveAssignPresets(),this.$Message&&this.$Message.success("已保存为一套固定配置")):this.$Message&&this.$Message.warning("固定配置须四项齐全：班组、班组长、质检员，质量员均填写后再保存")},'''

new_methods = '''loadTeamOptions(){try{const t=JSON.parse(localStorage.getItem("pifc_teams")||"[]");this.teamOptions=Array.isArray(t)?t:[]}catch(t){this.teamOptions=[]}},saveTeamOptions(){localStorage.setItem("pifc_teams",JSON.stringify(this.teamOptions))},addTeam(){const t=(this.newTeamName||"").trim();if(!t)return void(this.$Message&&this.$Message.warning("请输入班组名称"));if(this.teamOptions.includes(t))return void(this.$Message&&this.$Message.warning("该班组已存在"));this.teamOptions.push(t),this.saveTeamOptions(),this.newTeamName="",this.$Message&&this.$Message.success("已添加班组："+t)},deleteTeam(t){this.teamOptions=this.teamOptions.filter(e=>e!==t),this.saveTeamOptions(),this.$Message&&this.$Message.success("已删除班组："+t)},selectTeam(t){this.assignForm.teamName=t},'''

content = content.replace(old_methods, new_methods)
print("Replaced methods")

# 4. Update template: remove preset UI, update teamName to select dropdown
# Remove the preset block (固定班组配置)
old_preset_block = '''e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-preset-block"},[e("div",{staticClass:"pifc-preset-title"},[t._v("固定班组配置（四项一体）")]),e("p",{staticClass:"pifc-preset-lead"},[t._v("班组、班组长、质检员、质量员按「一套」保存与套用，日常一般不拆开变。")]),e("select",{directives:[{name:"model",rawName:"v-model",value:t.selectedComboId,expression:"selectedComboId"}],staticClass:"pifc-input",on:{change:[function(e){var s=Array.prototype.filter.call(e.target.options,(function(t){return t.selected})).map((function(t){return"_value"in t?t._value:t.value}));t.selectedComboId=e.target.multiple?s:s[0]},t.onPresetSelectChange]}},[e("option",{attrs:{value:""}},[t._v("— 选择已保存的固定配置 —")]),t._l(t.combinations,(function(s){return e("option",{key:s.id,domProps:{value:s.id}},[t._v(t._s(s.label))])}))],2),e("div",{staticClass:"pifc-preset-row"},[e("button",{staticClass:"pifc-btn-secondary",attrs:{type:"button",disabled:!t.selectedComboId},on:{click:t.applySelectedCombo}},[t._v("再次填入四项")]),e("button",{staticClass:"pifc-btn-danger",attrs:{type:"button",disabled:!t.selectedComboId},on:{click:t.deleteSelectedCombo}},[t._v("删除该套配置")])]),e("div",{staticClass:"pifc-preset-save"},[e("input",{directives:[{name:"model",rawName:"v-model",value:t.newComboLabel,expression:"newComboLabel"}],staticClass:"pifc-input",attrs:{type:"text",placeholder:"配置名称，如：A1 班组标准套",maxlength:"40"},domProps:{value:t.newComboLabel},on:{input:function(e){e.target.composing||(t.newComboLabel=e.target.value)}}}),e("button",{staticClass:"pifc-btn-secondary",attrs:{type:"button"},on:{click:t.saveCurrentCombination}},[t._v("保存当前四项为固定配置")])]),e("p",{staticClass:"pifc-preset-hint"},[t._v("保存时四项须齐全；数据存在本机浏览器，换电脑需重新录入。")])]),e("hr",{staticClass:"pifc-divider"}),'''

# New simplified version: just the team dropdown and add area
new_preset_block = '''e("hr",{staticClass:"pifc-divider"}),'''

content = content.replace(old_preset_block, new_preset_block)
print("Removed preset block")

# 5. Update the team input to be a select dropdown
old_team_input = '''e("div",{staticClass:"pifc-field"},[e("label",[t._v("制作班组")]),e("input",{directives:[{name:"model",rawName:"v-model",value:t.assignForm.teamName,expression:"assignForm.teamName"}],staticClass:"pifc-input",attrs:{type:"text",placeholder:"与整套配置一致，如：A1 班组",autocomplete:"off"},domProps:{value:t.assignForm.teamName},on:{input:function(e){e.target.composing||t.$set(t.assignForm,"teamName",e.target.value)}}})]),'''

new_team_input = '''e("div",{staticClass:"pifc-field"},[e("label",[t._v("制作班组")]),e("select",{directives:[{name:"model",rawName:"v-model",value:t.assignForm.teamName,expression:"assignForm.teamName"}],staticClass:"pifc-input",on:{change:function(e){var s=Array.prototype.filter.call(e.target.options,(function(t){return t.selected})).map((function(t){return"_value"in t?t._value:t.value}));t.assignForm.teamName=e.target.multiple?s:s[0]}}},[e("option",{attrs:{value:""}},[t._v("— 选择班组 —")]),t._l(t.teamOptions,(function(s){return e("option",{key:s,domProps:{value:s}},[t._v(t._s(s))])}))],2),e("div",{staticClass:"pifc-team-add"},[e("input",{directives:[{name:"model",rawName:"v-model",value:t.newTeamName,expression:"newTeamName"}],staticClass:"pifc-input pifc-input-sm",attrs:{type:"text",placeholder:"新班组名称"},domProps:{value:t.newTeamName},on:{input:function(e){e.target.composing||(t.newTeamName=e.target.value)}}}),e("button",{staticClass:"pifc-btn-sm",attrs:{type:"button"},on:{click:t.addTeam}},[t._v("添加")])])]),t.teamOptions.length>0?e("div",{staticClass:"pifc-team-list"},[t._l(t.teamOptions,(function(s){return e("span",{key:s,staticClass:"pifc-team-tag"},[t._v(" "+t._s(s)+" "),e("span",{staticClass:"pifc-team-del",on:{click:function(e){return e.stopPropagation(),t.deleteTeam(s)}}},[t._v("×")])])}))],2):t._e(),'''

content = content.replace(old_team_input, new_team_input)
print("Updated team input to select dropdown")

# 6. Remove the bundle section (班组与三方人员)
old_bundle = '''e("div",{staticClass:"pifc-bundle"},[t._m(0),e("p",{staticClass:"pifc-bundle-tip"},[t._v("优先从上方下拉套用整套；也可临时改某一格再点「应用到选中构件」。")]),'''
new_bundle = '''e("div",{staticClass:"pifc-bundle"},['''
content = content.replace(old_bundle, new_bundle)
print("Updated bundle section")

# 7. Remove the static render functions for bundle head and footnote
old_static_funcs = ''',[function(){var t=this._self._c;return t("div",{staticClass:"pifc-bundle-head"},[t("span",{staticClass:"pifc-bundle-title"},[this._v("班组与三方人员")]),t("span",{staticClass:"pifc-bundle-tag"},[this._v("一套固定")])])},function(){var t=this._self._c;return t("p",{staticClass:"pifc-footnote"},[this._v("保存后写入当前项目构件数据；主页「今日检测计划」按"),t("strong",[this._v("计划日期为当天")]),this._v("自动汇总显示（含所有项目）。")])}]'''
new_static_funcs = ''']'''
content = content.replace(old_static_funcs, new_static_funcs)
print("Removed static render functions")

# 8. Update panel title
content = content.replace('t._v("批量指派")', 't._v("制作人员设置")')
print("Updated panel title")

# 9. Update panel tip
content = content.replace('t._v("在左侧 IFC 构件列表左侧勾选复选框，再填写下列信息并保存。")', 't._v("在左侧勾选构件，填写信息后保存。")')
print("Updated panel tip")

print(f"\nFinal file length: {len(content)}")

# Write the file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved!")
