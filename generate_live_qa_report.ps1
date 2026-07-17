$ErrorActionPreference = "Stop"

$OutputPath = Join-Path (Get-Location) "UI_QA_Report_Live_Verification.pdf"
$GeneratedOn = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function E([string]$s) {
  if ($null -eq $s) { return "" }
  return (($s -replace "\\", "\\") -replace "\(", "\(") -replace "\)", "\)"
}

$script:Objects = New-Object System.Collections.ArrayList
$script:Pages = New-Object System.Collections.ArrayList
$script:Current = $null
$script:Y = 760

function AddPage([string]$Title = "") {
  $p = New-Object System.Collections.ArrayList
  [void]$script:Pages.Add($p)
  $script:Current = $p
  $script:Y = 760
  if ($Title) {
    Text $Title 48 $script:Y 18 $true @(0.06,0.08,0.13)
    $script:Y -= 18
    Line 48 $script:Y 548 $script:Y @(0.82,0.85,0.90)
    $script:Y -= 25
  }
}

function Raw([string]$r) { [void]$script:Current.Add($r) }

function Text([string]$Text, [double]$X, [double]$Y, [double]$Size = 9, [bool]$Bold = $false, [array]$Color = @(0.18,0.22,0.30)) {
  $font = if ($Bold) { "F2" } else { "F1" }
  Raw ("BT {0:N3} {1:N3} {2:N3} rg /{3} {4:N1} Tf {5:N1} {6:N1} Td ({7}) Tj ET" -f $Color[0],$Color[1],$Color[2],$font,$Size,$X,$Y,(E $Text))
}

function Line([double]$X1,[double]$Y1,[double]$X2,[double]$Y2,[array]$Color=@(0.85,0.87,0.91)) {
  Raw ("{0:N3} {1:N3} {2:N3} RG 0.6 w {3:N1} {4:N1} m {5:N1} {6:N1} l S" -f $Color[0],$Color[1],$Color[2],$X1,$Y1,$X2,$Y2)
}

function Rect([double]$X,[double]$Y,[double]$W,[double]$H,[array]$Color=@(0.96,0.97,0.99),[bool]$Fill=$true) {
  $cmd = if ($Fill) { "rg" } else { "RG" }
  $op = if ($Fill) { "f" } else { "S" }
  Raw ("{0:N3} {1:N3} {2:N3} {3} {4:N1} {5:N1} {6:N1} {7:N1} re {8}" -f $Color[0],$Color[1],$Color[2],$cmd,$X,$Y,$W,$H,$op)
}

function Need([int]$Space=60) {
  if ($script:Y -lt $Space) { AddPage }
}

function Para([string]$Text, [double]$X=48, [double]$Width=500, [double]$Size=9, [array]$Color=@(0.25,0.29,0.36)) {
  foreach ($block in ($Text -split "`n")) {
    if ($block.Trim().Length -eq 0) { $script:Y -= 8; continue }
    $max = [Math]::Max(42, [int]($Width / ($Size * 0.47)))
    $line = ""
    foreach ($word in ($block -split "\s+")) {
      $candidate = if ($line) { "$line $word" } else { $word }
      if ($candidate.Length -gt $max) {
        Need 55
        Text $line $X $script:Y $Size $false $Color
        $script:Y -= ($Size + 5)
        $line = $word
      } else {
        $line = $candidate
      }
    }
    if ($line) {
      Need 55
      Text $line $X $script:Y $Size $false $Color
      $script:Y -= ($Size + 7)
    }
  }
}

function Heading([string]$Text) {
  Need 80
  Text $Text 48 $script:Y 13 $true @(0.06,0.08,0.13)
  $script:Y -= 18
}

function StatusColor([string]$Status) {
  if ($Status -eq "PASS") { return @(0.10,0.48,0.25) }
  if ($Status -eq "FAIL") { return @(0.80,0.16,0.14) }
  return @(0.88,0.52,0.12)
}

function Badge([string]$TextValue, [double]$X, [double]$Y, [array]$Color) {
  Rect $X ($Y - 4) 42 14 $Color $true
  Text $TextValue ($X + 6) $Y 7 $true @(1,1,1)
}

function ResultRow([string]$Step,[string]$Command,[string]$Status,[string]$Summary) {
  Need 70
  Line 48 ($script:Y + 9) 548 ($script:Y + 9)
  Text $Step 52 $script:Y 7 $true @(0.12,0.16,0.22)
  Text $Command 116 $script:Y 7 $false @(0.25,0.29,0.36)
  Badge $Status 320 $script:Y (StatusColor $Status)
  Text $Summary 370 $script:Y 7 $false @(0.25,0.29,0.36)
  $script:Y -= 23
}

function Score([string]$Label,[int]$Value,[double]$X,[double]$Y) {
  Rect $X $Y 150 54 @(0.96,0.97,0.99) $true
  Rect $X $Y 150 54 @(0.82,0.85,0.90) $false
  Text $Label ($X + 10) ($Y + 34) 9 $true @(0.14,0.17,0.24)
  $c = if ($Value -ge 80) { @(0.10,0.48,0.25) } elseif ($Value -ge 70) { @(0.88,0.52,0.12) } else { @(0.80,0.16,0.14) }
  Text "$Value / 100" ($X + 10) ($Y + 13) 16 $true $c
}

$Results = @(
  @{Step="1"; Command="node -v"; Status="FAIL"; Summary="node command not recognized."; Output="node : The term 'node' is not recognized as the name of a cmdlet, function, script file, or operable program."},
  @{Step="2"; Command="npm -v"; Status="FAIL"; Summary="npm command not recognized."; Output="npm : The term 'npm' is not recognized as the name of a cmdlet, function, script file, or operable program."},
  @{Step="3"; Command="npm install"; Status="FAIL"; Summary="Cannot execute because npm is not recognized."; Output="npm : The term 'npm' is not recognized as the name of a cmdlet, function, script file, or operable program."},
  @{Step="4"; Command="npm run lint"; Status="FAIL"; Summary="Cannot execute because npm is not recognized."; Output="npm : The term 'npm' is not recognized as the name of a cmdlet, function, script file, or operable program."},
  @{Step="5"; Command="npm run build"; Status="FAIL"; Summary="Cannot execute because npm is not recognized."; Output="npm : The term 'npm' is not recognized as the name of a cmdlet, function, script file, or operable program."},
  @{Step="6"; Command="npm test"; Status="FAIL"; Summary="Cannot execute because npm is not recognized."; Output="npm : The term 'npm' is not recognized as the name of a cmdlet, function, script file, or operable program."},
  @{Step="7"; Command="docker --version"; Status="PASS"; Summary="Docker CLI available."; Output="WARNING: Error loading config file: open C:\Users\ELCOT\.docker\config.json: Access is denied.`nDocker version 29.6.1, build 8900f1d"},
  @{Step="8"; Command="docker compose version"; Status="PASS"; Summary="Docker Compose available."; Output="WARNING: Error loading config file: open C:\Users\ELCOT\.docker\config.json: Access is denied.`nDocker Compose version v5.2.0"},
  @{Step="9a"; Command="docker compose build"; Status="FAIL"; Summary="Sandbox attempt failed on Docker buildx permission."; Output="CreateFile C:\Users\ELCOT\.docker\buildx\instances: Access is denied."},
  @{Step="9b"; Command="docker compose build (escalated retry)"; Status="PASS"; Summary="Backend and frontend images built."; Output="Image ecommerce-store-backend Built`nImage ecommerce-store-frontend Built"},
  @{Step="10a"; Command="docker compose up --detach"; Status="FAIL"; Summary="Sandbox attempt could not connect to Docker API."; Output="unable to get image 'redis:7-alpine': permission denied while trying to connect to the docker API at npipe:////./pipe/docker_engine"},
  @{Step="10b"; Command="docker compose up --detach (escalated retry)"; Status="PASS"; Summary="Stack started; backend became healthy; frontend started."; Output="Container ecommerce-store-backend-1 Healthy`nContainer ecommerce-store-frontend-1 Started"},
  @{Step="11"; Command="Invoke-WebRequest http://localhost:5173"; Status="PASS"; Summary="Frontend returned 200 OK."; Output="StatusCode 200 OK"},
  @{Step="12"; Command="Invoke-WebRequest http://localhost:8000/health"; Status="PASS"; Summary="Backend health returned 200 OK."; Output='StatusCode 200 OK Content {"status":"healthy","version":"1.0.0"}'},
  @{Step="13"; Command="DB connectivity via backend startup/logs"; Status="PASS"; Summary="PostgreSQL ready, Alembic complete, seed complete."; Output="[Startup] PostgreSQL Ready`n[Startup] Alembic Complete`n[Startup] Database Seed Complete"},
  @{Step="14"; Command="Browser console capture"; Status="FAIL"; Summary="Attempted through Playwright; Chromium could not launch in container."; Output="browserType.launch: Failed to launch: Error: spawn /root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome ENOENT"},
  @{Step="15"; Command="Build errors"; Status="FAIL"; Summary="Host npm build failed; Docker image build passed."; Output="Host: npm command not recognized.`nDocker: backend and frontend images built."},
  @{Step="16"; Command="Runtime errors"; Status="PASS"; Summary="Frontend/backend server logs did not show fatal runtime errors; one expected unauthenticated 401 was observed."; Output="frontend: VITE ready in 757 ms.`nbackend: Application startup complete.`nbackend: GET /api/v1/auth/me 401 (expected without auth)."}
)

$Issues = @(
  "Theme tokens: Tailwind brand scale is all black; restore semantic brand colors.",
  "Dark mode: Footer, hero, catalog, admin contact, and dashboard use hard-coded light colors.",
  "Navigation: Product details and checkout still use legacy /login instead of /auth/login.",
  "Catalog: Mobile menu category slugs are plural and can mismatch backend canonical category slugs.",
  "Mobile UX: ProductCard add-to-cart is hover-only; make it visible on touch devices.",
  "Filters: FilterDrawer is fixed at 420px and can overflow narrow mobile screens.",
  "Code quality: Production console.log statements remain in auth/product/order/admin flows.",
  "Contact inbox: Mojibake symbols and raw light-mode UI reduce professional polish.",
  "Forms: Auth and checkout need persistent inline errors with aria-describedby.",
  "Performance: CSS @import for fonts and image dimension gaps can affect rendering and layout shift."
)

AddPage
Rect 0 0 612 792 @(0.06,0.08,0.13) $true
Rect 48 610 516 96 @(0.11,0.16,0.27) $true
Text "LIVE QA AUTOMATION REPORT" 72 660 26 $true @(1,1,1)
Text "Static Code Analysis + Runtime Verification" 72 632 15 $false @(0.84,0.89,0.98)
Text "Project: D:\ecommerce-store" 72 560 11 $false @(0.78,0.83,0.91)
Text "Generated: $GeneratedOn" 72 538 10 $false @(0.78,0.83,0.91)
Text "Prepared by: Senior QA Automation Engineer" 72 516 10 $false @(0.78,0.83,0.91)
Rect 72 390 142 58 @(0.95,0.97,1.0) $true
Text "173" 92 425 20 $true @(0.06,0.08,0.13)
Text "JS/JSX files" 92 405 8 $false @(0.25,0.29,0.36)
Rect 236 390 142 58 @(0.95,0.97,1.0) $true
Text "31+" 256 425 20 $true @(0.06,0.08,0.13)
Text "page surfaces" 256 405 8 $false @(0.25,0.29,0.36)
Rect 400 390 142 58 @(0.95,0.97,1.0) $true
Text "16" 420 425 20 $true @(0.06,0.08,0.13)
Text "verification steps" 420 405 8 $false @(0.25,0.29,0.36)

AddPage "1. Project Information"
Para "This report combines static source-code inspection with live environment verification. The audited application is a React/Vite ecommerce storefront and admin dashboard with FastAPI backend, Docker Compose runtime, Redis, Nginx, and Supabase PostgreSQL connectivity."
Para "Frontend stack observed: React 18, Vite, Redux Toolkit, React Query, Tailwind CSS, Firebase, Razorpay, lucide-react, react-hot-toast, and Playwright dependency inside the frontend container."
Para "Routes reviewed include storefront home, products, product detail, custom products, offers, cart, wishlist, checkout, tracking, auth, profile, orders, support/footer pages, not-found, and admin dashboard/products/categories/custom products/orders/offers/customers/contact/settings/banners."

AddPage "2. Environment Verification"
Text "Step" 52 $script:Y 8 $true
Text "Command" 116 $script:Y 8 $true
Text "Status" 320 $script:Y 8 $true
Text "Summary" 370 $script:Y 8 $true
$script:Y -= 22
foreach ($r in $Results) { ResultRow $r.Step $r.Command $r.Status $r.Summary }

AddPage "3. Build Verification"
Heading "Host NPM Build"
Para "Host build verification failed because node and npm are not recognized in this PowerShell environment. This is proven by direct command output from node -v, npm -v, npm install, npm run lint, npm run build, and npm test."
Heading "Docker Build"
Para "Docker Compose build initially failed inside sandbox due Docker config/buildx access. Escalated retry passed and produced backend and frontend images successfully."
Heading "Test Verification"
Para "npm test was attempted in frontend and failed because npm is not recognized on the host. No test suite result could be produced from host npm. Docker container dependency startup reported frontend dependencies up-to-date, but no dedicated test command was executed inside container because the requested command was npm test."

AddPage "4. Runtime Verification"
Para "Docker Compose up was executed in detached mode to avoid leaving a foreground process running. The sandbox attempt failed due Docker API permission, then escalated retry passed."
Para "Container status showed ecommerce-store-frontend-1 up on port 5173, ecommerce-store-backend-1 up and healthy on port 8000, nginx up on port 80, adminer up on 8080, and redis running."
Para "Frontend verification: http://localhost:5173 returned 200 OK."
Para "Backend verification: http://localhost:8000/health returned 200 OK with content {status: healthy, version: 1.0.0}."
Para "Database connectivity: backend logs show PostgreSQL Ready, Alembic Complete, database seed complete, and live API endpoints returning 200. This verifies backend-to-database connectivity through application startup and API behavior."
Para "Runtime logs: no fatal backend/frontend runtime errors were captured. Backend showed one GET /api/v1/auth/me 401, which is expected for an unauthenticated request."

AddPage "5. Docker Verification"
Para "Docker CLI: PASS with Docker version 29.6.1, build 8900f1d. The CLI also emitted a config access warning."
Para "Docker Compose: PASS with Docker Compose version v5.2.0. Compose build and up passed after escalation."
Para "Important note: The non-escalated Docker API/buildx attempts failed due local Docker config/API permissions. The final Docker runtime verification passed outside sandbox."

AddPage "6. UI Analysis"
Para "The UI has a solid structure and includes meaningful shells for storefront/admin, product grids, admin tables, checkout overlays, cart drawer, and reusable UI primitives. However, the visual system is inconsistent because several modules bypass theme tokens and use hard-coded black, white, gray, or hex colors."
Para "The highest-impact UI fixes are dark-mode consistency, brand token repair, footer color cleanup, catalog title and toolbar token cleanup, contact inbox polish, and mobile product-card CTA visibility."

AddPage "7. Component Analysis"
Heading "Working Properly"
foreach ($x in @("CartDrawer and CartEmpty have strong baseline states.", "ProductGrid has skeleton and empty state support.", "Checkout PaymentSection handles loading and no-payment-method states.", "Admin ProductsPage has mobile cards, desktop table, pagination, and error boundary.", "Docker runtime verified frontend and backend serving successfully.")) { Para "- $x" }
Heading "Needs Changes"
foreach ($x in @("StoreHeader slug routing.", "StoreFooter dark-mode tokens.", "HeroSection fallback styling.", "ProductList filter/search consistency.", "ProductCard mobile CTA and rating.", "FilterDrawer mobile width.", "ProductDetails and Checkout auth redirects.", "ContactMessagesPage mojibake and theme cleanup.", "Global console.log cleanup.")) { Para "- $x" }
Heading "Unused / Duplicate / Suspicious"
foreach ($x in @("ProductFilters imported but not rendered in ProductList.", "CustomerProfilePage appears not routed.", "Duplicate Modal and Badge components exist under shared/common and shared/ui.", "Duplicate cart drawer paths exist under storeheaders and shoppingcart.", "Admin and shared PageHeader variants create inconsistent page headers.")) { Para "- $x" }

AddPage "8. Issue List"
$n = 1
foreach ($issue in $Issues) {
  Need 45
  Text "$n." 54 $script:Y 9 $true @(0.06,0.08,0.13)
  Para $issue 76 460 9 @(0.25,0.29,0.36)
  $n++
}

AddPage "9. Recommendations"
Heading "Critical Fixes"
foreach ($x in @("Fix /login redirects to /auth/login.", "Normalize category slugs.", "Repair Tailwind brand tokens and theme variables.", "Make product add-to-cart visible on mobile.", "Fix FilterDrawer width with w-full max-w-[420px].")) { Para "- $x" }
Heading "Medium Fixes"
foreach ($x in @("Remove or guard production console.log statements.", "Replace mojibake with lucide icons/text.", "Add inline validation and aria-describedby.", "Standardize duplicate shared UI primitives.", "Move font loading out of CSS @import and add image dimensions where possible.")) { Para "- $x" }
Heading "Minor Fixes"
foreach ($x in @("Fix cart CTA typo.", "Convert nested absolute route paths to relative child paths.", "Improve category empty/error state.", "Add stronger screenshot-based regression coverage.")) { Para "- $x" }

AddPage "10. Final Score"
Score "UI Score" 72 54 650
Score "UX Score" 68 230 650
Score "Accessibility" 64 406 650
Score "Performance" 70 54 570
Score "Responsive" 66 230 570
Score "Code Quality" 69 406 570
Rect 54 448 502 74 @(0.94,0.98,0.96) $true
Text "Overall Health" 74 490 13 $true @(0.10,0.35,0.22)
Text "68%" 74 462 24 $true @(0.10,0.48,0.25)
Para "Readiness: Moderate. Runtime Docker verification passed, but host npm tooling is unavailable, browser console capture is blocked by Chromium runtime compatibility in the container, and multiple P1/P2 UI issues remain." 54 500 9

AddPage "11. Appendix - Command Outputs"
foreach ($r in $Results) {
  Need 105
  Text ("Step " + $r.Step + " - " + $r.Command + " - " + $r.Status) 48 $script:Y 10 $true @(0.06,0.08,0.13)
  $script:Y -= 14
  Rect 54 ($script:Y - 58) 492 66 @(0.97,0.98,0.99) $true
  Para $r.Output 62 470 7 @(0.18,0.22,0.30)
  $script:Y -= 10
}

for ($i=0; $i -lt $Pages.Count; $i++) {
  $script:Current = $Pages[$i]
  Line 48 38 548 38
  Text "UI_QA_Report.pdf" 48 22 8 $false @(0.45,0.49,0.57)
  Text ("Page " + ($i+1) + " of " + $Pages.Count) 488 22 8 $false @(0.45,0.49,0.57)
}

function Obj([string]$Body) { [void]$script:Objects.Add($Body); return $script:Objects.Count }
$f1 = Obj "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
$f2 = Obj "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
$pagesObj = Obj "PAGES_PLACEHOLDER"
$refs = New-Object System.Collections.ArrayList
$enc = [System.Text.Encoding]::ASCII
foreach ($page in $Pages) {
  $stream = ($page -join "`n")
  $bytes = $enc.GetBytes($stream)
  $content = Obj ("<< /Length {0} >>`nstream`n{1}`nendstream" -f $bytes.Length,$stream)
  $pageObj = Obj ("<< /Type /Page /Parent {0} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 {1} 0 R /F2 {2} 0 R >> >> /Contents {3} 0 R >>" -f $pagesObj,$f1,$f2,$content)
  [void]$refs.Add("$pageObj 0 R")
}
$Objects[$pagesObj-1] = ("<< /Type /Pages /Kids [{0}] /Count {1} >>" -f ($refs -join " "),$Pages.Count)
$catalog = Obj ("<< /Type /Catalog /Pages {0} 0 R >>" -f $pagesObj)

$ms = New-Object System.IO.MemoryStream
function W([string]$s) { $b=[System.Text.Encoding]::ASCII.GetBytes($s); $script:ms.Write($b,0,$b.Length) }
W "%PDF-1.4`n% Live QA Report`n"
$offsets = @(0)
for ($i=0; $i -lt $Objects.Count; $i++) {
  $offsets += $ms.Position
  W ("{0} 0 obj`n{1}`nendobj`n" -f ($i+1),$Objects[$i])
}
$xref = $ms.Position
W ("xref`n0 {0}`n" -f ($Objects.Count+1))
W "0000000000 65535 f `n"
for ($i=1; $i -lt $offsets.Count; $i++) { W ("{0:0000000000} 00000 n `n" -f $offsets[$i]) }
W ("trailer`n<< /Size {0} /Root {1} 0 R >>`nstartxref`n{2}`n%%EOF`n" -f ($Objects.Count+1),$catalog,$xref)
[System.IO.File]::WriteAllBytes($OutputPath,$ms.ToArray())
Write-Host "Generated $OutputPath"
