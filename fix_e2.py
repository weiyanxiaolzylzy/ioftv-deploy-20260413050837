# Fix the issue with t._e()]): 
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The current pattern is: t._e()]): which should be t._e()])
old = 't._e()]):'
new = 't._e()])'

if old in content:
    content = content.replace(old, new)
    print(f"Replaced '{old}' with '{new}'")
else:
    print(f"'{old}' not found")

# Save
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved!")
