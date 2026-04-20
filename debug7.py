# Read the file fresh
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find preset block start
preset_start = 'e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-preset-block"}'
idx_preset = content.find(preset_start)
print(f"Preset block starts at: {idx_preset}")

# Find the end of preset block
# It's right before e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass":" 
# Let's find this specific pattern
hr_divider = ']),e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass":"'
idx_preset_end = content.find(hr_divider)
print(f"Preset end (hr_divider) found at: {idx_preset_end}")

if idx_preset_end != -1:
    print("Content around preset end:")
    print(repr(content[idx_preset_end:idx_preset_end+150]))
