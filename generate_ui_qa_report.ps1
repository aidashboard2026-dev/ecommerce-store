$ErrorActionPreference = "Stop"

$OutputPath = Join-Path (Get-Location) "UI_QA_Report.pdf"
$GeneratedOn = Get-Date -Format "yyyy-MM-dd HH:mm"

function Escape-PdfText {
  param([string]$Text)
  if ($null -eq $Text) { return "" }
  return ($Text -replace "\\", "\\") -replace "\(", "\(" -replace "\)", "\)"
}

function New-PdfReport {
  return [ordered]@{
    Pages = New-Object System.Collections.ArrayList
    Current = $null
    Y = 760
  }
}

function Add-Page {
  param($Doc, [string]$Title = "")
  $page = New-Object System.Collections.ArrayList
  [void]$Doc.Pages.Add($page)
  $Doc.Current = $page
  $Doc.Y = 760
  if ($Title) {
    Add-Text $Doc $Title 48 $Doc.Y 18 $true @(0.07, 0.09, 0.15)
    $Doc.Y -= 18
    Add-Line $Doc 48 $Doc.Y 548 $Doc.Y @(0.83, 0.86, 0.90)
    $Doc.Y -= 24
  }
}

function Add-Raw {
  param($Doc, [string]$Raw)
  [void]$Doc.Current.Add($Raw)
}

function Add-Text {
  param($Doc, [string]$Text, [double]$X, [double]$Y, [double]$Size = 10, [bool]$Bold = $false, [array]$Color = @(0.12,0.16,0.22))
  $font = if ($Bold) { "F2" } else { "F1" }
  $escaped = Escape-PdfText $Text
  Add-Raw $Doc ("BT {0:N3} {1:N3} {2:N3} rg /{3} {4:N1} Tf {5:N1} {6:N1} Td ({7}) Tj ET" -f $Color[0],$Color[1],$Color[2],$font,$Size,$X,$Y,$escaped)
}

function Add-Line {
  param($Doc, [double]$X1, [double]$Y1, [double]$X2, [double]$Y2, [array]$Color = @(0.85,0.87,0.91))
  Add-Raw $Doc ("{0:N3} {1:N3} {2:N3} RG 0.7 w {3:N1} {4:N1} m {5:N1} {6:N1} l S" -f $Color[0],$Color[1],$Color[2],$X1,$Y1,$X2,$Y2)
}

function Add-Rect {
  param($Doc, [double]$X, [double]$Y, [double]$W, [double]$H, [array]$Color = @(0.95,0.96,0.98), [bool]$Fill = $true)
  $op = if ($Fill) { "f" } else { "S" }
  $cmd = if ($Fill) { "rg" } else { "RG" }
  Add-Raw $Doc ("{0:N3} {1:N3} {2:N3} {3} {4:N1} {5:N1} {6:N1} {7:N1} re {8}" -f $Color[0],$Color[1],$Color[2],$cmd,$X,$Y,$W,$H,$op)
}

function Ensure-Space {
  param($Doc, [double]$Need = 60)
  if ($Doc.Y -lt $Need) {
    Add-Page $Doc
  }
}

function Add-Paragraph {
  param($Doc, [string]$Text, [double]$X = 48, [double]$Width = 500, [double]$Size = 10, [array]$Color = @(0.25,0.29,0.36))
  $maxChars = [Math]::Max(35, [int]($Width / ($Size * 0.48)))
  $words = $Text -split "\s+"
  $line = ""
  foreach ($word in $words) {
    $candidate = if ($line) { "$line $word" } else { $word }
    if ($candidate.Length -gt $maxChars) {
      Ensure-Space $Doc 60
      Add-Text $Doc $line $X $Doc.Y $Size $false $Color
      $Doc.Y -= ($Size + 5)
      $line = $word
    } else {
      $line = $candidate
    }
  }
  if ($line) {
    Ensure-Space $Doc 60
    Add-Text $Doc $line $X $Doc.Y $Size $false $Color
    $Doc.Y -= ($Size + 8)
  }
}

function Add-SectionHeading {
  param($Doc, [string]$Text)
  Ensure-Space $Doc 80
  Add-Text $Doc $Text 48 $Doc.Y 14 $true @(0.07,0.09,0.15)
  $Doc.Y -= 18
}

function Get-SeverityColor {
  param([string]$Severity)
  switch ($Severity) {
    "Critical" { return @(0.70,0.10,0.13) }
    "High"     { return @(0.91,0.25,0.18) }
    "Medium"   { return @(0.92,0.55,0.13) }
    default    { return @(0.25,0.48,0.86) }
  }
}

function Add-SeverityBadge {
  param($Doc, [string]$Severity, [double]$X, [double]$Y)
  $c = Get-SeverityColor $Severity
  Add-Rect $Doc $X ($Y - 4) 54 14 $c $true
  Add-Text $Doc $Severity ($X + 5) $Y 7 $true @(1,1,1)
}

function Add-ScoreCard {
  param($Doc, [string]$Label, [int]$Score, [double]$X, [double]$Y)
  Add-Rect $Doc $X $Y 150 54 @(0.96,0.97,0.99) $true
  Add-Rect $Doc $X $Y 150 54 @(0.82,0.85,0.90) $false
  Add-Text $Doc $Label ($X + 10) ($Y + 34) 9 $true @(0.18,0.22,0.30)
  $color = if ($Score -ge 80) { @(0.12,0.55,0.30) } elseif ($Score -ge 70) { @(0.92,0.55,0.13) } else { @(0.86,0.20,0.18) }
  Add-Text $Doc "$Score / 100" ($X + 10) ($Y + 14) 16 $true $color
}

function Add-KeyValue {
  param($Doc, [string]$Key, [string]$Value)
  Ensure-Space $Doc 60
  Add-Text $Doc $Key 54 $Doc.Y 9 $true @(0.15,0.18,0.25)
  Add-Paragraph $Doc $Value 170 370 9 @(0.30,0.34,0.42)
  $Doc.Y += 4
}

function Add-Issue {
  param($Doc, [hashtable]$Issue, [int]$Index)
  Ensure-Space $Doc 150
  Add-Rect $Doc 48 ($Doc.Y - 104) 500 116 @(0.985,0.988,0.995) $true
  Add-Rect $Doc 48 ($Doc.Y - 104) 500 116 @(0.84,0.87,0.92) $false
  Add-Text $Doc ("{0}. {1} - {2}" -f $Index, $Issue.Page, $Issue.Section) 58 $Doc.Y 11 $true @(0.08,0.10,0.15)
  Add-SeverityBadge $Doc $Issue.Severity 482 $Doc.Y
  $Doc.Y -= 17
  Add-Text $Doc ("Component: {0}" -f $Issue.Component) 58 $Doc.Y 8 $true @(0.18,0.22,0.30)
  Add-Text $Doc ("Priority: {0} | Status: {1}" -f $Issue.Priority, $Issue.Status) 360 $Doc.Y 8 $true @(0.18,0.22,0.30)
  $Doc.Y -= 14
  Add-Text $Doc ("File: {0}" -f $Issue.File) 58 $Doc.Y 7 $false @(0.35,0.39,0.48)
  $Doc.Y -= 14
  Add-Paragraph $Doc ("Issue: " + $Issue.Description) 58 470 8 @(0.25,0.29,0.36)
  Add-Paragraph $Doc ("Expected: " + $Issue.Expected) 58 470 8 @(0.25,0.29,0.36)
  Add-Paragraph $Doc ("Actual: " + $Issue.Actual) 58 470 8 @(0.25,0.29,0.36)
  Add-Paragraph $Doc ("Suggested Fix: " + $Issue.Fix) 58 470 8 @(0.18,0.22,0.30)
  if ($Issue.Code) {
    Add-Paragraph $Doc ("Code Fix: " + $Issue.Code) 58 470 8 @(0.10,0.35,0.22)
  }
  $Doc.Y -= 8
}

function Add-SummaryRow {
  param($Doc, [string]$Page, [string]$Section, [string]$Component, [string]$Status, [string]$Severity, [string]$Action)
  Ensure-Space $Doc 56
  $y = $Doc.Y
  Add-Line $Doc 48 ($y + 8) 548 ($y + 8) @(0.88,0.90,0.94)
  Add-Text $Doc $Page 52 $y 7 $true @(0.10,0.13,0.20)
  Add-Text $Doc $Section 128 $y 7 $false @(0.28,0.32,0.40)
  Add-Text $Doc $Component 214 $y 7 $false @(0.28,0.32,0.40)
  Add-Text $Doc $Status 332 $y 7 $true $(if ($Status -eq "Pass") { @(0.12,0.55,0.30) } else { @(0.86,0.20,0.18) })
  Add-SeverityBadge $Doc $Severity 382 $y
  Add-Text $Doc $Action 444 $y 7 $false @(0.28,0.32,0.40)
  $Doc.Y -= 22
}

$Issues = @(
  @{ Page="Global"; Section="Theme"; Component="Tailwind brand tokens"; File="frontend/tailwind.config.js"; Severity="High"; Priority="P1"; Status="Fail"; Description="All brand color shades are configured as rgb(0,0,0), while CSS variables define indigo brand colors."; Expected="Brand color system should be consistent across light and dark UI."; Actual="Primary buttons, focus rings, badges, and CTAs collapse into black, reducing hierarchy."; Fix="Restore a real brand scale or map Tailwind brand values to CSS variables."; Code="brand: { 500: 'var(--color-brand)', 600: 'var(--color-brand-hover)' }" },
  @{ Page="Global"; Section="Theme"; Component="CSS utilities"; File="frontend/src/index.css"; Severity="Medium"; Priority="P1"; Status="Fail"; Description="--color-surface-hover is referenced but not defined."; Expected="Hover backgrounds should render consistently."; Actual="Some hover states can resolve to no background."; Fix="Define --color-surface-hover in :root and .dark."; Code=":root { --color-surface-hover: #f1f5f9; } .dark { --color-surface-hover: #27272a; }" },
  @{ Page="Storefront"; Section="Navigation"; Component="StoreHeader"; File="frontend/src/storefront/components/storeindex/StoreHeader.jsx"; Severity="High"; Priority="P1"; Status="Fail"; Description="Mobile nav category links use plural slugs like t-shirts and track-pants while category redirects and backend matching use canonical slugs like t-shirt and track-pant."; Expected="Clicking a category should always return filtered products."; Actual="Some menu links can lead to empty or inconsistent catalog results."; Fix="Normalize menu links to backend category slugs or centralize category route generation."; Code='to="/products?category=t-shirt&gender=Men"' },
  @{ Page="Products"; Section="Details"; Component="ProductDetails"; File="frontend/src/storefront/components/product/ProductDetails.jsx"; Severity="High"; Priority="P1"; Status="Fail"; Description="Product details auth CTA navigates to /login even though current auth route is /auth/login."; Expected="Auth redirects should use the canonical login route."; Actual="Legacy route causes avoidable redirects and can drop state."; Fix="Replace navigate('/login') with navigate('/auth/login')."; Code='navigate("/auth/login");' },
  @{ Page="Checkout"; Section="Payment/Auth"; Component="CheckoutPage"; File="frontend/src/storefront/pages/ordercheckout/CheckoutPage.jsx"; Severity="High"; Priority="P1"; Status="Fail"; Description="Checkout unauthorized/payment error flows navigate to /login."; Expected="All checkout auth recovery should route through /auth/login with from=/checkout state."; Actual="Legacy paths appear in payment failure and unauthorized handling."; Fix="Replace /login paths and preserve state."; Code='navigate("/auth/login", { state: { from: "/checkout" } });' },
  @{ Page="Products"; Section="Filters"; Component="FilterDrawer"; File="frontend/src/storefront/components/filters/FilterDrawer.jsx"; Severity="High"; Priority="P1"; Status="Fail"; Description="Filter drawer uses fixed w-[420px], which can overflow narrow phones."; Expected="Drawer should fit within viewport width."; Actual="Controls may be clipped on 320-390px devices."; Fix="Use full width with a max width."; Code='className="fixed right-0 top-0 ... w-full max-w-[420px] ..."' },
  @{ Page="Products"; Section="Product Card"; Component="ProductCard"; File="frontend/src/storefront/components/product/ProductCard.jsx"; Severity="High"; Priority="P1"; Status="Fail"; Description="Add to cart CTA is hover-only using group-hover transitions."; Expected="Touch users should see a clear persistent add action."; Actual="Mobile users may never discover quick add."; Fix="Make CTA visible on mobile and hover-revealed only on pointer devices."; Code='className="... translate-y-0 opacity-100 md:translate-y-12 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"' },
  @{ Page="Products"; Section="Product Card"; Component="ProductCard"; File="frontend/src/storefront/components/product/ProductCard.jsx"; Severity="Medium"; Priority="P2"; Status="Fail"; Description="Rating displays a hard-coded 4.5 for every product."; Expected="Rating should be data-driven or hidden."; Actual="Every product shows the same trust signal."; Fix="Bind to API rating/review count or remove the rating pill."; Code='product.rating ? product.rating.toFixed(1) : null' },
  @{ Page="Products"; Section="Catalog"; Component="ProductList"; File="frontend/src/storefront/components/product/ProductList.jsx"; Severity="Medium"; Priority="P2"; Status="Fail"; Description="ProductFilters is imported but not rendered, while a search input block is commented out."; Expected="Single coherent search/filter interface."; Actual="Dead code and partial controls increase maintenance risk."; Fix="Remove unused ProductFilters import or restore it as the canonical filter UI."; Code="Remove: import ProductFilters from '@/storefront/components/product/ProductFilters'" },
  @{ Page="Products"; Section="Dark Mode"; Component="ProductList"; File="frontend/src/storefront/components/product/ProductList.jsx"; Severity="High"; Priority="P1"; Status="Fail"; Description="Catalog page title uses text-black."; Expected="Text should use theme token text-app."; Actual="Title can be low contrast in dark mode."; Fix="Replace hard-coded text-black with text-app."; Code='className="font-display font-bold text-2xl sm:text-3xl text-app"' },
  @{ Page="Storefront"; Section="Footer"; Component="StoreFooter"; File="frontend/src/storefront/components/storeindex/StoreFooter.jsx"; Severity="High"; Priority="P1"; Status="Fail"; Description="Footer uses hard-coded #555555, #111111, and black button styles."; Expected="Footer should respect light/dark theme tokens."; Actual="Dark mode contrast is inconsistent."; Fix="Replace literal colors with text-muted, text-app, bg-brand, and border-app."; Code='const linkBase = "text-sm text-muted hover:text-app ...";' },
  @{ Page="Home"; Section="Hero"; Component="HeroSection"; File="frontend/src/storefront/components/home/HeroSection.jsx"; Severity="Medium"; Priority="P2"; Status="Fail"; Description="Static hero is forced white with decorative blobs and hard-coded black text."; Expected="Fallback hero should respect theme and show useful product imagery."; Actual="Dark mode breaks and design does not match the rest of the storefront."; Fix="Use bg-app/text-app tokens and preferably configured banner imagery."; Code='className="relative overflow-hidden bg-app border-b border-app"' },
  @{ Page="Cart"; Section="Empty State"; Component="CartPage"; File="frontend/src/storefront/pages/CartPage.jsx"; Severity="Low"; Priority="P1"; Status="Fail"; Description="Empty cart CTA contains typo: Start Shoppin."; Expected="Professional, correct copy."; Actual="Visible typo damages polish."; Fix="Change text to Start Shopping."; Code="Start Shopping" },
  @{ Page="Admin"; Section="Contact"; Component="ContactMessagesPage"; File="frontend/src/admin/pages/ContactMessagesPage.jsx"; Severity="High"; Priority="P1"; Status="Fail"; Description="Status labels and sort text contain mojibake characters, and the page uses hard-coded gray/light colors."; Expected="Clean icons and theme-aware admin UI."; Actual="Garbled symbols and poor dark-mode consistency."; Fix="Replace emoji strings with lucide icons/text, and use shared UI tokens."; Code="label: 'New'; use <Badge /> with icon prop" },
  @{ Page="Admin"; Section="Dashboard"; Component="DashboardPage"; File="frontend/src/admin/pages/DashboardPage.jsx"; Severity="Medium"; Priority="P2"; Status="Fail"; Description="Recent contact cards use bg-white and text-gray-600 inside a themed dashboard."; Expected="Dashboard cards should support dark mode."; Actual="Cards remain light or low contrast in dark mode."; Fix="Use bg-surface, text-muted, text-app, border-app."; Code='className="rounded-2xl border border-app p-4 bg-surface shadow-sm"' },
  @{ Page="Global"; Section="Console"; Component="Auth/Product flows"; File="Multiple frontend files"; Severity="Medium"; Priority="P2"; Status="Fail"; Description="Production console.log statements remain in login, product quick add, product details, orders, and admin forms."; Expected="Production console should be clean except meaningful handled errors."; Actual="Debug output can leak state and confuse QA monitoring."; Fix="Remove logs or guard with import.meta.env.DEV."; Code='if (import.meta.env.DEV) console.log(...)' },
  @{ Page="Admin"; Section="Architecture"; Component="PageHeader"; File="admin/layouts/MainLayout.jsx, shared/components/ui/PageHeader.jsx"; Severity="Medium"; Priority="P2"; Status="Fail"; Description="Admin uses multiple PageHeader implementations and nested headers in some pages."; Expected="One consistent admin page header API."; Actual="Duplicate header patterns create inconsistent spacing and controls."; Fix="Standardize on shared PageHeader or admin PageHeader, not both."; Code="Create one PageHeader contract: title, description, actions." },
  @{ Page="Storefront"; Section="Routes"; Component="AppRoutes"; File="frontend/src/shared/routes/AppRoutes.jsx"; Severity="Low"; Priority="P3"; Status="Fail"; Description="Nested StorefrontLayout routes include absolute child paths such as /about and /contact."; Expected="Child route paths should be relative inside the layout."; Actual="Works, but makes routing harder to reason about."; Fix="Remove leading slash for nested route paths."; Code='path="about"' },
  @{ Page="Global"; Section="Performance"; Component="Fonts/Images"; File="frontend/src/index.css and image components"; Severity="Medium"; Priority="P2"; Status="Fail"; Description="Google Fonts are imported through CSS @import and many images lack explicit width/height or responsive srcset."; Expected="Fonts and images should be optimized for render performance."; Actual="Potential render-blocking font load and layout shift."; Fix="Move font loading to index.html preconnect/preload and add dimensions/srcset where practical."; Code='<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' },
  @{ Page="Forms"; Section="Validation"; Component="Login/Register/Checkout"; File="auth and checkout components"; Severity="Medium"; Priority="P2"; Status="Fail"; Description="Several forms rely on toast-only or native validation without inline field feedback."; Expected="Users should see persistent field-level errors."; Actual="Errors can disappear and are less accessible."; Fix="Add aria-describedby and inline error text for critical fields."; Code='<p id="email-error" className="text-xs text-red-500">...</p>' }
)

$SummaryRows = @(
  @("Home","Hero/Category/Product sections","HeroSection, CategorySection, ProductGrid","Fail","Medium","Dark-mode and imagery polish"),
  @("Products","Catalog/Search/Filters","ProductList, SortDropdown, FilterDrawer","Fail","High","Fix mobile drawer, dark mode, dead filters"),
  @("Product Details","Gallery/Variants/CTA","ProductDetails","Fail","High","Fix auth route and mobile CTA consistency"),
  @("Cart","Drawer/Page/Empty State","CartDrawer, CartPage","Fail","Low","Fix typo; keep current empty state pattern"),
  @("Wishlist","Wishlist grid/empty","WishlistPage","Pass","Low","Minor image fallback polish"),
  @("Checkout","Address/Payment/Order state","CheckoutPage, PaymentSection","Fail","High","Fix auth paths and inline validation"),
  @("Login/Register","Auth forms","LoginForm, RegisterForm","Fail","Medium","Remove logs, add inline errors"),
  @("Orders","Customer/admin orders","OrdersPage, OrdersList","Fail","Medium","Clean logs, responsive status controls"),
  @("Admin Dashboard","Metrics/charts/activity","DashboardPage","Fail","Medium","Dark-mode card cleanup"),
  @("Admin Products","Table/cards/modals","ProductsPage, InlineProductForm","Pass","Low","Good states; reduce duplicate headers"),
  @("Admin Contact","Inbox/table/drawers","ContactMessagesPage","Fail","High","Fix mojibake and theme tokens"),
  @("Settings","Cards/forms/toggles","SettingsPage, settings components","Pass","Low","Continue using shared UI patterns"),
  @("Global","Theme/routing/performance","AppRoutes, index.css, tailwind","Fail","High","Tokens, routes, console cleanup")
)

$Doc = New-PdfReport

Add-Page $Doc
Add-Rect $Doc 0 0 612 792 @(0.06,0.08,0.13) $true
Add-Rect $Doc 48 612 516 92 @(0.11,0.16,0.27) $true
Add-Text $Doc "UI/UX QA REPORT" 72 660 28 $true @(1,1,1)
Add-Text $Doc "Ecommerce Store Frontend Audit" 72 632 15 $false @(0.84,0.89,0.98)
Add-Text $Doc "Prepared by: Senior Software QA Engineer / UI UX Expert / React Frontend Architect" 72 566 11 $false @(0.85,0.88,0.93)
Add-Text $Doc ("Generated: " + $GeneratedOn) 72 544 10 $false @(0.70,0.75,0.84)
Add-Text $Doc "Project path: D:\ecommerce-store" 72 522 10 $false @(0.70,0.75,0.84)
Add-Rect $Doc 72 380 150 70 @(0.95,0.97,1.0) $true
Add-Text $Doc "173" 92 420 24 $true @(0.07,0.09,0.15)
Add-Text $Doc "JS/JSX files checked" 92 398 9 $false @(0.22,0.27,0.36)
Add-Rect $Doc 236 380 150 70 @(0.95,0.97,1.0) $true
Add-Text $Doc "49+" 256 420 24 $true @(0.07,0.09,0.15)
Add-Text $Doc "Routes reviewed" 256 398 9 $false @(0.22,0.27,0.36)
Add-Rect $Doc 400 380 150 70 @(0.95,0.97,1.0) $true
Add-Text $Doc "20" 420 420 24 $true @(0.07,0.09,0.15)
Add-Text $Doc "Primary issues listed" 420 398 9 $false @(0.22,0.27,0.36)
Add-Text $Doc "Confidential QA deliverable for client/stakeholder review" 72 88 9 $false @(0.70,0.75,0.84)

Add-Page $Doc "Table Of Contents"
$toc = @(
  "1. Executive Summary",
  "2. Project Information",
  "3. UI Analysis",
  "4. UX Analysis",
  "5. Component Analysis",
  "6. Issue List",
  "7. Screenshot Placeholders",
  "8. Severity Charts",
  "9. Component Tables",
  "10. Score Cards",
  "11. Fix Recommendations",
  "12. Final Checklist",
  "13. Project Health Summary"
)
foreach ($item in $toc) {
  Add-Text $Doc $item 72 $Doc.Y 11 $false @(0.15,0.18,0.25)
  $Doc.Y -= 24
}

Add-Page $Doc "1. Executive Summary"
Add-Paragraph $Doc "This report audits the React frontend source code for UI quality, UX consistency, responsiveness, accessibility, performance, routing, API states, component quality, and maintainability. The application has a solid foundation with storefront and admin routing, reusable UI primitives, loading skeletons in many modules, cart/wishlist/checkout flows, and admin table/card views. The main release blockers are dark-mode inconsistencies, legacy navigation paths, mobile interaction gaps, hard-coded colors, console noise, and duplicate UI primitives."
Add-Paragraph $Doc "Live screenshot capture and browser-console verification were not completed because Node/NPM and Docker were unavailable in the execution environment. Findings are therefore based on source-code inspection, route analysis, and component-level UI/UX review. Screenshot placeholders are included for follow-up visual QA."
Add-SectionHeading $Doc "Overall Readiness"
Add-Paragraph $Doc "Overall project readiness is moderate. The product is usable and feature-rich, but needs a focused polish pass before production-grade client delivery. Estimated effort is 4 to 7 engineering days for P1/P2 fixes, plus 1 day for live browser QA across mobile, tablet, and desktop."

Add-Page $Doc "2. Project Information"
Add-KeyValue $Doc "Project" "Ecommerce Store"
Add-KeyValue $Doc "Frontend Stack" "React 18, Vite, Redux Toolkit, React Query, Tailwind CSS, lucide-react, Firebase, Razorpay integration."
Add-KeyValue $Doc "Audited Areas" "Storefront layout, admin layout, routing, theme tokens, home, catalog, product cards/details, wishlist, cart, checkout, auth, profile, orders, offers, dashboard, settings, contact inbox, banners, categories, custom products, forms, loading states, empty states, error states, responsiveness, accessibility, and performance."
Add-KeyValue $Doc "Files Checked" "173 JavaScript/JSX frontend files plus Tailwind and global CSS."
Add-KeyValue $Doc "Route Coverage" "Admin dashboard, products, categories, custom products, orders, offers, customers, contact, settings, banners; storefront home, products, details, cart, custom, offers, support, tracking, footer pages, wishlist, auth, checkout, profile, orders, not found."
Add-KeyValue $Doc "Verification Limitation" "Build/lint/runtime verification could not run because npm/npm.cmd and Docker daemon were unavailable in this shell."

Add-Page $Doc "3. UI Analysis"
Add-SectionHeading $Doc "Strengths"
foreach ($s in @(
  "Storefront and admin have clear layout separation.",
  "Cart drawer, checkout overlays, product grid skeletons, and admin product list states are meaningfully implemented.",
  "Admin Products page supports mobile cards and desktop table views.",
  "Checkout has payment-phase overlays and aria-live status announcements.",
  "Shared UI primitives exist for buttons, tables, badges, inputs, cards, drawers, and empty/loading states."
)) { Add-Paragraph $Doc ("- " + $s) }
Add-SectionHeading $Doc "UI Risks"
foreach ($s in @(
  "Hard-coded black/white/gray colors break dark mode across footer, hero, catalog, dashboard, and contact inbox.",
  "Tailwind brand palette is configured entirely as black, flattening visual hierarchy.",
  "Some admin pages are built with raw Tailwind light-mode styles instead of shared theme tokens.",
  "Mojibake characters appear in source comments and visible UI text in contact/status/order areas.",
  "Hover-only product actions reduce visibility and mobile usability."
)) { Add-Paragraph $Doc ("- " + $s) }

Add-Page $Doc "4. UX Analysis"
Add-SectionHeading $Doc "UX Strengths"
foreach ($s in @(
  "Checkout flow has clear payment states and recovery messaging.",
  "Cart and wishlist provide helpful empty states.",
  "Admin product management includes filters, bulk actions, pagination, and error boundaries.",
  "Support, footer, and order tracking routes are present for a complete storefront experience."
)) { Add-Paragraph $Doc ("- " + $s) }
Add-SectionHeading $Doc "UX Problems"
foreach ($s in @(
  "Category navigation can produce mismatched catalog results because of inconsistent slugs.",
  "Search/filter experience is split between header search, commented catalog search, imported unused filters, and drawer controls.",
  "Form validation relies too much on toast or native validation without persistent inline guidance.",
  "Legacy /login redirects create avoidable confusion in checkout/product flows.",
  "Mobile catalog add-to-cart is not discoverable because it depends on hover."
)) { Add-Paragraph $Doc ("- " + $s) }

Add-Page $Doc "5. Component Analysis"
Add-SectionHeading $Doc "Components Working Properly"
foreach ($s in @(
  "CartDrawer, CartEmpty, CartItem: good structure, dialog semantics, quantity controls, empty state.",
  "ProductGrid: skeleton and empty state pattern are present.",
  "Checkout PaymentSection: loading and no-payment-method states are present.",
  "Admin ProductsPage: mobile card view, desktop table, pagination, error boundary, loading and empty states.",
  "Settings components: ToggleSwitch, SettingsCard, PaymentMethodCard use a more consistent component pattern."
)) { Add-Paragraph $Doc ("- " + $s) }
Add-SectionHeading $Doc "Components Needing Changes"
foreach ($s in @(
  "StoreHeader, StoreFooter, HeroSection, ProductList, ProductCard, FilterDrawer, ProductDetails, CheckoutPage, ContactMessagesPage, DashboardPage, global theme files.",
  "LoginForm/RegisterForm need console cleanup and inline accessible validation.",
  "Admin PageHeader implementations should be standardized."
)) { Add-Paragraph $Doc ("- " + $s) }
Add-SectionHeading $Doc "Unused / Duplicate / Broken Components"
foreach ($s in @(
  "Unused or suspicious: ProductFilters imported but not rendered, CustomerProfilePage not routed, older StoreFrontFooterPages area appears stale.",
  "Duplicates: shared/common Modal and shared/ui Modal; shared/common Badge and shared/ui Badge; cart drawer under storeheaders and shoppingcart; admin/shared PageHeader variants.",
  "Broken or risky: ContactMessagesPage mojibake labels, legacy /login redirects, fixed-width filter drawer."
)) { Add-Paragraph $Doc ("- " + $s) }

Add-Page $Doc "6. Issue List"
$i = 1
foreach ($issue in $Issues) {
  Add-Issue $Doc $issue $i
  $i++
}

Add-Page $Doc "7. Screenshot Placeholders"
Add-Paragraph $Doc "Screenshots could not be captured in this environment. Capture the following after starting the app locally."
$shots = @(
  "Desktop storefront home - hero, category, product sections, footer dark mode.",
  "Mobile catalog - filter drawer, sort dropdown, product cards, add-to-cart CTA.",
  "Product details - image gallery, variants, wishlist, checkout redirect.",
  "Checkout - address form, payment method, empty cart, unauthorized auth modal.",
  "Admin dashboard - dark mode, recent messages, chart loading.",
  "Admin contact inbox - table, status badges, pagination, drawer, reply modal.",
  "Admin products - desktop table, mobile card list, manage catalog modal.",
  "Login/register - validation, loading state, password reveal."
)
foreach ($shot in $shots) {
  Ensure-Space $Doc 95
  Add-Rect $Doc 58 ($Doc.Y - 54) 480 64 @(0.96,0.97,0.99) $true
  Add-Rect $Doc 58 ($Doc.Y - 54) 480 64 @(0.70,0.74,0.82) $false
  Add-Text $Doc "Screenshot Placeholder" 72 ($Doc.Y - 14) 9 $true @(0.20,0.24,0.32)
  Add-Paragraph $Doc $shot 72 440 8 @(0.35,0.39,0.48)
  $Doc.Y -= 18
}

Add-Page $Doc "8. Severity Charts"
$sevCounts = @{}
foreach ($issue in $Issues) { $sevCounts[$issue.Severity] = 1 + ($sevCounts[$issue.Severity] -as [int]) }
Add-Paragraph $Doc "Severity distribution from the audited issue list."
$chartY = $Doc.Y - 20
foreach ($sev in @("Critical","High","Medium","Low")) {
  $count = ($sevCounts[$sev] -as [int])
  $color = Get-SeverityColor $sev
  Add-Text $Doc $sev 72 $chartY 10 $true @(0.12,0.16,0.22)
  Add-Rect $Doc 160 ($chartY - 5) ([Math]::Max(4, $count * 18)) 12 $color $true
  Add-Text $Doc "$count" (170 + [Math]::Max(4, $count * 18)) $chartY 9 $true @(0.12,0.16,0.22)
  $chartY -= 32
}
$Doc.Y = $chartY - 20
Add-SectionHeading $Doc "Priority Distribution"
foreach ($p in @("P1","P2","P3")) {
  $count = ($Issues | Where-Object { $_.Priority -eq $p }).Count
  Add-Paragraph $Doc ("- " + $p + ": " + $count + " items")
}

Add-Page $Doc "9. Component Tables"
Add-Text $Doc "Page" 52 $Doc.Y 8 $true @(0.10,0.13,0.20)
Add-Text $Doc "Section" 128 $Doc.Y 8 $true @(0.10,0.13,0.20)
Add-Text $Doc "Component" 214 $Doc.Y 8 $true @(0.10,0.13,0.20)
Add-Text $Doc "Status" 332 $Doc.Y 8 $true @(0.10,0.13,0.20)
Add-Text $Doc "Severity" 382 $Doc.Y 8 $true @(0.10,0.13,0.20)
Add-Text $Doc "Action Required" 444 $Doc.Y 8 $true @(0.10,0.13,0.20)
$Doc.Y -= 20
foreach ($row in $SummaryRows) {
  Add-SummaryRow $Doc $row[0] $row[1] $row[2] $row[3] $row[4] $row[5]
}

Add-Page $Doc "10. Score Cards"
Add-ScoreCard $Doc "UI Score" 72 54 650
Add-ScoreCard $Doc "UX Score" 68 230 650
Add-ScoreCard $Doc "Accessibility" 64 406 650
Add-ScoreCard $Doc "Performance" 66 54 570
Add-ScoreCard $Doc "Responsive" 66 230 570
Add-ScoreCard $Doc "Code Quality" 70 406 570
Add-Rect $Doc 54 450 502 70 @(0.94,0.98,0.96) $true
Add-Text $Doc "Overall Health" 74 490 12 $true @(0.12,0.35,0.22)
Add-Text $Doc "68%" 74 462 24 $true @(0.12,0.55,0.30)
Add-Paragraph $Doc "Health classification: Moderate. The app is functionally broad and close to production, but requires a focused P1/P2 polish pass across theme, navigation, mobile UX, accessibility, and console cleanliness." 54 500 10 @(0.25,0.29,0.36)

Add-Page $Doc "11. Fix Recommendations"
Add-SectionHeading $Doc "Critical Fixes"
foreach ($s in @(
  "Fix all /login redirects to /auth/login and preserve from state.",
  "Normalize category slugs between header, redirects, and backend category data.",
  "Repair brand tokens and dark-mode hard-coded colors.",
  "Make product add-to-cart usable on mobile.",
  "Fix filter drawer width for small devices."
)) { Add-Paragraph $Doc ("- " + $s) }
Add-SectionHeading $Doc "Medium Fixes"
foreach ($s in @(
  "Remove production console.log statements.",
  "Replace mojibake symbols with clean text or lucide icons.",
  "Standardize PageHeader, Modal, Badge, and CartDrawer duplicates.",
  "Add inline validation to auth and checkout forms.",
  "Optimize font loading and image dimensions."
)) { Add-Paragraph $Doc ("- " + $s) }
Add-SectionHeading $Doc "Minor Improvements"
foreach ($s in @(
  "Fix copy typo in empty cart CTA.",
  "Convert nested absolute route paths to relative paths.",
  "Improve empty states in homepage category failure cases.",
  "Add richer skeletons to admin contact and category modules.",
  "Add accessible focus trap validation for drawers/modals."
)) { Add-Paragraph $Doc ("- " + $s) }

Add-Page $Doc "12. Final Checklist"
$checks = @("Header","Footer","Navigation","Home","Products","Cart","Checkout","Login","Register","Dashboard","Mobile","Tablet","Desktop","Accessibility","Performance","SEO","Security")
foreach ($c in $checks) {
  Add-Paragraph $Doc ("[ ] " + $c)
}
Add-SectionHeading $Doc "Recommended Verification Commands"
Add-Paragraph $Doc "When local tooling is available, run: npm run build, npm run lint, and browser QA with desktop 1440px, tablet 768px, mobile 390px and 320px. Capture console output, network failures, and screenshots for all screenshot placeholders."

Add-Page $Doc "13. Project Health Summary"
Add-KeyValue $Doc "Total Components Checked" "Approximately 120 frontend components plus pages, stores, hooks, and shared utilities from 173 JS/JSX files."
Add-KeyValue $Doc "Total Pages Checked" "31 routed page surfaces and route variants across storefront and admin."
Add-KeyValue $Doc "Passed" "Core cart drawer, product grid skeletons, checkout loading overlays, payment unavailable state, admin product list states, settings component patterns."
Add-KeyValue $Doc "Failed" "20 documented issues, with the highest risk in theme/dark mode, route consistency, mobile catalog UX, contact page polish, and console output."
Add-KeyValue $Doc "Warnings" "Live browser QA, screenshots, build, lint, React runtime warnings, and real API loading behavior still require verification in a running environment."
Add-KeyValue $Doc "Estimated Time To Fix" "P1 fixes: 1.5 to 2.5 days. P2 fixes: 2 to 4 days. Final responsive/browser QA: 1 day."
Add-KeyValue $Doc "Overall Project Readiness" "Moderate readiness. Suitable for internal/demo use; not yet client-polished for production without P1 and main P2 fixes."

for ($p = 0; $p -lt $Doc.Pages.Count; $p++) {
  $pageNumber = $p + 1
  $Doc.Current = $Doc.Pages[$p]
  Add-Line $Doc 48 38 548 38 @(0.86,0.88,0.92)
  Add-Text $Doc "UI_QA_Report.pdf" 48 22 8 $false @(0.45,0.49,0.57)
  Add-Text $Doc ("Page " + $pageNumber + " of " + $Doc.Pages.Count) 486 22 8 $false @(0.45,0.49,0.57)
}

$objects = New-Object System.Collections.ArrayList
function Add-Obj([string]$Body) {
  [void]$script:objects.Add($Body)
  return $script:objects.Count
}

$font1 = Add-Obj "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
$font2 = Add-Obj "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
$pagesObj = Add-Obj "PAGES_PLACEHOLDER"
$pageRefs = New-Object System.Collections.ArrayList
$encoding = [System.Text.Encoding]::ASCII

foreach ($page in $Doc.Pages) {
  $streamText = ($page -join "`n")
  $bytes = $encoding.GetBytes($streamText)
  $contentObj = Add-Obj ("<< /Length {0} >>`nstream`n{1}`nendstream" -f $bytes.Length, $streamText)
  $pageObj = Add-Obj ("<< /Type /Page /Parent {0} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 {1} 0 R /F2 {2} 0 R >> >> /Contents {3} 0 R >>" -f $pagesObj,$font1,$font2,$contentObj)
  [void]$pageRefs.Add("$pageObj 0 R")
}

$objects[$pagesObj - 1] = ("<< /Type /Pages /Kids [{0}] /Count {1} >>" -f ($pageRefs -join " "), $Doc.Pages.Count)
$catalogObj = Add-Obj ("<< /Type /Catalog /Pages {0} 0 R >>" -f $pagesObj)

$ms = New-Object System.IO.MemoryStream
function Write-Ascii([string]$s) {
  $b = [System.Text.Encoding]::ASCII.GetBytes($s)
  $script:ms.Write($b, 0, $b.Length)
}

Write-Ascii "%PDF-1.4`n% UI QA Report`n"
$offsets = @(0)
for ($idx = 0; $idx -lt $objects.Count; $idx++) {
  $offsets += $ms.Position
  Write-Ascii ("{0} 0 obj`n{1}`nendobj`n" -f ($idx + 1), $objects[$idx])
}
$xref = $ms.Position
Write-Ascii ("xref`n0 {0}`n" -f ($objects.Count + 1))
Write-Ascii "0000000000 65535 f `n"
for ($idx = 1; $idx -lt $offsets.Count; $idx++) {
  Write-Ascii ("{0:0000000000} 00000 n `n" -f $offsets[$idx])
}
Write-Ascii ("trailer`n<< /Size {0} /Root {1} 0 R >>`nstartxref`n{2}`n%%EOF`n" -f ($objects.Count + 1), $catalogObj, $xref)
[System.IO.File]::WriteAllBytes($OutputPath, $ms.ToArray())
Write-Host "Generated $OutputPath"
