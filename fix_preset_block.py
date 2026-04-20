# Read the file
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"File length: {len(content)}")

# Find the preset block start and end
preset_block_start = 'e("div",{staticClass:"pifc-preset-block"}'
preset_block_end = 'e("div",{staticClass:"pifc-bundle"}'

idx_start = content.find(preset_block_start)
idx_end = content.find(preset_block_end)

print(f"Preset block starts at: {idx_start}")
print(f"Bundle div starts at: {idx_end}")

# The hr before preset block
hr_before_preset = 'e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-preset-block"}'
idx_hr = content.find(hr_before_preset)
print(f"HR + preset block starts at: {idx_hr}")

if idx_hr != -1:
    # Find the position where bundle div starts
    bundle_start = content.find('e("div",{staticClass:"pifc-bundle"}', idx_hr)
    if bundle_start != -1:
        # Find the hr that comes before bundle div (within or after preset block)
        # The structure is: [...preset block...],e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-bundle"}
        # We need to find the closing of the preset block - it should end with ]),e("hr"
        
        # Find "]),e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass":" just before bundle
        search_area = content[idx_hr:bundle_start+200]
        hr_and_bundle = search_area.find(']),e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-bundle"}')
        
        if hr_and_bundle != -1:
            # The preset block ends at idx_hr + hr_and_bundle + 2 (the ]))
            preset_end_pos = idx_hr + hr_and_bundle + 2
            print(f"Preset block ends at: {preset_end_pos}")
            print(f"Content to remove length: {preset_end_pos - idx_hr}")
            
            # Show what we're removing
            removed = content[idx_hr:preset_end_pos]
            print(f"\n=== Content to remove ===")
            print(removed[:200] + "..." if len(removed) > 200 else removed)
            print(f"\n=== End of content to remove ===")
            
            # Replace: remove preset block, keep only hr before bundle div
            new_content = content[:idx_hr] + 'e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-bundle"}' + content[preset_end_pos:]
            
            # Save
            with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            print(f"\nNew file length: {len(new_content)}")
            print("File saved!")
        else:
            print("Could not find end of preset block")
    else:
        print("Could not find bundle div")
else:
    print("Could not find hr before preset block")
