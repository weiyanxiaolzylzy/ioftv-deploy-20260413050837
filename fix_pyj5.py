#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys

filepath = r'D:\Roaming\ioftv-deploy-20260413050837\dist\beifen\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Original length: {len(content)}')

def convert_template(inner):
    """Convert template literal inner content to string concatenation.
    Returns a string that is the equivalent ES5 concatenation expression."""
    parts = []
    i = 0
    while i < len(inner):
        c = inner[i]
        # Handle escapes
        if c == '\\' and i + 1 < len(inner):
            next_c = inner[i+1]
            esc_map = {'`': '`', '\\': '\\\\', '$': '$', 'n': '\\n', 't': '\\t', 'r': '\\r'}
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
                        break
                    brace_depth -= 1
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

    # Build concatenation
    # Each part becomes either a quoted string (text) or (expr)
    segments = []
    for pt, val in parts:
        if pt == 'text':
            segments.append('"' + val + '"')
        else:
            segments.append('(' + val + ')')

    # Merge consecutive same-type segments and add proper + operators
    result = ''
    for seg in segments:
        if not result:
            result = seg
        elif result.endswith(')') and seg.startswith('('):
            # Expression followed by expression -> + between them
            result += '+' + seg
        elif result.endswith(')') and seg.startswith('"'):
            # Expression followed by string -> + between them
            result += '+' + seg
        elif result.endswith('"') and seg.startswith('('):
            # String followed by expression -> + between them
            result += '+' + seg
        elif result.endswith('"') and seg.startswith('"'):
            # String followed by string -> merge
            result = result[:-1] + seg[1:]
        else:
            result += '+' + seg

    return result

# Find all backtick pairs
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

    print(f'  {idx+1}: {repr(orig[:80])}')
    print(f'    -> {repr(converted[:80])}')

remaining = result.count('`')
print(f'Done. Remaining backticks: {remaining}')
print(f'Output length: {len(result)}')

# Validate: check for unbalanced parens in the result
open_parens = result.count('(')
close_parens = result.count(')')
print(f'Parens: {open_parens} open, {close_parens} close (diff={open_parens-close_parens})')

outpath = r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'
with open(outpath, 'w', encoding='utf-8') as f:
    f.write(result)
print(f'Saved to {outpath}')
