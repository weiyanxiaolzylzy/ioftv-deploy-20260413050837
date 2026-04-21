#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re, sys

filepath = r'D:\Roaming\ioftv-deploy-20260413050837\dist\beifen\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Original length: {len(content)}')

def convert_template(inner):
    """Convert template literal inner content to string concatenation."""
    parts = []
    i = 0
    while i < len(inner):
        c = inner[i]
        # Handle escapes
        if c == '\\' and i + 1 < len(inner):
            next_c = inner[i+1]
            esc_map = {'`': '`', '\\': '\\\\', '$': '$', 'n': '\\n', 't': '\\t'}
            if next_c in esc_map:
                txt = esc_map[next_c]
            else:
                txt = next_c
            if parts and parts[-1][0] == 'text':
                parts[-1] = ('text', parts[-1][1] + txt)
            else:
                parts.append(('text', txt))
            i += 2
            continue
        # Expression ${...}
        if c == '$' and i + 1 < len(inner) and inner[i+1] == '{':
            expr_start = i + 2
            brace_depth = 0
            j = expr_start
            while j < len(inner):
                if inner[j] == '{':
                    brace_depth += 1
                elif inner[j] == '}':
                    if brace_depth == 0:
                        j -= 1  # step back to before }
                        break
                    brace_depth -= 1
                elif inner[j] == '\\' and j + 1 < len(inner):
                    j += 2
                    continue
                j += 1
            expr = inner[expr_start:j+1]
            parts.append(('expr', expr))
            i = j + 2  # skip past the }
            continue
        # Text
        text_start = i
        while i < len(inner):
            if inner[i] == '\\' and i + 1 < len(inner):
                break
            if inner[i] == '$' and i + 1 < len(inner) and inner[i+1] == '{':
                break
            i += 1
        text = inner[text_start:i]
        if text:
            parts.append(('text', text))
        if i < len(inner) and inner[i] == '\\':
            continue

    result = ''
    for pt, val in parts:
        if pt == 'text':
            result += '"' + val + '"'
        else:
            result += '+(' + val + ')+'
    # Clean leading/trailing +
    if result.startswith('"+'):
        result = '"' + result[2:]
    if result.endswith('+'):
        result = result[:-1] + '"'
    return result

# Strategy: find all backtick pairs, parse inner content, replace
# Use a character-by-character approach to find backtick pairs
backtick_positions = []
i = 0
while i < len(content):
    if content[i] == '\\' and i + 1 < len(content):
        i += 2
        continue
    if content[i] == '`':
        backtick_positions.append(i)
        i += 1
        continue
    i += 1

print(f'Found {len(backtick_positions)} backticks ({len(backtick_positions)//2} pairs)')

if len(backtick_positions) % 2 != 0:
    print('ERROR: Unmatched backticks!')
    sys.exit(1)

num_pairs = len(backtick_positions) // 2

result = content
total_offset = 0
for idx in range(num_pairs):
    s = backtick_positions[idx*2] + total_offset
    e = backtick_positions[idx*2+1] + total_offset

    inner = content[backtick_positions[idx*2]+1 : backtick_positions[idx*2+1]]
    converted = convert_template(inner)

    orig = content[backtick_positions[idx*2]:backtick_positions[idx*2+1]+1]
    result = result[:s] + converted + result[e+1:]

    offset_delta = len(converted) - (backtick_positions[idx*2+1] - backtick_positions[idx*2] + 1)
    total_offset += offset_delta

    print(f'  {idx+1}: {repr(orig[:60])}')
    print(f'    -> {repr(converted[:60])}')

remaining = result.count('`')
print(f'Done. Remaining backticks: {remaining}')
print(f'Output length: {len(result)}')

outpath = r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'
with open(outpath, 'w', encoding='utf-8') as f:
    f.write(result)
print(f'Saved to {outpath}')
