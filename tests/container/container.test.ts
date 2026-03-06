/**
 * DI Container tests.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { Container } from "../../src/container/container";

describe("Container", () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe("register / resolve", () => {
    it("should register and resolve a transient dependency", () => {
      let callCount = 0;

      container.register("counter", () => {
        callCount++;
        return { count: callCount };
      });

      const first = container.resolve<{ count: number }>("counter");
      const second = container.resolve<{ count: number }>("counter");

      expect(first.count).toBe(1);
      expect(second.count).toBe(2); // new instance each time
    });

    it("should throw when resolving an unregistered token", () => {
      expect(() => container.resolve("nonexistent")).toThrow(
        'No registration found for token: "nonexistent"'
      );
    });
  });

  describe("registerSingleton", () => {
    it("should return the same instance on every resolve", () => {
      container.registerSingleton("service", () => ({ id: Math.random() }));

      const first = container.resolve<{ id: number }>("service");
      const second = container.resolve<{ id: number }>("service");

      expect(first).toBe(second); // same reference
      expect(first.id).toBe(second.id);
    });
  });

  describe("registerInstance", () => {
    it("should return the exact instance provided", () => {
      const instance = { value: 42 };
      container.registerInstance("config", instance);

      const resolved = container.resolve<{ value: number }>("config");
      expect(resolved).toBe(instance);
      expect(resolved.value).toBe(42);
    });
  });

  describe("dependency chain", () => {
    it("should resolve nested dependencies via the container argument", () => {
      container.registerSingleton("db", () => ({ connected: true }));
      container.registerSingleton("dao", (c) => ({
        db: c.resolve<{ connected: boolean }>("db"),
      }));
      container.registerSingleton("service", (c) => ({
        dao: c.resolve<{ db: { connected: boolean } }>("dao"),
      }));

      const service = container.resolve<{
        dao: { db: { connected: boolean } };
      }>("service");

      expect(service.dao.db.connected).toBe(true);
    });
  });

  describe("has / unregister / clear", () => {
    it("should check if a token is registered", () => {
      expect(container.has("foo")).toBe(false);
      container.register("foo", () => "bar");
      expect(container.has("foo")).toBe(true);
    });

    it("should unregister a token", () => {
      container.register("foo", () => "bar");
      expect(container.unregister("foo")).toBe(true);
      expect(container.has("foo")).toBe(false);
    });

    it("should clear all registrations", () => {
      container.register("a", () => 1);
      container.register("b", () => 2);
      container.clear();
      expect(container.getTokens()).toEqual([]);
    });
  });

  describe("getTokens", () => {
    it("should list all registered tokens", () => {
      container.register("a", () => 1);
      container.register("b", () => 2);
      expect(container.getTokens()).toEqual(["a", "b"]);
    });
  });
});
