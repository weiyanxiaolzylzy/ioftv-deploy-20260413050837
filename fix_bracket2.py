# Fix the extra ] issue
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the problematic pattern
# Original: ]),t._m(1)])])
# We changed to: ]),t._e()])])  <- wrong! extra ]
# Should be: ]),t._e()])    <- remove one ]

# Find t._e() followed by ])]) - need to reduce to ])]
old_pattern = 't._e()])])'
new_pattern = 't._e()])'

if old_pattern in content:
    print(f"Found '{old_pattern}'")
    content = content.replace(old_pattern, new_pattern)
    print(f"Replaced with '{new_pattern}'")
else:
    print("Pattern not found, trying alternative...")
    # Maybe it's slightly different
    idx = content.find('t._e()])])')
    if idx != -1:
        print(f"Found at position {idx}")
        print(f"Context: {repr(content[idx-20:idx+30])}")

# Save
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved!")
