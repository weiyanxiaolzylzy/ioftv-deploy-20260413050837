import re

# Read index.html
index_path = r"d:\Roaming\ioftv-deploy-20260413050837\dist\index.html"

with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find all script references
scripts = re.findall(r'<script[^>]*src="([^"]*project-ifc[^"]*)"', content)
print("project-ifc references in index.html:")
for s in scripts:
    print(f"  {s}")

# Check if both versions exist
import os
v1 = r"d:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js"
v2 = r"d:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.1063e5d0b18f28247f69.js"

print(f"\nVersion 3deb2a0f exists: {os.path.exists(v1)}")
print(f"Version 1063e5d0 exists: {os.path.exists(v2)}")

# Try to determine which is correct by checking if it's valid webpack chunk
for v_path, v_name in [(v1, "3deb2a0f"), (v2, "1063e5d0")]:
    if os.path.exists(v_path):
        with open(v_path, 'rb') as f:
            data = f.read()
            # Check last few bytes
            print(f"\n{v_name} last 20 bytes: {data[-20:].hex()}")
            print(f"{v_name} ends with: {repr(data[-20:].decode('latin-1'))}")
