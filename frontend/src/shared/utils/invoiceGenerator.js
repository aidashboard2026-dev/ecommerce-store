import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

/* ===========================================================
   COLORS
=========================================================== */

const BLACK = [0, 0, 0];
const DARK = [40, 40, 40];
const GRAY = [110, 110, 110];
const LIGHT = [245, 245, 245];
const BORDER = [170, 170, 170];

/* ===========================================================
   PAGE
=========================================================== */

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

const LEFT = 10;
const RIGHT = 200;

/* ===========================================================
   HELPERS
=========================================================== */

function hr(pdf, y) {
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.2);
  pdf.line(LEFT, y, RIGHT, y);
}

function drawBox(pdf, x, y, w, h) {
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.2);
  pdf.rect(x, y, w, h);
}

function bold(pdf, size = 8) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(size);
  pdf.setTextColor(...BLACK);
}

function normal(pdf, size = 8) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(size);
  pdf.setTextColor(...DARK);
}

function gray(pdf, size = 7) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(size);
  pdf.setTextColor(...GRAY);
}

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  SGD: 'S$',
  AED: 'د.إ',
};

function money(value) {
  const currency = localStorage.getItem('store_currency') || 'INR';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return Number(value || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function drawAmount(pdf, amount, x, y, size = 7, boldText = false) {

  pdf.setFont(
    "courier",
    boldText ? "bold" : "normal"
  );

  pdf.setFontSize(size);

  pdf.setTextColor(...BLACK);

  const currency = localStorage.getItem('store_currency') || 'INR';
  const symbol = CURRENCY_SYMBOLS[currency] || '₹';

  pdf.text(
    symbol,
    x - 18,
    y,
    {
      align: "right"
    }
  );

  pdf.text(
    money(amount),
    x,
    y,
    {
      align: "right"
    }
  );

}

function safe(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  return String(value);
}

function formatDate(date) {

  if (!date) return "-";

  try {

    return date.split("T")[0];

  } catch {

    return "-";

  }

}

/* ===========================================================
   MAIN
=========================================================== */

export async function generateInvoice(order) {

  const pdf = new jsPDF({

    orientation: "portrait",

    unit: "mm",

    format: "a4"

  });

  pdf.setFillColor(255,255,255);

  pdf.rect(
    0,
    0,
    PAGE_WIDTH,
    PAGE_HEIGHT,
    "F"
  );

  /* ========================================================
     COMPANY (TOP LEFT)
  ======================================================== */

  const storeName = localStorage.getItem('store_name') || "MY DESIGN PRIVATE LIMITED";
  const storeCountry = localStorage.getItem('store_country') || "India";

  bold(pdf,10);

  pdf.text(
    `Sold By : ${storeName.toUpperCase()}`,
    10,
    12
  );

  gray(pdf,7);

  pdf.text(
    "Registered Office:",
    10,
    17
  );

  pdf.text(
    "Thipaati, Pennagaram Main Road Dharmapuri,",
    32,
    17
  );

  pdf.text(
    storeCountry,
    "Pincode-636813,Tamil Nadu, India",
    10,
    21
  );

  bold(pdf,8);

  pdf.text(
    "GSTIN : XXXXXXXXXXXXXXX",
    10,
    28
  );

  /* ========================================================
     TITLE
  ======================================================== */

  bold(pdf,12);

  pdf.text(
    "TAX INVOICE",
    93,
    12
  );

  /* ========================================================
     INVOICE NUMBER BOX
  ======================================================== */

  drawBox(
    pdf,
    145,
    7,
    55,
    18
  );

  gray(pdf,7);

  pdf.text(
    "Invoice Number",
    148,
    13
  );

  bold(pdf,8);

  pdf.text(
    safe(order.order_number),
    148,
    20
  );

  /* ========================================================
     QR CODE
  ======================================================== */

  const storeUrl = localStorage.getItem('store_url') || window.location.origin;
  const qr = await QRCode.toDataURL(
    `${storeUrl}/orders/${safe(order.order_number)}`
  );

  pdf.addImage(
    qr,
    "PNG",
    176,
    30,
    18,
    18
  );

  hr(pdf,34);

  /* ========================================================
     NEXT PART START POSITION
  ======================================================== */

  let currentY = 42;

    /* ========================================================
     ORDER DETAILS + BILL TO + SHIP FROM + SHIP TO
  ======================================================== */

  // Column Widths
  const COL1 = 10;
  const COL2 = 58;
  const COL3 = 106;
  const COL4 = 154;

  //---------------------------------------------------------
  // ORDER DETAILS
  //---------------------------------------------------------

  bold(pdf, 8);

  pdf.text(
    "Order Details",
    COL1,
    currentY
  );

  normal(pdf, 7);

  pdf.text(
    `Order ID : ${safe(order.order_number)}`,
    COL1,
    currentY + 7
  );

  pdf.text(
    `Order Date : ${formatDate(order.ordered_at)}`,
    COL1,
    currentY + 13
  );

  pdf.text(
    `Invoice Date : ${formatDate(order.created_at || order.ordered_at)}`,
    COL1,
    currentY + 19
  );

  pdf.text(
    `Payment : ${safe(order.payment_method)}`,
    COL1,
    currentY + 25
  );

  pdf.text(
    `Status : ${safe(order.payment_status)}`,
    COL1,
    currentY + 31
  );

  //---------------------------------------------------------
  // BILL TO
  //---------------------------------------------------------

  bold(pdf, 8);

  pdf.text(
    "Bill To",
    COL2,
    currentY
  );

  normal(pdf, 7);

  pdf.text(
    safe(order.customer_name),
    COL2,
    currentY + 7
  );

  pdf.text(
    safe(order.address_line1),
    COL2,
    currentY + 13,
    {
      maxWidth: 42
    }
  );

  pdf.text(
    safe(order.address_line2),
    COL2,
    currentY + 19,
    {
      maxWidth: 42
    }
  );

  pdf.text(
    `${safe(order.city)}, ${safe(order.state)}`,
    COL2,
    currentY + 25
  );

  pdf.text(
    safe(order.country),
    COL2,
    currentY + 31
  );

  pdf.text(
    safe(order.pincode),
    COL2,
    currentY + 37
  );

  pdf.text(
    `Phone : ${safe(order.customer_phone)}`,
    COL2,
    currentY + 43
  );

  //---------------------------------------------------------
  // SHIP FROM
  //---------------------------------------------------------

  bold(pdf, 8);

  pdf.text(
    "Ship From",
    COL3,
    currentY
  );

  normal(pdf, 7);

  const storeNameShip = localStorage.getItem('store_name') || "MY DESIGN PRIVATE LIMITED";
  const storeCountryShip = localStorage.getItem('store_country') || "India";
  const storePhoneShip = localStorage.getItem('store_phone') || "+91 9876543210";

  pdf.text(
    storeNameShip.toUpperCase(),
    COL3,
    currentY + 7,
    {
      maxWidth: 42
    }
  );

  pdf.text(
    "Thipaati",
    COL3,
    currentY + 13
  );

  pdf.text(
    "Dharmapuri",
    COL3,
    currentY + 19
  );

  pdf.text(
    "Tamil Nadu",
    COL3,
    currentY + 25
  );

  pdf.text(
    storeCountryShip,
    COL3,
    currentY + 31
  );

  pdf.text(
    "636813",
    COL3,
    currentY + 37
  );

  pdf.text(
    `Phone : ${storePhoneShip}`,
    COL3,
    currentY + 43
  );

  //---------------------------------------------------------
  // SHIP TO
  //---------------------------------------------------------

  bold(pdf, 8);

  pdf.text(
    "Ship To",
    COL4,
    currentY
  );

  normal(pdf, 7);

  pdf.text(
    safe(order.customer_name),
    COL4,
    currentY + 7
  );

  pdf.text(
    safe(order.address_line1),
    COL4,
    currentY + 13,
    {
      maxWidth: 42
    }
  );

  pdf.text(
    safe(order.address_line2),
    COL4,
    currentY + 19,
    {
      maxWidth: 42
    }
  );

  pdf.text(
    `${safe(order.city)}, ${safe(order.state)}`,
    COL4,
    currentY + 25
  );

  pdf.text(
    safe(order.country),
    COL4,
    currentY + 31
  );

  pdf.text(
    safe(order.pincode),
    COL4,
    currentY + 37
  );

  pdf.text(
    `Phone : ${safe(order.customer_phone)}`,
    COL4,
    currentY + 43
  );

  //---------------------------------------------------------
  // Divider
  //---------------------------------------------------------

  currentY += 52;

  hr(pdf, currentY);

  currentY += 8;

    /* ========================================================
     PRODUCT DETAILS
  ======================================================== */

  bold(pdf, 8);

  pdf.text(
    "Product",
    10,
    currentY
  );

  currentY += 4;

  //--------------------------------------------------------
  // PRODUCT IMAGE
  //--------------------------------------------------------

  drawBox(
    pdf,
    10,
    currentY,
    28,
    28
  );

  try {

    if (order.product_image) {

      const response = await fetch(order.product_image);

      const blob = await response.blob();

      const image = await new Promise((resolve) => {

        const reader = new FileReader();

        reader.onloadend = () => resolve(reader.result);

        reader.readAsDataURL(blob);

      });

      pdf.addImage(
        image,
        "JPEG",
        11,
        currentY + 1,
        26,
        26
      );

    } else {

      gray(pdf,7);

      pdf.text(
        "No Image",
        15,
        currentY + 15
      );

    }

  } catch {

    gray(pdf,7);

    pdf.text(
      "No Image",
      15,
      currentY + 15
    );

  }

  //--------------------------------------------------------
  // PRODUCT INFORMATION
  //--------------------------------------------------------

  bold(pdf,8);

  pdf.text(
    safe(order.product_name),
    44,
    currentY + 6
  );

  normal(pdf,7);

  pdf.text(
    `Product ID : ${safe(order.product_id)}`,
    44,
    currentY + 12
  );

  pdf.text(
    `Size : ${safe(order.size || "All Size")}`,
    44,
    currentY + 18
  );

  pdf.text(
    `Color : ${safe(order.color)}`,
    44,
    currentY + 24
  );

  pdf.text(
    `Quantity : ${safe(order.quantity)}`,
    44,
    currentY + 30
  );

  //--------------------------------------------------------
  // TABLE
  //--------------------------------------------------------

  currentY += 38;

  const subtotal =
    Number(order.price || 0) *
    Number(order.quantity || 1);

  const taxable =
    subtotal / 1.18;

  const gst =
    subtotal - taxable;

  autoTable(pdf, {

    startY: currentY,

    theme: "grid",

    tableLineWidth: 0.2,

    tableLineColor: BORDER,

    styles: {

      fontSize: 7,

      cellPadding: 2,

      lineWidth: 0.2,

      lineColor: BORDER,

      textColor: BLACK,

      valign: "middle"

    },

    headStyles: {

      fillColor: [255,255,255],

      textColor: BLACK,

      fontStyle: "bold",

      lineColor: BORDER

    },

    columnStyles: {

      0:{cellWidth:40},

      1:{cellWidth:42},

      2:{cellWidth:10,halign:"center"},

      3:{cellWidth:18,halign:"right"},

      4:{cellWidth:16,halign:"right"},

      5:{cellWidth:20,halign:"right"},

      6:{cellWidth:12,halign:"right"},

      7:{cellWidth:20,halign:"right"}

    },

    head:[[
      "Product",
      "Title",
      "Qty",
      "Gross",
      "Discount",
      "Taxable",
      "GST",
      "Total"
    ]],

    body:[[
      safe(order.product_name),

      `${safe(order.product_name)}
HSN : 6109
Warranty : 6 Months`,

      safe(order.quantity),

      money(subtotal),

      "0.00",

      money(taxable),

      money(gst),

      money(subtotal)

    ]]

  });

  currentY = pdf.lastAutoTable.finalY + 6;

  //--------------------------------------------------------
  // TOTAL ROW
  //--------------------------------------------------------

  hr(pdf,currentY);

  currentY += 6;

  bold(pdf,8);

  pdf.text(
    "Total",
    82,
    currentY
  );

  pdf.text(
    String(order.quantity),
    120,
    currentY,
    {
      align:"center"
    }
  );

  drawAmount(
    pdf,
    subtotal,
    198,
    currentY,
    9,
    true
  );

  currentY += 8;

    /* ========================================================
     GST SUMMARY + PAYMENT SUMMARY
  ======================================================== */

  const grossAmount =
    Number(order.price || 0) *
    Number(order.quantity || 1);

  const discount = 0;

  const taxableValue =
    grossAmount / 1.18;

  const gstAmount =
    grossAmount - taxableValue;

  const cgst =
    gstAmount / 2;

  const sgst =
    gstAmount / 2;

  const shippingCharge = 0;

  const grandTotal =
    grossAmount + shippingCharge;

  //--------------------------------------------------------
  // GST SUMMARY (LEFT)
  //--------------------------------------------------------

  bold(pdf,8);

  pdf.text(
    "GST SUMMARY",
    10,
    currentY
  );

  autoTable(pdf,{

    startY: currentY + 3,

    theme:"grid",

    styles:{
      fontSize:7,
      cellPadding:2,
      lineWidth:0.2,
      lineColor:BORDER
    },

    headStyles:{
      fillColor:[255,255,255],
      textColor:BLACK,
      fontStyle:"bold"
    },

    columnStyles:{
      0:{cellWidth:35},
      1:{cellWidth:22,halign:"right"},
      2:{cellWidth:22,halign:"right"},
      3:{cellWidth:22,halign:"right"}
    },

    head:[[
      "Description",
      "Rate",
      "Amount",
      "Tax"
    ]],

    body:[

      [
        "Taxable Value",
        "-",
        money(taxableValue),
        "-"
      ],

      [
        "CGST",
        "9%",
        money(cgst),
        "-"
      ],

      [
        "SGST",
        "9%",
        money(sgst),
        "-"
      ]

    ]

  });

  //--------------------------------------------------------
  // PAYMENT SUMMARY (RIGHT)
  //--------------------------------------------------------

  const paymentY =
    currentY;

  drawBox(
    pdf,
    128,
    paymentY,
    70,
    48
  );

  bold(pdf,8);

  pdf.text(
    "Payment Summary",
    132,
    paymentY + 7
  );

  normal(pdf,7);

  pdf.text(
    "Gross Amount",
    132,
    paymentY + 15
  );

  drawAmount(
    pdf,
    grossAmount,
    194,
    paymentY + 15
);

  pdf.text(
    "Discount",
    132,
    paymentY + 21
  );

  drawAmount(
    pdf,
    discount,
    194,
    paymentY + 21
  );

  pdf.text(
    "Shipping",
    132,
    paymentY + 27
  );

  pdf.text(
    "FREE",
    194,
    paymentY + 27,
    {align:"right"}
  );

  pdf.text(
    "GST",
    132,
    paymentY + 33
  );

  drawAmount(
    pdf,
    gstAmount,
    194,
    paymentY + 33
  );

  //--------------------------------------------------------
  // GRAND TOTAL
  //--------------------------------------------------------

  pdf.setDrawColor(...BLACK);

  pdf.line(
    132,
    paymentY + 37,
    194,
    paymentY + 37
  );

  bold(pdf,9);

  pdf.text(
    "Grand Total",
    132,
    paymentY + 44
  );

  bold(pdf,10);

  drawAmount(
    pdf,
    grandTotal,
    194,
    paymentY + 44,
    10,
    true
  );

  //--------------------------------------------------------
  // AMOUNT IN WORDS
  //--------------------------------------------------------

  currentY =
    Math.max(
      pdf.lastAutoTable.finalY,
      paymentY + 48
    ) + 10;

  bold(pdf,8);

  pdf.text(
    "Amount in Words",
    10,
    currentY
  );

  normal(pdf,7);

  pdf.text(
    "Rupees " +
    grandTotal.toFixed(2) +
    " Only",
    10,
    currentY + 6
  );

  //--------------------------------------------------------
  // PAYMENT DETAILS
  //--------------------------------------------------------

  currentY += 18;

  bold(pdf,8);

  pdf.text(
    "Payment Details",
    10,
    currentY
  );

  normal(pdf,7);

  pdf.text(
    `Method : ${safe(order.payment_method)}`,
    10,
    currentY + 6
  );

  pdf.text(
    `Status : ${safe(order.payment_status)}`,
    70,
    currentY + 6
  );

  pdf.text(
    `Tracking : ${safe(order.tracking_status)}`,
    130,
    currentY + 6
  );

  currentY += 14;

    /* ========================================================
     DECLARATION
  ======================================================== */

  hr(pdf, currentY);

  currentY += 8;

  bold(pdf, 8);

  pdf.text(
    "Declaration",
    10,
    currentY
  );

  normal(pdf, 7);

  pdf.text(
    "We declare that this invoice shows the actual price of the goods",
    10,
    currentY + 6
  );

  pdf.text(
    "described and that all particulars shown are true and correct.",
    10,
    currentY + 11
  );

  /* ========================================================
     RETURN POLICY
  ======================================================== */

  currentY += 22;

  bold(pdf, 8);

  pdf.text(
    "Returns Policy",
    10,
    currentY
  );

  normal(pdf, 7);

  pdf.text(
    "Returns are accepted only for damaged or defective products.",
    10,
    currentY + 6
  );

  pdf.text(
    "Please contact support within 7 days from delivery.",
    10,
    currentY + 11
  );

  /* ========================================================
     COMPANY BANK DETAILS
  ======================================================== */

  currentY += 22;

  drawBox(
    pdf,
    10,
    currentY,
    95,
    30
  );

  bold(pdf, 8);

  pdf.text(
    "Bank Details",
    14,
    currentY + 6
  );

  normal(pdf, 7);

  pdf.text(
    "Bank : State Bank of India",
    14,
    currentY + 12
  );

  pdf.text(
    "A/C : 123456789012",
    14,
    currentY + 17
  );

  pdf.text(
    "IFSC : SBIN0001234",
    14,
    currentY + 22
  );

  pdf.text(
    "UPI : payments@mydesign",
    14,
    currentY + 27
  );

  /* ========================================================
     AUTHORIZED SIGNATORY
  ======================================================== */

  drawBox(
    pdf,
    115,
    currentY,
    85,
    30
  );

  gray(pdf, 7);

  pdf.text(
    "For MY DESIGN PRIVATE LIMITED",
    126,
    currentY + 8
  );

  bold(pdf, 9);

  pdf.text(
    "Authorized Signatory",
    128,
    currentY + 24
  );

  /* ========================================================
     FOOTER
  ======================================================== */

  currentY += 40;

  hr(pdf, currentY);

  currentY += 6;

  gray(pdf, 7);

  pdf.text(
    "Customer Care : +91 9876543210",
    10,
    currentY
  );

  pdf.text(
    "support@mydesign.com",
    75,
    currentY
  );

  pdf.text(
    "www.mydesign.com",
    145,
    currentY
  );

  currentY += 5;

  gray(pdf, 6);

  pdf.text(
    "This is a computer generated invoice. Signature not required.",
    10,
    currentY
  );

  pdf.text(
    "Page 1 of 1",
    196,
    currentY,
    {
      align: "right"
    }
  );

  /* ========================================================
     WATERMARK
  ======================================================== */

  pdf.saveGraphicsState();

  pdf.setGState(
    new pdf.GState({
      opacity: 0.04
    })
  );

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(50);

  pdf.setTextColor(150);

  pdf.text(
    "MY DESIGN",
    55,
    180,
    {
      angle: 45
    }
  );

  pdf.restoreGraphicsState();

  /* ========================================================
     SAVE PDF
  ======================================================== */

  pdf.save(
    `Invoice-${safe(order.order_number)}.pdf`
  );

  return pdf;

}