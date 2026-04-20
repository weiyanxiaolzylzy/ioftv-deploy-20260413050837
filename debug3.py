# Read the file fresh
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find preset block start
preset_start = 'e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-preset-block"}'
bundle_marker = 'e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-bundle"}'

idx_preset = content.find(preset_start)
idx_bundle = content.find(bundle_marker)

search_area = content[idx_preset:idx_bundle]

# Look for the specific ending pattern
# After the preset-hint, there's ]), then e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass":" 
preset_hint_end = search_area.find('preset-hint"')
if preset_hint_end != -1:
    print("Content around preset-hint end:")
    print(repr(search_area[preset_hint_end:preset_hint_end+100]))
    
# Find e("hr" in the search area
hr_idx = search_area.find('e("hr"')
if hr_idx != -1:
    print(f"\ne('hr' found at position {hr_idx} in search area")
    print("Content around e('hr'):")
    print(repr(search_area[hr_idx-20:hr_idx+50]))
