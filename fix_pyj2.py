#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re, sys

filepath = r'D:\Roaming\ioftv-deploy-20260413050837\dist\beifen\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Original length: {len(content)}')

# Regex to find template literals: `...`
# The key challenge: ${...} can contain nested braces, and ` can be escaped as \`
# We'll match greedily but correctly by handling escapes

def convert_template(m):
    inner = m.group(1)  # content between backticks (not including the backticks themselves)
    parts = []
    i = 0
    while i < len(inner):
        c = inner[i]
        # Handle escapes first
        if c == '\\' and i + 1 < len(inner):
            next_c = inner[i+1]
            if next_c == '`':
                if parts and parts[-1][0] == 'text':
                    parts[-1] = ('text', parts[-1][1] + '`')
                else:
                    parts.append(('text', '`'))
            elif next_c == '\\':
                if parts and parts[-1][0] == 'text':
                    parts[-1] = ('text', parts[-1][1] + '\\\\')
                else:
                    parts.append(('text', '\\\\'))
            elif next_c == '$':
                if parts and parts[-1][0] == 'text':
                    parts[-1] = ('text', parts[-1][1] + '$')
                else:
                    parts.append(('text', '$'))
            elif next_c == 'n':
                if parts and parts[-1][0] == 'text':
                    parts[-1] = ('text', parts[-1][1] + '\\n')
                else:
                    parts.append(('text', '\\n'))
            elif next_c == 't':
                if parts and parts[-1][0] == 'text':
                    parts[-1] = ('text', parts[-1][1] + '\\t')
                else:
                    parts.append(('text', '\\t'))
            else:
                if parts and parts[-1][0] == 'text':
                    parts[-1] = ('text', parts[-1][1] + c + next_c)
                else:
                    parts.append(('text', c + next_c))
            i += 2
            continue
        if c == '$' and i + 1 < len(inner) and inner[i+1] == '{':
            expr_start = i + 2
            brace_depth = 0
            j = expr_start
            while j < len(inner):
                if inner[j] == '{':
                    brace_depth += 1
                elif inner[j] == '}':
                    brace_depth -= 1
                    if brace_depth == 0:
                        break
                elif inner[j] == '\\' and j + 1 < len(inner):
                    j += 2
                    continue
                j += 1
            expr = inner[expr_start:j]
            parts.append(('expr', expr))
            i = j + 1
            continue
        # Text
        text_start = i
        while i < len(inner) and not (inner[i] == '$' and i + 1 < len(inner) and inner[i+1] == '{') and not (inner[i] == '\\' and i + 1 < len(inner)):
            i += 1
        text = inner[text_start:i]
        if text:
            parts.append(('text', text))
        if i < len(inner) and inner[i] == '\\':
            continue
    # Build concatenation
    result = ''
    for pt, val in parts:
        if pt == 'text':
            result += '"' + val + '"'
        else:
            result += '+(' + val + ')+'
    # Clean up
    if result.startswith('"+'):
        result = '"' + result[2:]
    if result.endswith('+'):
        result = result[:-1] + '"'
    return result

# Match: backtick, content (handling \`, \$, \}, \n, etc and ${...}), backtick
# Pattern explanation:
#   `          - opening backtick
#   (          - group for inner content
#     (?:      - non-capturing group for content alternatives
#       \\[\`\$\}\\] - escaped char
#       |      - or
#       \$\{[^}]*(?:\{[^}]*\}[^}]*)*\}  - ${...} expression (handles one level of nesting)
#       |      - or
#       [^\`\$] - any other char except backtick or $
#     )*       - repeat
#   )          - end group
#   `          - closing backtick

pattern = r'`((?:\\[\`\$\}\\]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*|[^\`\$])*)`'
regex = re.compile(pattern, re.DOTALL)

matches = list(regex.finditer(content))
print(f'Found {len(matches)} template literals via regex')

if not matches:
    print('ERROR: No template literals found!')
    sys.exit(1)

result = content
offset = 0
for idx, m in enumerate(matches):
    inner = m.group(1)
    converted = convert_template(m)
    start = m.start() + offset
    end = m.end() + offset
    orig = content[m.start():m.end()]
    result = result[:start] + converted + result[end:]
    offset += len(converted) - (m.end() - m.start())
    print(f'  {idx+1}: replaced {repr(orig[:50])} with {repr(converted[:50])}')

remaining = result.count('`')
print(f'Done. Remaining backticks: {remaining}')
print(f'Output length: {len(result)}')

outpath = r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'
with open(outpath, 'w', encoding='utf-8') as f:
    f.write(result)
print(f'Saved to {outpath}')
