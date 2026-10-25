param([switch]$SkipDownload)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$siteRoot = Join-Path $projectRoot 'web-ar'
$vendorRoot = Join-Path $siteRoot 'vendor'
$assetsRoot = Join-Path $siteRoot 'assets'
New-Item -ItemType Directory -Path $vendorRoot,$assetsRoot -Force | Out-Null
$assets = @{
    'recovery-assets/cards/tssgd.jpg' = 'tssgd.jpg'
    'recovery-assets/cards/tssgd.mind' = 'tssgd.mind'
    'recovery-assets/models/Model/taishanshigandang_yu.glb' = 'ben-zun.glb'
    'recovery-assets/models/FrameAnimation/dun.glb' = 'dun.glb'
    'recovery-assets/models/FrameAnimation/shan.glb' = 'shan.glb'
    'recovery-assets/models/Model/otherModel/sgd.glb' = 'sgd.glb'
    'recovery-assets/models/FrameAnimation/dcdy02.glb' = 'dcdy02.glb'
    'recovery-assets/audio/Audio/石敢当本当.mp3' = 'narration.mp3'
}
foreach ($source in $assets.Keys) {
    $fullSource = Join-Path $projectRoot $source
    if (!(Test-Path -LiteralPath $fullSource)) { throw "Missing asset: $source" }
    $inputFile = [System.IO.File]::OpenRead($fullSource)
    try {
        $prefix = New-Object byte[] 80
        $readCount = $inputFile.Read($prefix,0,$prefix.Length)
        $header = [System.Text.Encoding]::ASCII.GetString($prefix,0,$readCount)
        if ($header.StartsWith('version https://git-lfs.github.com')) { throw "LFS asset not downloaded: $source" }
        if ($source.EndsWith('.glb') -and !$header.StartsWith('glTF')) { throw "Invalid GLB: $source" }
    } finally { $inputFile.Dispose() }
    Copy-Item -LiteralPath $fullSource -Destination (Join-Path $assetsRoot $assets[$source])
}
$downloads = @{
    'aframe.min.js' = 'https://cdn.jsdelivr.net/npm/aframe@1.5.0/dist/aframe-master.min.js'
    'mindar-image-aframe.prod.js' = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js'
    'mindar-image.prod.js' = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js'
    'LICENSE-MindAR.txt' = 'https://raw.githubusercontent.com/hiukim/mind-ar-js/v1.2.5/LICENSE'
    'LICENSE-AFrame.txt' = 'https://raw.githubusercontent.com/aframevr/aframe/v1.5.0/LICENSE'
}
foreach ($name in $downloads.Keys) {
    $destination = Join-Path $vendorRoot $name
    if (!$SkipDownload -or !(Test-Path -LiteralPath $destination)) {
        Invoke-WebRequest -Uri $downloads[$name] -OutFile $destination -TimeoutSec 30 -MaximumRetryCount 2
    }
    if ((Get-Item -LiteralPath $destination).Length -lt 100) { throw "Dependency download invalid: $name" }
}
# The compiler entry is an ES module with versioned relative chunks.
$queue = [System.Collections.Generic.Queue[string]]::new()
$seen = [System.Collections.Generic.HashSet[string]]::new()
$queue.Enqueue('mindar-image.prod.js')
while ($queue.Count -gt 0) {
    $moduleName = $queue.Dequeue()
    if (!$seen.Add($moduleName)) { continue }
    $moduleSource = [System.IO.File]::ReadAllText((Join-Path $vendorRoot $moduleName))
    foreach ($match in [regex]::Matches($moduleSource, '(?:from\s*|import\s*)["'']\./([a-zA-Z0-9_-]+\.js)["'']')) {
        $chunk = $match.Groups[1].Value
        $chunkPath = Join-Path $vendorRoot $chunk
        if (!(Test-Path -LiteralPath $chunkPath)) {
            Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/$chunk" -OutFile $chunkPath -TimeoutSec 30 -MaximumRetryCount 2
        }
        $queue.Enqueue($chunk)
    }
}
$artifactRoot = Join-Path $projectRoot 'artifacts'
New-Item -ItemType Directory -Path $artifactRoot -Force | Out-Null
$archive = Join-Path $artifactRoot 'yushiji-self-hosted-ar.zip'
Compress-Archive -Path (Join-Path $siteRoot '*') -DestinationPath $archive -Force
Write-Output "Prepared: $archive"
Write-Output 'Deploy, test probe.html inside the mini program, compile the target on a PC with compile.html, then test index.html.'
