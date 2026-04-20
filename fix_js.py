import re

with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'rb') as f:
    raw = f.read()

content = raw.decode('utf-8', errors='replace')

# Check for template literals (backticks)
backtick_count = content.count('`')
print(f"Backtick count: {backtick_count}")

# Check bracket balance
opens = content.count('(') + content.count('[') + content.count('{')
closes = content.count(')') + content.count(']') + content.count('}')
print(f"Open brackets: {opens}, Close brackets: {closes}, Diff: {opens-closes}")

# Find position of potential issue by looking for suspicious patterns
# Look for pattern: something:ChineseText}
pattern = r'[^"\']{1,50}[\u4e00-\u9fff]{2,20}[^"\']{1,30}:'
matches = list(re.finditer(pattern, content))
print(f"Potential issues found: {len(matches)}")
for m in matches[:3]:
    start = max(0, m.start() - 20)
    end = min(len(content), m.end() + 50)
    print("  At %d: ..." % m.start(), content[start:end].encode('ascii', 'replace').decode('ascii'), "...")

# Find the gateHint function
gatehint_match = re.search(r'gateHint\(\)\{return.*?\}', content)
if gatehint_match:
    print("gateHint function:")
    snippet = content[gatehint_match.start():gatehint_match.end()]
    print(snippet.encode('ascii', 'replace').decode('ascii'))
