import fs from "node:fs/promises";
import { Workbook } from "@oai/artifact-tool";

const outputPath = "D:/udharapp/outputs/starbucks_dashboard_extraction/starbucks_dashboard_extracted.csv";

const rows = [];
const add = (section, item, metric, value, unit, quality = "exact_visible_value", notes = "") => {
  rows.push({ section, item, metric, value, unit, extraction_quality: quality, notes });
};

add("Metadata", "Dashboard", "data_scope", "Illustrative sample data", "text", "exact_visible_text", "The image states that the dashboard uses sample data for educational purposes only.");
add("Filter", "Date Range", "selection", "All", "text");
add("Filter", "Store Location", "selection", "All", "text");
add("Filter", "Product Category", "selection", "All", "text");
add("Filter", "Roast Type", "selection", "All", "text");

add("KPI", "Total Sales Revenue", "value", 1284572, "USD");
add("KPI", "Total Sales Revenue", "change_vs_previous_period", 12.5, "percent");
add("KPI", "Total Orders", "value", 48732, "orders");
add("KPI", "Total Orders", "change_vs_previous_period", 9.3, "percent");
add("KPI", "Average Order Value", "value", 26.36, "USD_per_order");
add("KPI", "Average Order Value", "change_vs_previous_period", 2.9, "percent");
add("KPI", "Total Stores", "value", 32, "stores");
add("KPI", "Total Stores", "change_vs_previous_period", 6.7, "percent");

const monthlyRevenue = {
  Jan: 75000, Feb: 95000, Mar: 95000, Apr: 105000, May: 120000, Jun: 132000,
  Jul: 137000, Aug: 150000, Sep: 160000, Oct: 172000, Nov: 185000, Dec: 205000,
};
const monthlyOrders = {
  Jan: 2900, Feb: 3700, Mar: 3400, Apr: 3800, May: 4400, Jun: 4800,
  Jul: 5200, Aug: 5300, Sep: 5600, Oct: 6000, Nov: 6400, Dec: 7100,
};
for (const month of Object.keys(monthlyRevenue)) {
  add("Revenue Trend", month, "sales_revenue", monthlyRevenue[month], "USD", "estimated_from_chart", "Rounded visual estimate from the chart axis; no point label is printed.");
  add("Revenue Trend", month, "order_count", monthlyOrders[month], "orders", "estimated_from_chart", "Rounded visual estimate from the chart axis; no point label is printed.");
}

for (const [category, share] of [
  ["Beverages", 43.2], ["Food", 22.8], ["Espresso", 16.5], ["Frappuccino", 12.6], ["Others", 4.9],
]) add("Product Category", category, "sales_share", share, "percent");

for (const [product, revenue] of [
  ["Iced Caffe Latte", 172315], ["Caramel Frappuccino", 146720], ["Cappuccino", 118942],
  ["Americano", 102504], ["Chocolate Croissant", 76381],
]) add("Top Product", product, "sales_revenue", revenue, "USD");

const stores = [
  ["New York (NY-001)", 248732, 9421, 26.38],
  ["Los Angeles (LA-002)", 212487, 8763, 24.25],
  ["Chicago (CH-003)", 176245, 6891, 25.58],
  ["Houston (HT-004)", 142398, 5732, 24.83],
  ["San Francisco (SF-005)", 128746, 4953, 26.01],
];
for (const [store, sales, orders, aov] of stores) {
  add("Store Performance", store, "total_sales", sales, "USD");
  add("Store Performance", store, "orders", orders, "orders");
  add("Store Performance", store, "average_order_value", aov, "USD_per_order");
}
add("Store Performance", "Total", "total_sales", 1284572, "USD", "exact_visible_value", "Dashboard-wide total across 32 stores, not the sum of the five displayed stores.");
add("Store Performance", "Total", "orders", 48732, "orders", "exact_visible_value", "Dashboard-wide total across 32 stores, not the sum of the five displayed stores.");
add("Store Performance", "Total", "average_order_value", 26.36, "USD_per_order", "exact_visible_value", "Dashboard-wide value.");

for (const [roast, share] of [
  ["Dark Roast", 38.2], ["Medium Roast", 34.7], ["Light Roast", 18.6], ["Blonde Roast", 8.5],
]) add("Roast Type", roast, "sales_share", share, "percent");

for (const [storeType, sales, share] of [
  ["Company Owned", 612428, 47.7], ["Licensed", 438126, 34.1],
]) {
  add("Store Type", storeType, "sales_revenue", sales, "USD");
  add("Store Type", storeType, "sales_share", share, "percent", "exact_visible_value", "Only the two visible store types were extracted; their shares do not cover 100% of dashboard sales.");
}

const headers = ["section", "item", "metric", "value", "unit", "extraction_quality", "notes"];
const escapeCsv = (value) => {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const csvText = [headers.join(","), ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(","))].join("\r\n") + "\r\n";

// Validate the authored CSV through artifact-tool, then render it once for visual QA.
const workbook = await Workbook.fromCSV(csvText, { sheetName: "Extracted Data" });
workbook.recalculate();
const inspection = await workbook.inspect({
  kind: "table",
  range: "Extracted Data!A1:G80",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 7,
  maxChars: 5000,
});
if (!inspection.ndjson.includes("Total Sales Revenue") || !inspection.ndjson.includes("extraction_quality")) {
  throw new Error("CSV validation failed: expected dashboard fields were not found.");
}
const preview = await workbook.render({ sheetName: "Extracted Data", range: "A1:G12", scale: 1, format: "png" });
if ((await preview.arrayBuffer()).byteLength < 1000) {
  throw new Error("CSV visual verification failed: preview was unexpectedly small.");
}

await fs.writeFile(outputPath, `\uFEFF${csvText}`, "utf8");
const saved = await fs.readFile(outputPath, "utf8");
if (!saved.includes("Iced Caffe Latte") || saved.split(/\r?\n/).length < 60) {
  throw new Error("Saved CSV verification failed.");
}

console.log(JSON.stringify({ outputPath, dataRows: rows.length, previewVerified: true }));
