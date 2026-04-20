# Read the file fresh
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find preset block start
preset_start = 'e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-preset-block"}'
bundle_marker = 'e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-bundle"}'

idx_preset = content.find(preset_start)
idx_bundle = content.find(bundle_marker)

print(f"Preset start: {idx_preset}")
print(f"Bundle marker: {idx_bundle}")

if idx_preset != -1 and idx_bundle != -1:
    # Find the closing ]) of preset block before the next hr
    search_area = content[idx_preset:idx_bundle]
    print(f"\nSearch area length: {len(search_area)}")
    
    # Look for ]),e("hr" pattern
    preset_close = search_area.find(']),e("hr"')
    print(f"Preset close pattern found at: {preset_close}")
    
    # Also try just ]) before e("hr
    if preset_close == -1:
        preset_close = search_area.find('])')
        print(f"Found ]) at: {preset_close}")
        if preset_close != -1:
            print("Content around ]):")
            print(repr(search_area[preset_close-5:preset_close+20]))
