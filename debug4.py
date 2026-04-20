# Read the file fresh
with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find preset block start
preset_start = 'e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-preset-block"}'
bundle_marker = 'e("hr",{staticClass:"pifc-divider"}),e("div",{staticClass:"pifc-bundle"}'

idx_preset = content.find(preset_start)
idx_bundle = content.find(bundle_marker)

search_area = content[idx_preset:idx_bundle]

# Look for the specific ending pattern: ]),e("hr"
# The search area starts with e("hr"... so find the second e("hr"
# Let's search for the end of preset block - after the hint

# Find hint end position
hint_end = search_area.find('preset-hint"')
if hint_end != -1:
    # Show more content after hint
    print("Content after hint end (100 chars):")
    print(repr(search_area[hint_end+20:hint_end+120]))
    
# Find bundle_marker in the original content
bundle_in_search = search_area.find(bundle_marker)
if bundle_in_search != -1:
    print(f"\nBundle marker found in search area at: {bundle_in_search}")
    print("Content around bundle marker:")
    print(repr(search_area[bundle_in_search-50:bundle_in_search+50]))
else:
    print("\nBundle marker NOT found in search area")
    # Show the last 100 chars
    print("Last 100 chars of search area:")
    print(repr(search_area[-100:]))
