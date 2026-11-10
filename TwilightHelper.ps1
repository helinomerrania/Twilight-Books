<#
    Twilight  —  the helper that keeps the books and hands them to your devices.

    Double-click "Start Twilight.bat". Do not run this on its own.

    What it does:
      - keeps the books in this folder and writes every change into it
      - serves them to this computer, and to your own devices over Tailscale
      - refuses anything that is not this computer or your own Tailscale network

    The books are the file in this folder, not the browser. Every device reads
    and writes that one file, so the lounge and home can never drift apart.
#>

# ---- settings you may want to change -------------------------------------
$BackupFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port         = 8787
# Set to $true only if you also want other computers on the SHOP's wifi to reach
# the books. Customers are on that wifi too, so leave it $false unless you mean it.
$AllowLocalWifi = $false

# Where new versions come from, and whether to look.
$UpdateFrom      = 'https://raw.githubusercontent.com/helinomerrania/Twilight-Books/main'
$CheckForUpdates = $true
# The ONLY files an update is ever allowed to replace. Your books are not on this
# list and cannot be put on it from GitHub, so no update can reach what you have
# entered, however the list published on GitHub is written.
$UpdatableFiles  = @(
    'TwilightBooks.html', 'TwilightHelper.ps1', 'Start Twilight.bat',
    'manifest.json', 'icon.png', 'icon-192.png', 'icon-48.png', 'favicon.ico',
    'Read me first.txt')
# --------------------------------------------------------------------------

$ErrorActionPreference = 'Stop'
$here    = Split-Path -Parent $MyInvocation.MyCommand.Path
$appFile = Join-Path $here 'TwilightBooks.html'
$mainFile = Join-Path $BackupFolder 'twilight-books.json'

if (-not (Test-Path $appFile)) {
    Write-Host "`n  Cannot find TwilightBooks.html next to this file." -ForegroundColor Red
    Write-Host "  Every file from the zip must sit in the same folder.`n"
    Read-Host "  Press Enter to close"; exit 1
}
if (-not (Test-Path $BackupFolder)) { [void](New-Item -ItemType Directory -Path $BackupFolder -Force) }

function Get-Seq {
    if (Test-Path $mainFile) { return (Get-Item $mainFile).LastWriteTimeUtc.Ticks.ToString() }
    return '0'
}
function Write-Reply($stream, [string]$status, [string]$type, [byte[]]$body) {
    if ($null -eq $body) { $body = New-Object byte[] 0 }
    $head = "HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`n" +
            "Cache-Control: no-store`r`nConnection: close`r`n`r`n"
    $hb = [Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($hb, 0, $hb.Length)
    if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
    $stream.Flush()
}
function Write-Text($stream, [string]$status, [string]$type, [string]$text) {
    Write-Reply $stream $status $type ([Text.Encoding]::UTF8.GetBytes($text))
}
function Save-File([string]$tmp, [string]$dest, [string]$body, $enc) {
    [IO.File]::WriteAllText($tmp, $body, $enc)
    try {
        if (Test-Path $dest) {
            # Replace needs a real backup path: passing $null arrives as an empty
            # string and Windows rejects it ("The path is not of a legal form").
            $bak = $dest + '.bak'
            [IO.File]::Replace($tmp, $dest, $bak)
            try { [IO.File]::Delete($bak) } catch {}
        } else {
            [IO.File]::Move($tmp, $dest)
        }
    } catch {
        [IO.File]::WriteAllText($dest, $body, $enc)
    }
    if (Test-Path $tmp) { try { [IO.File]::Delete($tmp) } catch {} }
}
function Get-LocalVersion {
    $f = Join-Path $here 'version.json'
    if (Test-Path $f) {
        try { return ([IO.File]::ReadAllText($f) | ConvertFrom-Json).version } catch { return '0' }
    }
    return '0'
}
function Update-Twilight {
    if (-not $CheckForUpdates) { return @{ status = 'off'; version = (Get-LocalVersion) } }
    $localVer = Get-LocalVersion
    $bust = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $r = Invoke-WebRequest -Uri "$UpdateFrom/version.json?t=$bust" -UseBasicParsing -TimeoutSec 15
        $remote = $r.Content | ConvertFrom-Json
    } catch {
        return @{ status = 'offline'; version = $localVer; error = $_.Exception.Message }
    }
    if (-not $remote.version) { return @{ status = 'error'; version = $localVer; error = 'GitHub has no version number' } }
    if ($remote.version -eq $localVer) { return @{ status = 'current'; version = $localVer } }

    # Only files on our own list. Anything else named on GitHub is ignored.
    $wanted = @()
    foreach ($f in $remote.files) { if ($UpdatableFiles -contains $f) { $wanted += $f } }
    if ($wanted.Count -eq 0) { return @{ status = 'error'; version = $localVer; error = 'nothing on the list to update' } }

    $stage = Join-Path $here '.twilight-update'
    if (Test-Path $stage) { try { Remove-Item $stage -Recurse -Force } catch {} }
    [void](New-Item -ItemType Directory -Path $stage -Force)

    # Everything is fetched and checked before a single file here is touched.
    try {
        foreach ($f in $wanted) {
            $url = "$UpdateFrom/" + [Uri]::EscapeDataString($f) + "?t=$bust"
            $out = Join-Path $stage $f
            Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 60 -OutFile $out
            if (-not (Test-Path $out) -or (Get-Item $out).Length -eq 0) { throw "$f arrived empty" }
        }
        $newApp = Join-Path $stage 'TwilightBooks.html'
        if (Test-Path $newApp) {
            $txt = [IO.File]::ReadAllText($newApp)
            if ($txt -notmatch 'twilight-books-app' -or $txt.Length -lt 40000) {
                throw 'the TwilightBooks.html that came down is not the books app'
            }
        }
    } catch {
        try { Remove-Item $stage -Recurse -Force } catch {}
        return @{ status = 'error'; version = $localVer; error = $_.Exception.Message }
    }

    # Keep the copy being replaced, so going back is a drag-and-drop away.
    $backup = Join-Path $here 'previous-version'
    if (Test-Path $backup) { try { Remove-Item $backup -Recurse -Force } catch {} }
    [void](New-Item -ItemType Directory -Path $backup -Force)
    $helperChanged = $false
    foreach ($f in $wanted) {
        $cur = Join-Path $here $f
        if (Test-Path $cur) { Copy-Item -LiteralPath $cur -Destination (Join-Path $backup $f) -Force }
    }
    foreach ($f in $wanted) {
        $dest = Join-Path $here $f
        if ($f -eq 'TwilightHelper.ps1') {
            # This very file is open and running, so it is left beside itself and
            # "Start Twilight.bat" moves it into place the next time you start.
            $dest = Join-Path $here 'TwilightHelper.ps1.new'
            $helperChanged = $true
        }
        Copy-Item -LiteralPath (Join-Path $stage $f) -Destination $dest -Force
    }
    $utf8 = New-Object System.Text.UTF8Encoding -ArgumentList $false
    [IO.File]::WriteAllText((Join-Path $here 'version.json'), $r.Content, $utf8)
    try { Remove-Item $stage -Recurse -Force } catch {}
    return @{ status = 'updated'; from = $localVer; version = $remote.version
              notes = $remote.notes; helper = $helperChanged }
}

function Test-Allowed([string]$ip) {
    if ($ip -like '127.*' -or $ip -eq '::1') { return $true }
    # Tailscale hands out 100.64.0.0 - 100.127.255.255
    if ($ip -match '^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.') { return $true }
    if ($AllowLocalWifi -and ($ip -like '192.168.*' -or $ip -like '10.*' -or
        $ip -match '^172\.(1[6-9]|2\d|3[01])\.')) { return $true }
    return $false
}

try {
    $listener = New-Object System.Net.Sockets.TcpListener -ArgumentList ([System.Net.IPAddress]::Any), $Port
    $listener.Start()
} catch {
    Write-Host "`n  Could not start on port $Port." -ForegroundColor Red
    Write-Host "  Twilight is probably already running - look for another window like this one.`n"
    Read-Host "  Press Enter to close"; exit 1
}

$local = "http://127.0.0.1:$Port/"
$tail  = $null
try {
    $tail = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
             Where-Object { $_.IPAddress -match '^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.' } |
             Select-Object -First 1).IPAddress
} catch {}

Write-Host ""
Write-Host "  Twilight is running." -ForegroundColor Green
Write-Host "  Here      : $local"
if ($tail) { Write-Host "  From home : http://${tail}:$Port/   (on your Tailscale devices)" -ForegroundColor Cyan }
else {
    Write-Host "  From home : not available yet - Tailscale is not running on this computer." -ForegroundColor Yellow
    Write-Host "              Start Tailscale, then close and reopen this window."
}
Write-Host "  Books     : $BackupFolder"
Write-Host ""
Write-Host "  Leave this window open while you work. Closing it stops the saving."
Write-Host ""

if ($CheckForUpdates) {
    $u = Update-Twilight
    switch ($u.status) {
        'updated' {
            Write-Host ("  Updated {0} -> {1}" -f $u.from, $u.version) -ForegroundColor Green
            if ($u.notes)  { Write-Host ("    {0}" -f $u.notes) }
            if ($u.helper) { Write-Host "    The helper changed too - close this window and start it again." -ForegroundColor Yellow }
            Write-Host "    The copy it replaced is in the 'previous-version' folder."
        }
        'current' { Write-Host ("  Version {0} - up to date." -f $u.version) -ForegroundColor DarkGray }
        'offline' { Write-Host "  Could not reach GitHub - carrying on with the copy that is here." -ForegroundColor DarkGray }
        'off'     { }
        default   { Write-Host ("  Update check: {0}" -f $u.error) -ForegroundColor DarkGray }
    }
    Write-Host ""
}

# open it in its own window: no tabs, no address bar, its own taskbar button
$chromePaths = @(); $edgePaths = @()
foreach ($base in @($env:LOCALAPPDATA, $env:ProgramFiles, ${env:ProgramFiles(x86)})) {
    if ($base) {
        $chromePaths += (Join-Path $base 'Google\Chrome\Application\chrome.exe')
        $edgePaths   += (Join-Path $base 'Microsoft\Edge\Application\msedge.exe')
    }
}
$browser = $null
foreach ($c in ($chromePaths + $edgePaths)) { if (Test-Path $c) { $browser = $c; break } }
if ($browser) { Start-Process $browser -ArgumentList "--app=$local", '--window-size=1280,900' }
else { Write-Host "  (No Chrome or Edge found, so it opens in your usual browser.)"; Start-Process $local }

$saves = 0
while ($true) {
    $client = $null
    try {
        $client = $listener.AcceptTcpClient()
        $client.ReceiveTimeout = 5000
        $client.SendTimeout    = 5000
        $ip = $client.Client.RemoteEndPoint.Address.ToString()
        if ($ip.StartsWith('::ffff:')) { $ip = $ip.Substring(7) }
        $stream = $client.GetStream()

        if (-not (Test-Allowed $ip)) {
            Write-Host ("  refused {0}" -f $ip) -ForegroundColor Yellow
            Write-Text $stream '403 Forbidden' 'text/plain; charset=utf-8' 'Not your books.'
            $client.Close(); continue
        }

        # ---- read the request head
        $ms = New-Object System.IO.MemoryStream
        $buf = New-Object byte[] 8192
        $headEnd = -1
        while ($headEnd -lt 0) {
            $n = $stream.Read($buf, 0, $buf.Length)
            if ($n -le 0) { break }
            $ms.Write($buf, 0, $n)
            $a = $ms.ToArray()
            for ($i = 3; $i -lt $a.Length; $i++) {
                if ($a[$i-3] -eq 13 -and $a[$i-2] -eq 10 -and $a[$i-1] -eq 13 -and $a[$i] -eq 10) { $headEnd = $i + 1; break }
            }
            if ($ms.Length -gt 65536) { break }
        }
        if ($headEnd -lt 0) { $client.Close(); continue }

        $all   = $ms.ToArray()
        $lines = ([Text.Encoding]::ASCII.GetString($all, 0, $headEnd)) -split "`r`n"
        $parts = $lines[0] -split ' '
        $method = $parts[0]
        $path   = if ($parts.Length -gt 1) { $parts[1] } else { '/' }
        if ($path.Contains('?')) { $path = $path.Substring(0, $path.IndexOf('?')) }
        $len = 0; $mine = $false; $seenSeq = $null
        foreach ($l in $lines) {
            if ($l -match '^(?i)Content-Length:\s*(\d+)\s*$') { $len = [int]$Matches[1] }
            # Only the books app sends this. A form on some other web page cannot add a
            # header without asking the browser first, and nothing here answers that ask.
            if ($l -match '^(?i)X-Twilight:') { $mine = $true }
            if ($l -match '^(?i)X-Twilight-Seq:\s*(.*?)\s*$') { $seenSeq = $Matches[1] }
        }
        if ($len -gt 16777216) {
            Write-Text $stream '413 Payload Too Large' 'text/plain; charset=utf-8' 'Too big.'
            $client.Close(); continue
        }

        # ---- read the body
        $body = ''
        if ($len -gt 0) {
            $bodyBytes = New-Object byte[] $len
            $have = 0
            $inHead = $all.Length - $headEnd
            if ($inHead -gt 0) {
                $take = [Math]::Min($inHead, $len)
                [Array]::Copy($all, $headEnd, $bodyBytes, 0, $take); $have = $take
            }
            while ($have -lt $len) {
                $n = $stream.Read($bodyBytes, $have, $len - $have)
                if ($n -le 0) { break }
                $have += $n
            }
            $body = [Text.Encoding]::UTF8.GetString($bodyBytes, 0, $have)
        }

        # ---- answer
        if ($method -eq 'GET' -and ($path -eq '/' -or $path -eq '/index.html')) {
            Write-Reply $stream '200 OK' 'text/html; charset=utf-8' ([IO.File]::ReadAllBytes($appFile))
        }
        elseif ($method -eq 'GET' -and $path -eq '/ping') {
            $f = $BackupFolder -replace '\\', '\\' -replace '"', '\"'
            Write-Text $stream '200 OK' 'application/json' ("{""ok"":true,""folder"":""$f"",""seq"":""$(Get-Seq)"",""you"":""$ip""}")
        }
        elseif ($method -eq 'GET' -and $path -eq '/state') {
            Write-Text $stream '200 OK' 'application/json' ("{""ok"":true,""seq"":""$(Get-Seq)""}")
        }
        elseif ($method -eq 'GET' -and $path -eq '/books') {
            if (Test-Path $mainFile) {
                Write-Reply $stream '200 OK' 'application/json; charset=utf-8' ([IO.File]::ReadAllBytes($mainFile))
            } else { Write-Text $stream '404 Not Found' 'application/json' '{"ok":false}' }
        }
        elseif ($method -eq 'GET' -and ($path -eq '/manifest.json' -or $path -eq '/icon.png' -or
                 $path -eq '/icon-192.png' -or $path -eq '/icon-48.png' -or $path -eq '/favicon.ico')) {
            $f = Join-Path $here ($path.TrimStart('/'))
            if (Test-Path $f) {
                $ct = switch -Wildcard ($path) {
                    '*.json' { 'application/json; charset=utf-8' }
                    '*.ico'  { 'image/x-icon' }
                    default  { 'image/png' }
                }
                Write-Reply $stream '200 OK' $ct ([IO.File]::ReadAllBytes($f))
            } else { Write-Reply $stream '204 No Content' 'text/plain' (New-Object byte[] 0) }
        }
        elseif ($method -eq 'GET' -and $path -eq '/update') {
            $u = Update-Twilight
            if ($u.status -eq 'updated') {
                Write-Host ("  updated {0} -> {1}" -f $u.from, $u.version) -ForegroundColor Green
                if ($u.helper) { Write-Host "  the helper changed - close this window and start it again" -ForegroundColor Yellow }
            }
            Write-Text $stream '200 OK' 'application/json; charset=utf-8' ($u | ConvertTo-Json -Compress)
        }
        elseif ($method -eq 'POST' -and $path -eq '/save') {
            if (-not $mine) {
                Write-Host "  refused a save that did not come from the books app" -ForegroundColor Yellow
                Write-Text $stream '403 Forbidden' 'application/json' '{"ok":false,"error":"not the books app"}'
            }
            elseif ([string]::IsNullOrWhiteSpace($body) -or ($body.TrimStart() -notlike '{*')) {
                Write-Text $stream '400 Bad Request' 'application/json' '{"ok":false,"error":"not the books"}'
            }
            elseif ($seenSeq -ne $null -and $seenSeq -ne '' -and $seenSeq -ne (Get-Seq)) {
                # Someone else saved since this device last looked. Say so rather than
                # letting one of the two evenings be written over.
                Write-Host "  a save arrived out of step - the device will merge and retry" -ForegroundColor Yellow
                Write-Text $stream '409 Conflict' 'application/json' ("{""ok"":false,""seq"":""$(Get-Seq)""}")
            }
            else {
                $day   = (Get-Date).ToString('yyyy-MM-dd')
                $utf8  = New-Object System.Text.UTF8Encoding -ArgumentList $false
                $daily = Join-Path $BackupFolder ("twilight-books-$day.json")
                $tmp   = Join-Path $BackupFolder 'twilight-books.tmp'
                # Written aside, then swapped in one move, so a copy is never left half
                # written. If the swap cannot be done on this drive, the file is written
                # straight out instead - a save must never be lost to a tidy-up trick.
                foreach ($dest in @($mainFile, $daily)) { Save-File $tmp $dest $body $utf8 }
                $saves++
                $who = if ($ip -like '127.*') { 'here' } else { $ip }
                Write-Host ("  saved {0} from {1}  ({2} today)" -f (Get-Date).ToString('HH:mm:ss'), $who, $saves)
                Write-Text $stream '200 OK' 'application/json' ("{""ok"":true,""seq"":""$(Get-Seq)""}")
            }
        }
        else { Write-Text $stream '404 Not Found' 'text/plain; charset=utf-8' 'Not here.' }
    } catch {
        Write-Host ("  trouble: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
        # tell the page, so it shows its warning instead of waiting on a dead line
        try { Write-Text $stream '500 Internal Server Error' 'application/json' '{"ok":false}' } catch {}
    } finally {
        if ($client) { try { $client.Close() } catch {} }
    }
}
