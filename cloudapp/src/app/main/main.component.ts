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

@Component({
    selector: 'app-main',
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.scss'],
    providers: [ DomService ] 
})
export class MainComponent implements OnInit, OnDestroy, AfterViewInit {

    @ViewChild('selectEntities') selectEntities!: SelectEntitiesComponent;  
    @ViewChild('exportTextArea') exportTextAreaRef!: ElementRef<HTMLTextAreaElement>;  

    loading = false;
    visibleEntities: Entity[] = [];  
    selectedEntities: Entity[] = [];  
    previewContent: string | null = null;
    
    private exportFields: FieldConfig[] = []; 
    private settings: AppSettings | null = null;

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
    
    private settingsSubscription: Subscription = new Subscription();
    private entitiesSubscription: Subscription = new Subscription();
    private langChangeSubscription: Subscription = new Subscription(); 

    constructor(
        private restService: CloudAppRestService,
        private eventsService: CloudAppEventsService,
        alert: AlertService,  
        private translate: TranslateService,
        private http: HttpClient, 
        private cd: ChangeDetectorRef,
        private elementRef: ElementRef, 
        private exportService: ExportService,
        private settingsService: SettingsService,
        private domService: DomService 
    ) {
        this.alert = alert;
        this.entities$ = this.eventsService.entities$.pipe(
            tap((entities: Entity[]) => { 
                this.loading = false;
                this.visibleEntities = entities || [];  
                this.selectedEntities = [];  
                this.previewContent = null;
                setTimeout(() => this.updateCheckboxLabel(), 200); 
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
            setTimeout(() => this.updateCheckboxLabel(), 300); 
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
        setTimeout(() => this.updateCheckboxLabel(), 300);
    }


    private updateCheckboxLabel() {
        try {
            const translatedText = this.translate.instant('Main.SelectEntities.CheckAll');
            if (translatedText && translatedText !== 'Main.SelectEntities.CheckAll') {
                this.domService.updateSelectAllCheckboxLabel( 
                    this.elementRef.nativeElement,
                    translatedText
                );
            } else {
                console.warn('Checkbox label translation not ready yet on "instant" call.');
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
    
    onGenerateExport() {
        this.previewContent = null;
        
        if (this.selectedEntities.length === 0) {
            this.alert.warn(this.translate.instant('Main.Alerts.SelectOne'));
            return;
        }
        
        if (this.exportFields.length === 0) {
            this.alert.warn(this.translate.instant('Main.Alerts.NoFieldsSelected'));
            return;
        }

        if (!this.settings || !this.settings.customHeader) {
             this.alert.error(this.translate.instant('Main.Alerts.SettingsNotReady') || 'Settings not loaded yet.');
             return;
        }
        
        this.loading = true; 

        this.exportService.generateExport(
            this.selectedEntities,
            this.exportFields, 
            this.settings.customHeader 
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
        if (!this.previewContent) {
            this.alert.warn(this.translate.instant('Main.Alerts.NoPreviewContent')); 
            return;
        }
        this.exportService.copyContent(this.previewContent);
    }
    
    downloadFile() {
        if (!this.previewContent) {
            this.alert.warn(this.translate.instant('Main.Alerts.NoPreviewContent')); 
            return;
        }
        this.exportService.downloadContent(this.previewContent);
    }
}
