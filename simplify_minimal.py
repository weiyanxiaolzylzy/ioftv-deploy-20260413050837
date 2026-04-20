# -*- coding: utf-8 -*-
import sys

# Read the file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Original file length: {len(content)}")

# ===== 1. Update data() =====
content = content.replace(
    'combinations:[],selectedComboId:"",newComboLabel:""',
    'teamOptions:[],newTeamName:""'
)
print("1. Updated data() - OK")

# ===== 2. Update mounted() =====
content = content.replace(
    'this.loadAssignPresets()',
    'this.loadTeamOptions()'
)
print("2. Updated mounted() - OK")

# ===== 3. Replace preset methods with team methods =====
# Only replace the methods, not the template
old_methods = '''onPresetSelectChange(){this.selectedComboId&&this.applySelectedCombo()},loadAssignPresets(){try{const t=JSON.parse(localStorage.getItem("pifc_assign_presets_v1")||"{}");this.combinations=Array.isArray(t.combinations)?t.combinations:[]}catch(t){this.combinations=[]}},saveAssignPresets(){localStorage.setItem("pifc_assign_presets_v1",JSON.stringify({combinations:this.combinations}))},applySelectedCombo(){const t=this.combinations.find(t=>t.id===this.selectedComboId);t&&(this.assignForm.teamName=t.teamName||"",this.assignForm.teamLeader=t.teamLeader||"",this.assignForm.qualityInspector=t.qualityInspector||"",this.assignForm.qualityManager=t.qualityManager||"",this.$Message&&this.$Message.success("已套用固定配置（班组 + 班组长 + 质检员 + 质量员）"))},deleteSelectedCombo(){this.selectedComboId&&(this.combinations=this.combinations.filter(t=>t.id!==this.selectedComboId),this.selectedComboId="",this.saveAssignPresets(),this.$Message&&this.$Message.success("已删除该套固定配置"))},saveCurrentCombination(){const t=(this.newComboLabel||"").trim();if(!t)return void(this.$Message&&this.$Message.warning("请填写配置名称"));const e=(this.assignForm.teamName||"").trim(),s=(this.assignForm.teamLeader||"").trim(),i=(this.assignForm.qualityInspector||"").trim(),a=(this.assignForm.qualityManager||"").trim();e&&s&&i&&a?this.combinations.length>=50?this.$Message&&this.$Message.warning("固定配置已达上限 50 套，请先删除部分"):(this.combinations.push({id:"c_"+Date.now(),label:t,teamName:e,teamLeader:s,qualityInspector:i,qualityManager:a}),this.newComboLabel="",this.saveAssignPresets(),this.$Message&&this.$Message.success("已保存为一套固定配置")):this.$Message&&this.$Message.warning("固定配置须四项齐全：班组、班组长、质检员、质量员均填写后再保存")},'''

new_methods = '''loadTeamOptions(){try{const t=JSON.parse(localStorage.getItem("pifc_teams")||"[]");this.teamOptions=Array.isArray(t)?t:[]}catch(t){this.teamOptions=[]}},saveTeamOptions(){localStorage.setItem("pifc_teams",JSON.stringify(this.teamOptions))},addTeam(){const t=(this.newTeamName||"").trim();if(!t)return void(this.$Message&&this.$Message.warning("请输入班组名称"));if(this.teamOptions.includes(t))return void(this.$Message&&this.$Message.warning("该班组已存在"));this.teamOptions.push(t),this.saveTeamOptions(),this.newTeamName="",this.$Message&&this.$Message.success("已添加班组："+t)},deleteTeam(t){this.teamOptions=this.teamOptions.filter(e=>e!==t),this.saveTeamOptions(),this.$Message&&this.$Message.success("已删除班组："+t)},selectTeam(t){this.assignForm.teamName=t},'''

if old_methods in content:
    content = content.replace(old_methods, new_methods)
    print("3. Replaced preset methods - OK")
else:
    print("3. WARNING: Could not find preset methods")

# ===== 4. Update team input to select dropdown =====
old_team_input = 'e("input",{directives:[{name:"model",rawName:"v-model",value:t.assignForm.teamName,expression:"assignForm.teamName"}],staticClass:"pifc-input",attrs:{type:"text",placeholder:"与整套配置一致，如：A1 班组",autocomplete:"off"},domProps:{value:t.assignForm.teamName},on:{input:function(e){e.target.composing||t.$set(t.assignForm,"teamName",e.target.value)}}})'

new_team_input = 'e("select",{directives:[{name:"model",rawName:"v-model",value:t.assignForm.teamName,expression:"assignForm.teamName"}],staticClass:"pifc-input",on:{change:function(e){var s=Array.prototype.filter.call(e.target.options,(function(t){return t.selected})).map((function(t){return"_value"in t?t._value:t.value}));t.assignForm.teamName=e.target.multiple?s:s[0]}}},[e("option",{attrs:{value:""}},[t._v("— 选择班组 —")]),t._l(t.teamOptions,(function(s){return e("option",{key:s,domProps:{value:s}},[t._v(t._s(s))]}))],2),e("div",{staticClass:"pifc-team-add"},[e("input",{directives:[{name:"model",rawName:"v-model",value:t.newTeamName,expression:"newTeamName"}],staticClass:"pifc-input pifc-input-sm",attrs:{type:"text",placeholder:"新班组名称"},domProps:{value:t.newTeamName},on:{input:function(e){e.target.composing||(t.newTeamName=e.target.value)}}}),e("button",{staticClass:"pifc-btn-sm",attrs:{type:"button"},on:{click:t.addTeam}},[t._v("添加")])])]),t.teamOptions.length>0?e("div",{staticClass:"pifc-team-list"},[t._l(t.teamOptions,(function(s){return e("span",{key:s,staticClass:"pifc-team-tag"},[t._v(" "+t._s(s)+" "),e("span",{staticClass:"pifc-team-del",on:{click:function(e){return e.stopPropagation(),t.deleteTeam(s)}}},[t._v("×")])]}))],2):t._e(),'''

if old_team_input in content:
    content = content.replace(old_team_input, new_team_input)
    print("4. Updated team input - OK")
else:
    print("4. WARNING: Could not find team input")

# ===== 5. Update panel title =====
content = content.replace('t._v("批量指派")', 't._v("制作人员设置")')
print("5. Updated panel title - OK")

# ===== 6. Update panel tip =====
content = content.replace(
    't._v("在左侧 IFC 构件列表左侧勾选复选框，再填写下列信息并保存。")',
    't._v("在左侧勾选构件，填写信息后保存。")'
)
print("6. Updated panel tip - OK")

print(f"\nFinal file length: {len(content)}")

# Save
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved!")
