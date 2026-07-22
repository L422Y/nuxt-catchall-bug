# Nuxt optional catch-all routes get a stray `]` and never match

## Summary

An **optional catch-all** page (`[[...slug]].vue`) generates a route whose **name
and path carry a stray trailing `]`** (URL-encoded `%5D` in the path). The
resulting route can never match at runtime → `VUE_ROUTER_R0004` / 404.

A regular (non-optional) catch-all `[...slug].vue` is fine — only the double-bracket
optional form is affected.

## Affected versions

Reproduced identically on:

- `nuxt@4.5.0`
- `nuxt@4.4.8`

(SSR on or off — it's a build-time route-generation problem.)

## Reproduce

```bash
npm install
npm run routes   # = nuxt prepare; a pages:extend hook dumps the generated routes
```

### Expected

```
name="a-slug"      path="/a/:slug(.*)*"
name="b-id-slug"   path="/b/:id()/:slug(.*)*"
name="c-slug"      path="/c/:slug(.*)*"
name="index"       path="/"
```

### Actual

```
❌ STRAY-]  name="a-slug]"      path="/a/:slug(.*)*%5D"
❌ STRAY-]  name="b-id-slug]"   path="/b/:id()/:slug(.*)*%5D"
✅          name="c-slug"       path="/c/:slug(.*)*"
✅          name="index"        path="/"
```

| Page file | Kind | Result |
|---|---|---|
| `app/pages/a/[[...slug]].vue` | optional catch-all | ❌ stray `]` |
| `app/pages/b/[id]/[[...slug]].vue` | optional catch-all under a dynamic segment | ❌ stray `]` |
| `app/pages/c/[...slug].vue` | **non-optional** catch-all | ✅ correct |
| `app/pages/index.vue` | static | ✅ correct |

## Runtime impact

Because the generated path is `/a/:slug(.*)*]` (a literal `]` at the end), the
route matches nothing. Navigating to `/a`, `/a/foo`, or `/b/123/foo` throws:

```
[VUE_ROUTER_R0004] No match found for location with path "/a/foo"
```

and Nuxt renders its 404 page.

## Root cause (guess)

The filename→route conversion for `[[...name]]` appears to consume the optional
open `[[` and a **single** closing `]`, leaving the second `]` as a literal
segment token — so it lands in both the route name (raw `]`) and the route path
(URL-encoded `%5D`).

## Workaround

A `pages:extend` hook that strips a trailing `]` / `%5D` from route path and name
(see `nuxt.config.ts` for the diagnostic version; the fix is a one-liner):

```ts
export default defineNuxtConfig({
  hooks: {
    'pages:extend'(pages) {
      const TRAIL = /(?:%5D|\])+$/i
      const fix = (list: any[]) => {
        for (const p of list) {
          if (typeof p.path === 'string') p.path = p.path.replace(TRAIL, '')
          if (typeof p.name === 'string') p.name = p.name.replace(TRAIL, '')
          if (p.children) fix(p.children)
        }
      }
      fix(pages)
    },
  },
})
```
