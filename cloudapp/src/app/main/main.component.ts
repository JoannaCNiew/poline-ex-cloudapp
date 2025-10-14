import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AlertService,
  CloudAppEventsService,
  CloudAppRestService,
  Entity,
  HttpMethod,
  CloudAppSettingsService,
} from '@exlibris/exl-cloudapp-angular-lib';
import { TranslateService } from '@ngx-translate/core';
import { Observable, forkJoin, Subscription } from 'rxjs'; // Dodano Subscription
import { finalize, tap, map } from 'rxjs/operators';
import { SelectEntitiesComponent } from '@exlibris/eca-components';
import { AVAILABLE_FIELDS } from './field-definitions';
import { FieldConfig, AppSettings } from '../models/settings'; // Dodano FieldConfig i AppSettings

// Interfejs dla danych eksportu (ISBN, Quantity)
export interface PoExportData {
  isbn: string;
  quantity: number;
}

// Lokalna definicja typu Settings dla MainComponent
type Settings = AppSettings; 

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  @ViewChild('selectEntities') selectEntities!: SelectEntitiesComponent; 
  @ViewChild('exportTextArea') exportTextAreaRef!: ElementRef<HTMLTextAreaElement>; 

  loading = false;
  
  // Lista encji widocznych w kontekście Almy
  visibleEntities: Entity[] = []; 
  
  // Lista encji ZAZNACZONYCH przez użytkownika
  selectedEntities: Entity[] = []; 
  
  previewContent: string | null = null;
  
  // Lista PÓL DO EKSPORTU (TYLKO zaznaczone przez użytkownika)
  exportFields: FieldConfig[] = []; // Zmieniono na pusta tablicę, będzie ładowana z ustawień
  
  entities$: Observable<Entity[]>;
  public alert: AlertService; 
  window: Window = window;

  private settings: Settings = { availableFields: [...AVAILABLE_FIELDS] }; // Inicjalizacja domyślnymi
  private settingsSubscription: Subscription = new Subscription(); // NAPRAWIONE: Inicjalizacja subskrypcji
  private entitiesSubscription: Subscription = new Subscription(); // NAPRAWIONE: Inicjalizacja subskrypcji

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    alert: AlertService, 
    private translate: TranslateService,
    private http: HttpClient,
    private settingsService: CloudAppSettingsService,
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
    this.entitiesSubscription = this.entities$.subscribe();

    // KLUCZOWA ZMIANA: Wczytywanie ustawień
    this.settingsSubscription = this.settingsService.get().subscribe((settings: any) => {
      // Ustawienia ładowane z Alma: jeśli istnieją, używamy ich, w przeciwnym razie używamy domyślnych
      const loadedSettings = settings && settings.availableFields ? settings : { availableFields: AVAILABLE_FIELDS };
      this.settings = loadedSettings;
      
      // KLUCZOWA ZMIANA: Filtracja pól do eksportu
      this.exportFields = this.settings.availableFields.filter(field => field.selected);
    });
  }

  ngOnDestroy(): void {
    if (this.settingsSubscription) {
        this.settingsSubscription.unsubscribe();
    }
    if (this.entitiesSubscription) {
        this.entitiesSubscription.unsubscribe();
    }
  }

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

    if (this.exportFields.length === 0) {
        this.loading = false;
        this.alert.warn('Nie wybrano żadnych pól do eksportu. Przejdź do Ustawień.');
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
    // KLUCZOWA ZMIANA: Używamy customLabel jako nagłówka
    const headers = this.exportFields.map(field => field.customLabel).join('\t');
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
          case 'title':
            return poLine.resource_metadata?.title || '';
          case 'author':
            return poLine.resource_metadata?.author || '';
          case 'poNumber':
            return poLine.po_number || '';
          case 'line_number':
            return poLine.line_number || '';
          case 'owner':
            return poLine.owner?.desc || ''; // Zakładamy, że właściciel ma opis
          case 'vendor':
            return poLine.vendor?.desc || ''; // Zakładamy, że dostawca ma opis
          case 'price':
            // Proste sumowanie cen z linii zamówienia (przykład)
            return (poLine.price?.sum || poLine.price?.amount || '0').toString();
          case 'fund':
            // Pobieramy nazwę pierwszego funduszu (przykład)
            return poLine.fund_ledger?.name || '';
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
