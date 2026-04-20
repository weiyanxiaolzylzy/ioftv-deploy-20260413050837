# Check bracket balance
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

open_brackets = 0
close_brackets = 0
open_parens = 0
close_parens = 0
open_curly = 0
close_curly = 0

issues = []

for i, c in enumerate(content):
    if c == '(':
        open_parens += 1
    elif c == ')':
        close_parens += 1
        if close_parens > open_parens:
            issues.append(f"Extra ) at position {i}: context: {content[max(0,i-20):i+20]}")
    elif c == '[':
        open_brackets += 1
    elif c == ']':
        close_brackets += 1
        if close_brackets > open_brackets:
            issues.append(f"Extra ] at position {i}: context: {content[max(0,i-20):i+20]}")
    elif c == '{':
        open_curly += 1
    elif c == '}':
        close_curly += 1
        if close_curly > open_curly:
            issues.append(f"Extra }} at position {i}: context: {content[max(0,i-20):i+20]}")

print(f"Parentheses: ( = {open_parens}, ) = {close_parens}, diff = {open_parens - close_parens}")
print(f"Brackets: [ = {open_brackets}, ] = {close_brackets}, diff = {open_brackets - close_brackets}")
print(f"Curly: {{ = {open_curly}, }} = {close_curly}, diff = {open_curly - close_curly}")

if issues:
    print(f"\nFound {len(issues)} issues:")
    for issue in issues[:10]:
        print(issue)
else:
    print("\nNo bracket issues found!")
