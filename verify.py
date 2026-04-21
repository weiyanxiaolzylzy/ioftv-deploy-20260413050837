import subprocess

p = r'd:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'

result = subprocess.run(['node', '--check', p], capture_output=True)
print('Exit:', result.returncode)
if result.stdout:
    print('STDOUT:', result.stdout[:300])
if result.stderr:
    s = result.stderr
    print('STDERR length:', len(s))
    print('STDERR first 300:', s[:300])
    print('STDERR last 100:', s[-100:])
