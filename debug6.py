# Read the file fresh
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The actual pattern to find is between preset block end and bundle div start
# After the preset block closes with ]), there's e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass":" 

# Find preset block start
preset_start = 'e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-preset-block"}'
idx_preset = content.find(preset_start)
print(f"Preset block starts at: {idx_preset}")

# Find the end of preset block - it's the last ]), before the next e("hr
# Let me search backwards from bundle div
bundle_div = 'e("div",{staticClass:"pifc-bundle"},[t._m(0)'
idx_bundle_div = content.find(bundle_div)
print(f"Bundle div with t._m(0) at: {idx_bundle_div}")

# The content between preset_start and bundle_div should contain the closing
search_area = content[idx_preset:idx_bundle_div]
print(f"\nSearch area length: {len(search_area)}")
print(f"Last 150 chars of search area:")
print(repr(search_area[-150:]))

# The preset block ends with "]),e("hr"
# Let me search for that
preset_end_pattern = '])]),e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass":" 
idx_preset_end = content.find(preset_end_pattern)
print(f"\nPreset end pattern found at: {idx_preset_end}")

if idx_preset_end != -1:
    print("Content around preset end:")
    print(repr(content[idx_preset_end:idx_preset_end+100]))
