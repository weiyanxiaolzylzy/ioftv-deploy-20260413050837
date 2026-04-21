import re

filepath = r'd:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.1063e5d0b18f28247f69.js'
with open(filepath, 'rb') as f:
    content = f.read()

print('File size:', len(content))
print('First 20 bytes:', content[:20].hex())
print('Has UTF-8 BOM:', content[:3] == b'\xef\xbb\xbf')
print('Last 20 bytes:', content[-20:].hex())
print('Last 20 chars:', content[-20:])

# Count null bytes and suspicious characters
null_count = content.count(0x00)
print('NULL bytes:', null_count)

# Check for characters outside valid JS string range (but allow normal printable ASCII and UTF-8 Chinese)
suspicious = []
for i, b in enumerate(content):
    if b == 0x00:
        suspicious.append(f'NULL at {i}')
    elif b < 0x09 or (0x0E <= b <= 0x1F and b not in (0x0A, 0x0D)):
        suspicious.append(f'0x{b:02X} at {i}')
        if len(suspicious) > 10:
            suspicious.append('... (too many, stopping)')
            break

if suspicious:
    print('Suspicious bytes:', suspicious)
else:
    print('No suspicious bytes found')

# Check template literal patterns
text = content.decode('latin-1')
# Find all unescaped $ followed by { 
dollar_brace_patterns = []
for m in re.finditer(r'(?<!\\)\$\{', text):
    pos = m.start()
    ctx = text[max(0,pos-10):pos+15]
    dollar_brace_patterns.append((pos, repr(ctx)))
print(f'\nUnescaped ${{ patterns found: {len(dollar_brace_patterns)}')
for pos, ctx in dollar_brace_patterns:
    print(f'  pos {pos}: {ctx}')
