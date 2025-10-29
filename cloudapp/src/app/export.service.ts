import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
    CloudAppRestService,
    CloudAppConfigService,
    Entity,
    HttpMethod,
} from '@exlibris/exl-cloudapp-angular-lib';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AppSettings, FieldConfig } from './models/settings';
import { AVAILABLE_FIELDS } from './main/field-definitions';

interface ExportResult {
    fileContent: string;
    exportFields: FieldConfig[];
    count: number;
}

@Injectable({
    providedIn: 'root'
})
export class ExportService {

    constructor(
        private restService: CloudAppRestService,
        private configService: CloudAppConfigService,
        private http: HttpClient
    ) { }

    generateExport(selectedEntities: Entity[]): Observable<ExportResult> {
        
        return this.configService.get().pipe(
            catchError(err => {
                console.error('ExportService: Błąd wczytywania ustawień z Almy. Używamy domyślnych pól.', err);
                return of({ availableFields: [...AVAILABLE_FIELDS] } as AppSettings);
            }),
            
            switchMap((settings: AppSettings) => {
                const exportFields = (settings.availableFields || AVAILABLE_FIELDS).filter(field => field.selected);

                if (exportFields.length === 0) {
                    throw new Error('Nie wybrano żadnych pól do eksportu. Sprawdź Ustawienia.');
                }

                const requests = selectedEntities.map(entity =>
                    this.restService.call({ url: entity.link, method: HttpMethod.GET })
                );

                return forkJoin(requests).pipe(
                    map(responses => {
                        const fileContent = this.generateFileContent(responses, exportFields);
                        
                        return {
                            fileContent: fileContent,
                            exportFields: exportFields,
                            count: selectedEntities.length
                        } as ExportResult;
                    }),
                    catchError(err => {
                        throw new Error(`Błąd API Alma podczas pobierania szczegółów PO Line: ${err.message}`);
                    })
                );
            }),
            catchError(err => {
                return new Observable<ExportResult>(subscriber => {
                    subscriber.error(err);
                });
            })
        );
    }

    private generateFileContent(responses: any[], exportFields: FieldConfig[]): string {
        const headers = exportFields.map(field => field.customLabel).join('\t');
        let fileContent = `# Eksport PO Line\n${headers}\n`;

        responses.forEach((poLine: any) => {
            const row = exportFields.map(field => {
                switch (field.name) {
                    case 'isbn':
                        return poLine.resource_metadata?.isbn || '';
                    case 'quantity':
                        return (poLine.location || []).reduce((sum: number, loc: any) => sum + loc.quantity, 0) || 0;
                    case 'title':
                        return poLine.resource_metadata?.title || '';
                    case 'author':
                        return poLine.resource_metadata?.author || '';
                    case 'poNumber':
                        return poLine.po_number || '';
                    case 'line_number':
                        return poLine.number || ''; 
                    case 'owner':
                        return poLine.owner?.desc || '';
                    case 'vendor':
                        return poLine.vendor?.desc || '';
                    case 'price':
                        return `${poLine.price?.sum} ${poLine.price?.currency?.value}` || '';
                    case 'fund':
                        return poLine.fund_distribution?.[0]?.fund_code?.value || '';
                    default:
                        return '';
                }
            }).join('\t');
            fileContent += `${row}\n`;
        });
        return fileContent;
    }
}