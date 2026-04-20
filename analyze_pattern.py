import requests

# Download from server
url = "http://localhost:8890/static/js/project-ifc.3deb2a0f040de4b2cc6c.js"
response = requests.get(url)
content = response.content

print("Content length:", len(content))

# Let's analyze the byte patterns more carefully
# Looking for sequences that represent wrongly encoded Chinese

# The sequence \xc3\xa6\xc2... suggests the original UTF-8 bytes were
# treated as Windows-1252 or Latin-1 and then converted to UTF-8

# Let's find all non-ASCII bytes and see if they form patterns
non_ascii_positions = []
for i in range(len(content)):
    if content[i] > 127:
        non_ascii_positions.append(i)

print(f"Non-ASCII positions: {len(non_ascii_positions)}")
if non_ascii_positions:
    print(f"First few: {non_ascii_positions[:20]}")
    print(f"Context at first non-ASCII:")
    start = max(0, non_ascii_positions[0] - 30)
    end = min(len(content), non_ascii_positions[0] + 30)
    print(content[start:end])

# The bytes \xc3\xa6 in UTF-8 is U+00E6 (Latin small letter ae)
# But \xc3\xa6\xc2... suggests a mis-encoded sequence

# Let's try to detect and fix the most common pattern:
# If we see \xc3 followed by a byte that should be part of a UTF-8 sequence

# For example: Original UTF-8 E6 9C AA (未) was read as Windows-1252
# Windows-1252 0xE6 -> UTF-8 C3 A6 (which is a different character)

# Let's implement a fix for this specific pattern
def fix_double_encoding(content):
    # Convert bytes to a list for easier manipulation
    result = bytearray()
    i = 0
    while i < len(content):
        b = content[i]
        
        # Check for the specific mis-encoded pattern
        if b == 0xC3 and i + 1 < len(content):
            next_b = content[i + 1]
            
            # Check if this could be a mis-encoded UTF-8 byte
            # In Windows-1252, bytes 0x80-0x9F are special characters
            # When these are converted to UTF-8, they become C2 XX
            
            # If we see C3 XX where XX >= 0x80, it might be a mis-encoding
            if next_b >= 0x80:
                # Try to decode this as a Windows-1252 character converted to UTF-8
                # First, undo the UTF-8 encoding
                try:
                    # Decode as UTF-8 to get the character
                    char = bytes([b, next_b]).decode('utf-8')
                    # Now encode as Windows-1252 to see what byte it was
                    try:
                        win1252_byte = char.encode('windows-1252')[0]
                        # Re-encode the original Windows-1252 byte as UTF-8
                        correct_utf8 = bytes([win1252_byte]).decode('windows-1252').encode('utf-8')
                        result.extend(correct_utf8)
                        i += 2
                        continue
                    except:
                        pass
                except:
                    pass
        
        result.append(b)
        i += 1
    
    return bytes(result)

# Try a simpler approach: just try to decode as UTF-8 with surrogateescape
# then encode back
try:
    decoded = content.decode('utf-8', errors='surrogateescape')
    print("Decoded with surrogateescape")
    
    # Check if there are any surrogates
    has_surrogates = any(0xD800 <= ord(c) <= 0xDFFF for c in decoded)
    print(f"Has surrogates: {has_surrogates}")
    
    # If there are surrogates, we can try to fix them
    if has_surrogates:
        # Try to interpret surrogates as bytes and re-decode
        # First, find the surrogates
        fixed = []
        i = 0
        while i < len(decoded):
            c = ord(decoded[i])
            if 0xD800 <= c <= 0xDBFF:  # High surrogate
                if i + 1 < len(decoded):
                    low = ord(decoded[i + 1])
                    if 0xDC00 <= low <= 0xDFFF:  # Low surrogate
                        # Combine to form a byte value
                        byte_val = (c - 0xD800) * 0x400 + (low - 0xDC00)
                        fixed.append(byte_val)
                        i += 2
                        continue
            fixed.append(c)
            i += 1
        
        # Try to decode the resulting bytes
        try:
            fixed_bytes = bytes(fixed)
            final = fixed_bytes.decode('utf-8')
            print(f"Fixed! Length: {len(final)}")
            
            # Save
            disk_path = r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'
            with open(disk_path, 'w', encoding='utf-8') as f:
                f.write(final)
            print("Saved!")
        except Exception as e:
            print(f"Failed to fix: {e}")
except Exception as e:
    print(f"surrogateescape failed: {e}")
