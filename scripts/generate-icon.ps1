$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-ScaledBitmap {
    param(
        [System.Drawing.Image]$Source,
        [int]$Size
    )

    $bitmap = New-Object System.Drawing.Bitmap(
        $Size,
        $Size,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

    try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.DrawImage(
            $Source,
            (New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)),
            0,
            0,
            $Source.Width,
            $Source.Height,
            [System.Drawing.GraphicsUnit]::Pixel
        )
    }
    finally {
        $graphics.Dispose()
    }

    return $bitmap
}

function Write-PngIcon {
    param(
        [string]$PngPath,
        [string]$IconPath
    )

    $pngBytes = [System.IO.File]::ReadAllBytes($PngPath)
    $stream = [System.IO.File]::Create($IconPath)
    $writer = New-Object System.IO.BinaryWriter($stream)

    try {
        $writer.Write([uint16]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]1)
        $writer.Write([byte]0)
        $writer.Write([byte]0)
        $writer.Write([byte]0)
        $writer.Write([byte]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]32)
        $writer.Write([uint32]$pngBytes.Length)
        $writer.Write([uint32]22)
        $writer.Write($pngBytes)
    }
    finally {
        $writer.Dispose()
        $stream.Dispose()
    }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$buildDirectory = Join-Path $projectRoot "build"
$publicDirectory = Join-Path $projectRoot "public"
$extensionIconDirectory = Join-Path $projectRoot "extension\icons"
$sourcePath = Join-Path $buildDirectory "icon-source.png"
$pngPath = Join-Path $buildDirectory "icon.png"
$icoPngPath = Join-Path $buildDirectory "icon-256.png"
$icoPath = Join-Path $buildDirectory "icon.ico"
$publicIconPath = Join-Path $publicDirectory "icon.png"

if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Missing icon artwork: $sourcePath"
}

New-Item -ItemType Directory -Path $buildDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $publicDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $extensionIconDirectory -Force | Out-Null

$source = [System.Drawing.Bitmap]::FromFile($sourcePath)
$workingSize = 2048
$working = New-Object System.Drawing.Bitmap(
    $workingSize,
    $workingSize,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)
$graphics = [System.Drawing.Graphics]::FromImage($working)
$clipPath = New-Object System.Drawing.Drawing2D.GraphicsPath

try {
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)

    # The supplied preview includes a checkerboard canvas. Clip to the badge's
    # outer ring so the installed icon gets genuine transparent corners.
    $clipPath.AddEllipse(75, 50, 1900, 1900)
    $graphics.SetClip($clipPath)
    $graphics.DrawImage(
        $source,
        (New-Object System.Drawing.Rectangle(0, 0, $workingSize, $workingSize)),
        0,
        0,
        $source.Width,
        $source.Height,
        [System.Drawing.GraphicsUnit]::Pixel
    )
}
finally {
    $clipPath.Dispose()
    $graphics.Dispose()
    $source.Dispose()
}

$appIcon = New-ScaledBitmap -Source $working -Size 1024
$icoImage = New-ScaledBitmap -Source $working -Size 256
$extensionIconSizes = @(16, 32, 48, 128)

try {
    $appIcon.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $appIcon.Save($publicIconPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $icoImage.Save($icoPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-PngIcon -PngPath $icoPngPath -IconPath $icoPath
    Remove-Item -LiteralPath $icoPngPath -Force

    foreach ($iconSize in $extensionIconSizes) {
        $extensionIcon = New-ScaledBitmap -Source $working -Size $iconSize
        try {
            $extensionIcon.Save(
                (Join-Path $extensionIconDirectory "icon-$iconSize.png"),
                [System.Drawing.Imaging.ImageFormat]::Png
            )
        }
        finally {
            $extensionIcon.Dispose()
        }
    }
}
finally {
    $icoImage.Dispose()
    $appIcon.Dispose()
    $working.Dispose()
}

Write-Output "Generated build/icon.png, build/icon.ico, public/icon.png, and extension icons"
