# Read the file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find t._m(1) in the template
idx = content.find('t._m(1)')
if idx != -1:
    print(f"Found t._m(1) at position: {idx}")
    print("Context around it:")
    print(repr(content[idx-50:idx+50]))
    
    # Replace t._m(1) with t._e() (empty render)
    content = content.replace('t._m(1)', 't._e()')
    print("\nReplaced t._m(1) with t._e()")
    
# Save
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved!")
