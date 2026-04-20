# Read the original file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.1063e5d0b18f28247f69.js', 'r', encoding='utf-8') as f:
    original = f.read()

# Find the static render functions
static_start = ',[function(){var t=this._self._c;return t("div",{staticClass:"pifc-bundle-head"}'
idx = original.find(static_start)
if idx != -1:
    print(f"Static functions start at: {idx}")
    print("Content:")
    print(repr(original[idx:]))
else:
    print("Static functions not found")

# Also check what's at the end of the modified file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    modified = f.read()

# Check if the modified file has the static functions
idx2 = modified.find(static_start)
if idx2 != -1:
    print(f"\nModified file has static functions at: {idx2}")
else:
    print("\nModified file does NOT have static functions")

# Check what comes after the assign panel
assign_panel_end = 't._m(1)])]):'
idx3 = modified.rfind(assign_panel_end)
if idx3 != -1:
    print(f"\nAssign panel end at: {idx3}")
    print("Content after:")
    print(repr(modified[idx3:idx3+100]))
