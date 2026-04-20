import requests
import re

# Download from server
url = "http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
response = requests.get(url)
content = response.content

print("Content length:", len(content))

# The issue is that the server is reading the file with wrong encoding
# Let's try to fix it by reading the file directly from disk with correct encoding

import os
disk_path = r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'

# Try reading the raw file with binary mode
with open(disk_path, 'rb') as f:
    raw = f.read()
    
print("Raw file length:", len(raw))

# The file seems to be in some mixed encoding
# Let's try to figure out the correct encoding by checking the bytes

# First, let's see what encoding would make sense for this JavaScript file
# The file should be valid UTF-8 with Chinese characters

# Try different encodings
for encoding in ['utf-8', 'gbk', 'gb18030', 'big5', 'utf-16']:
    try:
        decoded = raw.decode(encoding)
        # Check if it looks like valid JavaScript
        if '(window.webpackJsonp' in decoded and 'ProjectIfcPage' in decoded:
            print(f"Valid JavaScript with encoding: {encoding}")
            
            # Check for Chinese characters
            chinese_count = sum(1 for c in decoded if '\u4e00' <= c <= '\u9fff')
            print(f"  Chinese characters: {chinese_count}")
            
            # Re-encode to UTF-8
            utf8_content = decoded.encode('utf-8')
            print(f"  UTF-8 length: {len(utf8_content)}")
            
            # Save
            with open(disk_path, 'wb') as f:
                f.write(utf8_content)
            print(f"  Saved with {encoding} -> UTF-8")
            break
    except:
        print(f"Failed with encoding: {encoding}")
