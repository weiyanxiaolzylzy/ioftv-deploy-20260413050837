# Fix the extra parenthesis issue
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The issue is: t._m(1) has parentheses, t._e() doesn't have parameters
# Original: ]),t._m(1)])]) 
# We changed it to: ]),t._e()])])  <- extra )
# Should be: ]),t._e()])]) but we have: ]),t._e()])]) <- wrong

# Let's find what we have
idx = content.find('t._e()])])')
if idx != -1:
    print(f"Found t._e()])]) at position {idx}")
    print("Context:")
    print(repr(content[idx-30:idx+30]))
    # The fix is to remove the extra ]
    content = content.replace('t._e()])])', 't._e()])])')
    print("Trying to fix...")

# Let me check the original structure
# Looking for the pattern before t._m was called
idx2 = content.find('t._e()')
if idx2 != -1:
    print(f"\nContent around t._e():")
    print(repr(content[idx2-30:idx2+50]))
