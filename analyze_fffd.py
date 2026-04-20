with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'rb') as f:
    raw = f.read()

# Find all FFFD positions
fffd_positions = []
for i in range(len(raw) - 2):
    if raw[i:i+3] == b'\xef\xbf\xbd':
        fffd_positions.append(i)

print("FFFD positions:", fffd_positions[:20])
print("Total FFFD:", len(fffd_positions))

# Let's look at each one
for pos in fffd_positions[:5]:
    print("\nPosition:", pos)
    # Show context
    start = max(0, pos - 30)
    end = min(len(raw), pos + 50)
    print("Context:", repr(raw[start:end]))
    
    # Try to decode the context with gb18030 to see what was intended
    try:
        decoded = raw[start:end+10].decode('gb18030', errors='replace')
        print("GB18030 decoded:", decoded)
    except:
        print("GB18030 decode failed")
