import subprocess

paths = [
    r'd:\Roaming\ioftv-deploy-20260413050837\dist\beifen\static\js\project-ifc.3deb2a0f040de4b2cc6c.js',
    r'd:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js',
]

for p in paths:
    print('='*60)
    print(p.split('\\')[-1])
    result = subprocess.run(['node', '--check', p], capture_output=True, text=True)
    print('Exit code:', result.returncode)
    print('STDOUT:', result.stdout[:200] if result.stdout else '(none)')
    print('STDERR:', result.stderr[:500] if result.stderr else '(none)')
    print()
