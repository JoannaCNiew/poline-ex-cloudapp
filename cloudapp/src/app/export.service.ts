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

// Interfejs wyniku eksportu
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
        private http: HttpClient // Do innych, np. zewnętrznych API, jeśli dodasz
    ) { }

    /**
     * Główna funkcja generująca eksport, która łączy wczytywanie konfiguracji i wywołania API.
     */
    generateExport(selectedEntities: Entity[]): Observable<ExportResult> {
        
        // 1. Zaczynamy od wczytania ustawień
        return this.configService.get().pipe(
            catchError(err => {
                // Jeśli błąd, używamy domyślnej listy pól
                console.error('ExportService: Błąd wczytywania ustawień z Almy. Używamy domyślnych pól.', err);
                return of({ availableFields: [...AVAILABLE_FIELDS] } as AppSettings);
            }),
            
            // 2. Po wczytaniu ustawień, przełączamy się na logikę API (switchMap)
            switchMap((settings: AppSettings) => {
                const exportFields = (settings.availableFields || AVAILABLE_FIELDS).filter(field => field.selected);

                if (exportFields.length === 0) {
                    // Przerwanie, jeśli nie wybrano pól
                    throw new Error('Nie wybrano żadnych pól do eksportu. Sprawdź Ustawienia.');
                }

                // 3. Mapowanie wybranych encji na zapytania API (forkJoin)
                const requests = selectedEntities.map(entity =>
                    this.restService.call({ url: entity.link, method: HttpMethod.GET })
                );

                // Zwracamy Observable, który wykona wszystkie zapytania
                return forkJoin(requests).pipe(
                    map(responses => {
                        // 4. Generowanie treści pliku
                        const fileContent = this.generateFileContent(responses, exportFields);
                        
                        return {
                            fileContent: fileContent,
                            exportFields: exportFields,
                            count: selectedEntities.length
                        } as ExportResult;
                    }),
                    catchError(err => {
                        // Obsługa błędu, jeśli jedno z wywołań API zakończyło się niepowodzeniem
                        throw new Error(`Błąd API Alma podczas pobierania szczegółów PO Line: ${err.message}`);
                    })
                );
            }),
            catchError(err => {
                // Obsługa błędów z konfiguracji lub brakujących pól
                return new Observable<ExportResult>(subscriber => {
                    subscriber.error(err);
                });
            })
        );
    }

    /**
     * Generuje treść TXT na podstawie odpowiedzi API i wybranych pól.
     */
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
