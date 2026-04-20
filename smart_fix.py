import requests
import re

# Download the file
url = "http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
response = requests.get(url)
raw_content = response.content

print("Original content length:", len(raw_content))

# The file has corrupted bytes (\xef\xbf\xbd) that are U+FFFD replacement characters
# These should be removed from the middle of strings

# Strategy: Replace \xef\xbf\xbd with empty string
content = raw_content.replace(b'\xef\xbf\xbd', b'')

print("After removing replacement chars:", len(content))

# Now try to decode as UTF-8
try:
    decoded = content.decode('utf-8')
    print("UTF-8 decode successful!")
    
    # Check bracket balance
    opens = decoded.count('(') + decoded.count('[') + decoded.count('{')
    closes = decoded.count(')') + decoded.count(']') + decoded.count('}')
    print("Bracket balance - opens:", opens, "closes:", closes, "diff:", opens - closes)
    
    # Check for obvious syntax errors
    # The issue might be that removing bytes creates invalid sequences
    # Let's check if there are any obvious issues
    
    # Try to validate with node
    import subprocess
    result = subprocess.run(['node', '--check', r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'], 
                          capture_output=True)
    if result.returncode == 0:
        print("Node syntax check PASSED!")
    else:
        stderr = result.stderr.decode('utf-8', errors='replace')
        print("Node syntax check FAILED:")
        print(stderr[:500])
    
    # Save the file
    with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'wb') as f:
        f.write(decoded.encode('utf-8'))
    print("File saved!")
    
except UnicodeDecodeError as e:
    print("UTF-8 decode failed:", e)
    
    # Try a different approach: use errors='surrogateescape'
    try:
        decoded = content.decode('utf-8', errors='surrogateescape')
        print("Decoded with surrogateescape")
        
        # Check the content
        print("Checking content...")
        
        # Write as binary
        with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'wb') as f:
            f.write(content)
        print("File saved as binary!")
    except Exception as e2:
        print("Also failed:", e2)
