# Read the file fresh
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find where "]),e("hr" pattern exists
pattern1 = ']),e("hr"'
idx1 = content.find(pattern1)
print(f"']),e(\"hr\" found at: {idx1}")

if idx1 != -1:
    print("Content around it:")
    print(repr(content[idx1:idx1+80]))

# Also find "}),e("hr"
pattern2 = '}),e("hr"'
idx2 = content.find(pattern2)
print(f"\n'}}),e(\"hr\" found at: {idx2}")

if idx2 != -1:
    print("Content around it:")
    print(repr(content[idx2:idx2+80]))

# And just search for ']),' to find closing brackets
pattern3 = ']),'
positions = []
start = 0
while True:
    pos = content.find(pattern3, start)
    if pos == -1:
        break
    positions.append(pos)
    start = pos + 1
    
print(f"\nFound ']),' at {len(positions)} positions")
# Show last 5
for pos in positions[-5:]:
    print(f"  {pos}: {repr(content[pos:pos+50])}")
