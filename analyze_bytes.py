import requests

# Download from server
url = "http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
response = requests.get(url)
content = response.content

# Let's check the bytes around where Chinese characters should be
# Look for common UTF-8 Chinese ranges: E4-E9 for 3-byte sequences
print("Analyzing content...")

# Count potential Chinese characters by looking for valid UTF-8 Chinese ranges
chinese_count = 0
i = 0
while i < len(content):
    b = content[i]
    if 0xE4 <= b <= 0xE9 and i + 2 < len(content):
        # This could be a 3-byte Chinese character
        chinese_count += 1
        i += 3
    else:
        i += 1

print(f"Potential Chinese characters (3-byte UTF-8 sequences): {chinese_count}")

# Let's look at a specific position
print("\nBytes around position 530:")
print(content[520:600])

# Check what this should decode to
try:
    decoded = content[520:600].decode('utf-8')
    print("\nDecoded:")
    print(decoded)
except UnicodeDecodeError as e:
    print(f"\nUTF-8 decode error: {e}")
    
    # Try GBK
    try:
        decoded_gbk = content[520:600].decode('gbk', errors='replace')
        print("GBK decoded (with replacement):")
        print(decoded_gbk)
    except Exception as e2:
        print(f"GBK also failed: {e2}")
