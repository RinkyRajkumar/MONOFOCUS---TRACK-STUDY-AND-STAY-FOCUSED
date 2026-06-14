$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class IconHandle {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool DestroyIcon(IntPtr handle);
}
"@

function New-RoundedRectanglePath {
    param(
        [System.Drawing.RectangleF]$Rectangle,
        [float]$Radius
    )

    $diameter = $Radius * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($Rectangle.X, $Rectangle.Y, $diameter, $diameter, 180, 90)
    $path.AddArc(
        $Rectangle.Right - $diameter,
        $Rectangle.Y,
        $diameter,
        $diameter,
        270,
        90
    )
    $path.AddArc(
        $Rectangle.Right - $diameter,
        $Rectangle.Bottom - $diameter,
        $diameter,
        $diameter,
        0,
        90
    )
    $path.AddArc(
        $Rectangle.X,
        $Rectangle.Bottom - $diameter,
        $diameter,
        $diameter,
        90,
        90
    )
    $path.CloseFigure()
    return $path
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$buildDirectory = Join-Path $projectRoot "build"
New-Item -ItemType Directory -Path $buildDirectory -Force | Out-Null

$pngPath = Join-Path $buildDirectory "icon.png"
$icoPath = Join-Path $buildDirectory "icon.ico"
$bitmap = New-Object System.Drawing.Bitmap(
    256,
    256,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::Transparent)

$backgroundPath = New-RoundedRectanglePath `
    -Rectangle (New-Object System.Drawing.RectangleF(10, 10, 236, 236)) `
    -Radius 48
$backgroundBrush = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(255, 16, 16, 18)
)
$borderPen = New-Object System.Drawing.Pen(
    [System.Drawing.Color]::FromArgb(255, 244, 244, 242),
    8
)
$borderPen.Alignment = [System.Drawing.Drawing2D.PenAlignment]::Inset
$ringPen = New-Object System.Drawing.Pen(
    [System.Drawing.Color]::FromArgb(255, 244, 244, 242),
    9
)
$ringPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$ringPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$dotBrush = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(255, 244, 244, 242)
)

$graphics.FillPath($backgroundBrush, $backgroundPath)
$graphics.DrawPath($borderPen, $backgroundPath)
$graphics.DrawArc($ringPen, 62, 62, 132, 132, -84, 322)
$graphics.FillEllipse($dotBrush, 118, 118, 20, 20)
$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$iconHandle = $bitmap.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$stream = [System.IO.File]::Create($icoPath)

try {
    $icon.Save($stream)
}
finally {
    $stream.Dispose()
    $icon.Dispose()
    [IconHandle]::DestroyIcon($iconHandle) | Out-Null
    $dotBrush.Dispose()
    $ringPen.Dispose()
    $borderPen.Dispose()
    $backgroundBrush.Dispose()
    $backgroundPath.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}

Write-Output "Generated build/icon.png and build/icon.ico"
