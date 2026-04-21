#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix template literals at BYTE level.
"""
import sys

filepath = r'D:\Roaming\ioftv-deploy-20260413050837\dist\beifen\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'

with open(filepath, 'rb') as f:
    raw_bytes = f.read()

print('Raw bytes: %d' % len(raw_bytes))

content = raw_bytes.decode('latin1')

def convert_template(inner):
    """Convert template literal inner content to string concatenation."""
    parts = []
    i = 0
    while i < len(inner):
        c = inner[i]
        if c == '\\' and i + 1 < len(inner):
            next_c = inner[i+1]
            esc_map = {'`': '`', '\\': '\\\\', '$': '$', 'n': '\\n', 't': '\\t', 'r': '\\r'}
            txt = esc_map.get(next_c, next_c)
            if parts and parts[-1][0] == 'text':
                parts[-1] = ('text', parts[-1][1] + txt)
            else:
                parts.append(('text', txt))
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

    segments = []
    for pt, val in parts:
        if pt == 'text':
            segments.append('"' + val + '"')
        else:
            segments.append('(' + val + ')')

    result = ''
    for seg in segments:
        if not result:
            result = seg
        elif result.endswith(')') and seg.startswith('('):
            result += '+' + seg
        elif result.endswith(')') and seg.startswith('"'):
            result += '+' + seg
        elif result.endswith('"') and seg.startswith('('):
            result += '+' + seg
        elif result.endswith('"') and seg.startswith('"'):
            result = result[:-1] + seg[1:]
        else:
            result += '+' + seg
    return result

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

print('Found %d backticks (%d pairs)' % (len(backtick_positions), len(backtick_positions)//2))

if len(backtick_positions) % 2 != 0:
    print('ERROR: Unmatched backticks!')
    sys.exit(1)

num_pairs = len(backtick_positions) // 2

result = bytearray(raw_bytes)
total_offset = 0
for idx in range(num_pairs):
    char_start = backtick_positions[idx*2]
    char_end = backtick_positions[idx*2+1]
    byte_start = char_start
    byte_end = char_end
    inner_chars = content[char_start+1:char_end]
    converted = convert_template(inner_chars)
    converted_bytes = converted.encode('latin1')
    orig_byte_len = char_end - char_start + 1

    result[byte_start + total_offset : byte_start + total_offset + orig_byte_len] = converted_bytes
    offset_delta = len(converted_bytes) - orig_byte_len
    total_offset += offset_delta

    # Safe print: only show ASCII part
    try:
        print('  %d: chars %d-%d (len=%d) -> %d bytes' % (idx+1, char_start, char_end, orig_byte_len, len(converted_bytes)))
        ascii_preview = ''.join(c if ord(c) < 128 else '?' for c in inner_chars)
        print('    orig: %s' % ascii_preview[:60])
        ascii_conv = ''.join(c if ord(c) < 128 else '?' for c in converted)
        print('    conv: %s' % ascii_conv[:60])
    except Exception as e:
        print('  %d: chars %d-%d (len=%d) -> %d bytes [print error: %s]' % (idx+1, char_start, char_end, orig_byte_len, len(converted_bytes), e))

result_str = result.decode('latin1')
remaining = result_str.count('`')
print('Done. Remaining backticks: %d' % remaining)
print('Output bytes: %d' % len(result))

outpath = r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'
with open(outpath, 'wb') as f:
    f.write(bytes(result))
print('Saved to %s' % outpath)
