export const fmt=(n:number,currency:string)=> new Intl.NumberFormat(undefined,{style:'currency',currency}).format(n);
export const currencies=['SSP','USD','KES'] as const;
