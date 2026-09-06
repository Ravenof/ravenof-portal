// next/headers neegzistuoja kliente. Jei kas nors tai importuoja SPA'oje – tai klaida architektūroje.
export function cookies(): never { throw new Error('next/headers: nepasiekiama app bundle\'e (tik serveryje)') }
export function headers(): never { throw new Error('next/headers: nepasiekiama app bundle\'e (tik serveryje)') }
