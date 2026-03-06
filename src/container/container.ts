/**
 * Lightweight Dependency Injection Container
 *
 * A simple IoC container inspired by Spring's ApplicationContext.
 * Supports singleton and transient lifecycles with factory-based registration.
 *
 * @example
 * ```ts
 * const container = new Container();
 * container.registerSingleton('db', () => new Database());
 * container.register('userDao', (c) => new UserDao(c.resolve('db')));
 * const dao = container.resolve<UserDao>('userDao');
 * ```
 */

type Factory<T> = (container: Container) => T;

interface Registration<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

export class Container {
  private registrations = new Map<string, Registration<unknown>>();

  /**
   * Register a transient dependency (new instance every resolve).
   */
  register<T>(token: string, factory: Factory<T>): this {
    this.registrations.set(token, { factory, singleton: false });
    return this;
  }

  /**
   * Register a singleton dependency (same instance every resolve).
   */
  registerSingleton<T>(token: string, factory: Factory<T>): this {
    this.registrations.set(token, { factory, singleton: true });
    return this;
  }

  /**
   * Register an existing instance as a singleton.
   */
  registerInstance<T>(token: string, instance: T): this {
    this.registrations.set(token, {
      factory: () => instance,
      singleton: true,
      instance,
    });
    return this;
  }

  /**
   * Resolve a dependency by its token.
   * @throws Error if the token is not registered.
   */
  resolve<T>(token: string): T {
    const registration = this.registrations.get(token);

    if (!registration) {
      throw new Error(
        `[Container] No registration found for token: "${token}". ` +
          `Available tokens: [${Array.from(this.registrations.keys()).join(", ")}]`
      );
    }

    if (registration.singleton) {
      if (!registration.instance) {
        registration.instance = registration.factory(this);
      }
      return registration.instance as T;
    }

    return registration.factory(this) as T;
  }

  /**
   * Check if a token is registered.
   */
  has(token: string): boolean {
    return this.registrations.has(token);
  }

  /**
   * Remove a registration.
   */
  unregister(token: string): boolean {
    return this.registrations.delete(token);
  }

  /**
   * Clear all registrations.
   */
  clear(): void {
    this.registrations.clear();
  }

  /**
   * Get all registered tokens.
   */
  getTokens(): string[] {
    return Array.from(this.registrations.keys());
  }
}
