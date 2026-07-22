// Reproduction: Nuxt mis-generates optional catch-all ([[...slug]]) routes with
// a stray trailing "]" in the route name and path (URL-encoded %5D). This makes
// the route un-matchable at runtime (VUE_ROUTER_R0004 "No match found").
//
// The `pages:extend` hook below just DUMPS the generated routes so the bug is
// visible from `nuxt prepare` / `nuxt build` output — it does not fix anything.
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-01-01',
  hooks: {
    'pages:extend'(pages) {
      const walk = (list: any[]) => {
        for (const p of list) {
          const bad = String(p.path).match(/(%5D|\])$/) || String(p.name ?? '').match(/\]$/)
          // eslint-disable-next-line no-console
          console.log(`${bad ? '❌ STRAY-] ' : '✅         '}name=${JSON.stringify(p.name)}  path=${JSON.stringify(p.path)}`)
          if (p.children) walk(p.children)
        }
      }
      // eslint-disable-next-line no-console
      console.log('\n================ GENERATED ROUTES ================')
      walk(pages)
      // eslint-disable-next-line no-console
      console.log('==================================================\n')
    },
  },
})
