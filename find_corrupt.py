with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'rb') as f:
    raw = f.read()

# Find positions of FFFD (replacement character in UTF-8)
fffe_count = raw.count(b'\xef\xbf\xbe')
fffd_count = raw.count(b'\xef\xbf\xbd')
print("FFFE count:", fffe_count)
print("FFFD count:", fffd_count)

# Find the position
pos = raw.find(b'\xef\xbf\xbd')
if pos >= 0:
    print("\nPosition of FFFD:", pos)
    print("Context (bytes 50 before and after):")
    print(raw[max(0,pos-50):pos+100])
    
    # Try to decode with different encodings
    print("\nTrying to decode with gb18030:")
    try:
        decoded = raw[max(0,pos-100):pos+200].decode('gb18030', errors='replace')
        print(decoded)
    except:
        print("Failed to decode")
