import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InactivityService } from '../../services/inactivity.service';

@Component({
  selector: 'app-session-warning',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (inactivity.isWarningVisible()) {
      <div class="session-warning-backdrop" role="alert" aria-live="assertive">
        <div class="session-warning-toast">
          <div class="session-warning-icon" aria-hidden="true">⏱️</div>
          <div class="session-warning-content">
            <p class="session-warning-title">Tu sesión está por cerrarse</p>
            <p class="session-warning-text">
              Cerrando en
              <strong class="session-warning-countdown">{{ inactivity.warningSeconds() }}</strong>
              {{ inactivity.warningSeconds() === 1 ? 'segundo' : 'segundos' }}. Mueve el mouse o
              presiona cualquier tecla para continuar.
            </p>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .session-warning-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 24px;

        pointer-events: none;
      }

      .session-warning-toast {
        background: #1f2937;
        color: #f9fafb;
        border-left: 4px solid #f59e0b;
        border-radius: 8px;
        padding: 14px 18px;
        max-width: 460px;
        width: calc(100% - 32px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        display: flex;
        align-items: flex-start;
        gap: 12px;
        animation: sw-slide-in 200ms ease-out;
      }

      .session-warning-icon {
        font-size: 24px;
        line-height: 1;
        flex-shrink: 0;
      }

      .session-warning-content {
        flex: 1;
        min-width: 0;
      }

      .session-warning-title {
        margin: 0 0 4px 0;
        font-size: 15px;
        font-weight: 600;
      }

      .session-warning-text {
        margin: 0;
        font-size: 13px;
        line-height: 1.45;
        opacity: 0.9;
      }

      .session-warning-countdown {
        color: #fbbf24;
        font-variant-numeric: tabular-nums;
        margin: 0 2px;
      }

      @keyframes sw-slide-in {
        from {
          opacity: 0;
          transform: translateY(-12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class SessionWarningComponent {
  protected readonly inactivity = inject(InactivityService);
}
