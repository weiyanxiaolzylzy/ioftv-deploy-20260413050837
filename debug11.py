# Read the file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# After methods replacement, find preset block
preset_start = 'e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-preset-block"}'
idx_preset_start = content.find(preset_start)
print(f"Preset block starts at: {idx_preset_start}")

# Find where the preset block actually ends
# Look for the pattern that comes after the preset block - the ]) before bundle div
bundle_pattern = 'e("div",{staticClass:"pifc-bundle"}'
idx_bundle = content.find(bundle_pattern)
print(f"Bundle div at: {idx_bundle}")

if idx_bundle != -1:
    # Find the closing ]) of preset block
    # Look backwards from bundle div for the last ]), that closes the preset block
    search_area = content[idx_preset_start:idx_bundle]
    last_close = search_area.rfind(']),')
    if last_close != -1:
        preset_end = idx_preset_start + last_close + 2
        print(f"Preset block ends at: {preset_end}")
        print(f"Content around preset end:")
        print(repr(content[preset_end-10:preset_end+80]))
