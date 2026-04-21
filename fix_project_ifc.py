#!/usr/bin/env python3
"""
Check and fix project-ifc chunk file syntax errors
"""

import os

DIST_DIR = r"d:\Roaming\ioftv-deploy-20260413050837\dist"
JS_DIR = os.path.join(DIST_DIR, "static", "js")

def check_js_syntax(filepath):
    """Use Node.js to check JavaScript syntax"""
    import subprocess
    try:
        result = subprocess.run(
            ['node', '--check', filepath],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        return result.returncode == 0, result.stderr
    except FileNotFoundError:
        return None, "Node.js not found"
    except Exception as e:
        return None, str(e)

def analyze_file(filepath):
    """Analyze JS file"""
    with open(filepath, 'rb') as f:
        content = f.read()

    # Try to decode
    try:
        text = content.decode('utf-8')
    except:
        text = content.decode('latin-1', errors='replace')

    # Count brackets
    stats = {
        'open_braces': text.count('{'),
        'close_braces': text.count('}'),
        'open_parens': text.count('('),
        'close_parens': text.count(')'),
        'open_brackets': text.count('['),
        'close_brackets': text.count(']'),
        'size': len(content)
    }

    return stats, text

def fix_parentheses(text):
    """Fix extra closing parentheses"""
    count = text.count('(')
    close_count = text.count(')')
    diff = close_count - count

    if diff > 0:
        result = text
        for _ in range(diff):
            idx = result.rfind(')')
            if idx != -1:
                result = result[:idx] + result[idx+1:]
        return result, diff
    return text, 0

def main():
    files = []
    for f in os.listdir(JS_DIR):
        if 'project-ifc' in f and f.endswith('.js'):
            files.append(os.path.join(JS_DIR, f))

    print("=" * 60)
    print("Project-IFC Chunk File Analysis")
    print("=" * 60)

    for filepath in files:
        filename = os.path.basename(filepath)
        print("\nFile: " + filename)

        stats, text = analyze_file(filepath)
        print("  Size: " + str(stats['size']) + " bytes")
        print("  Braces { }: " + str(stats['open_braces']) + " / " + str(stats['close_braces']) + (" OK" if stats['open_braces'] == stats['close_braces'] else " ERROR"))
        print("  Parens ( ): " + str(stats['open_parens']) + " / " + str(stats['close_parens']) + (" OK" if stats['open_parens'] == stats['close_parens'] else " ERROR"))
        print("  Brackets [ ]: " + str(stats['open_brackets']) + " / " + str(stats['close_brackets']) + (" OK" if stats['open_brackets'] == stats['close_brackets'] else " ERROR"))

        # Node.js syntax check
        is_valid, error = check_js_syntax(filepath)
        if is_valid is True:
            print("  Node.js syntax check: PASS")
        elif is_valid is False:
            print("  Node.js syntax check: FAIL")
            if error:
                print("    Error: " + error[:100])
        else:
            print("  Node.js syntax check: " + error)

        # Check for issues
        if stats['open_parens'] != stats['close_parens']:
            print("\n  ISSUE FOUND: Parentheses imbalanced!")

            # Auto fix
            fixed_text, diff = fix_parentheses(text)
            if diff > 0:
                backup_path = filepath + '.backup'
                with open(backup_path, 'w', encoding='utf-8') as f:
                    f.write(text)
                print("  Backup saved to: " + backup_path)

                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(fixed_text)
                print("  FIXED: Removed " + str(diff) + " extra closing parentheses")

                # Re-check
                is_valid, error = check_js_syntax(filepath)
                if is_valid:
                    print("  FIX VERIFIED: Syntax check passed after fix!")
                else:
                    print("  STILL HAS ISSUES: " + (error[:100] if error else "Unknown error"))

    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
