import { Component, OnDestroy, OnInit, ViewChild, ElementRef, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AlertService,
  CloudAppEventsService,
  CloudAppRestService,
  Entity,
} from '@exlibris/exl-cloudapp-angular-lib';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { Observable, Subscription, of } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { SelectEntitiesComponent } from '@exlibris/eca-components';
import { FieldConfig, AppSettings, ProcessedSettings } from '../models/settings';
import { ExportService, ExportResult } from '../export.service';
import { SettingsService } from '../settings.service';
import { DomService } from './dom.service';
import { ValidationService } from './validation.service'; 

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  providers: [DomService, ValidationService] 
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

  private settings: AppSettings | undefined; 
  private settingsSubscription: Subscription = new Subscription();
  private entitiesSubscription: Subscription = new Subscription();
  private langChangeSubscription: Subscription = new Subscription(); 

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    alert: AlertService,  
    private translate: TranslateService,
    private http: HttpClient,
    private settingsService: SettingsService,
    private cd: ChangeDetectorRef,
    private elementRef: ElementRef, 
    private exportService: ExportService,
    private domService: DomService,
    private validationService: ValidationService 
  ) {
    this.alert = alert;
    this.entities$ = this.eventsService.entities$.pipe(
      tap((entities: Entity[]) => { 
        this.loading = false;
        this.visibleEntities = entities || [];  
        this.selectedEntities = [];  
        this.previewContent = null;
        setTimeout(() => this.domService.updateSelectAllCheckboxLabel(
            this.elementRef.nativeElement, 
            this.translate.instant('Main.SelectEntities.CheckAll')
        ), 200); 
      })
    );
  }

  async ngOnInit() {  
    await this.loadTranslations(); 

    this.entitiesSubscription = this.entities$.subscribe();
    
    this.settingsSubscription = this.settingsService.getSettings().subscribe(
      (processed: ProcessedSettings) => {
        this.settings = processed.settings;
        this.exportFields = processed.exportFields;
      }
    );

    this.langChangeSubscription = this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      console.log('Language changed:', event.lang);
      this.loadTranslations(); 
      setTimeout(() => this.domService.updateSelectAllCheckboxLabel(
        this.elementRef.nativeElement, 
        this.translate.instant('Main.SelectEntities.CheckAll')
      ), 300); 
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
        this.translationsLoaded = true;
        resolve();
      });
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.domService.updateSelectAllCheckboxLabel(
      this.elementRef.nativeElement, 
      this.translate.instant('Main.SelectEntities.CheckAll')
    ), 300);
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

    onGenerateExport() {
    this.previewContent = null;
    
    const errorKey = this.validationService.validateExportParameters(
      this.selectedEntities,
      this.exportFields,
      this.settings?.customHeader
    );

    if (errorKey) {
      this.alert.warn(this.translate.instant(errorKey));
      return;
    }
    
    this.loading = true; 

    this.exportService.generateExport(
      this.selectedEntities,
      this.exportFields, 
      this.settings!.customHeader 
    ).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (result: ExportResult) => { 
        this.previewContent = result.fileContent; 
        this.alert.success(this.translate.instant('Main.Alerts.PreviewSuccess')); 
      },
      error: (err) => {
        this.alert.error(this.translate.instant('Main.Alerts.PreviewError') + ': ' + err.message);
      }
    });
  }

    copyToClipboard() {
    const errorKey = this.validationService.validatePreviewContent(this.previewContent);
    if (errorKey) {
      this.alert.warn(this.translate.instant(errorKey));
      return;
    }
    this.exportService.copyContent(this.previewContent!);
  }
  
  downloadFile() {
    const errorKey = this.validationService.validatePreviewContent(this.previewContent);
    if (errorKey) {
      this.alert.warn(this.translate.instant(errorKey));
      return;
    }
    this.exportService.downloadContent(this.previewContent!);
  }
}

