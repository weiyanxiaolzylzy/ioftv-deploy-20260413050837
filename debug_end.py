# Read the file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Show content around the first extra ] at position 13091
print("Content around position 13091:")
print(repr(content[13070:13120]))

print("\n\nLast 100 characters:")
print(repr(content[-100:]))
