import sys

# Read last 500 bytes of project-ifc file
file_path = r"d:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js"

try:
    with open(file_path, 'rb') as f:
        # Get file size
        f.seek(0, 2)
        size = f.tell()
        print(f"File size: {size} bytes")

        # Read last 500 bytes
        f.seek(max(0, size - 500))
        data = f.read()
        print("\nLast 500 bytes (hex):")
        print(data[-100:].hex())
        print("\nAs text (last 200 chars):")
        try:
            text = data.decode('utf-8')
            print(repr(text[-200:]))
        except:
            print("Cannot decode as UTF-8")
except FileNotFoundError:
    print(f"File not found: {file_path}")
