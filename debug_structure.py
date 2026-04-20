# Read the file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find preset block start
preset_start = content.find('e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-preset-block"}')
if preset_start != -1:
    print(f"Preset block starts at: {preset_start}")
    # Show content from preset_start to preset_start+200
    print("Content from preset_start:")
    print(repr(content[preset_start:preset_start+300]))
    print("\n\n")
    
# Find bundle div
bundle_start = content.find('e("div",{staticClass:"pifc-bundle"}')
if bundle_start != -1:
    print(f"Bundle div starts at: {bundle_start}")
    print("Content around bundle div:")
    print(repr(content[bundle_start-100:bundle_start+100]))
