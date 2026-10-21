# Měření času projektu. Zapisuje do CAS.csv v téže složce.
# Použití:
#   .\cas.ps1 start "popis úkolu" [agent]   zahájí úsek (agent výchozí: hlavni)
#   .\cas.ps1 stop [agent]                  ukončí poslední otevřený úsek agenta
#   .\cas.ps1 souhrn                        celkový čas, čas po úkolech, agentech a dnech
#   .\cas.ps1 vykaz                         výkaz pro klienta (VYKAZ.md): agenti, úkoly s časy, součet
param(
    [Parameter(Mandatory = $true, Position = 0)][ValidateSet("start", "stop", "souhrn", "vykaz")][string]$Akce,
    [Parameter(Position = 1)][string]$Arg1,
    [Parameter(Position = 2)][string]$Arg2
)

$soubor = Join-Path $PSScriptRoot "CAS.csv"
$fmt = "yyyy-MM-dd HH:mm:ss"
$ci = [Globalization.CultureInfo]::InvariantCulture
$hlavicka = "zacatek;konec;minuty;agent;ukol"

if (-not (Test-Path $soubor)) {
    Set-Content -Path $soubor -Value $hlavicka -Encoding UTF8
}
$radky = @(Import-Csv -Path $soubor -Delimiter ";")

function Uloz($data) {
    if ($data.Count -eq 0) { Set-Content -Path $soubor -Value $hlavicka -Encoding UTF8 }
    else { $data | Export-Csv -Path $soubor -Delimiter ";" -NoTypeInformation -Encoding UTF8 }
}
function Hodiny($min) { "{0}:{1:00}" -f [math]::Floor($min / 60), [int]($min % 60) }

switch ($Akce) {
    "start" {
        if (-not $Arg1) { throw "Zadej popis úkolu." }
        $agent = if ($Arg2) { $Arg2 } else { "hlavni" }
        $novy = [pscustomobject]@{
            zacatek = (Get-Date).ToString($fmt); konec = ""; minuty = ""; agent = $agent; ukol = $Arg1
        }
        Uloz (@($radky) + $novy)
        "Start: $Arg1 [$agent]"
    }
    "stop" {
        $agent = if ($Arg1) { $Arg1 } else { "hlavni" }
        $otevrene = @($radky | Where-Object { $_.konec -eq "" -and $_.agent -eq $agent })
        if ($otevrene.Count -eq 0) { "Žádný otevřený úsek pro agenta $agent."; return }
        $r = $otevrene[-1]
        $now = Get-Date
        $zac = [datetime]::ParseExact($r.zacatek, $fmt, $ci)
        $r.konec = $now.ToString($fmt)
        $r.minuty = [math]::Round(($now - $zac).TotalMinutes, 1).ToString($ci)
        Uloz $radky
        "Stop: $($r.ukol) [$agent] – $($r.minuty) min"
    }
    "souhrn" {
        $hotove = @($radky | Where-Object { $_.konec -ne "" } | ForEach-Object {
            [pscustomobject]@{
                z = [datetime]::ParseExact($_.zacatek, $fmt, $ci)
                k = [datetime]::ParseExact($_.konec, $fmt, $ci)
                min = [double]::Parse($_.minuty, $ci)
                agent = $_.agent; ukol = $_.ukol
            }
        })
        if ($hotove.Count -eq 0) { "Zatím žádný ukončený úsek."; return }

        # Reálný čas projektu = sjednocení úseků (souběžní agenti se nepočítají dvakrát)
        $celkem = 0.0; $odkdy = $null; $dokdy = $null
        foreach ($u in ($hotove | Sort-Object z)) {
            if ($null -eq $odkdy) { $odkdy = $u.z; $dokdy = $u.k }
            elseif ($u.z -le $dokdy) { if ($u.k -gt $dokdy) { $dokdy = $u.k } }
            else { $celkem += ($dokdy - $odkdy).TotalMinutes; $odkdy = $u.z; $dokdy = $u.k }
        }
        $celkem += ($dokdy - $odkdy).TotalMinutes
        $soucet = ($hotove | Measure-Object min -Sum).Sum

        "== CELKEM =="
        "Čas projektu (skutečný, bez překryvu): $(Hodiny $celkem)"
        "Součet práce všech agentů:            $(Hodiny $soucet)"
        ""
        "== PO ÚKOLECH =="
        $hotove | Group-Object ukol | ForEach-Object {
            "{0,8}  {1}" -f (Hodiny ($_.Group | Measure-Object min -Sum).Sum), $_.Name
        }
        ""
        "== PO AGENTECH =="
        $hotove | Group-Object agent | ForEach-Object {
            "{0,8}  {1}" -f (Hodiny ($_.Group | Measure-Object min -Sum).Sum), $_.Name
        }
        ""
        "== PO DNECH =="
        $hotove | Group-Object { $_.z.ToString("yyyy-MM-dd") } | Sort-Object Name | ForEach-Object {
            "{0,8}  {1}" -f (Hodiny ($_.Group | Measure-Object min -Sum).Sum), $_.Name
        }
        $otevrene = @($radky | Where-Object { $_.konec -eq "" }).Count
        if ($otevrene -gt 0) { ""; "Pozor: $otevrene otevřený úsek (nezapočítán). Ukonči ho příkazem stop." }
    }
    "vykaz" {
        # Výkaz pro klienta: po agentech, každý úkol s časovým razítkem a dobou, celkový součet.
        $cs = [Globalization.CultureInfo]::GetCultureInfo("cs-CZ")
        $dobaTxt = { param($s) "{0}:{1:00}:{2:00}" -f [math]::Floor($s / 3600), [math]::Floor(($s % 3600) / 60), [int]($s % 60) }
        $hotove = @($radky | Where-Object { $_.konec -ne "" } | ForEach-Object {
            $z = [datetime]::ParseExact($_.zacatek, $fmt, $ci)
            $k = [datetime]::ParseExact($_.konec, $fmt, $ci)
            [pscustomobject]@{ z = $z; k = $k; s = ($k - $z).TotalSeconds; agent = $_.agent; ukol = ($_.ukol -replace "\|", "/") }
        })
        if ($hotove.Count -eq 0) { "Zatím žádný ukončený úsek."; return }

        $o = New-Object System.Collections.Generic.List[string]
        $o.Add("# Výkaz práce")
        $o.Add("")
        $o.Add("Projekt: " + (Split-Path $PSScriptRoot -Leaf))
        $o.Add("Období: " + ($hotove | Sort-Object z | Select-Object -First 1).z.ToString("d. M. yyyy HH:mm", $cs) +
               " – " + ($hotove | Sort-Object k | Select-Object -Last 1).k.ToString("d. M. yyyy HH:mm", $cs))
        $o.Add("Vygenerováno: " + (Get-Date).ToString("d. M. yyyy HH:mm", $cs))

        foreach ($g in ($hotove | Group-Object agent | Sort-Object Name)) {
            $soucetA = ($g.Group | Measure-Object s -Sum).Sum
            $o.Add(""); $o.Add("## Agent: " + $g.Name); $o.Add("")
            $o.Add("| Úkol | Začátek | Konec | Doba |"); $o.Add("|---|---|---|---|")
            foreach ($u in ($g.Group | Sort-Object z)) {
                $o.Add("| " + $u.ukol + " | " + $u.z.ToString("d. M. yyyy HH:mm:ss", $cs) + " | " +
                       $u.k.ToString("d. M. yyyy HH:mm:ss", $cs) + " | " + (& $dobaTxt $u.s) + " |")
            }
            $o.Add("| **Celkem " + $g.Name + "** | | | **" + (& $dobaTxt $soucetA) + "** |")
        }

        $soucet = ($hotove | Measure-Object s -Sum).Sum
        $o.Add(""); $o.Add("## Souhrn"); $o.Add("")
        $o.Add("| Agent | Doba |"); $o.Add("|---|---|")
        foreach ($g in ($hotove | Group-Object agent | Sort-Object Name)) {
            $o.Add("| " + $g.Name + " | " + (& $dobaTxt ($g.Group | Measure-Object s -Sum).Sum) + " |")
        }
        $o.Add("| **Celkový součet práce všech agentů** | **" + (& $dobaTxt $soucet) + "** |")
        $o.Add("")
        $o.Add("Celkem hodin: **" + ($soucet / 3600).ToString("0.00", $cs) + " h**")

        $otevrene = @($radky | Where-Object { $_.konec -eq "" }).Count
        if ($otevrene -gt 0) { $o.Add(""); $o.Add("Pozor: $otevrene otevřený úsek není započítán.") }

        $vystup = Join-Path $PSScriptRoot "VYKAZ.md"
        Set-Content -Path $vystup -Value $o -Encoding UTF8
        $o
        ""
        "Uloženo: $vystup"
    }
}
