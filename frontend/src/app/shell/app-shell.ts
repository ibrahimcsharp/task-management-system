import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';

import { AppIcon, IconName } from '@shared/components/app-icon';

interface NavItem {
  label: string;
  icon: IconName;
  link: string;
  adminOnly?: boolean;
}

/** Authenticated layout: dark sidebar, sticky topbar and the routed content area. */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppIcon],
  template: `
    <div class="shell" [class.collapsed]="collapsed()">
      <aside class="sidebar" [class.mobile-open]="mobileOpen()">
        <a class="brand" routerLink="/dashboard" (click)="mobileOpen.set(false)">
          <span class="brand-mark">
            <app-icon name="zap" [size]="17" [strokeWidth]="2.2" />
          </span>
          <span class="brand-name">TaskFlow</span>
        </a>

        <nav class="nav" aria-label="Main navigation">
          @for (item of nav(); track item.link) {
            <a
              class="nav-link"
              [routerLink]="item.link"
              routerLinkActive="active"
              (click)="mobileOpen.set(false)"
              [attr.title]="collapsed() ? item.label : null"
            >
              <app-icon [name]="item.icon" [size]="17" />
              <span class="nav-label">{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar-foot">
          <span class="nav-label sidebar-version">Task Management v1.0</span>
        </div>
      </aside>

      @if (mobileOpen()) {
        <div class="scrim" (click)="mobileOpen.set(false)"></div>
      }

      <div class="main">
        <header class="topbar">
          <button
            type="button"
            class="btn btn-ghost btn-icon topbar-burger"
            (click)="mobileOpen.set(true)"
            aria-label="Open navigation"
          >
            <app-icon name="menu" [size]="18" />
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-icon topbar-collapse"
            (click)="toggleCollapsed()"
            [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
          >
            <app-icon [name]="collapsed() ? 'chevronRight' : 'chevronLeft'" [size]="17" />
          </button>

          <span class="flex-1"></span>

          <div class="topbar-user">
            <span class="avatar avatar-sm">{{ auth.initials() }}</span>
            <span class="topbar-user-text">
              <span class="topbar-user-name">{{ auth.displayName() }}</span>
              <span class="topbar-user-role">{{ auth.currentUser()?.role }}</span>
            </span>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            (click)="logout()"
            title="Sign out"
            aria-label="Sign out"
          >
            <app-icon name="logOut" [size]="17" />
          </button>
        </header>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .shell {
        display: grid;
        grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
        min-height: 100vh;
      }
      .shell.collapsed {
        grid-template-columns: var(--sidebar-w-rail) minmax(0, 1fr);
      }

      .sidebar {
        position: sticky;
        top: 0;
        height: 100vh;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 18px 14px;
        background: linear-gradient(180deg, var(--sidebar-from), var(--sidebar-to));
        color: var(--text-on-dark);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 2px 6px 16px;
        color: inherit;
        text-decoration: none;
      }
      .brand:hover {
        text-decoration: none;
      }
      .brand-mark {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        flex: none;
        border-radius: 9px;
        background: linear-gradient(135deg, var(--primary), #6366f1);
        color: #fff;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
      }
      .brand-name {
        font-size: 15.5px;
        font-weight: 650;
        letter-spacing: -0.01em;
        white-space: nowrap;
      }

      .nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .nav-link {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 9px 11px;
        border-radius: 9px;
        color: var(--text-on-dark-muted);
        font-size: 13.5px;
        font-weight: 550;
        text-decoration: none;
        transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
      }
      .nav-link:hover {
        background: rgba(148, 163, 184, 0.12);
        color: var(--text-on-dark);
        text-decoration: none;
      }
      .nav-link.active {
        background: rgba(59, 130, 246, 0.22);
        color: #fff;
      }
      .nav-link app-icon {
        flex: none;
      }

      .sidebar-foot {
        margin-top: auto;
        padding: 8px 10px;
      }
      .sidebar-version {
        font-size: 11px;
        color: var(--text-on-dark-muted);
        opacity: 0.7;
      }

      .collapsed .brand {
        justify-content: center;
      }
      .collapsed .brand-name,
      .collapsed .nav-label {
        display: none;
      }
      .collapsed .nav-link {
        justify-content: center;
        padding: 10px 0;
      }

      .main {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .topbar {
        position: sticky;
        top: 0;
        z-index: 20;
        display: flex;
        align-items: center;
        gap: 10px;
        height: var(--topbar-h);
        padding: 0 var(--content-pad);
        background: rgba(255, 255, 255, 0.86);
        backdrop-filter: blur(8px);
        border-bottom: 1px solid var(--border);
      }
      .topbar-burger {
        display: none;
      }
      .topbar-user {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-left: auto;
      }
      .topbar-user-text {
        display: flex;
        flex-direction: column;
        line-height: 1.25;
      }
      .topbar-user-name {
        font-size: 13px;
        font-weight: 600;
      }
      .topbar-user-role {
        font-size: 11px;
        color: var(--text-muted);
      }

      .content {
        flex: 1;
        min-width: 0;
        padding: var(--content-pad);
      }

      .scrim {
        display: none;
      }

      @media (max-width: 960px) {
        .shell,
        .shell.collapsed {
          grid-template-columns: minmax(0, 1fr);
        }
        .sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: var(--sidebar-w);
          z-index: 60;
          transform: translateX(-102%);
          transition: transform var(--t-base) var(--ease);
        }
        .sidebar.mobile-open {
          transform: none;
          box-shadow: var(--shadow-lg);
        }
        .topbar-burger {
          display: inline-flex;
        }
        .topbar-collapse {
          display: none;
        }
        .collapsed .brand {
          justify-content: flex-start;
        }
        .collapsed .brand-name,
        .collapsed .nav-label {
          display: inline;
        }
        .collapsed .nav-link {
          justify-content: flex-start;
          padding: 9px 11px;
        }
        .scrim {
          display: block;
          position: fixed;
          inset: 0;
          z-index: 50;
          background: rgba(15, 23, 42, 0.45);
        }
      }
    `,
  ],
})
export class AppShell {
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly collapsed = signal(false);
  protected readonly mobileOpen = signal(false);

  protected readonly nav = computed<readonly NavItem[]>(() => {
    const items: NavItem[] = [
      { label: 'Dashboard', icon: 'barChart', link: '/dashboard' },
      { label: 'Tasks', icon: 'tasks', link: '/tasks' },
      { label: 'Projects', icon: 'folder', link: '/projects' },
      { label: 'Profile', icon: 'user', link: '/profile' },
    ];
    if (this.auth.isAdmin()) {
      items.push({ label: 'Users', icon: 'shield', link: '/users', adminOnly: true });
    }
    return items;
  });

  protected toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
  }

  protected logout(): void {
    this.auth.logout();
    this.toast.info('You have been signed out.', 'Signed out');
  }
}
