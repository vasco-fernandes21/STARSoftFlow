import * as XLSX from 'xlsx';

export const lerExcel = async (file: File): Promise<any[][]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Procurar especificamente a sheet RH_Budget_SUBM
        const sheetName = 'RH_Budget_SUBM';
        if (!workbook.SheetNames.includes(sheetName)) {
          throw new Error('Sheet "RH_Budget_SUBM" não encontrada no ficheiro Excel');
        }
        
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
