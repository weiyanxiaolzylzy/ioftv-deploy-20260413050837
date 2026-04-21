import sys

# Read first 500 bytes of project-ifc file
file_path = r"d:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js"

try:
    with open(file_path, 'rb') as f:
        data = f.read(500)
        print("First 500 bytes (hex):")
        print(data[:100].hex())
        print("\nAs text (first 200 chars):")
        try:
            text = data.decode('utf-8')
            print(repr(text[:200]))
        except:
            print("Cannot decode as UTF-8, trying latin-1:")
            print(repr(data[:200].decode('latin-1')))
except FileNotFoundError:
    print(f"File not found: {file_path}")
    # List directory to find the correct file
    import os
    js_dir = os.path.dirname(file_path)
    if os.path.exists(js_dir):
        print(f"\nFiles in {js_dir}:")
        for f in os.listdir(js_dir):
            if 'project' in f.lower():
                print(f"  {f}")
