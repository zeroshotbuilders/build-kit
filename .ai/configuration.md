# Configuration

## Configuration Loading

Configuration is read via `packages/commons/src/config/config-utils.ts`. This defaults to reading from a YAML file at
the application root (e.g., `assets/config.yaml`).

Overrides can be set as environment variables with the `app_` prefix:

```json
{
  "name": "app_remoteClient___port",
  "value": "8080"
},
{
  "name": "app_remoteClient___address",
  "value": "localhost"
}
```

### Type Suffixes

Env vars are parsed as strings. For typed values, use suffixes:
- `_numeric`: `"app_defaultTokenExpirySeconds_numeric"` → `600`
- `_boolean`: `"app_someFeatureEnabled_boolean"` → `true`

## Dynamic Configuration

`*DynamicConfig` classes are simple, injectable config holders that:

- Load initial values from YAML at startup via `loadConfig(...)`.
- Expose **getter** methods for production code.
- Expose **setter** methods so tests can override values at runtime.

Typical structure:
- Static `CONFIG_KEY` field pointing to the YAML section
- Private fields for each config value
- Constructor: `loadConfig` using `ApplicationConfig.applicationRoot` and `CONFIG_KEY`
- Public getters and setters mirroring those fields

Best practices:
- Always save and restore original values (use `try/finally`) in tests.
- Keep fields private, exposed only via getters/setters.
- Use consistent naming: `getX()` / `setX(...)`.
- Always mark these classes as `@Injectable()`.
