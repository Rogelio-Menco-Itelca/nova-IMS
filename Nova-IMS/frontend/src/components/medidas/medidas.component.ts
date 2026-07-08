import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  computed,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  hasMedidasPanelPendingChanges,
  pendingMedidasSections,
  snapshotMedidasDraft,
  describeMedidasSaveDelta,
  type MedidasDraftSnapshot,
} from '../../utils/medidas-pending-changes';
import { ConfigurationService } from '../../services/configuration.service';
import {
  CSJ_MEDIADAS_WORKFLOW_STEPS,
  describeClosedReviewStages,
  getMedidasPermissions,
  isClosedWorkflowStatus,
  isNuevoLockedMedidasPanel,
  medidasPanelLockedMessage,
  medidasTabHint,
  resolveClosedMedidasPermissions,
  type MedidasFieldMode,
  type MedidasPermissions,
} from '../../utils/medidas-permissions';
import {
  catalogStatusToUiStatus,
  CSJ_STATUS_WORKFLOW_RANK,
} from '../../models/incident.model';

interface TipoMedida {
  id: number;
  nombre: string;
  descripcion: string;
}

interface MedidaAsignada {
  ID_tipo_medida: number;
  nombre: string;
  cantidad: number;
  observacion_medida: string;
  asignado: boolean;
}

interface Gestion {
  ID_gestion: number;
  servidor_judicial: string;
  cedula: string;
  cargo: string;
  codigo_oficio: string;
  tramite_destino: string;
  fecha_cerrem: string;
  resolucion_cerrem: string;
  fecha_resolucion: string;
  ID_riesgo: number;
  nivel_riesgo: string;
  tipo_esquema: 'Individual' | 'Colectivo' | null;
  compartido_con: string;
  observaciones: string;
}

interface Solicitud {
  servidor_judicial: string;
  cedula: string;
  cargo: string;
}

type ModuloMedidas = 'oseg' | 'cerrem' | 'medidas';

interface ModuloMensaje {
  texto: string;
  tipo: 'ok' | 'error';
}

@Component({
  selector: 'app-medidas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      @if (!permissions().showPanel) {
        @if (isNuevoLocked()) {
          <div class="rounded-lg border border-gray-700 bg-gray-900/50 p-5 sm:p-6">
            <div class="flex items-start gap-4">
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-600 bg-gray-800 text-gray-400"
                aria-hidden="true"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.75"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-base font-semibold text-gray-100 mb-2">
                  Aún no puede gestionar OSEG ni CERREM
                </h3>
                <p class="text-sm text-gray-400 leading-relaxed">
                  El incidente está en «{{ uiStatus() }}». Cambie el estado a «En gestión OSEG» desde
                  la pestaña Detalle y guarde para habilitar el registro del oficio, la decisión
                  CERREM y las medidas de seguridad.
                </p>
              </div>
            </div>

            <div
              class="mt-5 flex items-center gap-2 overflow-x-auto pb-1"
              role="list"
              aria-label="Flujo de estados CSJ"
            >
              @for (step of workflowSteps; track step; let i = $index; let last = $last) {
                <div class="flex items-center gap-2 shrink-0" role="listitem">
                  <span
                    class="inline-flex items-center rounded-full border px-3 py-1 text-xs sm:text-sm whitespace-nowrap"
                    [class.border-gray-500]="step === uiStatus()"
                    [class.bg-gray-800]="step === uiStatus()"
                    [class.text-gray-100]="step === uiStatus()"
                    [class.border-gray-700]="step !== uiStatus()"
                    [class.bg-gray-900/60]="step !== uiStatus()"
                    [class.text-gray-500]="step !== uiStatus()"
                  >
                    {{ step }}
                  </span>
                  @if (!last) {
                    <span class="text-gray-600 text-xs" aria-hidden="true">→</span>
                  }
                </div>
              }
            </div>

            <button
              type="button"
              (click)="goToDetalle.emit()"
              class="mt-5 w-full rounded-lg border border-gray-600 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-gray-800 hover:border-gray-500 transition-colors"
            >
              Ir a Detalle para cambiar el estado →
            </button>
          </div>
        } @else {
          <div class="rounded-lg border border-gray-700 bg-gray-800/60 p-4 text-center text-sm text-gray-400">
            {{ panelLockedMessage() }}
          </div>
        }
      } @else if (closedReviewEmpty()) {
        <div class="bg-gray-800/60 border border-gray-700 rounded-lg p-6 text-center text-gray-400 text-sm">
          Este incidente se cerró sin registros en Medidas (OSEG, CERREM ni medidas de seguridad).
        </div>
      } @else {
        @if (displayHint()) {
          <div
            class="rounded-md p-3 text-sm border"
            [class.bg-amber-900/20]="permissions().medidasFisicas === 'editable'"
            [class.border-amber-500/40]="permissions().medidasFisicas === 'editable'"
            [class.text-amber-200]="permissions().medidasFisicas === 'editable'"
            [class.bg-indigo-900/20]="permissions().medidasFisicas !== 'editable'"
            [class.border-indigo-500/40]="permissions().medidasFisicas !== 'editable'"
            [class.text-indigo-200]="permissions().medidasFisicas !== 'editable'"
          >
            {{ displayHint() }}
          </div>
        }

        @if (permissions().showOsegBlock) {
          <div
            class="bg-gray-800 rounded-lg p-4 border border-orange-500/30"
            [class.opacity-95]="osegGuardada()"
          >
            <h3 class="text-orange-300 font-semibold flex items-center gap-2 text-sm uppercase tracking-wider mb-4">
              <svg class="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Gestión OSEG
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @if (fieldVisible('servidorJudicial')) {
                <div class="md:col-span-2">
                  <label for="medidas-servidor-judicial" class="text-xs text-gray-400 uppercase tracking-wider">Solicitud — Servidor judicial</label>
                  <input
                    id="medidas-servidor-judicial"
                    type="text"
                    [value]="displayServidor()"
                    readonly
                    class="mt-1 w-full bg-gray-900/80 border border-gray-600 text-gray-300 rounded-md px-3 py-2 text-sm cursor-not-allowed"
                  />
                  @if (!displayServidor()) {
                    <p class="mt-1 text-xs text-amber-400">
                      Registre al menos una persona involucrada en el incidente (pestaña Detalle).
                    </p>
                  }
                </div>
              }
              @if (fieldVisible('oficioTramite')) {
                <div>
                  <label for="medidas-oficio-tramite" class="text-xs text-gray-400 uppercase tracking-wider">Oficio trámite</label>
                  <input
                    id="medidas-oficio-tramite"
                    type="text"
                    [ngModel]="form.codigo_oficio"
                    (ngModelChange)="form.codigo_oficio = $event"
                    [readonly]="fieldAuto('oficioTramite') || !fieldEditable('oficioTramite')"
                    class="mt-1 w-full bg-gray-900 border border-gray-600 text-white rounded-md px-3 py-2 text-sm"
                    [class.cursor-not-allowed]="fieldAuto('oficioTramite') || !fieldEditable('oficioTramite')"
                    [class.opacity-80]="fieldAuto('oficioTramite')"
                    placeholder="Se genera automáticamente"
                  />
                </div>
              }
              @if (fieldVisible('tramiteDestino')) {
                <div>
                  <label for="medidas-tramite-destino" class="text-xs text-gray-400 uppercase tracking-wider">Trámite / destino</label>
                  <input
                    id="medidas-tramite-destino"
                    [(ngModel)]="form.tramite_destino"
                    (ngModelChange)="onDraftChange()"
                    type="text"
                    [readonly]="!isTramiteEditable()"
                    class="mt-1 w-full bg-gray-900 border border-gray-600 text-white rounded-md px-3 py-2 text-sm"
                    [class.cursor-not-allowed]="!isTramiteEditable()"
                    placeholder="Ej: CERREM — Protección a funcionarios judiciales"
                  />
                  @if (isTramiteEditable() && permissions().tramiteDestino === 'readonly') {
                    <p class="mt-1 text-xs text-amber-400">
                      Complete este dato pendiente de la gestión OSEG.
                    </p>
                  }
                </div>
              }
            </div>
            @if (showModuleActions()) {
              <div class="mt-4 pt-4 border-t border-orange-500/20 flex items-center justify-end gap-3 flex-wrap">
                @if (mensajeOseg(); as m) {
                  <span
                    class="text-xs"
                    [class.text-green-400]="m.tipo === 'ok'"
                    [class.text-red-400]="m.tipo === 'error'"
                  >{{ m.texto }}</span>
                } @else if (osegGuardada()) {
                  <span class="text-xs text-orange-300/90">Guardado — no editable</span>
                }
                @if (!osegGuardada()) {
                  <button
                    type="button"
                    (click)="guardarGestionOseg()"
                    class="group inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md shadow-indigo-900/30 transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-800 active:scale-[0.98]"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                      />
                    </svg>
                    Guardar gestión OSEG
                  </button>
                }
              </div>
            }
          </div>
        }

        @if (permissions().showCerremBlock) {
          <div
            class="bg-gray-800 rounded-lg p-4 border border-gray-700"
            [class.opacity-95]="cerremGuardada() && !cerremEditMode()"
          >
            <h3 class="text-white font-semibold flex items-center gap-2 text-sm uppercase tracking-wider mb-4">
              <svg class="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              Decisión CERREM
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @if (fieldVisible('fechaCerrem')) {
                <div>
                  <label for="medidas-fecha-cerrem" class="text-xs text-gray-400 uppercase tracking-wider">Fecha CERREM</label>
                  <input
                    id="medidas-fecha-cerrem"
                    [(ngModel)]="form.fecha_cerrem"
                    (ngModelChange)="onDraftChange()"
                    type="date"
                    [readonly]="!isCerremFieldEditable('fechaCerrem')"
                    class="mt-1 w-full bg-gray-900 border border-gray-600 text-white rounded-md px-3 py-2 text-sm"
                    [class.cursor-not-allowed]="!isCerremFieldEditable('fechaCerrem')"
                  />
                </div>
              }
              @if (fieldVisible('resolucionCerrem')) {
                <div>
                  <label for="medidas-resolucion-cerrem" class="text-xs text-gray-400 uppercase tracking-wider">Resolución CERREM</label>
                  <input
                    id="medidas-resolucion-cerrem"
                    [(ngModel)]="form.resolucion_cerrem"
                    (ngModelChange)="onDraftChange()"
                    type="text"
                    [readonly]="!isCerremFieldEditable('resolucionCerrem')"
                    class="mt-1 w-full bg-gray-900 border border-gray-600 text-white rounded-md px-3 py-2 text-sm"
                    [class.cursor-not-allowed]="!isCerremFieldEditable('resolucionCerrem')"
                    placeholder="Número de resolución"
                  />
                </div>
              }
              @if (fieldVisible('fechaResolucion')) {
                <div>
                  <label for="medidas-fecha-resolucion" class="text-xs text-gray-400 uppercase tracking-wider">Fecha resolución</label>
                  <input
                    id="medidas-fecha-resolucion"
                    [(ngModel)]="form.fecha_resolucion"
                    (ngModelChange)="onDraftChange()"
                    type="date"
                    [readonly]="!isCerremFieldEditable('fechaResolucion')"
                    class="mt-1 w-full bg-gray-900 border border-gray-600 text-white rounded-md px-3 py-2 text-sm"
                    [class.cursor-not-allowed]="!isCerremFieldEditable('fechaResolucion')"
                  />
                </div>
              }
              @if (fieldVisible('nivelRiesgo')) {
                <div>
                  <label for="medidas-nivel-riesgo" class="text-xs text-gray-400 uppercase tracking-wider">Nivel de riesgo</label>
                  <select
                    id="medidas-nivel-riesgo"
                    [(ngModel)]="form.ID_riesgo"
                    (ngModelChange)="onDraftChange()"
                    [disabled]="!isCerremFieldEditable('nivelRiesgo')"
                    class="mt-1 w-full bg-gray-900 border border-gray-600 text-white rounded-md px-3 py-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <option [ngValue]="null">Seleccione...</option>
                    @for (r of riesgos(); track r.id) {
                      <option [ngValue]="r.id">{{ r.nombre }}</option>
                    }
                  </select>
                </div>
              }
            </div>
            @if (showCerremAccion()) {
              <div class="mt-4 pt-4 border-t border-gray-700 flex items-center justify-end gap-3 flex-wrap">
                @if (mensajeCerrem(); as m) {
                  <span
                    class="text-xs"
                    [class.text-green-400]="m.tipo === 'ok'"
                    [class.text-red-400]="m.tipo === 'error'"
                  >{{ m.texto }}</span>
                } @else if (cerremGuardada() && !cerremEditMode()) {
                  <span class="text-xs text-gray-400">Guardado. Pulse «Editar» si debe actualizar la decisión CERREM.</span>
                }
                <button
                  type="button"
                  (click)="accionCerrem()"
                  class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 active:scale-[0.98]"
                  [class.bg-indigo-600]="cerremBotonGuardar()"
                  [class.hover:bg-indigo-500]="cerremBotonGuardar()"
                  [class.text-white]="cerremBotonGuardar()"
                  [class.shadow-md]="cerremBotonGuardar()"
                  [class.shadow-indigo-900/30]="cerremBotonGuardar()"
                  [class.focus:ring-indigo-400]="cerremBotonGuardar()"
                  [class.text-indigo-300]="!cerremBotonGuardar()"
                  [class.hover:text-indigo-200]="!cerremBotonGuardar()"
                  [class.hover:bg-indigo-500/10]="!cerremBotonGuardar()"
                  [class.border]="!cerremBotonGuardar()"
                  [class.border-indigo-500/40]="!cerremBotonGuardar()"
                  [class.focus:ring-indigo-500/50]="!cerremBotonGuardar()"
                >
                  @if (cerremBotonGuardar()) {
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                      />
                    </svg>
                  } @else {
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  }
                  {{ cerremBotonGuardar() ? 'Guardar' : 'Editar' }}
                </button>
              </div>
            }
          </div>
        }

        @if (permissions().showMedidasBlock) {
          <div
            class="bg-gray-800 rounded-lg p-4 border border-gray-700"
            [class.opacity-95]="medidasGuardadas() && !medidasEditMode()"
          >
            <h3 class="text-white font-semibold flex items-center gap-2 text-sm uppercase tracking-wider mb-4">
              <svg class="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Medidas de seguridad
            </h3>

            <div class="space-y-3">
              @for (tipo of tiposMedida(); track tipo.id) {
                <div
                  class="flex items-start gap-3 p-3 rounded-lg border"
                  [class.border-indigo-500]="isMedidaSelected(tipo.id)"
                  [class.bg-indigo-900/20]="isMedidaSelected(tipo.id)"
                  [class.border-gray-700]="!isMedidaSelected(tipo.id)"
                >
                  <input
                    type="checkbox"
                    [checked]="isMedidaSelected(tipo.id)"
                    (change)="toggleMedida(tipo.id)"
                    [disabled]="!isMedidasEditable()"
                    class="mt-1 h-4 w-4 accent-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div class="flex-1">
                    <p class="text-white text-sm font-medium">{{ tipo.nombre }}</p>
                    <p class="text-gray-400 text-xs">{{ tipo.descripcion }}</p>
                    @if (isMedidaSelected(tipo.id)) {
                      <div class="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label [for]="'medidas-cantidad-' + tipo.id" class="text-xs text-gray-400">Cantidad</label>
                          <input
                            [id]="'medidas-cantidad-' + tipo.id"
                            type="number"
                            min="1"
                            [ngModel]="getMedidaSeleccionada(tipo.id)!.cantidad"
                            (ngModelChange)="updateCantidad(tipo.id, $event)"
                            [readonly]="!isMedidasEditable()"
                            class="mt-1 w-full bg-gray-900 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label [for]="'medidas-obs-' + tipo.id" class="text-xs text-gray-400">Observación</label>
                          <input
                            [id]="'medidas-obs-' + tipo.id"
                            type="text"
                            [ngModel]="getMedidaSeleccionada(tipo.id)!.observacion_medida"
                            (ngModelChange)="updateObservacion(tipo.id, $event)"
                            [readonly]="!isMedidasEditable()"
                            class="mt-1 w-full bg-gray-900 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            @if (fieldVisible('tipoEsquema')) {
              <div class="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="medidas-tipo-esquema" class="text-xs text-gray-400 uppercase tracking-wider">Esquema colectivo o individual</label>
                  <select
                    id="medidas-tipo-esquema"
                    [(ngModel)]="form.tipo_esquema"
                    (ngModelChange)="onDraftChange()"
                    [disabled]="!isMedidasEditable()"
                    class="mt-1 w-full bg-gray-900 border border-gray-600 text-white rounded-md px-3 py-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <option [ngValue]="null">Seleccione...</option>
                    <option value="Individual">Individual</option>
                    <option value="Colectivo">Colectivo</option>
                  </select>
                </div>
                @if (form.tipo_esquema === 'Colectivo') {
                  <div class="md:col-span-2">
                    <label for="medidas-compartido-con" class="text-xs text-gray-400 uppercase tracking-wider">Compartido con</label>
                    <input
                      id="medidas-compartido-con"
                      [(ngModel)]="form.compartido_con"
                      (ngModelChange)="onDraftChange()"
                      type="text"
                      [readonly]="!isMedidasEditable()"
                      class="mt-1 w-full bg-gray-900 border border-gray-600 text-white rounded-md px-3 py-2 text-sm"
                      [class.cursor-not-allowed]="!isMedidasEditable()"
                    />
                  </div>
                }
              </div>
            }

            @if (fieldVisible('observaciones')) {
              <div class="mt-4 pt-4 border-t border-gray-700">
                <label for="medidas-observaciones" class="text-xs text-gray-400 uppercase tracking-wider">Observaciones</label>
                <textarea
                  id="medidas-observaciones"
                  [(ngModel)]="form.observaciones"
                  (ngModelChange)="onDraftChange()"
                  rows="2"
                  [readonly]="!isMedidasEditable()"
                  class="mt-1 w-full bg-gray-900 border border-gray-600 text-white rounded-md px-3 py-2 text-sm"
                  [class.cursor-not-allowed]="!isMedidasEditable()"
                ></textarea>
              </div>
            }

            @if (showMedidasAccion()) {
              <div class="mt-4 pt-4 border-t border-gray-700 flex items-center justify-end gap-3 flex-wrap">
                @if (mensajeMedidas(); as m) {
                  <span
                    class="text-xs"
                    [class.text-green-400]="m.tipo === 'ok'"
                    [class.text-red-400]="m.tipo === 'error'"
                  >{{ m.texto }}</span>
                } @else if (medidasGuardadas() && !medidasEditMode()) {
                  <span class="text-xs text-gray-400">Guardado. Pulse «Editar» para asignar más medidas o modificar las existentes.</span>
                }
                <button
                  type="button"
                  (click)="accionMedidas()"
                  [disabled]="medidasBotonGuardar() && medidasSeleccionadas().length === 0"
                  class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                  [class.bg-amber-600]="medidasBotonGuardar()"
                  [class.hover:bg-amber-500]="medidasBotonGuardar()"
                  [class.text-white]="medidasBotonGuardar()"
                  [class.shadow-md]="medidasBotonGuardar()"
                  [class.shadow-amber-900/30]="medidasBotonGuardar()"
                  [class.focus:ring-amber-400]="medidasBotonGuardar()"
                  [class.text-amber-300]="!medidasBotonGuardar()"
                  [class.hover:text-amber-200]="!medidasBotonGuardar()"
                  [class.hover:bg-amber-500/10]="!medidasBotonGuardar()"
                  [class.border]="!medidasBotonGuardar()"
                  [class.border-amber-500/40]="!medidasBotonGuardar()"
                  [class.focus:ring-amber-500/50]="!medidasBotonGuardar()"
                >
                  @if (medidasBotonGuardar()) {
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                      />
                    </svg>
                  } @else {
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  }
                  {{ medidasBotonGuardar() ? 'Guardar' : 'Editar' }}
                </button>
              </div>
            }
          </div>
        }
      }

    </div>
  `,
})
export class MedidasComponent implements OnInit, OnChanges {
  @Input() incidentId!: string;
  @Input() workflowStatus = 'Nuevo';
  @Input() agency = 'CSJ';
  /** Réplica en signal para que los computed reaccionen al cambio de @Input. */
  private readonly workflowStatusSig = signal('Nuevo');
  private readonly agencySig = signal('CSJ');
  @Output() goToDetalle = new EventEmitter<void>();
  @Output() gestionUpdated = new EventEmitter<void>();
  /** Medidas físicas + esquema guardados en `/medidas` (distinto del formulario del incidente). */
  @Output() medidasSaved = new EventEmitter<string | undefined>();
  /** true cuando hay borrador sin guardar en OSEG, CERREM o medidas. */
  @Output() pendingChangesChange = new EventEmitter<boolean>();

  readonly workflowSteps = CSJ_MEDIADAS_WORKFLOW_STEPS;

  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigurationService);

  private refreshAuditHistory(): void {
    this.configService.getAuditLogs().catch(() => void 0);
  }

  tiposMedida = signal<TipoMedida[]>([]);
  riesgos = signal<{ id: number; nombre: string }[]>([]);
  medidasSeleccionadas = signal<MedidaAsignada[]>([]);
  mensajeOseg = signal<ModuloMensaje | null>(null);
  mensajeCerrem = signal<ModuloMensaje | null>(null);
  mensajeMedidas = signal<ModuloMensaje | null>(null);
  private mensajeTimers: Partial<Record<ModuloMedidas, ReturnType<typeof setTimeout>>> = {};
  solicitud = signal<Solicitud | null>(null);

  gestionSnapshot = signal<Partial<Gestion> | null>(null);

  permissions = computed(() => {
    const status = this.workflowStatusSig();
    const agency = this.agencySig();
    if (isClosedWorkflowStatus(status)) {
      return resolveClosedMedidasPermissions(
        this.gestionSnapshot(),
        this.medidasSeleccionadas().length,
      );
    }
    return getMedidasPermissions(status, agency, this.gestionSnapshot());
  });
  closedReviewEmpty = computed(
    () =>
      isClosedWorkflowStatus(this.workflowStatusSig()) &&
      !this.permissions().showOsegBlock &&
      !this.permissions().showCerremBlock &&
      !this.permissions().showMedidasBlock,
  );
  hint = computed(() => medidasTabHint(this.workflowStatusSig(), this.gestionSnapshot()));
  uiStatus = computed(() => catalogStatusToUiStatus(this.workflowStatusSig()));
  isNuevoLocked = computed(() =>
    isNuevoLockedMedidasPanel(this.workflowStatusSig(), this.agencySig()),
  );
  panelLockedMessage = computed(() =>
    medidasPanelLockedMessage(this.workflowStatusSig(), this.agencySig()),
  );
  /** OSEG ya guardado en BD: oficio + trámite/destino completos. */
  osegGuardada = signal(false);
  /** CERREM ya guardado en BD: resolución + nivel de riesgo. */
  cerremGuardada = signal(false);
  cerremEditMode = signal(false);
  medidasGuardadas = signal(false);
  medidasEditMode = signal(false);
  private draftBaseline: MedidasDraftSnapshot | null = null;
  private readonly cerremFieldKeys: (keyof MedidasPermissions)[] = [
    'fechaCerrem',
    'resolucionCerrem',
    'fechaResolucion',
    'nivelRiesgo',
  ];
  displayHint = computed(() => {
    const ui = catalogStatusToUiStatus(this.workflowStatusSig());
    if (ui === 'En gestión OSEG' && this.osegGuardada()) {
      return 'Gestión OSEG registrada. Los datos quedaron bloqueados; avance el flujo o cierre el caso en «Cerrado» (pestaña Detalle).';
    }
    if (this.cerremGuardada() && !this.cerremEditMode() && this.permissions().showCerremBlock) {
      return 'Decisión CERREM guardada. Pulse «Editar» al final del módulo para modificar.';
    }
    if (this.medidasGuardadas() && !this.medidasEditMode() && this.permissions().showMedidasBlock) {
      return 'Medidas asignadas. Pulse «Editar» al final del módulo para agregar o cambiar medidas.';
    }
    if (isClosedWorkflowStatus(this.workflowStatus)) {
      const stages = describeClosedReviewStages(
        this.gestionSnapshot(),
        this.medidasSeleccionadas().length,
      );
      return stages || this.hint();
    }
    return this.hint();
  });
  form: Partial<Gestion> = {
    servidor_judicial: '',
    cedula: '',
    cargo: '',
    codigo_oficio: '',
    tramite_destino: '',
    fecha_cerrem: '',
    resolucion_cerrem: '',
    fecha_resolucion: '',
    ID_riesgo: null as unknown as number,
    tipo_esquema: null,
    compartido_con: '',
    observaciones: '',
  };

  ngOnInit() {
    this.workflowStatusSig.set(this.workflowStatus);
    this.agencySig.set(this.agency);
    this.loadTiposMedida();
    this.loadRiesgos();
    this.loadGestion();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['workflowStatus']) {
      this.workflowStatusSig.set(this.workflowStatus);
    }
    if (changes['agency']) {
      this.agencySig.set(this.agency);
    }
    if (changes['incidentId'] && !changes['incidentId'].firstChange) {
      this.loadGestion();
      return;
    }
    if (!changes['workflowStatus']) return;
    if (isClosedWorkflowStatus(this.workflowStatus)) return;
    const ui = catalogStatusToUiStatus(this.workflowStatus);
    const rank = CSJ_STATUS_WORKFLOW_RANK[ui];
    if (
      rank !== undefined &&
      rank >= CSJ_STATUS_WORKFLOW_RANK['En gestión OSEG'] &&
      !String(this.form.codigo_oficio || '').trim()
    ) {
      this.ensureGestionDraft();
    } else if (!changes['workflowStatus'].firstChange) {
      this.loadGestion();
    }
  }

  fieldVisible(key: keyof MedidasPermissions): boolean {
    const mode = this.permissions()[key] as MedidasFieldMode;
    return mode !== 'hidden';
  }

  fieldEditable(key: keyof MedidasPermissions): boolean {
    if (this.osegGuardada() && (key === 'tramiteDestino' || key === 'oficioTramite')) {
      return false;
    }
    return (this.permissions()[key] as MedidasFieldMode) === 'editable';
  }

  showModuleActions(): boolean {
    return !isClosedWorkflowStatus(this.workflowStatus);
  }

  hasPendingChanges(): boolean {
    return hasMedidasPanelPendingChanges(
      snapshotMedidasDraft(this.form, this.medidasSeleccionadas()),
      this.draftBaseline,
      this.pendingContext(),
    );
  }

  discardPendingChanges(): void {
    if (!this.draftBaseline) return;
    this.form.tramite_destino = this.draftBaseline.tramite_destino;
    this.form.fecha_cerrem = this.draftBaseline.fecha_cerrem;
    this.form.resolucion_cerrem = this.draftBaseline.resolucion_cerrem;
    this.form.fecha_resolucion = this.draftBaseline.fecha_resolucion;
    this.form.ID_riesgo = (this.draftBaseline.ID_riesgo ?? null) as unknown as number;
    this.form.tipo_esquema = this.draftBaseline.tipo_esquema as Gestion['tipo_esquema'];
    this.form.compartido_con = this.draftBaseline.compartido_con;
    this.form.observaciones = this.draftBaseline.observaciones;
    this.medidasSeleccionadas.set(
      this.draftBaseline.medidas.map((m) => {
        const tipo = this.tiposMedida().find((t) => t.id === m.ID_tipo_medida);
        return {
          ID_tipo_medida: m.ID_tipo_medida,
          nombre: tipo?.nombre ?? '',
          cantidad: m.cantidad,
          observacion_medida: m.observacion_medida,
          asignado: true,
        };
      }),
    );
    this.cerremEditMode.set(false);
    this.medidasEditMode.set(false);
    this.notifyPendingChanges();
  }

  async savePendingChanges(): Promise<boolean> {
    if (!this.hasPendingChanges()) return true;

    for (const section of pendingMedidasSections(
      snapshotMedidasDraft(this.form, this.medidasSeleccionadas()),
      this.draftBaseline,
      this.pendingContext(),
    )) {
      const ok = await this.savePendingSection(section);
      if (!ok) return false;
    }

    return true;
  }

  private async savePendingSection(section: 'oseg' | 'cerrem' | 'medidas'): Promise<boolean> {
    if (section === 'oseg') return this.savePendingOsegSection();
    if (section === 'cerrem') return this.savePendingCerremSection();
    return this.guardarMedidasAsync();
  }

  private async savePendingOsegSection(): Promise<boolean> {
    if (!String(this.form.tramite_destino || '').trim()) {
      this.showMensaje('oseg', 'Complete «Trámite / destino» antes de guardar.', 'error');
      return false;
    }
    return this.postGestionAsync('oseg', 'Gestión OSEG guardada correctamente');
  }

  private async savePendingCerremSection(): Promise<boolean> {
    if (!String(this.form.resolucion_cerrem || '').trim()) {
      this.showMensaje('cerrem', 'Complete «Resolución CERREM» antes de guardar.', 'error');
      return false;
    }
    if (!this.form.ID_riesgo) {
      this.showMensaje('cerrem', 'Seleccione el «Nivel de riesgo» antes de guardar.', 'error');
      return false;
    }
    return this.postGestionAsync(
      'cerrem',
      'Decisión CERREM guardada correctamente',
      () => this.cerremEditMode.set(false),
      true,
    );
  }

  onDraftChange(): void {
    this.notifyPendingChanges();
  }

  private notifyPendingChanges(): void {
    this.pendingChangesChange.emit(this.hasPendingChanges());
  }

  private pendingContext() {
    const permissions = this.permissions();
    return {
      closed: isClosedWorkflowStatus(this.workflowStatus),
      osegGuardada: this.osegGuardada(),
      cerremGuardada: this.cerremGuardada(),
      cerremEditMode: this.cerremEditMode(),
      medidasGuardadas: this.medidasGuardadas(),
      medidasEditMode: this.medidasEditMode(),
      showOsegBlock: permissions.showOsegBlock,
      showCerremBlock: permissions.showCerremBlock,
      showMedidasBlock: permissions.showMedidasBlock,
    };
  }

  private captureDraftBaseline(): void {
    this.draftBaseline = snapshotMedidasDraft(this.form, this.medidasSeleccionadas());
    this.notifyPendingChanges();
  }

  /** El flujo ya pasó por CERREM (incluye «Medidas asignadas» aunque canSaveGestion sea false). */
  private flujoCerremAlcanzado(): boolean {
    const ui = catalogStatusToUiStatus(this.workflowStatus);
    const rank = CSJ_STATUS_WORKFLOW_RANK[ui];
    return (
      rank !== undefined &&
      rank >= CSJ_STATUS_WORKFLOW_RANK['En evaluación CERREM'] &&
      rank < CSJ_STATUS_WORKFLOW_RANK['Cerrado']
    );
  }

  /**
   * Botón CERREM: «Guardar» la primera vez; «Editar» solo tras guardar;
   * «Guardar» de nuevo mientras edita.
   */
  showCerremAccion(): boolean {
    if (isClosedWorkflowStatus(this.workflowStatus)) return false;
    if (!this.permissions().showCerremBlock) return false;
    if (this.cerremGuardada()) return true;
    return this.permissions().canSaveGestion || this.flujoCerremAlcanzado();
  }

  /**
   * Botón medidas: «Guardar» la primera asignación; «Editar» solo tras guardar;
   * «Guardar» de nuevo si el operador agrega o cambia medidas.
   */
  showMedidasAccion(): boolean {
    if (isClosedWorkflowStatus(this.workflowStatus)) return false;
    if (!this.permissions().showMedidasBlock) return false;
    if (this.medidasGuardadas()) return true;
    return this.permissions().canSaveMedidas;
  }

  /** true = etiqueta «Guardar»; false = etiqueta «Editar» */
  cerremBotonGuardar(): boolean {
    return !this.cerremGuardada() || this.cerremEditMode();
  }

  medidasBotonGuardar(): boolean {
    return !this.medidasGuardadas() || this.medidasEditMode();
  }

  isCerremFieldEditable(key: keyof MedidasPermissions): boolean {
    if (isClosedWorkflowStatus(this.workflowStatus)) return false;
    if (!this.cerremFieldKeys.includes(key)) return this.fieldEditable(key);
    if (this.cerremGuardada() && !this.cerremEditMode()) return false;
    if (this.cerremEditMode()) return true;
    if (this.permissions()[key] === 'editable') return true;
    return !this.cerremGuardada() && this.flujoCerremAlcanzado();
  }

  isMedidasEditable(): boolean {
    if (isClosedWorkflowStatus(this.workflowStatus)) return false;
    if (this.medidasGuardadas() && !this.medidasEditMode()) return false;
    if (this.medidasEditMode()) return this.permissions().showMedidasBlock;
    return this.permissions().canSaveMedidas;
  }

  accionCerrem(): void {
    if (this.cerremGuardada() && !this.cerremEditMode()) {
      this.cerremEditMode.set(true);
      return;
    }
    this.guardarGestionCerrem();
  }

  accionMedidas(): void {
    if (this.medidasGuardadas() && !this.medidasEditMode()) {
      this.medidasEditMode.set(true);
      return;
    }
    this.guardarMedidas();
  }

  fieldAuto(key: keyof MedidasPermissions): boolean {
    return (this.permissions()[key] as MedidasFieldMode) === 'auto';
  }

  /** Permite completar OSEG si el incidente saltó ese paso. */
  isTramiteEditable(): boolean {
    if (this.osegGuardada()) return false;
    if (this.permissions().tramiteDestino === 'editable') return true;
    return (
      this.permissions().showOsegBlock &&
      this.permissions().canSaveGestion &&
      !String(this.form.tramite_destino || '').trim()
    );
  }

  displayServidor(): string {
    const s = this.solicitud();
    const name = String(this.form.servidor_judicial || s?.servidor_judicial || '').trim();
    const cedula = String(this.form.cedula || s?.cedula || '').trim();
    const cargo = String(this.form.cargo || s?.cargo || '').trim();
    const parts = [name];
    if (cedula) parts.push(`CC ${cedula}`);
    if (cargo) parts.push(`(${cargo})`);
    return parts.filter(Boolean).join(' — ');
  }

  private loadTiposMedida() {
    this.http.get<TipoMedida[]>('/api/medidas/tipos').subscribe({
      next: (rows) => this.tiposMedida.set(rows),
    });
  }

  private loadRiesgos() {
    this.http.get<{ id: number; nombre: string }[]>('/api/catalog/riesgos').subscribe({
      next: (rows) => this.riesgos.set(rows),
      error: () => void 0,
    });
  }

  private loadGestion() {
    this.http
      .get<{ gestion: Gestion | null; medidas: MedidaAsignada[]; solicitud?: Solicitud | null }>(
        `/api/incidents/${this.incidentId}/medidas`,
      )
      .subscribe({
        next: ({ gestion, medidas, solicitud }) =>
          this.applyLoadedGestion(gestion, medidas, solicitud ?? null),
      });
  }

  private resetEmptyGestionForm(): void {
    this.form = {
      servidor_judicial: '',
      cedula: '',
      cargo: '',
      codigo_oficio: '',
      tramite_destino: '',
      fecha_cerrem: '',
      resolucion_cerrem: '',
      fecha_resolucion: '',
      ID_riesgo: null as unknown as number,
      tipo_esquema: null,
      compartido_con: '',
      observaciones: '',
    };
    this.osegGuardada.set(false);
    this.cerremGuardada.set(false);
  }

  private applySolicitudToForm(solicitud: Solicitud): void {
    this.form.servidor_judicial = solicitud.servidor_judicial;
    this.form.cedula = solicitud.cedula;
    this.form.cargo = solicitud.cargo;
  }

  private maybeEnsureGestionDraft(): void {
    const ui = catalogStatusToUiStatus(this.workflowStatus);
    const rank = CSJ_STATUS_WORKFLOW_RANK[ui];
    if (
      rank !== undefined &&
      rank >= CSJ_STATUS_WORKFLOW_RANK['En gestión OSEG'] &&
      !String(this.form.codigo_oficio || '').trim()
    ) {
      this.ensureGestionDraft();
    }
  }

  private applyLoadedGestion(
    gestion: Gestion | null,
    medidas: MedidaAsignada[],
    solicitud: Solicitud | null,
  ): void {
    this.solicitud.set(solicitud);
    this.gestionSnapshot.set(gestion);
    if (gestion) {
      this.form = {
        ...this.form,
        ...gestion,
        fecha_cerrem: this.toDateInput(gestion.fecha_cerrem),
        fecha_resolucion: this.toDateInput(gestion.fecha_resolucion),
      };
      this.osegGuardada.set(this.isOsegPersistida(gestion));
      this.cerremGuardada.set(this.isCerremPersistida(gestion));
    } else {
      this.resetEmptyGestionForm();
    }
    if (!gestion && solicitud) {
      this.applySolicitudToForm(solicitud);
    }

    const lista = medidas
      .filter((m) => !this.isEsquemaProteccionNombre(m.nombre))
      .map((m) => ({ ...m, asignado: true }));
    this.medidasSeleccionadas.set(lista);
    this.medidasGuardadas.set(lista.length > 0);
    this.medidasEditMode.set(false);
    this.cerremEditMode.set(false);
    this.maybeEnsureGestionDraft();
    this.captureDraftBaseline();
  }

  private ensureGestionDraft() {
    if (!this.permissions().canSaveGestion) return;
    this.http
      .post<{ ok: boolean; codigo_oficio?: string }>(`/api/incidents/${this.incidentId}/gestion`, {
        tramite_destino: this.form.tramite_destino ?? '',
        workflowStatus: this.workflowStatus,
      })
      .subscribe({
        next: (res) => {
          if (res.codigo_oficio) {
            this.form.codigo_oficio = res.codigo_oficio;
          } else {
            this.loadGestion();
          }
          this.refreshAuditHistory();
        },
        error: (err) => {
          const msg =
            err?.error?.error?.message || err?.error?.message || 'No se pudo generar el oficio.';
          this.showMensaje('oseg', msg, 'error');
        },
      });
  }

  private toDateInput(value: string | null | undefined): string {
    if (!value) return '';
    const d = String(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
  }

  isMedidaSelected(id: number): boolean {
    return this.medidasSeleccionadas().some((m) => m.ID_tipo_medida === id);
  }

  /** Catálogo legacy: «Esquema de protección» no es checkbox; va en columnas V/W del Excel. */
  private isEsquemaProteccionNombre(nombre: string | null | undefined): boolean {
    return /esquema de protecci/i.test(String(nombre ?? ''));
  }

  getMedidaSeleccionada(id: number): MedidaAsignada | undefined {
    return this.medidasSeleccionadas().find((m) => m.ID_tipo_medida === id);
  }

  toggleMedida(id: number) {
    if (!this.isMedidasEditable()) return;
    const current = this.medidasSeleccionadas();
    if (this.isMedidaSelected(id)) {
      this.medidasSeleccionadas.set(current.filter((m) => m.ID_tipo_medida !== id));
    } else {
      const tipo = this.tiposMedida().find((t) => t.id === id);
      if (!tipo) return;
      this.medidasSeleccionadas.set([
        ...current,
        {
          ID_tipo_medida: id,
          nombre: tipo.nombre,
          cantidad: 1,
          observacion_medida: '',
          asignado: true,
        },
      ]);
    }
    this.notifyPendingChanges();
  }

  updateCantidad(id: number, val: number) {
    if (!this.isMedidasEditable()) return;
    this.medidasSeleccionadas.update((list) =>
      list.map((m) => (m.ID_tipo_medida === id ? { ...m, cantidad: val } : m)),
    );
    this.notifyPendingChanges();
  }

  updateObservacion(id: number, val: string) {
    if (!this.isMedidasEditable()) return;
    this.medidasSeleccionadas.update((list) =>
      list.map((m) => (m.ID_tipo_medida === id ? { ...m, observacion_medida: val } : m)),
    );
    this.notifyPendingChanges();
  }

  guardarGestionOseg() {
    if (this.osegGuardada() || isClosedWorkflowStatus(this.workflowStatus)) return;
    if (!String(this.form.tramite_destino || '').trim()) {
      this.showMensaje('oseg', 'Complete «Trámite / destino» antes de guardar.', 'error');
      return;
    }
    this.postGestion('oseg', 'Gestión OSEG guardada correctamente');
  }

  guardarGestionCerrem() {
    if (isClosedWorkflowStatus(this.workflowStatus)) return;
    if (this.cerremGuardada() && !this.cerremEditMode()) return;
    if (!String(this.form.resolucion_cerrem || '').trim()) {
      this.showMensaje('cerrem', 'Complete «Resolución CERREM» antes de guardar.', 'error');
      return;
    }
    if (!this.form.ID_riesgo) {
      this.showMensaje('cerrem', 'Seleccione el «Nivel de riesgo» antes de guardar.', 'error');
      return;
    }
    this.postGestion(
      'cerrem',
      'Decisión CERREM guardada correctamente',
      () => this.cerremEditMode.set(false),
      true,
    );
  }

  private postGestion(
    modulo: ModuloMedidas,
    successMsg: string,
    afterSuccess?: () => void,
    soloCerrem = false,
  ) {
    void this.postGestionAsync(modulo, successMsg, afterSuccess, soloCerrem);
  }

  private async postGestionAsync(
    modulo: ModuloMedidas,
    successMsg: string,
    afterSuccess?: () => void,
    soloCerrem = false,
  ): Promise<boolean> {
    const payload = soloCerrem
      ? {
          fecha_cerrem: this.form.fecha_cerrem,
          resolucion_cerrem: this.form.resolucion_cerrem,
          fecha_resolucion: this.form.fecha_resolucion,
          ID_riesgo: this.form.ID_riesgo,
          workflowStatus: this.workflowStatus,
        }
      : {
          ...this.form,
          workflowStatus: this.workflowStatus,
        };
    try {
      await firstValueFrom(
        this.http.post(`/api/incidents/${this.incidentId}/gestion`, payload),
      );
      this.osegGuardada.set(this.isOsegPersistida(this.form));
      this.cerremGuardada.set(this.isCerremPersistida(this.form));
      afterSuccess?.();
      this.captureDraftBaseline();
      this.showMensaje(modulo, successMsg, 'ok');
      this.loadGestion();
      this.refreshAuditHistory();
      this.gestionUpdated.emit();
      return true;
    } catch (err: unknown) {
      const e = err as { error?: { error?: { message?: string }; message?: string } };
      const msg =
        e?.error?.error?.message || e?.error?.message || 'Error al guardar la gestión';
      this.showMensaje(modulo, msg, 'error');
      return false;
    }
  }

  private describeSavedMedidasDelta(): string | null {
    const after = snapshotMedidasDraft(this.form, this.medidasSeleccionadas());
    const nameById = new Map(this.tiposMedida().map((t) => [t.id, t.nombre]));
    return describeMedidasSaveDelta(this.draftBaseline, after, (id) => nameById.get(id) ?? '');
  }

  getAssignedMedidasForDisplay(): { nombre: string; cantidad: number }[] {
    return this.medidasSeleccionadas().map((m) => ({
      nombre: m.nombre,
      cantidad: m.cantidad,
    }));
  }

  guardarMedidas() {
    if (isClosedWorkflowStatus(this.workflowStatus)) return;
    if (this.medidasGuardadas() && !this.medidasEditMode()) return;
    this.guardarMedidasAsync();
  }

  private async guardarMedidasAsync(): Promise<boolean> {
    if (isClosedWorkflowStatus(this.workflowStatus)) return false;
    if (this.medidasGuardadas() && !this.medidasEditMode()) return true;
    try {
      await firstValueFrom(
        this.http.post(`/api/incidents/${this.incidentId}/medidas`, {
          medidas: this.medidasSeleccionadas().map((m) => ({
            ID_tipo_medida: m.ID_tipo_medida,
            cantidad: m.cantidad,
            observacion_medida: m.observacion_medida,
          })),
          tipo_esquema: this.form.tipo_esquema,
          compartido_con: this.form.compartido_con,
          observaciones: this.form.observaciones,
        }),
      );
      this.medidasEditMode.set(false);
      this.medidasGuardadas.set(this.medidasSeleccionadas().length > 0);
      const saveDelta = this.describeSavedMedidasDelta();
      this.captureDraftBaseline();
      this.showMensaje(
        'medidas',
        saveDelta
          ? `Medidas guardadas: ${saveDelta}`
          : this.medidasGuardadas()
            ? 'Medidas actualizadas correctamente'
            : 'Medidas asignadas correctamente',
        'ok',
      );
      this.loadGestion();
      this.refreshAuditHistory();
      this.gestionUpdated.emit();
      this.medidasSaved.emit(saveDelta ?? undefined);
      return true;
    } catch (err: unknown) {
      const e = err as { error?: { error?: { message?: string }; message?: string } };
      const msg =
        e?.error?.error?.message || e?.error?.message || 'Error al asignar medidas';
      this.showMensaje('medidas', msg, 'error');
      return false;
    }
  }

  private isCerremPersistida(
    gestion: Pick<Gestion, 'resolucion_cerrem' | 'ID_riesgo'> | Partial<Gestion>,
  ): boolean {
    return (
      Boolean(String(gestion.resolucion_cerrem || '').trim()) &&
      Boolean(gestion.ID_riesgo)
    );
  }

  private isOsegPersistida(
    gestion: Pick<Gestion, 'codigo_oficio' | 'tramite_destino'> | Partial<Gestion>,
  ): boolean {
    return (
      Boolean(String(gestion.codigo_oficio || '').trim()) &&
      Boolean(String(gestion.tramite_destino || '').trim())
    );
  }

  private showMensaje(modulo: ModuloMedidas, texto: string, tipo: 'ok' | 'error' = 'ok') {
    const target = {
      oseg: this.mensajeOseg,
      cerrem: this.mensajeCerrem,
      medidas: this.mensajeMedidas,
    }[modulo];
    const prev = this.mensajeTimers[modulo];
    if (prev) clearTimeout(prev);
    target.set({ texto, tipo });
    this.mensajeTimers[modulo] = setTimeout(() => {
      target.set(null);
      delete this.mensajeTimers[modulo];
    }, 4000);
  }
}
