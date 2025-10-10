import { Component, OnInit, ViewChild } from '@angular/core';
import { Entity } from '@exlibris/exl-cloudapp-angular-lib';
import { AppService } from '../app.service';
import { SelectEntitiesComponent } from '@exlibris/eca-components'; // Konieczny import

@Component({
  selector: 'app-multi-select',
  templateUrl: './multi-select.component.html',
  styleUrls: ['./multi-select.component.scss']
})
export class MultiSelectComponent implements OnInit {
  
  // ROZWIĄZANIE BŁĘDU TS2339 (selectEntities.clear()):
  // Używamy ViewChild, aby powiązać instancję klasy z elementem w HTML (#selectEntities).
  // Operator '!' informuje TypeScript, że Angular zainicjuje tę właściwość.
  @ViewChild('selectEntities') selectEntities!: SelectEntitiesComponent;

  // ROZWIĄZANIE BŁĘDU TS2322: count jest typu number i będzie poprawnie wiązane.
  count: number = 0;
  
  constructor(
    private appService: AppService,
  ) { }

  ngOnInit() {
    this.appService.setTitle('Multi-select Test');
  }

  selectedEntities = new Array<Entity>();
}
