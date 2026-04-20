# -*- coding: utf-8 -*-
import sys

# Read the file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Original file length: {len(content)}")

# Fix 1: Remove leading comma in methods
content = content.replace('methods:{,loadTeamOptions()', 'methods:{loadTeamOptions()')
print("1. Fixed methods leading comma - OK")

# Fix 2: Remove double comma in template (after pifc-panel-tip)
content = content.replace(']),,e("hr"', ']),e("hr"')
print("2. Fixed template double comma - OK")

print(f"\nFinal file length: {len(content)}")

# Save
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved!")
