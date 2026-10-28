/**
 * The flash-of-wrong-theme fix (13.7). `ThemeProvider` applies the `dark` class in an effect, i.e. AFTER
 * React has rendered and the browser has painted a light page: a visitor with dark mode saw a white
 * flash on every hard reload. This script runs in `<head>`, BEFORE the first paint (it is inline, so
 * it blocks nothing but runs immediately), reads the same stored choice and OS preference, and sets
 * the same class and `color-scheme` the provider will set later (so the provider's effect finds nothing to change).
 *
 * It must stay a plain, self-contained string: no imports, `var`, try/catch (localStorage can throw in
 * private mode and a throw here must never stop the page). Any change to it changes its CSP hash:
 * `public/_headers` pins the hash and a unit test fails until they match.
 */
export const THEME_STORAGE_KEY = "shopsphere.theme"

export const themeInitScript = `(function(){var t=null;try{t=JSON.parse(localStorage.getItem("${THEME_STORAGE_KEY}")||"null")}catch(e){}var d=false;try{d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches)}catch(e){}var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"})()`
