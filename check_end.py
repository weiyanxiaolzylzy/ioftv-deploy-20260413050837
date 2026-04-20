# Check the end of the file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

print("File length:", len(content))
print("\nLast 200 characters:")
print(content[-200:])

# Check if the file ends properly
print("\n\nChecking for proper closing:")
if content.endswith('}]);'):
    print("Ends with '}]);' - CORRECT")
elif content.endswith('}]})'):
    print("Ends with '}]}) - may need to check")
else:
    print("Ends with:", repr(content[-20:]))
