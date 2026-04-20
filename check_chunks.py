import requests

# Check different chunk files to see if they contain ProjectIfcPage
files_to_check = [
    "LSD.bighome~project-ifc~secondview.3deb2a0f040de4b2cc6c.js",
    "LSD.original.3deb2a0f040de4b2cc6c.js"
]

for filename in files_to_check:
    url = f"http://localhost:8890/static/js/{filename}"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            content = response.content.decode('utf-8', errors='replace')
            if 'ProjectIfcPage' in content:
                print(f"{filename}: Contains ProjectIfcPage")
                print(f"  Size: {len(content)} bytes")
                # Find position
                pos = content.find('ProjectIfcPage')
                print(f"  Position: {pos}")
            else:
                print(f"{filename}: Does NOT contain ProjectIfcPage")
        else:
            print(f"{filename}: HTTP {response.status_code}")
    except Exception as e:
        print(f"{filename}: Error - {e}")

# Also check the original dist folder
print("\n\nChecking original folder:")
import os
original_dir = r'D:\Roaming\ioftv-deploy-20260413050837\dist\original\static\js'
for f in os.listdir(original_dir):
    if 'ifc' in f.lower() or 'second' in f.lower():
        print(f"Found: {f}")
