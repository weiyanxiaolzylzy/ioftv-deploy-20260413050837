import requests

# Download from server
url = "http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
response = requests.get(url)
content = response.content

print("Original content length:", len(content))

# The content was double-encoded:
# Original UTF-8 bytes -> interpreted as Latin-1 -> re-encoded as UTF-8

# To fix:
# 1. Decode as UTF-8 (gets the wrongly decoded characters)
# 2. Encode those characters back to UTF-8 (but they were Latin-1, so we get garbage)
# 3. Then decode those UTF-8 bytes as Latin-1

# Actually, a simpler way:
# 1. Decode the UTF-8 to get the wrong characters (e.g. "Ã" instead of "未")
# 2. Encode those characters as Latin-1 to get the intermediate bytes
# 3. Decode those bytes as UTF-8 to get the original text

# Step 1: Decode as UTF-8 (wrong)
wrong_text = content.decode('utf-8')
print("Wrong text decoded, length:", len(wrong_text))

# Step 2: Encode as Latin-1 to get intermediate bytes
intermediate_bytes = wrong_text.encode('latin-1')
print("Intermediate bytes length:", len(intermediate_bytes))

# Step 3: Decode as UTF-8
try:
    correct_text = intermediate_bytes.decode('utf-8')
    print("Correct text decoded, length:", len(correct_text))
    
    # Check for Chinese characters
    chinese_count = sum(1 for c in correct_text if '\u4e00' <= c <= '\u9fff')
    print(f"Chinese characters: {chinese_count}")
    
    # Save
    disk_path = r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'
    with open(disk_path, 'w', encoding='utf-8') as f:
        f.write(correct_text)
    print("File saved!")
    
except UnicodeDecodeError as e:
    print(f"Final decode failed: {e}")
    
    # Debug: show first 100 chars of intermediate
    print("First 200 intermediate bytes:", intermediate_bytes[:200])
