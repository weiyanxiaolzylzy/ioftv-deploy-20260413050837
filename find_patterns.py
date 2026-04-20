# Check what patterns we have
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all occurrences of t._e()
import re
matches = list(re.finditer(r't\._e\(\)', content))
print(f"Found {len(matches)} occurrences of t._e()")

for m in matches:
    idx = m.start()
    print(f"\nAt position {idx}:")
    print(f"Context: {repr(content[idx-30:idx+30])}")

# Also find the pattern near the button
btn_idx = content.find('pifc-apply')
if btn_idx != -1:
    print(f"\n\nAround pifc-apply button:")
    print(repr(content[btn_idx-100:btn_idx+100]))
