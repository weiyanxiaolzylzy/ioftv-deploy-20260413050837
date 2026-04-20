import requests

# Download from server
url = "http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
response = requests.get(url)
content = response.content

print("Content length:", len(content))

# Check encoding
print("First 100 bytes hex:", content[:100].hex())

# Try to decode as UTF-8
try:
    decoded_utf8 = content.decode('utf-8')
    print("UTF-8 decode: SUCCESS")
    chinese_count = sum(1 for c in decoded_utf8 if '\u4e00' <= c <= '\u9fff')
    print(f"Chinese chars: {chinese_count}")
except UnicodeDecodeError as e:
    print(f"UTF-8 decode: FAILED - {e}")
    
# Try to decode as GBK
try:
    decoded_gbk = content.decode('gbk')
    print("GBK decode: SUCCESS")
except UnicodeDecodeError as e:
    print(f"GBK decode: FAILED - {e}")

# The file is corrupted - let's save it as-is and let the browser handle it
disk_path = r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'
with open(disk_path, 'wb') as f:
    f.write(content)
print("File saved as-is")
