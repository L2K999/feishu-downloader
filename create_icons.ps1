$tempDir = 'C:\temp_icons'
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
Add-Type -AssemblyName System.Drawing

$icons = @(
    @{Name='tab_download.png'; R=74; G=144; B=217},
    @{Name='tab_download_active.png'; R=53; G=122; B=189},
    @{Name='tab_history.png'; R=153; G=153; B=153},
    @{Name='tab_history_active.png'; R=74; G=144; B=217}
)

foreach ($icon in $icons) {
    $bmp = New-Object System.Drawing.Bitmap(81, 81)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb($icon.R, $icon.G, $icon.B))
    $g.Dispose()
    $tempPath = Join-Path $tempDir $icon.Name
    $bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created $($icon.Name) at $tempPath"
}

Write-Host 'Done creating icons'