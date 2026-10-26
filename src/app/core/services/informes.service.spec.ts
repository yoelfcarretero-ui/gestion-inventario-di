import { generarCsv } from './informes.service';
import { Columna } from '../utils/formato.util';

interface Fila {
  nombre: string;
  precio: number;
  estado: string;
}

const columnas: Columna<Fila>[] = [
  { clave: 'nombre', etiqueta: 'Nombre' },
  { clave: 'precio', etiqueta: 'Precio', tipo: 'moneda' },
  { clave: 'estado', etiqueta: 'Estado', tipo: 'estado' },
];

describe('generarCsv', () => {
  it('incluye BOM, cabecera y separador punto y coma', () => {
    const csv = generarCsv({ columnas, filas: [{ nombre: 'Ratón', precio: 39.9, estado: 'pendiente' }] });
    expect(csv.startsWith('﻿')).toBe(true);
    const lineas = csv.slice(1).split('\r\n');
    expect(lineas[0]).toBe('Nombre;Precio;Estado');
    // Los números se exportan con coma decimal y sin símbolo, para poder operar en la hoja de cálculo.
    expect(lineas[1]).toBe('Ratón;39,9;Pendiente');
  });

  it('escapa comillas, separadores y saltos de línea', () => {
    const csv = generarCsv({ columnas, filas: [{ nombre: 'Monitor 27" 4K; mate\nnuevo', precio: 1, estado: 'enviado' }] });
    expect(csv).toContain('"Monitor 27"" 4K; mate\nnuevo"');
  });

  it('genera solo la cabecera si no hay filas', () => {
    expect(generarCsv({ columnas, filas: [] })).toBe('﻿Nombre;Precio;Estado');
  });
});
