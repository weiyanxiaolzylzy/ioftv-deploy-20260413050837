import requests

# Download app.js
url = "http://localhost:8890/static/js/app.3deb2a0f040de4b2cc6c.js"
response = requests.get(url)
content = response.content.decode('utf-8', errors='replace')

print(f"app.js size: {len(content)}")

# Check if it contains ProjectIfcPage
if 'ProjectIfcPage' in content:
    print("ProjectIfcPage found in app.js!")
    
    # Find all occurrences
    positions = [i for i in range(len(content)) if content[i:i+15] == 'ProjectIfcPage']
    print(f"Positions: {positions}")
    
    # Check if it's just a reference or actual code
    for pos in positions[:5]:
        start = max(0, pos - 100)
        end = min(len(content), pos + 100)
        print(f"\nContext at {pos}:")
        print(content[start:end])
else:
    print("ProjectIfcPage NOT found in app.js")

# Check for key components
keywords = ['AdvancedIfcViewer', 'assignForm', 'teamOptions', 'teamLeader']
for kw in keywords:
    if kw in content:
        print(f"{kw}: found")
    else:
        print(f"{kw}: NOT found")
