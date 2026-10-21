# Živý přehled práce agentů. Čte CAS.csv (zapisuje ho cas.ps1), žádné tokeny nespotřebuje.
# Použití:
#   .\dashboard.ps1            spustí server na http://localhost:8765/ a otevře prohlížeč
#   .\dashboard.ps1 -Port 9000 jiný port
#   .\dashboard.ps1 -BezProhlizece
# Ukončení: Ctrl+C. Server naslouchá jen na localhostu a vydává pouze dashboard.html a CAS.csv.
param(
    [int]$Port = 8765,
    [switch]$BezProhlizece
)

$html = Join-Path $PSScriptRoot "dashboard.html"
$csv = Join-Path $PSScriptRoot "CAS.csv"
if (-not (Test-Path $html)) { throw "Chybí dashboard.html vedle skriptu." }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try { $listener.Start() } catch { throw "Port $Port je obsazený. Zkus: .\dashboard.ps1 -Port 9000" }
$url = "http://localhost:$Port/"
"Dashboard běží: $url (ukončení Ctrl+C)"
if (-not $BezProhlizece) { Start-Process $url }

function Odpoved($ctx, [int]$kod, [string]$typ, [byte[]]$data) {
    $ctx.Response.StatusCode = $kod
    $ctx.Response.ContentType = $typ
    $ctx.Response.Headers.Add("Cache-Control", "no-store")
    $ctx.Response.ContentLength64 = $data.Length
    $ctx.Response.OutputStream.Write($data, 0, $data.Length)
    $ctx.Response.Close()
}

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        try {
            switch ($ctx.Request.Url.AbsolutePath) {
                "/" {
                    Odpoved $ctx 200 "text/html; charset=utf-8" ([IO.File]::ReadAllBytes($html))
                }
                "/cas.csv" {
                    $bytes = [byte[]]@()
                    if (Test-Path $csv) {
                        $fs = [IO.File]::Open($csv, "Open", "Read", "ReadWrite")
                        try { $ms = New-Object IO.MemoryStream; $fs.CopyTo($ms); $bytes = $ms.ToArray() } finally { $fs.Close() }
                    }
                    Odpoved $ctx 200 "text/csv; charset=utf-8" $bytes
                }
                default {
                    Odpoved $ctx 404 "text/plain; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes("Nenalezeno"))
                }
            }
        } catch { try { $ctx.Response.Abort() } catch {} }
    }
} finally {
    $listener.Stop()
}
