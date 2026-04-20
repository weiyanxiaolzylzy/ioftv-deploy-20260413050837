# Read the original file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.1063e5d0b18f28247f69.js', 'r', encoding='utf-8') as f:
    original = f.read()

# Read the modified file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    modified = f.read()

print(f"Original file length: {len(original)}")
print(f"Modified file length: {len(modified)}")

print("\nOriginal file last 100 chars:")
print(repr(original[-100:]))

print("\nModified file last 100 chars:")
print(repr(modified[-100:]))

# Find where they differ
for i in range(min(len(original), len(modified))):
    if original[i] != modified[i]:
        print(f"\nFirst difference at position {i}")
        print(f"Original: {repr(original[max(0,i-50):i+50])}")
        print(f"Modified: {repr(modified[max(0,i-50):i+50])}")
        break
