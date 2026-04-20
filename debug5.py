# Read the file fresh
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find where e("div",{staticClass:"pifc-bundle"} actually appears
bundle_actual = 'e("div",{staticClass:"pifc-bundle"}'
bundle_positions = []
start = 0
while True:
    pos = content.find(bundle_actual, start)
    if pos == -1:
        break
    bundle_positions.append(pos)
    start = pos + 1

print(f"Found pifc-bundle at positions: {bundle_positions}")

# Show content around each occurrence
for i, pos in enumerate(bundle_positions):
    print(f"\n=== Occurrence {i+1} at position {pos} ===")
    print("Content around it:")
    print(repr(content[pos-50:pos+100]))
