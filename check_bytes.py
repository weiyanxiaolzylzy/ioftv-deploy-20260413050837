with open(r'D:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js', 'rb') as f:
    raw = f.read()

# Find backtick positions
backtick_positions = [i for i, b in enumerate(raw) if b == 0x60]
print("Backtick positions:", backtick_positions)

# Check bytes around position 530
print("\nBytes around position 530:")
print(raw[520:600])
