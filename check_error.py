import subprocess

result = subprocess.run(['node', '--check', r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'], 
                      capture_output=True)
stderr = result.stderr.decode('utf-8', errors='replace')
print("Full stderr:")
print(stderr)
