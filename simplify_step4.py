# -*- coding: utf-8 -*-
import sys
import re

# Read the file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Original file length: {len(content)}")

# ===== 1. Update data() =====
# Change: combinations:[],selectedComboId:"",newComboLabel:""
# To:     teamOptions:[],newTeamName:""
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

# ===== 3. Replace methods from onPresetSelectChange to getTodayStr =====
# Find the start of the old methods block
old_methods_start = 'onPresetSelectChange(){this.selectedComboId&&this.applySelectedCombo()},'
old_methods_end = ',getTodayStr()'

idx_start = content.find(old_methods_start)
idx_end = content.find(old_methods_end, idx_start)

if idx_start != -1 and idx_end != -1:
    # New methods to replace the preset-related methods
    new_methods = ',loadTeamOptions(){try{const t=JSON.parse(localStorage.getItem("pifc_teams")||"[]");this.teamOptions=Array.isArray(t)?t:[]}catch(t){this.teamOptions=[]}},saveTeamOptions(){localStorage.setItem("pifc_teams",JSON.stringify(this.teamOptions))},addTeam(){const t=(this.newTeamName||"").trim();if(!t)return void(this.$Message&&this.$Message.warning("请输入班组名称"));if(this.teamOptions.includes(t))return void(this.$Message&&this.$Message.warning("该班组已存在"));this.teamOptions.push(t),this.saveTeamOptions(),this.newTeamName="",this.$Message&&this.$Message.success("已添加班组："+t)},deleteTeam(t){this.teamOptions=this.teamOptions.filter(e=>e!==t),this.saveTeamOptions(),this.$Message&&this.$Message.success("已删除班组："+t)},selectTeam(t){this.assignForm.teamName=t}'
    
    # Replace from beginning of onPresetSelectChange to just before getTodayStr
    # We include the comma before onPresetSelectChange
    content = content[:idx_start] + new_methods + content[idx_end:]
    print("3. Replaced methods - OK")
else:
    print("3. ERROR: Could not find method boundaries")
    sys.exit(1)

# ===== 4. Remove preset block in template =====
# The preset block starts after a divider hr and ends before the next divider hr
# Find: e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-preset-block"}
preset_block_start = 'e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-preset-block"}'
preset_block_end = 'e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-bundle"}'

idx_preset_start = content.find(preset_block_start)
idx_preset_end = content.find(preset_block_end)

if idx_preset_start != -1 and idx_preset_end != -1:
    # Find the closing ]) of the preset block before the next hr
    # The preset block ends with ]),e("hr"
    preset_close_area = content[idx_preset_start:idx_preset_end]
    preset_close_idx = preset_close_area.find(']),e("hr"')
    
    if preset_close_idx != -1:
        # Remove from hr+preset-block-start to preset_close_idx + ])
        remove_start = idx_preset_start
        remove_end = idx_preset_start + preset_close_idx + 2
        content = content[:remove_start] + 'e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-bundle"}' + content[remove_end:]
        print("4. Removed preset block - OK")
    else:
        print("4. ERROR: Could not find preset block end")
        sys.exit(1)
else:
    print("4. ERROR: Could not find preset block markers")
    sys.exit(1)

# ===== 5. Update team input to select dropdown =====
old_team_input = 'e("input",{directives:[{name:"model",rawName:"v-model",value:t.assignForm.teamName,expression:"assignForm.teamName"}],staticClass:"pifc-input",attrs:{type:"text",placeholder:"与整套配置一致，如：A1 班组",autocomplete:"off"},domProps:{value:t.assignForm.teamName},on:{input:function(e){e.target.composing||t.$set(t.assignForm,"teamName",e.target.value)}}})'

new_team_input = 'e("select",{directives:[{name:"model",rawName:"v-model",value:t.assignForm.teamName,expression:"assignForm.teamName"}],staticClass:"pifc-input",on:{change:function(e){var s=Array.prototype.filter.call(e.target.options,(function(t){return t.selected})).map((function(t){return"_value"in t?t._value:t.value}));t.assignForm.teamName=e.target.multiple?s:s[0]}}},[e("option",{attrs:{value:""}},[t._v("— 选择班组 —")]),t._l(t.teamOptions,(function(s){return e("option",{key:s,domProps:{value:s}},[t._v(t._s(s))])}))],2),e("div",{staticClass:"pifc-team-add"},[e("input",{directives:[{name:"model",rawName:"v-model",value:t.newTeamName,expression:"newTeamName"}],staticClass:"pifc-input pifc-input-sm",attrs:{type:"text",placeholder:"新班组名称"},domProps:{value:t.newTeamName},on:{input:function(e){e.target.composing||(t.newTeamName=e.target.value)}}}),e("button",{staticClass:"pifc-btn-sm",attrs:{type:"button"},on:{click:t.addTeam}},[t._v("添加")])])]),t.teamOptions.length>0?e("div",{staticClass:"pifc-team-list"},[t._l(t.teamOptions,(function(s){return e("span",{key:s,staticClass:"pifc-team-tag"},[t._v(" "+t._s(s)+" "),e("span",{staticClass:"pifc-team-del",on:{click:function(e){return e.stopPropagation(),t.deleteTeam(s)}}},[t._v("×")])]}))],2):t._e(),'

if old_team_input in content:
    content = content.replace(old_team_input, new_team_input)
    print("5. Updated team input to select - OK")
else:
    print("5. WARNING: Could not find team input")

# ===== 6. Remove bundle header (t._m(0) and bundle-tip) =====
old_bundle_header = 'e("div",{staticClass:"pifc-bundle"},[t._m(0),e("p",{staticClass:"pifc-bundle-tip"},[t._v("优先从上方下拉套用整套；也可临时改某一格再点「应用到选中构件」。")]),'
new_bundle_header = 'e("div",{staticClass:"pifc-bundle"},['

if old_bundle_header in content:
    content = content.replace(old_bundle_header, new_bundle_header)
    print("6. Removed bundle header - OK")
else:
    print("6. WARNING: Could not find bundle header")

# ===== 7. Remove static render functions =====
old_static_funcs = ',[function(){var t=this._self._c;return t("div",{staticClass:"pifc-bundle-head"},[t("span",{staticClass:"pifc-bundle-title"},[this._v("班组与三方人员")]),t("span",{staticClass:"pifc-bundle-tag"},[this._v("一套固定")])])},function(){var t=this._self._c;return t("p",{staticClass:"pifc-footnote"},[this._v("保存后写入当前项目构件数据；主页「今日检测计划」按"),t("strong",[this._v("计划日期为当天")]),this._v("自动汇总显示（含所有项目）。")])}],'
new_static_funcs = '],'

if old_static_funcs in content:
    content = content.replace(old_static_funcs, new_static_funcs)
    print("7. Removed static render functions - OK")
else:
    print("7. WARNING: Could not find static render functions")

# ===== 8. Update panel title =====
content = content.replace('t._v("批量指派")', 't._v("制作人员设置")')
print("8. Updated panel title - OK")

# ===== 9. Update panel tip =====
content = content.replace(
    't._v("在左侧 IFC 构件列表左侧勾选复选框，再填写下列信息并保存。")',
    't._v("在左侧勾选构件，填写信息后保存。")'
)
print("9. Updated panel tip - OK")

print(f"\nFinal file length: {len(content)}")

# Save
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved!")
