# Read the file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# After methods replacement, find preset block
preset_start = 'e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-preset-block"}'
idx_preset_start = content.find(preset_start)
print(f"Preset block starts at: {idx_preset_start}")

if idx_preset_start != -1:
    # Show content around preset block
    print("Content around preset block start:")
    print(repr(content[idx_preset_start-20:idx_preset_start+100]))
    
    # Find where the preset block actually ends
    # Look for the pattern that comes after the preset block
    bundle_with_m0 = 'e("div",{staticClass:"pifc-bundle"},[t._m(0)'
    idx_bundle = content.find(bundle_with_m0)
    print(f"\nBundle with t._m(0) at: {idx_bundle}")
    
    if idx_bundle != -1:
        print("Content around bundle:")
        print(repr(content[idx_bundle-100:idx_bundle+50]))
