import requests

# Download from server
url = "http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
server_content = requests.get(url).content

# Read from disk
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'rb') as f:
    disk_content = f.read()

print("Server content length:", len(server_content))
print("Disk content length:", len(disk_content))

# Find differences
min_len = min(len(server_content), len(disk_content))
for i in range(min_len):
    if server_content[i] != disk_content[i]:
        print(f"First difference at position {i}:")
        print(f"Server byte: {server_content[i]:02x}, Disk byte: {disk_content[i]:02x}")
        print(f"Server context: {server_content[max(0,i-20):i+30]}")
        print(f"Disk context: {disk_content[max(0,i-20):i+30]}")
        break
else:
    if len(server_content) != len(disk_content):
        print("Files differ in length but content matches up to min length")
    else:
        print("Files are identical")

# Check for FFFD in both
server_fffd = server_content.count(b'\xef\xbf\xbd')
disk_fffd = disk_content.count(b'\xef\xbf\xbd')
print(f"\nServer FFFD count: {server_fffd}")
print(f"Disk FFFD count: {disk_fffd}")
