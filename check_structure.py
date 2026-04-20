import subprocess

# Check the file
result = subprocess.run(['node', '--check', r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'], 
                      capture_output=True)

if result.returncode == 0:
    print("Node syntax check PASSED!")
else:
    stderr = result.stderr.decode('utf-8', errors='replace')
    print("Node syntax check FAILED:")
    
    # Try to extract the error location
    lines = stderr.split('\n')
    for line in lines:
        if 'SyntaxError' in line or 'Unexpected' in line:
            print("ERROR:", line)
    
    # Check bracket balance in the file
    with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    opens = content.count('(') + content.count('[') + content.count('{')
    closes = content.count(')') + content.count(']') + content.count('}')
    print(f"\nBracket check: opens={opens}, closes={closes}, diff={opens-closes}")
    
    # Check for specific patterns
    print("\nChecking for missing semicolons in array/object literals...")
    
    # Count the number of webpackJsonp push calls
    push_count = content.count('.push(')
    print(f"Push calls: {push_count}")
    
    # Count curly braces in the component definition
    component_match = content.find('name:"ProjectIfcPage"')
    if component_match >= 0:
        # Find the corresponding closing brace
        brace_count = 0
        found_start = False
        for i, c in enumerate(content[component_match:]):
            if c == '{':
                brace_count += 1
                found_start = True
            elif c == '}':
                brace_count -= 1
                if found_start and brace_count == 0:
                    print(f"Component definition ends at position {component_match + i}")
                    break
