import requests

# Download the file
url = "http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
response = requests.get(url)
content = response.content

print("Content length:", len(content))

# Find all FFFD positions and try to fix them
# FFFD is U+FFFD (Replacement Character) used in UTF-8 as \xef\xbf\xbd
# These are corrupted bytes that should be removed

# Strategy: Remove FFFD bytes and adjust surrounding context
# This will result in slightly garbled Chinese text but the code will work

fixed_content = content.replace(b'\xef\xbf\xbd', b'')

# Try to decode
try:
    decoded = fixed_content.decode('utf-8')
    print("Decoded successfully!")
    print("Fixed content length:", len(decoded))
    
    # Save fixed content
    with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'w', encoding='utf-8') as f:
        f.write(decoded)
    print("File saved!")
except UnicodeDecodeError as e:
    print("Still fails:", e)
    # Let's try to fix more aggressively
    print("Trying GBK encoding...")
    try:
        decoded_gbk = content.decode('gbk', errors='replace')
        print("GBK decoded, length:", len(decoded_gbk))
    except Exception as e2:
        print("GBK also fails:", e2)
