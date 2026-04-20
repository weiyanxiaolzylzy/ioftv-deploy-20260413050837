# -*- coding: utf-8 -*-
# 只做最基础的修改，不改变模板结构

# Read the file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Original file length: {len(content)}")

# 1. Update data() - 添加 teamOptions 和 newTeamName
content = content.replace(
    'combinations:[],selectedComboId:"",newComboLabel:""',
    'teamOptions:[],newTeamName:""'
)
print("1. Updated data() - OK")

# 2. Update mounted() - 加载 team options
content = content.replace(
    'this.loadAssignPresets()',
    'this.loadTeamOptions()'
)
print("2. Updated mounted() - OK")

# 3. Add team methods
# 在 getTodayStr 之前添加新方法
old_methods = ',getTodayStr(){'

new_methods = ',loadTeamOptions(){try{const t=JSON.parse(localStorage.getItem("pifc_teams")||"[]");this.teamOptions=Array.isArray(t)?t:[]}catch(t){this.teamOptions=[]}},saveTeamOptions(){localStorage.setItem("pifc_teams",JSON.stringify(this.teamOptions))},addTeam(){const t=(this.newTeamName||"").trim();if(!t)return void(this.$Message&&this.$Message.warning("请输入班组名称"));if(this.teamOptions.includes(t))return void(this.$Message&&this.$Message.warning("该班组已存在"));this.teamOptions.push(t),this.saveTeamOptions(),this.newTeamName="",this.$Message&&this.$Message.success("已添加班组："+t)},deleteTeam(t){this.teamOptions=this.teamOptions.filter(e=>e!==t),this.saveTeamOptions(),this.$Message&&this.$Message.success("已删除班组："+t)},selectTeam(t){this.assignForm.teamName=t},getTodayStr(){'

if old_methods in content:
    content = content.replace(old_methods, new_methods)
    print("3. Added team methods - OK")
else:
    print("3. WARNING: Could not find getTodayStr marker")

# 4. Update panel title
content = content.replace('t._v("批量指派")', 't._v("制作人员设置")')
print("4. Updated panel title - OK")

# 5. Update panel tip
content = content.replace(
    't._v("在左侧 IFC 构件列表左侧勾选复选框，再填写下列信息并保存。")',
    't._v("在左侧勾选构件，填写信息后保存。")'
)
print("5. Updated panel tip - OK")

print(f"\nFinal file length: {len(content)}")

# Save
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved!")
