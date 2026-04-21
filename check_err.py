import subprocess, sys

p = r'd:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'

result = subprocess.run(['node', '--check', p], capture_output=True)
print('Exit:', result.returncode)
if result.stdout:
    try: print('STDOUT:', result.stdout.decode('utf8', errors='replace'))
    except: print('STDOUT raw:', result.stdout)
if result.stderr:
    try: print('STDERR:', result.stderr.decode('utf8', errors='replace'))
    except: print('STDERR raw:', result.stderr)
