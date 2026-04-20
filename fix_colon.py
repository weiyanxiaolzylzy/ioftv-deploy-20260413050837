# Fix the missing : for the ternary operator
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Current: t._e()])t.currentProject&&
# Should be: t._e()]):t.currentProject&&
old = 't._e()])t.currentProject'
new = 't._e()]):t.currentProject'

if old in content:
    content = content.replace(old, new)
    print(f"Fixed: '{old}' -> '{new}'")
else:
    print(f"'{old}' not found")

# Save
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved!")
