
import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('import/recipes.xlsx');
console.log(`Reading file from: ${filePath}`);

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Get headers
const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
console.log('Headers:', headers);

// Get first row of data
const data = XLSX.utils.sheet_to_json(sheet);
console.log('First row example:', data[0]);
