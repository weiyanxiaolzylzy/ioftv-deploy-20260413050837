import subprocess
import requests

# Download the file and save to disk
url = "http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
response = requests.get(url)

print("Status:", response.status_code)
print("Content length:", len(response.content))
print("First 100 bytes:", response.content[:100])

# Check for FFFD
fffd_count = response.content.count(b'\xef\xbf\xbd')
print("FFFD count in response:", fffd_count)

# Save to a new file
with open(r'D:\temp\pifc_fixed.js', 'wb') as f:
    f.write(response.content)
print("Saved to temp file")
