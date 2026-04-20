import requests

# Check the app.js file
url = "http://localhost:8890/static/js/app.3deb2a0f040de4b2cc6c.js"
response = requests.get(url)
content = response.content

print("app.js content length:", len(content))

# Try to decode
try:
    decoded = content.decode('utf-8')
    chinese_count = sum(1 for c in decoded if '\u4e00' <= c <= '\u9fff')
    print(f"app.js Chinese chars: {chinese_count}")
    
    # Check bracket balance
    opens = decoded.count('(') + decoded.count('[') + decoded.count('{')
    closes = decoded.count(')') + decoded.count(']') + decoded.count('}')
    print(f"Bracket balance: opens={opens}, closes={closes}, diff={opens-closes}")
    
except Exception as e:
    print(f"Decode error: {e}")

# Check if the chunk files are valid
print("\n\nChecking chunk file structure:")
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\LSD.bighome~project-ifc~secondview.3deb2a0f040de4b2cc6c.js', 'rb') as f:
    chunk_content = f.read()
print(f"Chunk size: {len(chunk_content)} bytes")
print(f"First 50 bytes: {chunk_content[:50]}")
