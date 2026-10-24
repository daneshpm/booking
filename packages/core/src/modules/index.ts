import type { IEventBus } from '../events';

export type FeatureModuleCategory =
  | 'core'
  | 'operations'
  | 'marketing'
  | 'automation'
  | 'integrations';

export interface FeatureNavItem {
  label: string;
  href: string;
  iconName: string;
  order?: number;
  badge?: string;
}

export interface FeatureModule {
  /** Unique machine identifier, e.g. 'workflows', 'services', 'analytics' */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Short feature summary */
  description: string;
  /** Categorization for settings and module marketplaces */
  category: FeatureModuleCategory;
  /** Semantic version of the module */
  version?: string;
  /** Workspace feature flag property name, e.g. 'workflowsEnabled' */
  flag?: string;
  /** Restricts access strictly to workspace admins and owners */
  adminOnly?: boolean;
  /** Minimum role required to view or access this module */
  requiredRole?: 'OWNER' | 'ADMIN' | 'STAFF' | 'RECEPTIONIST';
  /** Navigation item exposed in the application sidebar or header */
  navItem?: FeatureNavItem;
  /** Settings route or configuration tab path */
  settingsPath?: string;
  /** Initialization callback to register event listeners or setup hooks */
  onRegister?: (eventBus: IEventBus) => void;
}

export class ModuleRegistry {
  private modules = new Map<string, FeatureModule>();

  register(module: FeatureModule, eventBus?: IEventBus): void {
    if (this.modules.has(module.id)) {
      console.warn(`[ModuleRegistry] Module "${module.id}" is already registered. Overwriting.`);
    }
    this.modules.set(module.id, module);

    if (eventBus && module.onRegister) {
      module.onRegister(eventBus);
    }
  }

  unregister(id: string): boolean {
    return this.modules.delete(id);
  }

  get(id: string): FeatureModule | undefined {
    return this.modules.get(id);
  }

  getAll(): FeatureModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Filter modules that are active for a specific workspace based on its feature flags.
   * If a module has no `flag` declared, it is considered active by default.
   */
  getEnabledModules(flags: Record<string, boolean | undefined | null> = {}): FeatureModule[] {
    return this.getAll().filter((mod) => {
      if (!mod.flag) return true;
      return Boolean(flags[mod.flag]);
    });
  }

  /**
   * Computes the list of navigation items accessible to a given role and active workspace feature flags.
   */
  getVisibleNavItems(
    userRole: string,
    flags: Record<string, boolean | undefined | null> = {}
  ): Array<FeatureNavItem & { id: string }> {
    const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

    return this.getEnabledModules(flags)
      .filter((mod) => {
        if (!mod.navItem) return false;
        if (mod.adminOnly && !isAdmin) return false;
        return true;
      })
      .map((mod) => ({
        id: mod.id,
        ...mod.navItem!,
        order: mod.navItem!.order ?? 100,
      }))
      .sort((a, b) => a.order - b.order);
  }
}

/** Global shared instance of the module registry */
export const defaultModuleRegistry = new ModuleRegistry();
