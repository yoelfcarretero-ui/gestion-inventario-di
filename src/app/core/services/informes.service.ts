import { Injectable } from '@angular/core';

import { Columna, valorCelda } from '../utils/formato.util';

/** Definición de un informe tabulado exportable. */
export interface Informe<T> {
  titulo: string;
  /** Línea descriptiva bajo el título (filtros aplicados, autor...). */
  subtitulo?: string;
  columnas: Columna<T>[];
  filas: T[];
  /** Pares etiqueta/valor que se muestran como resumen al final del PDF. */
  resumen?: { etiqueta: string; valor: string }[];
  /** Nombre base del fichero, sin extensión. */
  nombreFichero: string;
}

/**
 * Genera el contenido CSV de un informe.
 * Usa `;` como separador y BOM UTF-8 para que Excel en español lo abra correctamente.
 */
export function generarCsv<T>(informe: Pick<Informe<T>, 'columnas' | 'filas'>): string {
  const escapar = (valor: string) => (/[";\n\r]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor);
  const cabecera = informe.columnas.map((c) => escapar(c.etiqueta)).join(';');
  const filas = informe.filas.map((fila) =>
    informe.columnas
      .map((c) => {
        const bruto = fila[c.clave] as unknown;
        // Los números se exportan sin formato de moneda para que la hoja de cálculo pueda operar con ellos.
        const texto = typeof bruto === 'number' && !c.formato ? String(bruto).replace('.', ',') : valorCelda(fila, c);
        return escapar(texto);
      })
      .join(';'),
  );
  return '﻿' + [cabecera, ...filas].join('\r\n');
}

/**
 * Exportación de informes tabulados a CSV y PDF.
 * La librería de PDF se carga bajo demanda (import dinámico) para no penalizar la carga inicial.
 */
@Injectable({ providedIn: 'root' })
export class InformesService {
  /** Descarga el informe como fichero CSV. */
  exportarCsv<T>(informe: Informe<T>): void {
    const blob = new Blob([generarCsv(informe)], { type: 'text/csv;charset=utf-8' });
    this.descargar(blob, `${informe.nombreFichero}.csv`);
  }

  /** Genera y descarga el informe como PDF maquetado (cabecera, tabla con estilos, resumen y paginación). */
  async exportarPdf<T>(informe: Informe<T>): Promise<void> {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const horizontal = informe.columnas.length > 5;
    const doc = new jsPDF({ orientation: horizontal ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
    const ancho = doc.internal.pageSize.getWidth();
    const azul: [number, number, number] = [30, 64, 175];

    // Cabecera corporativa
    doc.setFillColor(...azul);
    doc.rect(0, 0, ancho, 64, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Gestión de Inventario', 40, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generado el ${new Date().toLocaleString('es-ES')}`, 40, 48);

    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(informe.titulo, 40, 92);
    if (informe.subtitulo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text(informe.subtitulo, 40, 108);
    }

    autoTable(doc, {
      startY: informe.subtitulo ? 120 : 104,
      head: [informe.columnas.map((c) => c.etiqueta)],
      body: informe.filas.map((f) => informe.columnas.map((c) => valorCelda(f, c))),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: azul, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [243, 244, 246] },
      columnStyles: Object.fromEntries(
        informe.columnas.map((c, i) => [i, { halign: c.tipo === 'moneda' || c.tipo === 'numero' ? 'right' : 'left' }]),
      ),
      margin: { left: 40, right: 40, bottom: 50 },
      didDrawPage: () => {
        const alto = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(`Página ${doc.getNumberOfPages()}`, ancho - 40, alto - 24, { align: 'right' });
        doc.text('Datos sintéticos de demostración', 40, alto - 24);
      },
    });

    if (informe.resumen?.length) {
      const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
      autoTable(doc, {
        startY: y,
        head: [['Resumen', '']],
        body: informe.resumen.map((r) => [r.etiqueta, r.valor]),
        theme: 'grid',
        tableWidth: 280,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [55, 65, 81] },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 40 },
      });
    }

    this.descargar(doc.output('blob'), `${informe.nombreFichero}.pdf`);
  }

  private descargar(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
