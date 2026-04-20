import requests

# Download the file
url = "http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
response = requests.get(url)
content = response.content

print("Original content length:", len(content))

# Analyze the FFFD issue
# FFFD in UTF-8 is \xef\xbf\xbd
# This appears when the original GBK/GB18030 encoded text was incorrectly converted to UTF-8

# Let's check if the content is actually GBK encoded
try:
    # Try to decode as GBK
    content_gbk = content.decode('gbk')
    print("GBK decode successful, length:", len(content_gbk))
    
    # Check for Chinese characters
    chinese_count = sum(1 for c in content_gbk if '\u4e00' <= c <= '\u9fff')
    print("Chinese characters:", chinese_count)
    
    # Now encode back to UTF-8
    content_utf8 = content_gbk.encode('utf-8')
    print("UTF-8 encode successful, length:", len(content_utf8))
    
    # Save
    with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'wb') as f:
        f.write(content_utf8)
    print("File saved!")
    
except UnicodeDecodeError as e:
    print("GBK decode failed:", e)
    
    # Try Latin-1 which is byte-transparent
    content_latin1 = content.decode('latin-1')
    print("Latin-1 decode successful, length:", len(content_latin1))
    
    # Now encode to UTF-8
    content_utf8 = content_latin1.encode('utf-8')
    print("UTF-8 encode successful, length:", len(content_utf8))
    
    # Save
    with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'wb') as f:
        f.write(content_utf8)
    print("File saved via Latin-1!")
