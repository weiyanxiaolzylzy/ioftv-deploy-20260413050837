# Read the file fresh
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The preset block structure is:
# e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-preset-block"},[...]...],"hr",...e("div",{staticClass":" 
# After the preset block content ends, there's ]), then e("hr", then e("div",{staticClass":" 

# From the debug output, we know:
# ']),e("hr" found at: 9833
# e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-preset-block"} found at: 9836

# So the preset block starts at 9836 and the content ends at 9833+2=9835
# The closing is: ]),e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass":" 

# Let me find the actual end by searching for the pattern after preset block starts
preset_start = 9836
# Find the closing that comes after "preset-hint"
hint_end = content.find('preset-hint"', preset_start)
if hint_end != -1:
    print(f"Hint end at: {hint_end}")
    print("Content after hint:")
    print(repr(content[hint_end:hint_end+80]))
    
    # Find the next ]), after hint end
    closing = content.find(']),', hint_end)
    if closing != -1:
        print(f"\nClosing ]), at: {closing}")
        print("Content around closing:")
        print(repr(content[closing:closing+100]))
