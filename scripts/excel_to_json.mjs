import fs from 'fs';
import xlsx from 'xlsx';
import moment from 'moment';

/**
 * Convert the first (and only) sheet from an xlsx file to JSON.
 * @param {string} filePath - Path to the xlsx file.
 * @returns {Array<Object>} - JSON representation of the sheet.
 */
function convertFirstSheetToJson(filePath) {
  const workbook = xlsx.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = xlsx.utils.sheet_to_json(worksheet);
  return jsonData;
}

// Always use "July (1).xlsx" as the input file
const xlsxPath = "nov (1).xlsx";

try {
  const json = convertFirstSheetToJson(xlsxPath);
  console.log(json)
  const bulkOfProductformatteddata = json.map((row) => ({
    brand_name: row["Brand Name"] ? row["Brand Name"].trim().toUpperCase() : "",
    model_name: row["Model Name"] ? row["Model Name"].trim().toUpperCase() : "",
    imei_number: String(row["IMEI"]).trim(),
    sales_price: row["Sales Price"],
    sold_at_price: row["Sales Price"],
    purchase_price: row["Purchase Price"],
    grade: row["Grade"],
    engineer_name: row["Engineer Name"],
    accessories: row["Accessories"] ? row["Accessories"].trim().toUpperCase() : "",
    supplier_name: row["Supplier"] ? row["Supplier"].trim().toUpperCase() : "",
    qc_remark: row["QC Remark"],
    product_created_at: moment.utc(row["Date"], "DD/MM/YYYY").subtract(3, 'days').startOf('day').valueOf(),
    product_updated_at: moment.utc(row["Date"], "DD/MM/YYYY").subtract(3, 'days').startOf('day').valueOf(),

    bill_id: row["Bill No"],
    customer_name: row["Customer Name"],
    billing_created_at: moment.utc(row["Date"], "DD/MM/YYYY").startOf('day').valueOf(),
    billing_updated_at: moment.utc(row["Date"], "DD/MM/YYYY").startOf('day').valueOf(),
  }));
  fs.writeFileSync(`${xlsxPath}.json`, JSON.stringify(bulkOfProductformatteddata, null, 2), "utf8");
  console.log(`Successfully wrote JSON for the first sheet of "July (1).xlsx" to ${xlsxPath}.json`);
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}