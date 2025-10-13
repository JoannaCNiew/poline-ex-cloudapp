import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SelectEntitiesModule } from '@exlibris/eca-components';
import { AlertModule, CloudAppTranslateModule, InitService, MaterialModule } from '@exlibris/exl-cloudapp-angular-lib';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainComponent } from './main/main.component';
import { TopmenuComponent } from './topmenu/topmenu.component';
import { SettingsComponent } from './settings/settings.component'; 
import { MultiSelectComponent } from './multi-select/multi-select.component'; 

@NgModule({
    declarations: [
        AppComponent,
        MainComponent,
        TopmenuComponent,
        SettingsComponent,
        MultiSelectComponent
    ],
    bootstrap: [AppComponent],
    imports: [
        CommonModule,
        MaterialModule,
        MatProgressSpinnerModule,
        MatCheckboxModule,
        MatRadioModule,
        MatButtonModule,
        MatIconModule,
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        AlertModule,
        FormsModule,
        ReactiveFormsModule,
        SelectEntitiesModule,
        CloudAppTranslateModule.forRoot()],
    providers: [
        { provide: APP_INITIALIZER, useFactory: () => () => true, deps: [InitService], multi: true },
        // ZMIENIONE: 'standard' na 'outline'
        { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } }, 
        provideHttpClient(withInterceptorsFromDi())
    ]
})
export class AppModule { }
