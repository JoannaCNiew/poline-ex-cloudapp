import { FieldConfig } from '../models/settings';

// Lista wszystkich dostępnych pól PO Line do eksportu.
export const AVAILABLE_FIELDS: FieldConfig[] = [
    { name: 'isbn', label: 'ISBN', selected: true, customLabel: 'ISBN' },
    { name: 'title', label: 'Tytuł', selected: true, customLabel: 'Tytuł' },
    { name: 'quantity', label: 'Ilość', selected: true, customLabel: 'Ilość' },
    { name: 'poNumber', label: 'Numer zamówienia', selected: false, customLabel: 'Numer zamówienia' },
    { name: 'author', label: 'Autor', selected: false, customLabel: 'Autor' },
    { name: 'line_number', label: 'Numer linii', selected: false, customLabel: 'Numer linii' },
    { name: 'owner', label: 'Właściciel', selected: false, customLabel: 'Właściciel' },
    { name: 'vendor', label: 'Dostawca', selected: false, customLabel: 'Dostawca' },
    { name: 'price', label: 'Cena', selected: false, customLabel: 'Cena' },
    { name: 'fund', label: 'Fundusz', selected: false, customLabel: 'Fundusz' },
];
