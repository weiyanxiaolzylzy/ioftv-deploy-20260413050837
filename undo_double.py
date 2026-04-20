import requests
import re

# Download from server
url = "http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
response = requests.get(url)
content = response.content

print("Original content length:", len(content))

# The file has been doubly encoded:
# Original UTF-8 bytes -> interpreted as Latin-1/Windows-1252 -> re-encoded as UTF-8
# So each original byte X becomes UTF-8 sequence for chr(X) in Latin-1

# For ASCII bytes (0x00-0x7F), they stay the same
# For bytes 0x80-0xFF, they become 2-byte UTF-8 sequences

def undo_double_encoding(content):
    """Undo the double encoding: UTF-8 -> Latin-1 -> UTF-8"""
    result = bytearray()
    i = 0
    while i < len(content):
        b = content[i]
        
        if b < 0x80:
            # ASCII character - no change needed
            result.append(b)
            i += 1
        elif b >= 0x80:
            # Check if this is a UTF-8 encoded Latin-1 character
            # Latin-1 characters U+0080-U+00FF are encoded as 2-byte UTF-8: C2 XX or C3 XX
            if i + 1 < len(content) and content[i + 1] >= 0x80:
                next_b = content[i + 1]
                
                # For Latin-1 range 0x80-0xBF (C2 XX)
                # The original byte was content[i+1] - 0x80 + 0x80 = content[i+1]
                # Wait, that's not right...
                
                # Let me think again:
                # Original byte X (0x80-0xFF)
                # Interpreted as Latin-1 character chr(X) 
                # Encoded as UTF-8 becomes: C2/C3 + (X xor 0x40)
                
                # Actually:
                # - If X is 0x80-0xBF, it becomes C2 + (X - 0x80 + 0x80) = C2 + X, no...
                
                # Let me use a lookup approach
                # Characters U+0080-U+00FF encode as: (0xC0 + high_bit) + (0x80 + low_bits)
                # where X = (high_bit << 6) | low_bits
                
                # For X in 0x80-0xBF:
                #   encoded as: 0xC2, (X & 0x3F) + 0x80 = 0xC2, X - 0x40
                # For X in 0xC0-0xFF:
                #   encoded as: 0xC3, (X & 0x3F) + 0x80 = 0xC3, X - 0x40
                
                if b == 0xC2:
                    # Original byte was 0x80-0xBF
                    original = (next_b - 0x80) + 0x80  # = next_b
                    # Actually: if encoded byte X is 0xC2 YY, then original X = YY
                    # Wait, that's not right either
                    
                    # Let me recalculate:
                    # Latin-1 character at position X (0x80-0xBF) is U+0080+X-0x80 = U+X-0x80
                    # This encodes as: 11000010 10XXXXXX where XXXXXX = X - 0x80
                    # So if we have C2 YY, original byte was (YY - 0x80) + 0x80 = YY
                    # But that doesn't work for the math...
                    
                    # 11000010 10XXXXXX
                    # C2 = 11000010
                    # 10XXXXXX = YY
                    # XXXXXX = YY - 0x80
                    # Original X = 0x80 + (YY - 0x80) = YY
                    
                    # So if we see C2 YY, original byte was YY
                    original = next_b
                elif b == 0xC3:
                    # Original byte was 0xC0-0xFF
                    # U+C0+YY-0x80 = U+40+YY
                    # 11100011 10XXXXXX
                    # Original X = 0xC0 + (YY - 0x80)
                    # = 0xC0 + YY - 0x80 = 0x40 + YY
                    original = 0x40 + next_b
                else:
                    # Unknown pattern, keep as-is
                    result.append(b)
                    i += 1
                    continue
                
                result.append(original)
                i += 2
            else:
                # Lone high bit byte, keep as-is
                result.append(b)
                i += 1
        else:
            result.append(b)
            i += 1
    
    return bytes(result)

# Apply the fix
fixed = undo_double_encoding(content)
print("Fixed content length:", len(fixed))

# Try to decode
try:
    decoded = fixed.decode('utf-8')
    print("UTF-8 decode successful!")
    
    # Check for Chinese characters
    chinese_count = sum(1 for c in decoded if '\u4e00' <= c <= '\u9fff')
    print(f"Chinese characters: {chinese_count}")
    
    # Save
    disk_path = r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'
    with open(disk_path, 'wb') as f:
        f.write(fixed)
    print("File saved!")
    
except UnicodeDecodeError as e:
    print(f"UTF-8 decode failed: {e}")
