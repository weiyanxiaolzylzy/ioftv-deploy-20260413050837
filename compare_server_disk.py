import requests

# Download fresh from server
url = "http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
response = requests.get(url)
server_content = response.content

print("Server content length:", len(server_content))

# Read from disk
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'rb') as f:
    disk_content = f.read()

print("Disk content length:", len(disk_content))

# They should be the same if server reads from disk
if server_content == disk_content:
    print("Server and disk content are IDENTICAL")
else:
    print("Server and disk content are DIFFERENT!")
    # Find first difference
    for i in range(min(len(server_content), len(disk_content))):
        if server_content[i] != disk_content[i]:
            print(f"First difference at position {i}")
            print(f"Server byte: {server_content[i]:02x}, Disk byte: {disk_content[i]:02x}")
            print(f"Server context: {server_content[max(0,i-20):i+30]}")
            print(f"Disk context: {disk_content[max(0,i-20):i+30]}")
            break
    else:
        print("Files match up to min length, differ in length only")
