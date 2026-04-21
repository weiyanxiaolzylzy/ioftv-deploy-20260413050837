$f = 'd:\Roaming\ioftv-deploy-20260413050837\dist\beifen\static\js\project-ifc.3deb2a0f040de4b2cc6c.js'
$b = [System.IO.File]::ReadAllBytes($f)
Write-Host "File length in bytes: $($b.Length)"
Write-Host "First 4 bytes: $($b[0]) $($b[1]) $($b[2]) $($b[3])"
Write-Host "Last 10 bytes:"
for ($i = $b.Length - 10; $i -lt $b.Length; $i++) {
    Write-Host ("{0} " -f $b[$i])
}
