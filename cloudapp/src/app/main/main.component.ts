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
import { Observable, forkJoin, Subscription, of } from 'rxjs';
import { finalize, tap, map } from 'rxjs/operators';
import { SelectEntitiesComponent } from '@exlibris/eca-components';
import { AVAILABLE_FIELDS } from './field-definitions';
import { FieldConfig, AppSettings } from '../models/settings';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  @ViewChild('selectEntities') selectEntities!: SelectEntitiesComponent;
  // Usunięto ViewChild dla exportTextAreaRef, ponieważ nie jest już potrzebny do kopiowania
  // @ViewChild('exportTextArea') exportTextAreaRef!: ElementRef<HTMLTextAreaElement>;

  loading = false;
  
  visibleEntities: Entity[] = [];
  selectedEntities: Entity[] = [];
  
  previewContent: string | null = null;
  
  exportFields: FieldConfig[] = [];
  
  entities$: Observable<Entity[]>;
  public alert: AlertService;
  window: Window = window;

  private settings: AppSettings = { availableFields: [...AVAILABLE_FIELDS] };
  private settingsSubscription: Subscription = new Subscription();
  private entitiesSubscription: Subscription = new Subscription();

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    alert: AlertService,
    private translate: TranslateService,
    private http: HttpClient,
    private settingsService: CloudAppSettingsService,
  ) {
    this.alert = alert;

    this.entities$ = this.eventsService.entities$.pipe(
      tap(entities => {
        this.loading = false;
        this.visibleEntities = entities || [];
        this.selectedEntities = [];
        this.previewContent = null;
      })
    );
  }

  ngOnInit() {
    this.entitiesSubscription = this.entities$.subscribe();

    this.settingsSubscription = this.settingsService.get().subscribe((settings: any) => {
      const loadedSettings = settings && settings.availableFields ? settings : { availableFields: AVAILABLE_FIELDS };
      this.settings = loadedSettings;
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

  clearSelection() {
    this.selectEntities.clear();
    this.previewContent = null;
  }
  
  /**
   * Wywoływane przez przycisk "Preview". Pobiera dane i wyświetla je w polu podglądu.
   */
  onGenerateExport() {
    this.generateExportContent().subscribe({
      next: (fileContent: string) => {
        if (fileContent) {
          this.previewContent = fileContent;
          this.alert.success(this.translate.instant('App.ExportSuccess', 
            { count: this.selectedEntities.length }
          ));
        }
      },
      error: (err: any) => {
        this.alert.error(this.translate.instant('App.ExportError') + ': ' + (err.message || 'Unknown API error'));
      }
    });
  }

  /**
   * Centralna metoda do pobierania danych z API i generowania zawartości pliku.
   * Zwraca Observable, aby inne metody mogły subskrybować wynik.
   */
  private generateExportContent(): Observable<string> {
    if (this.selectedEntities.length === 0) {
      this.alert.warn('Select at least one PO line to process.');
      return of('');
    }

    if (this.exportFields.length === 0) {
      this.alert.warn('No fields are selected for export. Please go to Settings.');
      return of('');
    }
    
    this.loading = true;

    const requests = this.selectedEntities.map(entity => 
        this.restService.call({ url: entity.link, method: HttpMethod.GET })
    );

    return forkJoin(requests).pipe(
        finalize(() => {
            this.loading = false;
        }),
        map((responses: any[]) => {
            if (responses.some(r => r && r.error)) {
                throw new Error('One or more API requests returned an error.');
            }
            return this.formatDataAsText(responses);
        })
    );
  }

  /** Generuje zawartość pliku TXT na podstawie danych z API. */
  private formatDataAsText(responses: any[]): string {
    const headers = this.exportFields.map(field => field.customLabel || field.label).join('\t');
    let fileContent = `# PO Line Export\n${headers}\n`;

    responses.forEach((poLine: any) => {
      if (!poLine || !poLine.resource_metadata) {
        console.warn('WARN: PO Line entity does not contain resource_metadata. Skipping row.');
        return;
      }
      
      const row = this.exportFields.map(field => {
        switch (field.name) {
          case 'isbn': return poLine.resource_metadata?.isbn || '';
          case 'title': return poLine.resource_metadata?.title || '';
          case 'author': return poLine.resource_metadata?.author || '';
          case 'poNumber': return poLine.po_number || '';
          case 'line_number': return poLine.line_number || '';
          case 'owner': return poLine.owner?.desc || '';
          case 'vendor': return poLine.vendor?.desc || '';
          case 'price': return (poLine.price?.sum || poLine.price?.amount || '0').toString();
          case 'fund': return poLine.fund_ledger?.name || '';
          case 'quantity': return (poLine.location || []).reduce((sum: number, loc: any) => sum + loc.quantity, 0) || 0;
          default: return '';
        }
      }).join('\t');
      fileContent += `${row}\n`;
    });
    return fileContent;
  }

  /** Kopiuje wygenerowaną zawartość do schowka bez wyświetlania podglądu. */
  copyToClipboard() {
    this.generateExportContent().subscribe({
      next: (fileContent: string) => {
        if (fileContent) {
          const tempTextArea = document.createElement('textarea');
          tempTextArea.value = fileContent;
          tempTextArea.style.position = 'fixed';
          tempTextArea.style.opacity = '0';
          document.body.appendChild(tempTextArea);
          tempTextArea.select();
          try {
            document.execCommand('copy');
            this.alert.success(this.translate.instant('App.CopySuccess'));
          } catch (err) {
            this.alert.error('Failed to copy content.');
          }
          document.body.removeChild(tempTextArea);
        }
      },
      error: (err: any) => {
        this.alert.error(this.translate.instant('App.ExportError') + ': ' + (err.message || 'Unknown API error'));
      }
    });
  }
  
  /** Pobiera plik TXT bez wyświetlania podglądu. */
  downloadFile() {
    this.generateExportContent().subscribe({
      next: (fileContent: string) => {
        if (fileContent) {
          const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
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
      },
      error: (err: any) => {
        this.alert.error(this.translate.instant('App.ExportError') + ': ' + (err.message || 'Unknown API error'));
      }
    });
  }
}
