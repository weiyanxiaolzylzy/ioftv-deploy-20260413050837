import requests

# Try to download the project-ifc.js file
url = "http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
try:
    response = requests.get(url, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Content length: {len(response.content)}")
    
    # Save
    disk_path = r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'
    with open(disk_path, 'wb') as f:
        f.write(response.content)
    print(f"Saved to disk")
    
except Exception as e:
    print(f"Error: {e}")
