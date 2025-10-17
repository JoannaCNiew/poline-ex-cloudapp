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
import { finalize, tap, map, switchMap } from 'rxjs/operators';
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
  @ViewChild('exportTextArea') exportTextAreaRef!: ElementRef<HTMLTextAreaElement>;  

  loading = false;
  visibleEntities: Entity[] = [];  
  selectedEntities: Entity[] = [];  
  previewContent: string | null = null;
  exportFields: FieldConfig[] = []; 
  
  entities$: Observable<Entity[]>;
  public alert: AlertService;  
  window: Window = window;

  private settings: AppSettings = { availableFields: [...AVAILABLE_FIELDS], customHeader: '# PO Line Export' };
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
      const defaultSettings: AppSettings = { availableFields: AVAILABLE_FIELDS, customHeader: '# PO Line Export' };
      const loadedSettings = settings && settings.availableFields ? settings : defaultSettings;
      if (!loadedSettings.customHeader) {
        loadedSettings.customHeader = defaultSettings.customHeader;
      }
      this.settings = loadedSettings;
      this.exportFields = this.settings.availableFields.filter(field => field.selected);
    });
  }

  ngOnDestroy(): void {
    if (this.settingsSubscription) this.settingsSubscription.unsubscribe();
    if (this.entitiesSubscription) this.entitiesSubscription.unsubscribe();
  }

  clearSelection() {
    this.selectEntities.clear();  
    this.previewContent = null;  
  }
  
  private getExportContent(): Observable<string> {
    if (this.selectedEntities.length === 0) {
      this.alert.warn('Select at least one PO line to process.');
      return of('');
    }
    if (this.exportFields.length === 0) {
      this.alert.warn('No fields are selected for export. Please check the Settings.');
      return of('');
    }
    this.loading = true;
    const requests = this.selectedEntities.map(entity => this.restService.call({ url: entity.link, method: HttpMethod.GET }));
    return forkJoin(requests).pipe(
      finalize(() => this.loading = false),
      map((responses: any[]) => this.generateFileContent(responses))
    );
  }

  onGenerateExport() {
    this.previewContent = null;
    this.getExportContent().subscribe({
      next: (fileContent) => { if (fileContent) { this.previewContent = fileContent; this.alert.success('Preview generated successfully.'); } },
      error: (err) => this.alert.error('Error generating preview: ' + err.message)
    });
  }

  copyToClipboard() {
    this.getExportContent().subscribe({
      next: (fileContent) => {
        if (fileContent) {
          navigator.clipboard.writeText(fileContent).then(
            () => this.alert.success('Content copied to clipboard.'),
            () => this.alert.error('Failed to copy content.')
          );
        }
      },
      error: (err) => this.alert.error('Error preparing content for copy: ' + err.message)
    });
  }
  
  downloadFile() {
    this.getExportContent().subscribe({
      next: (fileContent) => {
        if (fileContent) {
          const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'po_line_export.txt';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.alert.success('File download started.');
        }
      },
      error: (err) => this.alert.error('Error preparing file for download: ' + err.message)
    });
  }

  private generateFileContent(responses: any[]): string {
    const headers = this.exportFields.map(field => field.customLabel).join('\t');
    const customHeader = this.settings.customHeader ? `${this.settings.customHeader}\n` : '';
    let fileContent = `${customHeader}${headers}\n`;  

    responses.forEach((poLine: any) => {
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
          case 'quantity': return (poLine.location || []).reduce((sum: number, loc: any) => sum + (loc.quantity || 0), 0);
          default: return '';
        }
      }).join('\t');
      fileContent += `${row}\n`;
    });
    return fileContent;
  }
}

