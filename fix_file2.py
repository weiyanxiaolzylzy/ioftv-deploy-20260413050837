import requests

# Download the file
url = "http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
response = requests.get(url)
content = response.content

print("Content length:", len(content))

# Find all FFFD positions and context
fffd_positions = []
for i in range(len(content) - 2):
    if content[i:i+3] == b'\xef\xbf\xbd':
        fffd_positions.append(i)

print("FFFD positions:", fffd_positions[:10])

# The FFFD bytes should be replaced with correct bytes
# Based on context analysis, FFFD appears after valid UTF-8 sequences
# These are corrupted bytes that need to be replaced

# Strategy: Replace FFFD with a valid single-byte character or remove the whole sequence
# Let's try replacing FFFD with a space character (0x20)
fixed_content = content.replace(b'\xef\xbf\xbd', b' ')

# Try to decode
try:
    decoded = fixed_content.decode('utf-8')
    print("Decoded successfully!")
    print("Fixed content length:", len(decoded))
    
    # Check bracket balance
    opens = decoded.count('(') + decoded.count('[') + decoded.count('{')
    closes = decoded.count(')') + decoded.count(']') + decoded.count('}')
    print("Bracket diff:", opens - closes)
    
    # Save fixed content
    with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'w', encoding='utf-8') as f:
        f.write(decoded)
    print("File saved!")
except UnicodeDecodeError as e:
    print("Still fails:", e)
