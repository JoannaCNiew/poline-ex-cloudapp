import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { finalize, tap, map, filter } from 'rxjs/operators'; // DODANY FILTER

// Interface for export data (ISBN, Quantity)
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

  loading = false;
  
  // Visible entities (Alma context)
  visibleEntities: Entity[] = []; 
  
  // Selected entities (chosen by user)
  selectedEntities: Entity[] = []; 
  
  previewContent: string | null = null;
  
  // Export fields (headers)
  exportFields = [
    { name: 'isbn', label: 'ISBN' },
    { name: 'quantity', label: 'Quantity' }
  ];
  
  entityFilterTypes: EntityType[] = [EntityType.PO_LINE];

  entities$: Observable<Entity[]>;
  public alert: AlertService; 
  window: Window = window; // For safe use in copying

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    alert: AlertService, 
    private translate: TranslateService,
    private http: HttpClient
  ) {
    this.alert = alert;

    // KEY CHANGE: Subscription fetches the list of VISIBLE entities from Alma context.
    this.entities$ = this.eventsService.entities$.pipe(
      // Wymuszamy, aby stream przepuścił tylko niepuste listy (czasem to pomaga)
      // filter(entities => entities.length > 0), 
      tap(entities => {
        this.loading = false;
        
        // Zawsze zapisujemy, co przyszło, nawet jeśli jest puste.
        this.visibleEntities = entities || []; 
        
        // Resetujemy stan, tylko jeśli kontekst się ZMIENIŁ
        this.selectedEntities = [];
        this.previewContent = null;
      })
    );
  }

  ngOnInit() { 
    // Initialization of translations (if necessary)
  }

  ngOnDestroy(): void { }

  /** Method that clears application state: clears selection and preview. */
  clear() {
    this.selectedEntities = [];
    this.previewContent = null;
  }
  
  // --- MANUAL MULTI-SELECT LOGIC ---
  
  /** Checks if all entities are selected */
  isAllSelected(entities: Entity[]): boolean {
    if (!entities || entities.length === 0) return false;
    return entities.every(entity => this.selectedEntities.some(e => e.link === entity.link));
  }

  /** Select/Deselect all visible entities */
  masterToggle(entities: Entity[]) {
    const isAll = this.isAllSelected(entities);
    this.selectedEntities = isAll ? [] : [...entities];
  }

  /** Adds/removes a single entity from the selected list */
  toggleEntity(entity: Entity) {
    const index = this.selectedEntities.findIndex(e => e.link === entity.link);
    if (index === -1) {
      this.selectedEntities.push(entity);
    } else {
      this.selectedEntities.splice(index, 1);
    }
  }

  /** Checks if a given entity is selected */
  isSelected(entity: Entity): boolean {
    return this.selectedEntities.some(e => e.link === entity.link);
  }
  // --- END OF MANUAL LOGIC ---


  /** Generates export preview: fetches data, processes, and saves to previewContent. */
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

  /** Generates TXT file content based on API data. */
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

  /** Copies preview content to clipboard. */
  copyToClipboard(textArea: HTMLTextAreaElement) {
    if (!this.previewContent) {
      this.alert.error(this.translate.instant('App.NoContentToCopy'));
      return;
    }
    
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
