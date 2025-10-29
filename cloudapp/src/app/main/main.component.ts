import { Component, OnDestroy, OnInit, ViewChild, ElementRef, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AlertService,
  CloudAppEventsService,
  CloudAppRestService,
  Entity,
  HttpMethod,
  CloudAppSettingsService,
} from '@exlibris/exl-cloudapp-angular-lib';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { Observable, forkJoin, Subscription, of } from 'rxjs';
import { finalize, tap, map } from 'rxjs/operators'; // Usunięto nieużywane switchMap, delay
import { SelectEntitiesComponent } from '@exlibris/eca-components';
import { AVAILABLE_FIELDS } from './field-definitions';
import { FieldConfig, AppSettings } from '../models/settings';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('selectEntities') selectEntities!: SelectEntitiesComponent;  
  @ViewChild('exportTextArea') exportTextAreaRef!: ElementRef<HTMLTextAreaElement>;  

  loading = false;
  visibleEntities: Entity[] = [];  
  selectedEntities: Entity[] = [];  
  previewContent: string | null = null;
  exportFields: FieldConfig[] = []; 
  
  translationsLoaded = false; 

  entities$: Observable<Entity[]>;
  public alert: AlertService;  
  window: Window = window;

  titleSelectText: string = ''; 
  titleOptionsText: string = '';
  previewButtonText: string = '';
  copyButtonText: string = '';
  downloadButtonText: string = '';
  selectTitleText: string = '';

  private settings: AppSettings = { availableFields: [...AVAILABLE_FIELDS], customHeader: '# PO Line Export' };
  private settingsSubscription: Subscription = new Subscription();
  private entitiesSubscription: Subscription = new Subscription();
  private langChangeSubscription: Subscription = new Subscription(); 

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    alert: AlertService,  
    private translate: TranslateService,
    private http: HttpClient,
    private settingsService: CloudAppSettingsService,
    private cd: ChangeDetectorRef,
    private elementRef: ElementRef 
  ) {
    this.alert = alert;
    this.entities$ = this.eventsService.entities$.pipe(
      tap((entities: Entity[]) => { 
        this.loading = false;
        this.visibleEntities = entities || [];  
        this.selectedEntities = [];  
        this.previewContent = null;
        setTimeout(() => this.updateSelectAllCheckboxLabel(), 200); 
      })
    );
  }

  async ngOnInit() {  
    await this.loadTranslations(); 

    this.entitiesSubscription = this.entities$.subscribe();
    this.settingsSubscription = this.settingsService.get().subscribe((settings: AppSettings) => {
      const defaultSettings: AppSettings = { availableFields: AVAILABLE_FIELDS, customHeader: '# PO Line Export' };
      const loadedSettings = settings && settings.availableFields ? settings : defaultSettings;
      if (!loadedSettings.customHeader) {
        loadedSettings.customHeader = defaultSettings.customHeader;
      }
      this.settings = loadedSettings;
      this.exportFields = this.settings.availableFields.filter((field: FieldConfig) => field.selected);
    });

    this.langChangeSubscription = this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      console.log('Language changed:', event.lang);
      this.loadTranslations(); 
      setTimeout(() => this.updateSelectAllCheckboxLabel(), 300); 
    });
  }

  private loadTranslations(): Promise<void> {
    const keysToLoad = [
      'Main.EntityList.TitleSelect',
      'Main.EntityList.TitleOptions',
      'Main.EntityList.Buttons.Preview',
      'Main.EntityList.Buttons.Copy',
      'Main.EntityList.Buttons.Download',
      'Main.EntityList.SelectTitle'
    ];

    return new Promise(resolve => {
        this.translate.get(keysToLoad).subscribe((translations: { [key: string]: string }) => {
            this.titleSelectText = translations['Main.EntityList.TitleSelect'];
            this.titleOptionsText = translations['Main.EntityList.TitleOptions'];
            this.previewButtonText = translations['Main.EntityList.Buttons.Preview'];
            this.copyButtonText = translations['Main.EntityList.Buttons.Copy'];
            this.downloadButtonText = translations['Main.EntityList.Buttons.Download'];
            this.selectTitleText = translations['Main.EntityList.SelectTitle'];
            this.cd.markForCheck();
            this.translationsLoaded = true; // Flaga w górę
            resolve(); // Rozwiązanie Promise
        });
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.updateSelectAllCheckboxLabel(), 300); // Zwiększony timeout
  }

  private updateSelectAllCheckboxLabel() {
    try {
      const selectEntitiesElement = this.elementRef.nativeElement.querySelector('eca-select-entities');
      if (selectEntitiesElement) {
        const selectAllCheckboxLabel = selectEntitiesElement.querySelector('mat-checkbox .mdc-checkbox__label'); 
        const genericLabel = selectEntitiesElement.querySelector('mat-checkbox label'); 
        const labelElement = selectAllCheckboxLabel || genericLabel; 

        if (labelElement) {
          const translatedText = this.translate.instant('Main.SelectEntities.CheckAll');
          if (labelElement.innerHTML !== `<b>${translatedText}</b>`) {
             labelElement.innerHTML = `<b>${translatedText}</b>`; 
             console.log('Checkbox label updated with bold to:', translatedText);
          }
        } else {
          console.warn('Could not find the select all checkbox label element inside eca-select-entities using selectors.');
        }
      } else {
        console.warn('Could not find the eca-select-entities element in the DOM.');
      }
    } catch (error) {
      console.error('Error trying to update select all checkbox label:', error);
    }
  }

  ngOnDestroy(): void {
    if (this.settingsSubscription) this.settingsSubscription.unsubscribe();
    if (this.entitiesSubscription) this.entitiesSubscription.unsubscribe();
    if (this.langChangeSubscription) this.langChangeSubscription.unsubscribe();
  }

  clearSelection() {
    this.selectEntities.clear();  
    this.previewContent = null;  
  }
  
  private getExportContent(): Observable<string> {
    if (this.selectedEntities.length === 0) {
      this.alert.warn(this.translate.instant('Main.Alerts.SelectOne'));
      return of('');
    }
    if (this.exportFields.length === 0) {
      this.alert.warn(this.translate.instant('Main.Alerts.NoFieldsSelected'));
      return of('');
    }
    this.loading = true;
    const requests = this.selectedEntities.map((entity: Entity) => this.restService.call({ url: entity.link, method: HttpMethod.GET }));
    return forkJoin(requests).pipe(
      finalize(() => this.loading = false),
      map((responses: any[]) => this.generateFileContent(responses))
    );
  }

  onGenerateExport() {
    this.previewContent = null;
    this.getExportContent().subscribe({
      next: (fileContent) => { if (fileContent) { this.previewContent = fileContent; this.alert.success(this.translate.instant('Main.Alerts.PreviewSuccess')); } },
      error: (err) => this.alert.error(this.translate.instant('Main.Alerts.PreviewError') + err.message)
    });
  }

  copyToClipboard() {
    this.getExportContent().subscribe({
      next: (fileContent) => {
        if (fileContent) {
          const textArea = document.createElement("textarea");
          textArea.value = fileContent;
          textArea.style.position = 'fixed';
          textArea.style.top = '0';
          textArea.style.left = '0';
          textArea.style.opacity = '0';

          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            const successful = document.execCommand('copy');
            if(successful) {
              this.alert.success(this.translate.instant('Main.Alerts.CopySuccess'));
            } else {
              this.alert.error(this.translate.instant('Main.Alerts.CopyError'));
            }
          } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            this.alert.error(this.translate.instant('Main.Alerts.CopyError'));
          }
          document.body.removeChild(textArea);
        }
      },
      error: (err) => this.alert.error(this.translate.instant('Main.Alerts.CopyPrepError') + err.message)
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
          a.download = this.translate.instant('Main.ExportFilename'); 
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.alert.success(this.translate.instant('Main.Alerts.DownloadSuccess'));
        }
      },
      error: (err) => this.alert.error(this.translate.instant('Main.Alerts.DownloadError') + err.message)
    });
  }

  private generateFileContent(responses: any[]): string {
    const headers = this.exportFields.map((field: FieldConfig) => {
      if (typeof field.customLabel === 'string' && field.customLabel.startsWith('Fields.')) {
         try {
           return this.translate.instant(field.customLabel); 
         } catch (e) {
           console.error(`Missing translation for key: ${field.customLabel}`);
           return field.customLabel; 
         }
      }
      return field.customLabel || ''; 
    }).join('\t');

    const customHeader = this.settings.customHeader ? `${this.settings.customHeader}\n` : '';
    let fileContent = `${customHeader}${headers}\n`;  

    responses.forEach((poLine: any) => {
      const row = this.exportFields.map((field: FieldConfig) => {
        switch (field.name) {
          case 'isbn': return poLine.resource_metadata?.isbn || '';
          case 'title': return poLine.resource_metadata?.title || '';
          case 'author': return poLine.resource_metadata?.author || '';
          case 'poNumber': return poLine.po_number || '';
          case 'line_number': return poLine.number || '';
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