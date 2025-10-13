import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core'; // DODANO ElementRef
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
import { SelectEntitiesComponent } from '@exlibris/eca-components'; 

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

  @ViewChild('selectEntities') selectEntities!: SelectEntitiesComponent; 
  // KLUCZOWA ZMIANA: Dodajemy @ViewChild dla #exportTextArea
  @ViewChild('exportTextArea') exportTextAreaRef!: ElementRef<HTMLTextAreaElement>; 

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

  /** Metoda czyszcząca stan aplikacji: czyści wybór. */
  clearSelection() {
    this.selectEntities.clear(); 
    this.previewContent = null; 
  }
  
  // --- LOGIKA EKSPORTU ---

  /**
   * Główna metoda wywoływana po kliknięciu "Generuj podgląd eksportu"
   */
  onGenerateExport() {
    this.loading = true;

    if (this.selectedEntities.length === 0) {
      this.loading = false;
      this.alert.warn('Wybierz co najmniej jedną linię zamówienia do przetworzenia.');
      return;
    }

    // Mapowanie wybranych encji na zapytania API do pobrania pełnych danych
    const requests = this.selectedEntities.map(entity => 
        this.restService.call({ url: entity.link, method: HttpMethod.GET })
    );

    // Łączenie zapytań i oczekiwanie na wszystkie odpowiedzi
    forkJoin(requests)
      .pipe(
        finalize(() => {
            this.loading = false;
        }),
        map((responses: any[]) => {
            // Sprawdzenie, czy API zwróciło błędy w odpowiedzi
            if (responses.some(r => r && r.error)) {
                // Rzucamy błąd, który zostanie przechwycony przez blok error
                throw new Error('Jedno lub więcej zapytań API zwróciło błąd.');
            }
            return this.generateFileContent(responses);
        })
      )
      .subscribe({
        next: (fileContent: string) => {
          this.previewContent = fileContent; // <--- USTAWIENIE PODGLĄDU
          this.alert.success(this.translate.instant('App.ExportSuccess', 
            { count: this.selectedEntities.length }
          ));
        },
        error: (err: any) => {
          this.alert.error(this.translate.instant('App.ExportError') + ': ' + (err.message || 'Nieznany błąd API'));
        }
      });
  }

  /** Generuje TXT file content based on API data. */
  private generateFileContent(responses: any[]): string {
    const headers = this.exportFields.map(field => field.label).join('\t');
    let fileContent = `# Eksport PO Line\n${headers}\n`; 

    responses.forEach((poLine: any) => {
      
      // Jeżeli encja nie ma kluczowych danych, rzucamy pusty wiersz
      if (!poLine || !poLine.resource_metadata) {
          console.warn('WARN: Encja PO Line nie zawiera resource_metadata. Pomijanie wiersza.');
          return;
      }
      
      const row = this.exportFields.map(field => {
        switch (field.name) {
          case 'isbn':
            return poLine.resource_metadata?.isbn || '';
          case 'quantity':
            // Sumowanie quantity ze wszystkich lokalizacji
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
  // KLUCZOWA ZMIANA: Metoda nie przyjmuje już argumentu z HTML, tylko odwołuje się do ViewChild
  copyToClipboard() {
    if (!this.previewContent) {
      this.alert.error(this.translate.instant('App.NoContentToCopy'));
      return;
    }
    
    // Używamy referencji z ViewChild (ElementRef)
    const textArea = this.exportTextAreaRef.nativeElement;

    textArea.select();
    this.window.document.execCommand('copy');
    this.alert.success(this.translate.instant('App.CopySuccess'));
  }
  
  /** Initiates TXT file download. */
  downloadFile() {
    if (!this.previewContent) {
      this.alert.error(this.translate.instant('App.NoContentToDownload'));
      return;
    }

    // Pozostała logika bez zmian
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
