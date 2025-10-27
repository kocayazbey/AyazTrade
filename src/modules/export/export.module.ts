import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExcelExportService } from './excel-export.service';
import { CSVExportService } from './csv-export.service';
import { PDFExportService } from './pdf-export.service';

@Module({
  controllers: [ExportController],
  providers: [ExcelExportService, CSVExportService, PDFExportService],
  exports: [ExcelExportService, CSVExportService, PDFExportService],
})
export class ExportModule {}

