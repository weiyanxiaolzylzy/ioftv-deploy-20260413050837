$f = 'd:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'
$b = [System.IO.File]::ReadAllBytes($f)
Write-Host "File length in bytes: $($b.Length)"
Write-Host "Last 20 bytes (hex): $($b[$b.Length-20..$b.Length-1] | ForEach-Object { $_.ToString('X2') })"
Write-Host "Last char bytes: $($b[$b.Length-4..$b.Length-1] | ForEach-Object { $_.ToString('X2') })"
# Check for BOM
if ($b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) {
    Write-Host "UTF-8 BOM found at start"
}
if ($b[0] -eq 0xFF -and $b[1] -eq 0xFE) {
    Write-Host "UTF-16 LE BOM found at start"
}
