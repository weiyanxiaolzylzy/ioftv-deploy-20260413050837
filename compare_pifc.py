import sys

# Check the other hash version
file_path1 = r"d:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js"
file_path2 = r"d:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.1063e5d0b18f28247f69.js"

for fp in [file_path1, file_path2]:
    filename = fp.split('\\')[-1]
    print(f"\n=== {filename} ===")
    try:
        with open(fp, 'rb') as f:
            # Get file size
            f.seek(0, 2)
            size = f.tell()
            print(f"File size: {size} bytes")

            # Read last 200 bytes
            f.seek(max(0, size - 200))
            data = f.read()

            # Try to decode as UTF-8 with error handling
            try:
                text = data.decode('utf-8')
                print(f"Last 100 chars: {repr(text[-100:])}")
            except UnicodeDecodeError as e:
                print(f"UTF-8 decode error at position {e.start}: {repr(data[e.start:e.start+20])}")
                # Try latin-1
                text = data.decode('latin-1')
                print(f"Last 100 chars (latin-1): {repr(text[-100:])}")

    except FileNotFoundError:
        print(f"File not found")
