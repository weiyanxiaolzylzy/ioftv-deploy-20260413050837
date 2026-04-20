with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'rb') as f:
    raw = f.read()

print("Original size:", len(raw))
print("FFFD count:", raw.count(b'\xef\xbf\xbd'))

# Replace FFFD bytes
# Try to figure out what the correct byte should be
# FFFD at position 578, context shows: ...重[FFFD]?:"
# Should be "重试" which is \xe9\x87\x8d\xe8\xaf\x95
# But we have \xe9\x87\x8d\xef\xbf\xbd

# Let's just replace FFFD with the correct byte
# "试" in UTF-8 is \xe8\xaf\x95
fixed = raw.replace(b'\xef\xbf\xbd', b'\x95')

# Try decoding to check
try:
    decoded = fixed.decode('utf-8')
    print("Decoded successfully, size:", len(decoded))
    # Write the fixed version
    with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'wb') as f:
        f.write(fixed)
    print("Fixed file written")
except UnicodeDecodeError as e:
    print("Still fails at:", e)
