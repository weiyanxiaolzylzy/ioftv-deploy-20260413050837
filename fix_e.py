# Check and fix the extra ]) after t._e()
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find t._e() in the context
idx = content.find('t._e()])])')
if idx != -1:
    print(f"Found t._e()])]) at position: {idx}")
    # This should be t._e()]) - not two ])
    content = content.replace('t._e()])])', 't._e()])')
    print("Fixed extra ])")
else:
    # Check what we have
    idx2 = content.find('t._e()')
    if idx2 != -1:
        print(f"Found t._e() at position: {idx2}")
        print("Context:")
        print(repr(content[idx2:idx2+30]))

# Save
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved!")
