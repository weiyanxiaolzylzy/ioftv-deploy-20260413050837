$f = 'd:\Roaming\ioftv-deploy-20260413050837\dist\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'
$b = [System.IO.File]::ReadAllBytes($f)
Write-Host "File length in bytes: $($b.Length)"
Write-Host "First 4 bytes: $($b[0]) $($b[1]) $($b[2]) $($b[3])"
# Check for BOM
if ($b[0] -eq 0xFF -and $b[1] -eq 0xFE) {
    Write-Host "UTF-16 LE BOM detected"
} elseif ($b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) {
    Write-Host "UTF-8 BOM detected"
} else {
    Write-Host "No BOM - likely single-byte encoding"
}
# Last 10 bytes
Write-Host "Last 10 bytes:"
foreach ($i in ($b.Length - 10)..($b.Length - 1)) {
    Write-Host "$i : $($b[$i])"
}
