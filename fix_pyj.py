#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys

filepath = r'D:\Roaming\ioftv-deploy-20260413050837\dist\beifen\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Original length: {len(content)}')

def find_template_positions(content):
    """Find start and end positions of template literals, handling escaped backticks."""
    positions = []
    i = 0
    while i < len(content):
        if content[i] == '\\' and i + 1 < len(content):
            i += 2
            continue
        if content[i] == '`':
            positions.append(i)
            i += 1
            # Find matching end backtick
            while i < len(content):
                if content[i] == '\\' and i + 1 < len(content):
                    i += 2
                    continue
                if content[i] == '`':
                    positions.append(i)
                    i += 1
                    break
                if content[i] == '$' and i + 1 < len(content) and content[i+1] == '{':
                    # Skip over expression, handling nested braces
                    i += 2
                    depth = 1
                    while i < len(content) and depth > 0:
                        if content[i] == '{':
                            depth += 1
                        elif content[i] == '}':
                            depth -= 1
                        elif content[i] == '\\' and i + 1 < len(content):
                            i += 2
                            continue
                        elif content[i] == '`':
                            # Nested backtick in expression - need to handle
                            # This is complex; for now, just note it
                            pass
                        i += 1
                    continue
                i += 1
    return positions

def get_template_parts(content, start, end):
    """Extract parts of a template literal, handling escaped chars."""
    inner = content[start+1:end]
    parts = []
    i = 0
    
    while i < len(inner):
        c = inner[i]
        
        # Handle escape sequences
        if c == '\\' and i + 1 < len(inner):
            next_c = inner[i+1]
            if next_c == '`':
                # Escaped backtick in template literal text
                if parts and parts[-1][0] == 'text':
                    parts[-1] = ('text', parts[-1][1] + '`')
                else:
                    parts.append(('text', '`'))
                i += 2
                continue
            elif next_c == '$':
                if parts and parts[-1][0] == 'text':
                    parts[-1] = ('text', parts[-1][1] + '$')
                else:
                    parts.append(('text', '$'))
                i += 2
                continue
            elif next_c == '\\':
                if parts and parts[-1][0] == 'text':
                    parts[-1] = ('text', parts[-1][1] + '\\')
                else:
                    parts.append(('text', '\\'))
                i += 2
                continue
            elif next_c == 'n':
                if parts and parts[-1][0] == 'text':
                    parts[-1] = ('text', parts[-1][1] + '\\n')
                else:
                    parts.append(('text', '\\n'))
                i += 2
                continue
            elif next_c == 't':
                if parts and parts[-1][0] == 'text':
                    parts[-1] = ('text', parts[-1][1] + '\\t')
                else:
                    parts.append(('text', '\\t'))
                i += 2
                continue
            else:
                # Other escape
                if parts and parts[-1][0] == 'text':
                    parts[-1] = ('text', parts[-1][1] + c + next_c)
                else:
                    parts.append(('text', c + next_c))
                i += 2
                continue
        
        if c == '$' and i + 1 < len(inner) and inner[i+1] == '{':
            # Expression
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
                    j += 2  # skip escape in expression
                    continue
                j += 1
            
            expr = inner[expr_start:j]
            parts.append(('expr', expr))
            i = j + 1
            continue
        
        # Regular text
        text_start = i
        while i < len(inner) and not (inner[i] == '$' and i + 1 < len(inner) and inner[i+1] == '{'):
            if inner[i] == '\\' and i + 1 < len(inner):
                break
            i += 1
        
        text = inner[text_start:i]
        if text:
            parts.append(('text', text))
        
        if i < len(inner) and inner[i] == '\\':
            continue
    
    return parts

positions = find_template_positions(content)
print(f'Found {len(positions)} backtick positions ({len(positions)//2} template literals)')

if len(positions) % 2 != 0:
    print('ERROR: Unmatched backticks!')
    sys.exit(1)

num_templates = len(positions) // 2

# Convert each template literal
result = content
replaced_count = 0

for idx in range(num_templates):
    start = positions[idx * 2]
    end = positions[idx * 2 + 1]
    
    parts = get_template_parts(content, start, end)
    
    # Convert to string concatenation
    converted = ''
    for part_type, part_val in parts:
        if part_type == 'text':
            converted += '"' + part_val + '"'
        else:  # expr
            converted += '+(' + part_val + ')+'
    
    # Clean up the concatenation
    # Remove leading + if the first part is text
    if converted.startswith('"+'):
        converted = '"' + converted[2:]
    # Remove trailing + if the last part is text
    if converted.endswith('+'):
        converted = converted[:-1] + '"'
    
    # Find the template literal in result and replace
    template_str = content[start:end+1]
    if template_str in result:
        # Check if we already replaced this (in case of identical templates)
        count_before = result.count(template_str)
        result = result.replace(template_str, converted, 1)
        print(f'Replaced template {idx+1}: {repr(template_str[:50])}...')
        replaced_count += 1
    else:
        print(f'WARNING: Could not find template {idx+1} in result: {repr(template_str[:50])}')

# Check for remaining backticks
remaining_bt = result.count('`')
print(f'Replaced {replaced_count} template literals. Remaining backticks: {remaining_bt}')

if remaining_bt > 0:
    for i, c in enumerate(result):
        if c == '`':
            print(f'  Backtick at {i}: {repr(result[max(0,i-20):i+20])}')

# Save
outpath = r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'
with open(outpath, 'w', encoding='utf-8') as f:
    f.write(result)

print(f'Saved to {outpath}')
print(f'Output length: {len(result)}')
