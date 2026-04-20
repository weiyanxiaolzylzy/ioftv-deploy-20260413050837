import requests

# Download from server
url = "http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
response = requests.get(url)
content = response.content

print("Original content length:", len(content))

# The bytes are doubly encoded - UTF-8 was incorrectly interpreted as Latin-1
# and re-encoded to UTF-8

# To fix: interpret the current bytes as Latin-1 (which is byte-transparent)
# then decode as UTF-8

decoded = content.decode('latin-1')
print("After Latin-1 interpretation:", len(decoded))

# Now encode to UTF-8
utf8_content = decoded.encode('utf-8')
print("UTF-8 content length:", len(utf8_content))

# Check if the UTF-8 is valid
try:
    test = utf8_content.decode('utf-8')
    chinese_count = sum(1 for c in test if '\u4e00' <= c <= '\u9fff')
    print(f"Valid UTF-8 with {chinese_count} Chinese characters")
    
    # Save the file
    disk_path = r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'
    with open(disk_path, 'wb') as f:
        f.write(utf8_content)
    print("File saved!")
except UnicodeDecodeError as e:
    print(f"UTF-8 decode failed: {e}")
