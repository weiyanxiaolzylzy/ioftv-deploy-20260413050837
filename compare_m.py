# Check original file structure
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.1063e5d0b18f28247f69.js', 'r', encoding='utf-8') as f:
    original = f.read()

# Find the pattern around t._m(1)
idx = original.find('t._m(1)')
if idx != -1:
    print("Original context around t._m(1):")
    print(repr(original[idx-50:idx+50]))

# Now check modified file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    modified = f.read()

idx2 = modified.find('t._e()')
if idx2 != -1:
    print("\nModified context around t._e():")
    print(repr(modified[idx2-50:idx2+50]))
