import subprocess

p = r'd:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'

result = subprocess.run(['node', '--check', p], capture_output=True)
print('Exit:', result.returncode)
# Try to decode stderr
for enc in ['utf8', 'latin1', 'gbk']:
    try:
        s = result.stderr.decode(enc)
        # Look for SyntaxError
        if 'SyntaxError' in s or 'Error' in s:
            lines = s.split('\n')
            for l in lines:
                if 'SyntaxError' in l or 'Error' in l or 'at ' in l:
                    print('[%s] %s' % (enc, l))
    except:
        pass
