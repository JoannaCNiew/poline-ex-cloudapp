import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AlertService,
  CloudAppEventsService,
  CloudAppRestService,
  Entity,
  HttpMethod,
  EntityType,
} from '@exlibris/exl-cloudapp-angular-lib';
import { TranslateService } from '@ngx-translate/core';
import { Observable, forkJoin } from 'rxjs';
import { finalize, tap, map } from 'rxjs/operators';
import { SelectEntitiesComponent } from '@exlibris/eca-components'; // Import dla ViewChild

// Interfejs dla danych eksportu (ISBN, Quantity)
export interface PoExportData {
  isbn: string;
  quantity: number;
}

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  // ViewChild dla komponentu ECA, aby móc wywołać metodę clear()
  @ViewChild('selectEntities') selectEntities!: SelectEntitiesComponent; 

  loading = false;
  
  // Lista encji widocznych w kontekście Almy
  visibleEntities: Entity[] = []; 
  
  // Lista encji ZAZNACZONYCH przez użytkownika
  selectedEntities: Entity[] = []; 
  
  previewContent: string | null = null;
  
  // Pola do eksportu (nagłówki)
  exportFields = [
    { name: 'isbn', label: 'ISBN' },
    { name: 'quantity', label: 'Quantity' }
  ];
  
  entities$: Observable<Entity[]>;
  public alert: AlertService; 
  window: Window = window;

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    alert: AlertService, 
    private translate: TranslateService,
    private http: HttpClient
  ) {
    this.alert = alert;

    // Subskrypcja pobiera listę WIDOCZNYCH encji z kontekstu Almy.
    this.entities$ = this.eventsService.entities$.pipe(
      tap(entities => {
        this.loading = false;
        
        // W kontekście listy PO Line, entities$ zwraca listę widocznych encji.
        // Komponent ECA sam zajmuje się powiązaniem, ale my używamy tej tablicy do licznika.
        this.visibleEntities = entities || []; 
        
        // Resetujemy stan po zmianie kontekstu
        this.selectedEntities = []; 
        this.previewContent = null;
      })
    );
  }

  ngOnInit() { 
    // Subskrybujemy strumień, aby aktywować pobieranie encji w MainComponent
    this.entities$.subscribe();
  }

  ngOnDestroy(): void { }

  /** Metoda aktualizująca widoczną liczbę encji (wywoływana przez (count) z ECA) */
  updateVisibleCount(count: number) {
    // Ponieważ ECA-Select-Entities nie jest powiązany z visibleEntities w HTML, 
    // używamy tej metody do synchronizacji licznika.
    // UWAGA: Tracimy tutaj listę encji, ale zyskujemy działający interfejs i licznik.
    this.visibleEntities.length = count; 
  }
  
  /** Metoda czyszcząca stan aplikacji: czyści wybór. */
  clearSelection() {
    // Wywołuje metodę clear() na komponencie ECA (przez ViewChild)
    this.selectEntities.clear(); 
  }
  
  // --- LOGIKA EKSPORTU (PRZENIESIONA) ---

  /** Generuje podgląd eksportu: pobiera dane, przetwarza i zapisuje do previewContent. */
  onGenerateExport() {
    this.loading = true;

    if (this.selectedEntities.length === 0) {
      this.loading = false;
      this.alert.warn('Wybierz co najmniej jedną linię zamówienia do przetworzenia.');
      return;
    }

    const requests = this.selectedEntities.map(entity => 
      this.restService.call({ url: entity.link, method: HttpMethod.GET })
    );

    forkJoin(requests)
      .pipe(
        finalize(() => this.loading = false),
        map((responses: any[]) => this.generateFileContent(responses))
      )
      .subscribe({
        next: (fileContent: string) => {
          this.previewContent = fileContent;
          this.alert.success(this.translate.instant('App.ExportSuccess', 
            { count: this.selectedEntities.length }
          ));
        },
        error: (err: any) => {
          this.alert.error(this.translate.instant('App.ExportError') + ': ' + err.message);
        }
      });
  }

  /** Generuje zawartość pliku TXT na podstawie danych z API. */
  private generateFileContent(responses: any[]): string {
    const headers = this.exportFields.map(field => field.label).join('\t');
    let fileContent = `# Eksport PO Line\n${headers}\n`; 

    responses.forEach((poLine: any) => {
      const row = this.exportFields.map(field => {
        switch (field.name) {
          case 'isbn':
            return poLine.resource_metadata?.isbn || '';
          case 'quantity':
            return (poLine.location || []).reduce((sum: number, loc: any) => sum + loc.quantity, 0) || 0;
          default:
            return '';
        }
      }).join('\t');
      fileContent += `${row}\n`;
    });
    return fileContent;
  }

  /** Kopiuje zawartość podglądu do schowka. */
  copyToClipboard(textArea: HTMLTextAreaElement) {
    if (!this.previewContent) {
      this.alert.error(this.translate.instant('App.NoContentToCopy'));
      return;
    }
    
    textArea.select();
    this.window.document.execCommand('copy');
    this.alert.success(this.translate.instant('App.CopySuccess'));
  }
  
  /** Uruchamia pobieranie pliku TXT. */
  downloadFile() {
    if (!this.previewContent) {
      this.alert.error(this.translate.instant('App.NoContentToDownload'));
      return;
    }

    const blob = new Blob([this.previewContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'po_line_export.txt';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.alert.success(this.translate.instant('App.DownloadSuccess'));
  }
}
