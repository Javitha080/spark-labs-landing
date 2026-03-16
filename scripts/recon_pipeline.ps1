<#
.SYNOPSIS
    Red Team Pipeline for Spark Labs Landing Page (Windows Adaptation)
.DESCRIPTION
    Automated reconnaissance using local tools located in D:\Pentesting.
#>

$TargetDomains = @("dvpyic.dpdns.org", "yicdvp.lovable.app")
$ProjectDir = "target"

# Tool Paths
$SubfinderPath = "D:\Pentesting\subfinder\subfinder.exe"
$HttpxPath = "D:\Pentesting\httpx\httpx.exe"
$KatanaPath = "D:\Pentesting\katana\katana.exe"
$NucleiPath = "D:\Pentesting\nuclei\nuclei.exe"
$NucleiTemplatesPath = "D:\Pentesting\nuclei-templates-10.3.9\nuclei-templates-10.3.9"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "    Spark Labs Landing Red Team Recon Pipeline" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Setup Project Tracking
if (-Not (Test-Path "$ProjectDir")) {
    New-Item -ItemType Directory -Force -Path "$ProjectDir" | Out-Null
}

Set-Location "$ProjectDir"

foreach ($Domain in $TargetDomains) {
    Write-Host "[*] Initiating scan for target: $Domain" -ForegroundColor Yellow
    $DomainDir = "$Domain"
    $ReconDir = "$DomainDir\recon"
    $VulnsDir = "$DomainDir\vulns"
    New-Item -ItemType Directory -Force -Path $ReconDir | Out-Null
    New-Item -ItemType Directory -Force -Path $VulnsDir | Out-Null
    
    # 2. Subdomain Enumeration
    Write-Host "[*] Phase 1: Subdomain Enumeration" -ForegroundColor Green
    if (Test-Path $SubfinderPath) {
        &$SubfinderPath -d $Domain -silent -o "$ReconDir\subfinder.txt"
        Copy-Item "$ReconDir\subfinder.txt" -Destination "$ReconDir\all_subs.txt" -ErrorAction SilentlyContinue
    } else {
        Write-Host "[-] subfinder.exe not found. Adding domain directly." -ForegroundColor Red
        $Domain | Out-File -FilePath "$ReconDir\all_subs.txt"
    }
    
    # 3. Live Host Discovery
    Write-Host "[*] Phase 2: Live Host Discovery" -ForegroundColor Green
    if (Test-Path $HttpxPath) {
        if (Test-Path "$ReconDir\all_subs.txt" -PathType Leaf) {
            Get-Content "$ReconDir\all_subs.txt" | &$HttpxPath -title -tech-detect -status-code -o "$ReconDir\live_hosts.txt"
            # Extract clean target URLs for next phases (primitive extraction by taking first token)
            Get-Content "$ReconDir\live_hosts.txt" | ForEach-Object { ($_ -split ' ')[0] } | Out-File -FilePath "$ReconDir\target_urls.txt"
        }
    } else {
        Write-Host "[-] httpx.exe not found." -ForegroundColor Red
    }

    # 4. Content and API Discovery (Katana instead of Waybackurls/Dalfox pipeline on Windows)
    Write-Host "[*] Phase 3: Content Discovery & Spidering (Katana)" -ForegroundColor Green
    if ((Test-Path $KatanaPath) -and (Test-Path "$ReconDir\target_urls.txt")) {
        &$KatanaPath -list "$ReconDir\target_urls.txt" -silent -o "$ReconDir\katana_endpoints.txt"
    } else {
        Write-Host "[-] katana.exe not found or no target URLs to scan." -ForegroundColor Red
    }

    # 5. Vulnerability Scanning with Nuclei
    Write-Host "[*] Phase 4: Comprehensive Vulnerability Scanning (Nuclei)" -ForegroundColor Green
    if ((Test-Path $NucleiPath) -and (Test-Path "$ReconDir\target_urls.txt")) {
        if (Test-Path $NucleiTemplatesPath) {
           &$NucleiPath -l "$ReconDir\target_urls.txt" -t "$NucleiTemplatesPath\vulnerabilities\" -t "$NucleiTemplatesPath\cves\" -t "$NucleiTemplatesPath\misconfiguration\" -o "$VulnsDir\nuclei_results.txt" 
        } else {
            # Use default templates if custom path holds nothing
            &$NucleiPath -l "$ReconDir\target_urls.txt" -o "$VulnsDir\nuclei_results.txt"
        }
    } else {
        Write-Host "[-] nuclei.exe not found or no target URLs to scan." -ForegroundColor Red
    }

    Write-Host "[+] Scan completed for $Domain. Results stored in target\$Domain\" -ForegroundColor Cyan
    Write-Host "--------------------------------------------------"
}

Set-Location ".."
Write-Host "[!] Pipeline execution finished." -ForegroundColor Yellow
